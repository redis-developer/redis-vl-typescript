/**
 * @module Search Index
 * Main search index class for managing Redis search indexes.
 */

import type { RedisClientType, RedisClusterType } from 'redis';
import type { RediSearchSchema } from '@redis/search';
import { IndexSchema } from '../schema/schema.js';
import { BaseStorage, HashStorage, JsonStorage } from '../storage/index.js';
import { RedisVLError, SchemaValidationError } from '../errors.js';
import type { BaseQuery, SearchResult, SearchDocument, QueryOptions } from '../query/base.js';
import { VectorQuery } from '../query/vector.js';
import { DISTANCE_NORMALIZERS } from '../utils/distance.js';

/**
 * Options for creating an index.
 */
export interface CreateIndexOptions {
    /**
     * Whether to overwrite the index if it already exists.
     * @default false
     */
    overwrite?: boolean;

    /**
     * Whether to drop all keys associated with the index when overwriting.
     * Only applies when overwrite is true.
     * @default false
     */
    drop?: boolean;
}

/**
 * Options for deleting an index.
 */
export interface DeleteIndexOptions {
    /**
     * Whether to drop all keys associated with the index.
     * @default false
     */
    drop?: boolean;
}

/**
 * Options for loading data into an index.
 */
export interface LoadOptions {
    /**
     * Field name to use as the document ID.
     * If provided, the value of this field will be used as the key.
     * If not provided, keys will be auto-generated.
     */
    idField?: string;

    /**
     * Explicit keys to use for the documents.
     * Must match the length of the data array.
     */
    keys?: string[];

    /**
     * Time-to-live in seconds for the documents.
     * If provided, documents will expire after this duration.
     */
    ttl?: number;

    /**
     * Number of objects to write in a single Redis pipeline execution.
     * @default 200
     */
    batchSize?: number;

    /**
     * Preprocessing function to transform documents before loading.
     * The function receives a document and returns a Promise of the transformed document.
     *
     * @example
     * ```typescript
     * // Simple transformation
     * await index.load(data, {
     *   preprocess: async (doc) => ({ ...doc, timestamp: Date.now() })
     * });
     *
     * // generating embeddings
     * await index.load(data, {
     *   preprocess: async (doc) => ({
     *     ...doc,
     *     embedding: await vectorizer.embed(doc.text)
     *   })
     * });
     * ```
     */
    preprocess?: (doc: Record<string, unknown>) => Promise<Record<string, unknown>>;

    /**
     * Whether to validate documents against schema before loading.
     * @default false
     */
    validateOnLoad?: boolean;
}

/**
 * SearchIndex class for managing Redis vector search indices.
 *
 * This class provides methods to create, manage, and query Redis search indices.
 * Users create their own Redis client and pass it to the constructor.
 *
 * @example
 * ```typescript
 * import { createClient } from 'redis';
 * import { SearchIndex, IndexSchema, StorageType } from 'redis-vl';
 *
 * const client = createClient();
 * await client.connect();
 *
 * const schema = new IndexSchema({
 *   index: { name: 'my-index', prefix: 'doc', storageType: StorageType.HASH }
 * });
 * schema.addField({ name: 'title', type: 'text' });
 *
 * const searchIndex = new SearchIndex(schema, client);
 * await searchIndex.create();
 * ```
 */
export class SearchIndex {
    /**
     * The index schema defining the structure and fields.
     */
    public readonly schema: IndexSchema;

    /**
     * The Redis client instance.
     */
    private readonly client: RedisClientType | RedisClusterType;

    /**
     * Internal storage handler for data operations.
     */
    private readonly storage: BaseStorage;

    /**
     * Whether to validate documents against schema when loading.
     * Can be overridden per load() call.
     */
    private readonly validateOnLoad: boolean;

    /**
     * Create a new SearchIndex instance.
     *
     * @param schema - The index schema
     * @param client - Redis client instance (created by user)
     * @param validateOnLoad - Whether to validate documents on load (default: false)
     * @throws {Error} If schema is not a valid IndexSchema instance
     * @throws {Error} If client is not provided
     */
    constructor(
        schema: IndexSchema,
        client: RedisClientType | RedisClusterType,
        validateOnLoad = false
    ) {
        if (!(schema instanceof IndexSchema)) {
            throw new RedisVLError('Must provide a valid IndexSchema object');
        }

        if (!client) {
            throw new RedisVLError('Must provide a valid Redis client');
        }

        this.schema = schema;
        this.client = client;
        this.validateOnLoad = validateOnLoad;

        // Initialize appropriate storage based on storage type
        const isJson = this.schema.index.storageType.toLowerCase() === 'json';
        this.storage = isJson ? new JsonStorage(schema) : new HashStorage(schema);
    }

