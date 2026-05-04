import type { RedisClientType, RedisClusterType } from 'redis';
import type { IndexSchema } from '../schema/schema.js';
import type { BaseField, VectorFieldAttrs } from '../schema/fields.js';
import { FieldType } from '../schema/types.js';
import { SchemaValidationError } from '../errors.js';
import { randomBytes } from 'crypto';
import { vectorElementByteLength } from '../redis/utils.js';

/**
 * Redis client type (standalone or cluster)
 */
export type RedisClient = RedisClientType | RedisClusterType;

/**
 * Generate a ULID-like unique identifier.
 * Format: timestamp (10 chars) + random (16 chars) = 26 chars total
 */
export function generateUlid(): string {
    const timestamp = Date.now().toString(36).toUpperCase().padStart(10, '0');
    const randomPart = randomBytes(10).toString('base64url').substring(0, 16).toUpperCase();
    return timestamp + randomPart;
}

/**
 * Options for writing data to Redis
 */
export interface WriteOptions {
    /**
     * Field name to use as the document ID
     */
    idField?: string;

    /**
     * Explicit keys to use for the documents
     */
    keys?: string[];

    /**
     * Time-to-live in seconds for the documents
     */
    ttl?: number;

    /**
     * Number of objects to write in a single Redis pipeline execution
     * @default 200
     */
    batchSize?: number;

    /**
     * Preprocessing function to transform documents before storage.
     */
    preprocess?: (doc: Record<string, unknown>) => Promise<Record<string, unknown>>;

    /**
     * Whether to validate documents against schema
     * @default false
     */
    validateOnLoad?: boolean;
}

/**
 * Base class for internal storage handling in Redis.
 * Provides foundational methods for key management, data preprocessing,
 * validation, and basic read/write operations.
 */
export abstract class BaseStorage {
    protected readonly schema: IndexSchema;
    protected readonly defaultBatchSize: number = 200;

    constructor(schema: IndexSchema) {
        this.schema = schema;
    }

    /**
     * Create a Redis key using prefix, separator, and ID.
     * Normalizes the prefix by removing trailing separators to avoid double separators.
     */
    protected createKey(id: string, prefix: string | string[], keySeparator: string): string {
        // Handle array prefix - use first element
        const prefixStr = Array.isArray(prefix) ? prefix[0] : prefix;

        if (!prefixStr) {
            return id;
        }

        // Normalize prefix by removing trailing separators
        const normalizedPrefix = keySeparator
            ? prefixStr.replace(new RegExp(`${keySeparator}+$`), '')
            : prefixStr;

        if (!normalizedPrefix) {
            return id;
        }

        return `${normalizedPrefix}${keySeparator}${id}`;
    }

    /**
     * Generate a key for a document.
     * If idField is provided, extract the ID from the document.
     * Otherwise, generate a ULID.
     */
    protected createKeyForDocument(
        doc: Record<string, unknown>,
        idField: string | undefined,
        prefix: string | string[],
        keySeparator: string
    ): string {
        let keyValue: string;

        if (idField) {
            if (!(idField in doc)) {
                throw new SchemaValidationError(`Key field "${idField}" not found in document`);
            }
            keyValue = String(doc[idField]);
        } else {
            keyValue = generateUlid();
        }

        return this.createKey(keyValue, prefix, keySeparator);
    }

    /**
     * Preprocess a document using the provided async function.
     */
    protected async preprocess(
        doc: Record<string, unknown>,
        preprocessFn?: (doc: Record<string, unknown>) => Promise<Record<string, unknown>>
    ): Promise<Record<string, unknown>> {
        return preprocessFn ? await preprocessFn(doc) : doc;
    }

    /**
     * Validate a document against the schema
     * @throws {SchemaValidationError} If validation fails
     */
    protected validate(doc: Record<string, unknown>): Record<string, unknown> {
        if (!this.schema || !this.schema.fields) {
            return doc;
        }

        const fields = Object.values(this.schema.fields);

        // Only validate the fields that are present in the document
        for (const [fieldName, value] of Object.entries(doc)) {
            // Find the field definition in the schema
            const field = fields.find((f: BaseField) => f.name === fieldName);

            if (field && value !== null && value !== undefined) {
                this.validateField(field, fieldName, value);
            }
        }

        return doc;
    }

