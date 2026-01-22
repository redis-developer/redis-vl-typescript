import type { RedisClientType, RedisClusterType } from 'redis';
import { IndexSchema } from '../schema/schema.js';

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
     * Create a new SearchIndex instance.
     *
     * @param schema - The index schema
     * @param client - Redis client instance (created by user)
     * @throws {Error} If schema is not a valid IndexSchema instance
     * @throws {Error} If client is not provided
     */
    constructor(schema: IndexSchema, client: RedisClientType | RedisClusterType) {
        if (!(schema instanceof IndexSchema)) {
            throw new Error('Must provide a valid IndexSchema object');
        }

        if (!client) {
            throw new Error('Must provide a valid Redis client');
        }

        this.schema = schema;
        this.client = client;
    }

    /**
     * Get the index name from the schema.
     */
    get name(): string {
        return this.schema.index.name;
    }

    /**
     * Create the index in Redis.
     *
     * @param options - Creation options
     * @throws {Error} If no fields are defined for the index
     */
    async create(options: CreateIndexOptions = {}): Promise<void> {
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
        // TODO: Convert schema fields to Redis field definitions
        // For now, this is a placeholder
        await this.client.ft.create(
            this.name,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {} as any, // Field schema - will be implemented in next step
            {
                ON: this.schema.index.storageType.toUpperCase() as 'HASH' | 'JSON',
                PREFIX: this.schema.index.prefix,
            },
        );
    }

    /**
     * Check if the index exists in Redis.
     *
     * @returns True if the index exists, false otherwise
     */
    async exists(): Promise<boolean> {
        // Use FT._LIST to get all indices
        const indices = (await this.client.ft._list()) as string[];
        return indices.includes(this.name);
    }

    /**
     * Delete the index from Redis.
     *
     * @param options - Deletion options
     */
    async delete(options: DeleteIndexOptions = {}): Promise<void> {
        const { drop = false } = options;

        if (drop) {
            // Drop index and associated data
            await this.client.ft.dropIndex(this.name, { DD: true });
        } else {
            // Drop index only, keep data
            await this.client.ft.dropIndex(this.name);
        }
    }

    /**
     * Get information about the index.
     *
     * @returns Index information from Redis
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async info(): Promise<Record<string, any>> {
        return await this.client.ft.info(this.name);
    }
}

