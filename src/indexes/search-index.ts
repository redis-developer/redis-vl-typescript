import type { RedisClientType, RedisClusterType } from 'redis';
import type { RediSearchSchema } from '@redis/search';
import { IndexSchema } from '../schema/schema.js';
import { BaseStorage, HashStorage, JsonStorage } from '../storage/index.js';
import { RedisVLError, SchemaValidationError } from '../errors.js';

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
     * The function receives a document and should return the transformed document.
     */
    preprocess?: (doc: Record<string, unknown>) => Record<string, unknown>;

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
            throw new Error('Must provide a valid IndexSchema object');
        }

        if (!client) {
            throw new Error('Must provide a valid Redis client');
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
            // Determine the field path
            const fieldPath = field.path || field.name;
            const key = isJson ? `$.${fieldPath}` : fieldPath;

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
            throw new Error('No fields defined for index');
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
                `Failed to load data: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}