    /**
     * Get the index name from the schema.
     */
    get name(): string {
        return this.schema.index.name;
    }

    /**
     * Convert schema fields to Redis field schema format.
     * Each field class knows how to convert itself via the toRedisField() method.
     * @private
     */
    private convertFieldsToRedisSchema(): RediSearchSchema {
        const redisSchema: RediSearchSchema = {};
        const isJson = this.schema.index.storageType.toLowerCase() === 'json';

        for (const field of Object.values(this.schema.fields)) {
            // Determine the field key for Redis schema
            let key: string;
            if (isJson) {
                // For JSON storage, use the path (which should already have $. prefix)
                key = field.path || field.name;
                // Safety check: ensure path starts with $.
                if (!key.startsWith('$.')) {
                    key = `$.${key}`;
                }
            } else {
                // For HASH storage, use the field name directly
                key = field.name;
            }

            // Converts each field to Redis format
            redisSchema[key] = field.toRedisField(isJson);
        }

        return redisSchema;
    }

    /**
     * Create the index in Redis.
     *
     * @param options - Creation options
     * @throws {Error} If no fields are defined for the index
     * @returns The result from Redis FT.CREATE command
     */
    async create(options: CreateIndexOptions = {}) {
        const { overwrite = false, drop = false } = options;

        // Check that fields are defined
        const fields = Object.values(this.schema.fields);
        if (fields.length === 0) {
            throw new SchemaValidationError('No fields defined for index');
        }

        // Check if index already exists
        if (await this.exists()) {
            if (!overwrite) {
                // Index exists and we're not overwriting - do nothing
                return;
            }
            // Delete existing index
            await this.delete({ drop });
        }

        // Create the index using Redis FT.CREATE
        const fieldSchema = this.convertFieldsToRedisSchema();

        return this.client.ft.create(this.name, fieldSchema, {
            ON: this.schema.index.storageType.toUpperCase() as 'HASH' | 'JSON',
            PREFIX: this.schema.index.prefix,
        });
    }

    /**
     * Check if the index exists in Redis.
     *
     * @returns True if the index exists, false otherwise
     */
    async exists(): Promise<boolean> {
        try {
            // Try to get index info - if it exists, this will succeed
            await this.client.ft.info(this.name);
            return true;
        } catch {
            // If index doesn't exist, FT.INFO will throw an error
            return false;
        }
    }

    /**
     * Delete the index from Redis.
     *
     * @param options - Deletion options
     * @returns The result from Redis FT.DROPINDEX command
     */
    async delete(options: DeleteIndexOptions = {}) {
        const { drop = false } = options;

        if (drop) {
            // Drop index and associated data
            return this.client.ft.dropIndex(this.name, { DD: true });
        } else {
            // Drop index only, keep data
            return this.client.ft.dropIndex(this.name);
        }
    }

    /**
     * Get information about the index.
     *
     * @returns Index information from Redis
     */
    async info() {
        return this.client.ft.info(this.name);
    }

