import type { RedisClient, WriteOptions } from './base-storage.js';
import { BaseStorage } from './base-storage.js';
import type { IndexSchema } from '../schema/schema.js';
import { FieldType } from '../schema/types.js';
import { SchemaValidationError } from '../errors.js';

/**
 * Read the value at a dotted JSON path such as `$.embedding` or `$.meta.vec`.
 * Returns `undefined` if any step along the path is missing. Array indexes and
 * wildcards are not supported.
 */
function readJsonPath(doc: Record<string, unknown>, path: string): unknown {
    let current: unknown = doc;

    for (const segment of path.replace(/^\$\.?/, '').split('.')) {
        if (current === null || typeof current !== 'object') {
            return undefined;
        }
        current = (current as Record<string, unknown>)[segment];
    }

    return current;
}

/**
 * Storage implementation for Redis JSON data type.
 * Implements JSON-specific logic for validation and read/write operations.
 */
export class JsonStorage extends BaseStorage {
    constructor(schema: IndexSchema) {
        super(schema);
    }

    /**
     * Write documents to Redis as JSON entries using pipelining for performance.
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
        this.validateNoBufferVectors(preparedDocs);

        // Pass 2: Write all valid documents in batches using pipeline
        const loadedKeys: string[] = [];
        let pipeline = client.multi();
        let commandCount = 0;

        for (let i = 0; i < preparedDocs.length; i++) {
            const { key, doc } = preparedDocs[i];

            // Add JSON.SET command to pipeline
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pipeline.json.set(key, '$', doc as any);
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
     * JSON storage only: reject documents that hold a Buffer in a vector field,
     * since JSON storage only accepts number arrays.
     */
    private validateNoBufferVectors(preparedDocs: Array<{ doc: Record<string, unknown> }>): void {
        const vectorFields = Object.values(this.schema.fields).flatMap((field) =>
            field.type === FieldType.VECTOR && field.path
                ? [{ name: field.name, path: field.path }]
                : []
        );

        for (let i = 0; i < preparedDocs.length; i++) {
            for (const { name, path } of vectorFields) {
                if (Buffer.isBuffer(readJsonPath(preparedDocs[i].doc, path))) {
                    throw new SchemaValidationError(
                        `Vector field '${name}' holds a Buffer, which JSON storage cannot store. ` +
                            `Pass a number array instead, or use HASH storage for pre-encoded vectors.`,
                        i
                    );
                }
            }
        }
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

            // Add JSON.GET commands to pipeline
            for (const key of batch) {
                pipeline.json.get(key);
            }

            // Execute pipeline and get results
            const batchResults = (await pipeline.execAsPipeline()) as unknown as Array<Record<
                string,
                unknown
            > | null>;

            // Process batch results
            for (const data of batchResults) {
                if (data && typeof data === 'object') {
                    results.push(data as Record<string, unknown>);
                } else {
                    results.push(null);
                }
            }
        }

        return results;
    }
}
