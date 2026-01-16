import { z } from 'zod';
import { StorageType } from './types.js';
import { BaseField, FieldFactory } from './fields.js';

/**
 * Zod schema for IndexInfo validation.
 * Validates index configuration including name, prefix, key separator, storage type, and stopwords.
 */
export const IndexInfoSchema = z.object({
    /** The unique name of the index (required, non-empty) */
    name: z.string().min(1, 'IndexInfo name cannot be empty'),
    /** The prefix(es) used for Redis keys associated with this index */
    prefix: z.union([z.string(), z.array(z.string())]).default('rvl'),
    /** The separator character used in designing Redis keys */
    keySeparator: z.string().default(':'),
    /** The storage type used in Redis (StorageType.HASH or StorageType.JSON) */
    storageType: z.enum(StorageType).default(StorageType.HASH),
    /** Index-level stopwords configuration */
    stopwords: z.array(z.string()).optional(),
});

/**
 * TypeScript type inferred from IndexInfoSchema.
 */
export type IndexInfoOptions = z.input<typeof IndexInfoSchema>;

/**
 * IndexInfo includes the essential details regarding index settings,
 * such as its name, prefix, key separator, storage type, and stopwords in Redis.
 */
export class IndexInfo {
    /** The unique name of the index */
    readonly name: string;
    /** The prefix(es) used for Redis keys associated with this index */
    readonly prefix: string | string[];
    /** The separator character used in designing Redis keys */
    readonly keySeparator: string;
    /** The storage type used in Redis (e.g., StorageType.HASH or StorageType.JSON) */
    readonly storageType: StorageType;
    /** Index-level stopwords configuration */
    readonly stopwords?: string[];

    constructor(options: IndexInfoOptions) {
        // Validate and parse options using Zod
        const validated = IndexInfoSchema.parse(options);

        this.name = validated.name;
        this.prefix = validated.prefix;
        this.keySeparator = validated.keySeparator;
        this.storageType = validated.storageType;
        this.stopwords = validated.stopwords;
    }
}

/**
 * Zod schema for IndexSchema validation.
 */
export const IndexSchemaOptionsSchema = z.object({
    /** Details of the basic index configurations */
    index: z.instanceof(IndexInfo),
    /** Fields associated with the search index and their properties */
    fields: z.record(z.string(), z.instanceof(BaseField)).optional(),
    /** Version of the underlying index schema */
    version: z.literal('0.1.0').optional(),
});

/**
 * TypeScript type inferred from IndexSchemaOptionsSchema.
 */
export type IndexSchemaOptions = z.input<typeof IndexSchemaOptionsSchema>;

/**
 * Field input type for addField and addFields methods
 */
export interface FieldInput {
    name: string;
    type: string;
    attrs?: Record<string, unknown>;
    path?: string;
}

/**
 * A schema definition for a search index in Redis, used in RedisVL for
 * configuring index settings and organizing vector and metadata fields.
 */
export class IndexSchema {
    /** Details of the basic index configurations */
    readonly index: IndexInfo;
    /** Fields associated with the search index and their properties */
    fields: Record<string, BaseField>;
    /** Version of the underlying index schema */
    readonly version: '0.1.0';

    constructor(options: IndexSchemaOptions) {
        // Validate options using Zod
        const validated = IndexSchemaOptionsSchema.parse(options);

        this.index = validated.index;
        this.fields = validated.fields ?? {};
        this.version = validated.version ?? '0.1.0';
    }

    /**
     * A list of field names associated with the index schema.
     *
     * @returns A list of field names from the schema
     */
    get fieldNames(): string[] {
        return Object.keys(this.fields);
    }

    /**
     * Internal helper to create a field and set its path based on storage type.
     * For JSON storage: auto-sets path to $.fieldname if not provided.
     * For HASH storage: sets path to null (paths not used).
     */
    private makeField(storageType: StorageType, fieldInputs: FieldInput): BaseField {
        // Extract field properties from inputs
        const { name, type, attrs, path } = fieldInputs;

        if (!name) {
            throw new Error('Field name is required');
        }
        if (!type) {
            throw new Error('Field type is required');
        }

        // Create field from inputs using FieldFactory
        const field = FieldFactory.createField(type, name, attrs);

        // Handle field path based on storage type
        if (storageType === StorageType.JSON) {
            // For JSON storage, auto-set path to $.fieldname if not provided
            field.path = path ?? `$.${field.name}`;
        } else {
            // For HASH storage, path should always be null
            if (path !== null && path !== undefined) {
                // TODO: log a warning
            }
            field.path = null;
        }

        return field;
    }

    /**
     * Adds a single field to the index schema.
     *
     * @param fieldInputs - Field definition object with name, type, and optional attributes
     * @throws {Error} If a field with the same name already exists
     *
     * @example
     * ```typescript
     * schema.addField({ name: 'title', type: 'text' });
     * schema.addField({
     *   name: 'embedding',
     *   type: 'vector',
     *   attrs: { dims: 1536, algorithm: 'hnsw' }
     * });
     * ```
     */
    addField(fieldInputs: FieldInput): void {
        // Create field with proper path handling
        const field = this.makeField(this.index.storageType, fieldInputs);

        // Check for duplicates
        if (Object.hasOwn(this.fields, field.name)) {
            throw new Error(
                `Duplicate field name: ${field.name}. Field names must be unique across all fields for this index.`,
            );
        }

        // Add field to schema
        this.fields[field.name] = field;
    }

    /**
     * Adds multiple fields to the index schema.
     *
     * @param fields - Array of field definition objects
     * @throws {Error} If any field has a duplicate name
     *
     * @example
     * ```typescript
     * schema.addFields([
     *   { name: 'title', type: 'text' },
     *   { name: 'category', type: 'tag' },
     *   { name: 'price', type: 'numeric' }
     * ]);
     * ```
     */
    addFields(fields: FieldInput[]): void {
        for (const fieldInput of fields) {
            this.addField(fieldInput);
        }
    }

    /**
     * Removes a field from the schema by name.
     *
     * @param fieldName - The name of the field to remove
     *
     * @example
     * ```typescript
     * schema.removeField('old_field');
     * ```
     */
    removeField(fieldName: string): void {
        if (!Object.hasOwn(this.fields, fieldName)) {
            // TODO: log a warning
            return;
        }
        delete this.fields[fieldName];
    }
}

