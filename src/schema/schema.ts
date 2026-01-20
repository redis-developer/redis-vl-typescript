import { z } from 'zod';
import * as yaml from 'js-yaml';
import { promises as fs } from 'fs';
import { resolve } from 'path';
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

    /**
     * Create an IndexSchema from a dictionary.
     * Accepts both snake_case (from YAML/JSON files) and camelCase (from TypeScript) property names.
     *
     * @param data - The index schema data
     * @returns A new IndexSchema instance
     *
     * @example
     * ```typescript
     * // From YAML/JSON (snake_case)
     * const schema = IndexSchema.fromDict({
     *   index: {
     *     name: 'docs-index',
     *     prefix: 'docs',
     *     storage_type: 'hash',  // snake_case from YAML/JSON
     *   },
     *   fields: [
     *     { name: 'doc-id', type: 'tag' },
     *     { name: 'title', type: 'text' }
     *   ]
     * });
     * ```
     */
    static fromDict(data: {
        index: IndexInfoOptions | IndexInfo | Record<string, unknown>;
        fields?: FieldInput[] | Record<string, FieldInput>;
        version?: '0.1.0';
    }): IndexSchema {
        // 1. Create IndexInfo if it's a plain object
        let indexInfo: IndexInfo;
        if (data.index instanceof IndexInfo) {
            indexInfo = data.index;
        } else {
            // Convert snake_case to camelCase for IndexInfo properties
            const indexData: Record<string, unknown> = { ...data.index };

            // Handle storage_type -> storageType conversion
            if ('storage_type' in indexData && !('storageType' in indexData)) {
                indexData.storageType = indexData.storage_type;
                delete indexData.storage_type;
            }

            // Handle key_separator -> keySeparator conversion
            if ('key_separator' in indexData && !('keySeparator' in indexData)) {
                indexData.keySeparator = indexData.key_separator;
                delete indexData.key_separator;
            }

            indexInfo = new IndexInfo(indexData as IndexInfoOptions);
        }

        // 2. Create empty schema
        const schema = new IndexSchema({
            index: indexInfo,
            version: data.version,
        });

        // 3. Add fields if provided
        if (data.fields) {
            if (Array.isArray(data.fields)) {
                // Handle array format
                schema.addFields(data.fields);
            } else {
                // Handle object format
                for (const [key, fieldData] of Object.entries(data.fields)) {
                    // Validate field name matches key
                    if (fieldData.name !== key) {
                        throw new Error(
                            `Field name mismatch: key is "${key}" but field.name is "${fieldData.name}"`,
                        );
                    }
                    schema.addField(fieldData);
                }
            }
        }

        return schema;
    }

    /**
     * Create an IndexSchema from a YAML file.
     *
     * @param filePath - The path to the YAML file
     * @returns A new IndexSchema instance
     *
     * @throws Error if the file path is invalid
     * @throws Error if the file does not exist
     *
     * @example
     * ```typescript
     * const schema = await IndexSchema.fromYAML('schema.yaml');
     * console.log(schema.index.name);
     * ```
     */
    static async fromYAML(filePath: string): Promise<IndexSchema> {
        const resolvedPath = resolve(filePath);

        // Check if file exists
        try {
            await fs.access(resolvedPath);
        } catch {
            throw new Error(`Schema file ${filePath} does not exist`);
        }

        // Read and parse YAML file
        const yamlContent = await fs.readFile(resolvedPath, 'utf-8');
        const data = yaml.load(yamlContent) as {
            index: IndexInfoOptions | IndexInfo;
            fields?: FieldInput[] | Record<string, FieldInput>;
            version?: '0.1.0';
        };

        // Use fromDict to create the schema
        return IndexSchema.fromDict(data);
    }

    /**
     * Serialize the index schema to a dictionary.
     * Converts camelCase properties to snake_case for YAML/JSON compatibility.
     *
     * @returns The index schema as a plain object with snake_case keys
     *
     * @example
     * ```typescript
     * const schema = new IndexSchema({ index: indexInfo });
     * const dict = schema.toDict();
     * console.log(dict.index.name);
     * console.log(dict.index.storage_type);  // snake_case in output
     * ```
     */
    toDict(): {
        index: {
            name: string;
            prefix: string | string[];
            key_separator: string;
            storage_type: string;
            stopwords?: string[];
        };
        fields: Array<{
            name: string;
            type: string;
            attrs?: Record<string, unknown>;
            path?: string | null;
        }>;
        version: '0.1.0';
    } {
        // Serialize index info - convert camelCase to snake_case
        const indexDict = {
            name: this.index.name,
            prefix: this.index.prefix,
            key_separator: this.index.keySeparator,  // camelCase -> snake_case
            storage_type: this.index.storageType,  // camelCase -> snake_case (enum value is already string)
            ...(this.index.stopwords !== undefined && { stopwords: this.index.stopwords }),
        };

        // Serialize fields as array
        const fieldsArray = Object.values(this.fields).map((field) => {
            const fieldDict: {
                name: string;
                type: string;
                attrs?: Record<string, unknown>;
                path?: string | null;
            } = {
                name: field.name,
                type: field.type,
            };

            if (Object.keys(field.attrs).length > 0) {
                fieldDict.attrs = field.attrs as Record<string, unknown>;
            }

            if (field.path !== undefined) {
                fieldDict.path = field.path;
            }

            return fieldDict;
        });

        return {
            index: indexDict,
            fields: fieldsArray,
            version: this.version,
        };
    }

    /**
     * Write the index schema to a YAML file.
     *
     * @param filePath - The path to the YAML file
     * @param overwrite - Whether to overwrite the file if it already exists (default: true)
     *
     * @throws Error if the file already exists and overwrite is false
     *
     * @example
     * ```typescript
     * const schema = new IndexSchema({ index: indexInfo });
     * await schema.toYAML('schema.yaml');
     * ```
     */
    async toYAML(filePath: string, overwrite: boolean = true): Promise<void> {
        const resolvedPath = resolve(filePath);

        // Check if file exists
        if (!overwrite) {
            try {
                await fs.access(resolvedPath);
                throw new Error(`Schema file ${filePath} already exists.`);
            } catch (error: unknown) {
                // File doesn't exist, which is what we want
                if (error instanceof Error && error.message.includes('already exists')) {
                    throw error;
                }
                // Otherwise, file doesn't exist, continue
            }
        }

        // Convert to dict and write as YAML
        const dictData = this.toDict();
        const yamlData = yaml.dump(dictData, { sortKeys: false });
        await fs.writeFile(resolvedPath, yamlData, 'utf-8');
    }
}

