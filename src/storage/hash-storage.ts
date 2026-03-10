import type { RedisClient, WriteOptions } from './base-storage.js';
import { BaseStorage } from './base-storage.js';
import type { IndexSchema } from '../schema/schema.js';
import { SchemaValidationError } from '../errors.js';

/**
 * Storage implementation for Redis HASH data type.
 * Implements hash-specific logic for validation and read/write operations.
 */
export class HashStorage extends BaseStorage {
    constructor(schema: IndexSchema) {
        super(schema);
    }

    /**
     * Write documents to Redis as HASH entries using pipelining for performance.
     */
    async write(
        client: RedisClient,
        data: Record<string, unknown>[],
        options: WriteOptions = {}
    ): Promise<string[]> {
        const { keys, ttl, batchSize = this.defaultBatchSize } = options;

        // Validate inputs
        if (data.length === 0) {
            return [];
        }

        if (keys && keys.length !== data.length) {
            throw new SchemaValidationError('Length of keys does not match the length of data');
        }

        // Pass 1: Preprocess and validate all documents
        const preparedDocs = await this.preprocessAndValidateDocuments(data, options);

        // Pass 2: Write all valid documents in batches using pipeline
        const loadedKeys: string[] = [];
        let pipeline = client.multi();
        let commandCount = 0;

        for (let i = 0; i < preparedDocs.length; i++) {
            const { key, doc } = preparedDocs[i];

            // Add HSET command to pipeline
            pipeline.hSet(key, doc as Record<string, string | number | Buffer>);
            commandCount++;

            // Add EXPIRE command if TTL is provided
            if (ttl) {
                pipeline.expire(key, ttl);
                commandCount++;
            }

            loadedKeys.push(key);

            // Execute pipeline in batches
            if (commandCount >= batchSize || i === preparedDocs.length - 1) {
                await pipeline.execAsPipeline();
                pipeline = client.multi();
                commandCount = 0;
            }
        }

        return loadedKeys;
    }

    /**
     * Read documents from Redis by keys using pipelining.
     */
    async get(
        client: RedisClient,
        keys: string[],
        batchSize = this.defaultBatchSize
    ): Promise<(Record<string, unknown> | null)[]> {
        if (!keys || keys.length === 0) {
            return [];
        }

        const results: (Record<string, unknown> | null)[] = [];

        // Process in batches
        for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            const pipeline = client.multi();

            // Add HGETALL commands to pipeline
            for (const key of batch) {
                pipeline.hGetAll(key);
            }

            // Execute pipeline and get results
            const batchResults = (await pipeline.execAsPipeline()) as unknown as Array<
                Record<string, string>
            >;

            // Process batch results
            for (const data of batchResults) {
                if (data && Object.keys(data).length > 0) {
                    results.push(data as Record<string, unknown>);
                } else {
                    results.push(null);
                }
            }
        }

        return results;
    }
}