    /**
     * Validate a single field value against its schema definition
     * @throws {SchemaValidationError} If validation fails
     */
    private validateField(field: BaseField, fieldName: string, value: unknown): void {
        const fieldType = field.type;

        switch (fieldType) {
            case FieldType.NUMERIC:
                if (typeof value !== 'number') {
                    throw new SchemaValidationError(
                        `Field '${fieldName}' should be numeric but got: ${typeof value}`
                    );
                }
                break;

            case FieldType.VECTOR:
                this.validateVectorField(field, fieldName, value);
                break;

            case FieldType.TEXT:
            case FieldType.TAG:
                if (typeof value !== 'string') {
                    throw new SchemaValidationError(
                        `Field '${fieldName}' should be string but got: ${typeof value}`
                    );
                }
                break;

            case FieldType.GEO:
                // TODO: Implement geo validation
                // Geo fields should be in format "longitude,latitude"
                break;
        }
    }

    /**
     * Validate a vector field value
     * @throws {SchemaValidationError} If validation fails
     */
    private validateVectorField(field: BaseField, fieldName: string, value: unknown): void {
        // Check if value is an array or Buffer
        if (!Array.isArray(value) && !Buffer.isBuffer(value)) {
            throw new SchemaValidationError(
                `Field '${fieldName}' expects a vector (array or Buffer), but got ${typeof value}. ` +
                    `For vector fields, provide a list of numbers or bytes.`
            );
        }

        // Get dimensions from field attributes
        const attrs = field.attrs as Partial<VectorFieldAttrs> & { dim?: number };
        const expectedDims = attrs?.dims || attrs?.dim;

        if (expectedDims) {
            const actualDims = Array.isArray(value)
                ? value.length
                : value.byteLength / vectorElementByteLength(attrs.datatype);

            if (actualDims !== expectedDims) {
                throw new SchemaValidationError(
                    `Vector field '${fieldName}' has incorrect dimensions. ` +
                        `Expected ${expectedDims} dimensions but got ${actualDims}.`
                );
            }
        }

        // Validate array elements are numbers
        if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                if (typeof value[i] !== 'number') {
                    throw new SchemaValidationError(
                        `Vector field '${fieldName}' contains non-numeric value at index ${i}: ${typeof value[i]}`
                    );
                }
            }
        }
    }

    /**
     * Preprocess and validate documents before writing to Redis:
     * 1. Generate Redis keys for each document (from provided keys or idField)
     * 2. Apply preprocessing transformations (if provided)
     * 3. Validate documents against schema (if validateOnLoad is true)
     *
     * @param data - Array of documents to preprocess and validate
     * @param options - Write options containing idField, keys, preprocess, and validateOnLoad
     * @returns Array of prepared documents with their Redis keys
     * @throws {SchemaValidationError} If validation fails for any document (includes document index)
     * @throws {Error} If key generation or preprocessing fails for any document
     */
    protected async preprocessAndValidateDocuments(
        data: Record<string, unknown>[],
        options: WriteOptions
    ): Promise<Array<{ key: string; doc: Record<string, unknown> }>> {
        const { idField, keys, preprocess, validateOnLoad = false } = options;
        const prefix = this.schema.index.prefix;
        const keySeparator = this.schema.index.keySeparator;

        const preparedDocs: Array<{ key: string; doc: Record<string, unknown> }> = [];

        for (let i = 0; i < data.length; i++) {
            try {
                // Generate key
                const key = keys
                    ? keys[i]
                    : this.createKeyForDocument(data[i], idField, prefix, keySeparator);

                // Preprocess
                let processedDoc = await this.preprocess(data[i], preprocess);

                // Validate if enabled
                if (validateOnLoad) {
                    processedDoc = this.validate(processedDoc);
                }

                preparedDocs.push({ key, doc: processedDoc });
            } catch (error) {
                if (error instanceof SchemaValidationError) {
                    // Re-throw validation errors with index context
                    throw new SchemaValidationError(error.message, i);
                }
                throw new SchemaValidationError(
                    `Error processing document at index ${i}: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }

        return preparedDocs;
    }

    /**
     * Write documents to Redis
     */
    abstract write(
        client: RedisClient,
        data: Record<string, unknown>[],
        options?: WriteOptions
    ): Promise<string[]>;

    /**
     * Read documents from Redis by keys
     */
    abstract get(
        client: RedisClient,
        keys: string[],
        batchSize?: number
    ): Promise<(Record<string, unknown> | null)[]>;
}