    /**
     * Load documents into the index.
     *
     * This method handles:
     * - Auto-generating keys using ULID if no idField or keys provided
     * - Extracting IDs from documents using idField
     * - Using explicit keys if provided
     * - Preprocessing documents before storage
     * - Setting TTL on documents
     * - Supporting both HASH and JSON storage types
     * - Batching operations using Redis pipelining for performance
     * - Optional schema validation
     *
     * @param data - Array of documents to load
     * @param options - Load options
     * @returns Array of keys that were loaded
     * @throws {Error} If keys length doesn't match data length
     * @throws {Error} If idField is not found in a document
     * @throws {SchemaValidationError} If validation fails when validateOnLoad is enabled
     * @throws {RedisVLError} If there's an error loading data to Redis
     *
     * @example
     * ```typescript
     * // Auto-generate keys
     * const keys = await index.load([
     *   { title: 'Doc 1', score: 100 },
     *   { title: 'Doc 2', score: 200 }
     * ]);
     *
     * // Use idField
     * const keys = await index.load(
     *   [{ id: 'user1', name: 'John' }],
     *   { idField: 'id' }
     * );
     *
     * // Use explicit keys
     * const keys = await index.load(
     *   [{ name: 'John' }],
     *   { keys: ['user:1'] }
     * );
     *
     * // With preprocessing, TTL, and validation
     * const keys = await index.load(
     *   [{ name: 'John' }],
     *   {
     *     ttl: 3600,
     *     batchSize: 100,
     *     validateOnLoad: true,
     *     preprocess: (doc) => ({ ...doc, timestamp: Date.now() })
     *   }
     * );
     * ```
     */
    async load(data: Record<string, unknown>[], options: LoadOptions = {}): Promise<string[]> {
        // Use instance-level validateOnLoad setting if not overridden in options
        const validateOnLoad = options.validateOnLoad ?? this.validateOnLoad;

        try {
            return await this.storage.write(this.client, data, { ...options, validateOnLoad });
        } catch (error) {
            if (error instanceof SchemaValidationError) {
                // Re-throw validation errors as-is with detailed information
                throw error;
            }
            // Wrap other errors as general RedisVL errors
            throw new RedisVLError(
                `Failed to load data: ${error instanceof Error ? error.message : String(error)}`,
                { cause: error instanceof Error ? error : undefined }
            );
        }
    }

    /**
     * Fetch a single document by key.
     *
     * @param key - The document key (without prefix)
     * @returns The document or null if not found
     *
     * @example
     * ```typescript
     * const doc = await index.fetch('123');
     */
    async fetch(key: string): Promise<Record<string, unknown> | null> {
        try {
            // Normalize prefix (use first prefix if array)
            const prefix = Array.isArray(this.schema.index.prefix)
                ? this.schema.index.prefix[0]
                : this.schema.index.prefix;

            // Build full key with prefix and separator
            // Normalize prefix by removing trailing separator to avoid double separators (e.g. ::)
            const normalizedPrefix = prefix.endsWith(this.schema.index.keySeparator)
                ? prefix.slice(0, -this.schema.index.keySeparator.length)
                : prefix;
            const fullKey = normalizedPrefix
                ? `${normalizedPrefix}${this.schema.index.keySeparator}${key}`
                : key;

            // Fetch using storage layer
            const results = await this.storage.get(this.client, [fullKey]);

            // Return first result (or null)
            return results[0];
        } catch (error) {
            throw new RedisVLError(
                `Failed to fetch document: ${error instanceof Error ? error.message : String(error)}`,
                { cause: error instanceof Error ? error : undefined }
            );
        }
    }

    /**
     * Fetch multiple documents by keys.
     * Uses pipelining for efficient batch retrieval.
     *
     * @param keys - Array of document keys (without prefix)
     * @param batchSize - Number of commands per pipeline batch (default: 200)
     * @returns Array of documents (null for missing keys)
     *
     * @example
     * ```typescript
     * const docs = await index.fetchMany(['123', '456', '789']);
     */
    async fetchMany(keys: string[], batchSize = 200): Promise<(Record<string, unknown> | null)[]> {
        try {
            if (!keys || keys.length === 0) {
                return [];
            }

            // Normalize prefix (use first prefix if array)
            const prefix = Array.isArray(this.schema.index.prefix)
                ? this.schema.index.prefix[0]
                : this.schema.index.prefix;

            // Build full keys with prefix and separator
            // Normalize prefix by removing trailing separator to avoid double separators (e.g. ::)
            const normalizedPrefix = prefix.endsWith(this.schema.index.keySeparator)
                ? prefix.slice(0, -this.schema.index.keySeparator.length)
                : prefix;
            const fullKeys = normalizedPrefix
                ? keys.map((key) => `${normalizedPrefix}${this.schema.index.keySeparator}${key}`)
                : keys;

            // Fetch using storage layer with pipelining
            return await this.storage.get(this.client, fullKeys, batchSize);
        } catch (error) {
            throw new RedisVLError(
                `Failed to fetch documents: ${error instanceof Error ? error.message : String(error)}`,
                { cause: error instanceof Error ? error : undefined }
            );
        }
    }

