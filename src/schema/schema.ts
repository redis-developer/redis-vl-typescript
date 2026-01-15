import { z } from 'zod';
import { StorageType } from './types.js';
import { BaseField } from './fields.js';

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
}