    /**
     * Execute a search query against the index
     *
     * @param query - Query object (VectorQuery, FilterQuery, etc.)
     * @param options - Optional query execution options
     * @returns Search results with documents and scores
     *
     * @example
     * ```typescript
     * import { VectorQuery } from 'redisvl';
     *
     * // Vector similarity search
     * const query = new VectorQuery({
     *   vector: embedding,
     *   vectorField: 'embedding',
     *   topK: 10,
     *   returnFields: ['title', 'content']
     * });
     *
     * const results = await index.search(query);
     * console.log(`Found ${results.total} results`);
     *
     * results.documents.forEach((doc) => {
     *   console.log(`${doc.value.title} (score: ${doc.score})`);
     * });
     * ```
     *
     * @example
     * ```typescript
     * // Vector search with metadata filtering
     * const query = new VectorQuery({
     *   vector: embedding,
     *   vectorField: 'embedding',
     *   filter: '@category:{electronics}',
     *   topK: 5
     * });
     *
     * const results = await index.search(query);
     * ```
     */
    async search<T = Record<string, unknown>>(
        query: BaseQuery,
        options?: QueryOptions
    ): Promise<SearchResult<T>> {
        try {
            const queryString = query.buildQuery();
            const params = query.buildParams();

            // Build FT.SEARCH options
            const searchOptions: Record<string, unknown> = {
                PARAMS: params,
                DIALECT: options?.dialect ?? 2, // DIALECT 2 required for KNN
            };

            // Add RETURN fields if specified
            // For VectorQuery, always include the score field (vector_distance by default)
            if (query.returnFields && query.returnFields.length > 0) {
                const returnFields = [...query.returnFields];
                // Check if this is a vector query by looking at the query string
                if (queryString.includes('=>[KNN')) {
                    // Extract the score alias from the query string (after "AS ")
                    const scoreAliasMatch = queryString.match(/AS\s+(\w+)\]/);
                    const scoreAlias = scoreAliasMatch ? scoreAliasMatch[1] : 'vector_distance';

                    // Only add if not already in returnFields
                    if (!returnFields.includes(scoreAlias)) {
                        returnFields.push(scoreAlias);
                    }
                }
                searchOptions.RETURN = returnFields;
            }

            // Add pagination
            if (query.limit !== undefined || query.offset !== undefined) {
                const offset = query.offset ?? 0;
                const limit = query.limit ?? 10;
                searchOptions.LIMIT = { from: offset, size: limit };
            }

            // Add sorting if specified
            if (options?.sortBy) {
                searchOptions.SORTBY = options.sortBy;
                if (options.sortOrder) {
                    searchOptions.SORTBY = {
                        BY: options.sortBy,
                        DIRECTION: options.sortOrder,
                    };
                }
            }

            // Execute search
            const response = await this.client.ft.search(
                this.schema.index.name,
                queryString,
                searchOptions
            );

            // Determine if we need to normalize distances
            const isVectorQuery = query instanceof VectorQuery;
            const shouldNormalize = isVectorQuery && query.normalizeDistance;
            let normalizer: ((distance: number) => number) | null = null;

            if (shouldNormalize) {
                // Find the vector field being queried to get its distance metric
                const vectorFieldName = query.vectorField;
                if (vectorFieldName && this.schema) {
                    const vectorField = this.schema.fields[vectorFieldName];

                    if (
                        vectorField &&
                        vectorField.type === 'vector' &&
                        'distanceMetric' in vectorField
                    ) {
                        const distanceMetric = (vectorField as any).distanceMetric || 'COSINE';
                        normalizer = DISTANCE_NORMALIZERS[distanceMetric] || null;
                    }
                }
            }

            // Transform response to SearchResult format
            const documents: SearchDocument<T>[] = response.documents.map((doc) => {
                const value = doc.value as Record<string, unknown>;

                // Extract score from the document value
                // The score is returned with the alias specified in the query (e.g., 'vector_distance', 'similarity')
                // Try to detect the score field from the query string
                const scoreAliasMatch = queryString.match(/AS\s+(\w+)\]/);
                const scoreAlias = scoreAliasMatch ? scoreAliasMatch[1] : 'vector_distance';

                const scoreValue = value[scoreAlias];
                let score =
                    typeof scoreValue === 'string'
                        ? parseFloat(scoreValue)
                        : (scoreValue as number | undefined);

                // Apply normalization if needed
                if (score !== undefined && normalizer) {
                    score = normalizer(score);
                }

                return {
                    id: doc.id,
                    value: value as T,
                    score,
                };
            });

            return {
                total: response.total,
                documents,
            };
        } catch (error) {
            throw new RedisVLError(
                `Failed to execute search query: ${error instanceof Error ? error.message : String(error)}`,
                { cause: error instanceof Error ? error : undefined }
            );
        }
    }
}
