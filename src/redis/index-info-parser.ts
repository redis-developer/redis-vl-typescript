/**
 * Parser for Redis FT.INFO output to reconstruct IndexSchema
 */

import { IndexSchema, IndexInfo, StorageType } from '../schema/index.js';
import {
    BaseField,
    type BaseFieldAttrs,
    TextField,
    type TextFieldAttrs,
    TagField,
    type TagFieldAttrs,
    NumericField,
    type NumericFieldAttrs,
    GeoField,
    type GeoFieldAttrs,
    VectorField,
    type VectorFieldAttrs,
} from '../schema/fields.js';
import { VectorDistanceMetric, VectorDataType } from '../schema/types.js';
import { RedisVLError } from '../errors.js';
import type { RedisClientType } from 'redis';

// ================================
// Types
// ================================

// Extract the actual return type from client.ft.info()
export type RawInfoReply = Awaited<ReturnType<RedisClientType['ft']['info']>>;

/**
 * Input type for the index info parser.
 *
 * This is derived from the native Redis client `ft.info()` return type.
 * We intentionally widen `index_definition` and `attributes` value types to
 * reflect the runtime plain-object shape used by node-redis.
 */
export type RedisIndexInfoReply = Pick<RawInfoReply, 'index_name' | 'stopwords_list'> & {
    index_definition: Record<string, unknown>;
    attributes: Array<Record<string, unknown>>;
};

// ================================
// Public API
// ================================

/**
 * Build RedisVL IndexSchema from Redis FT.INFO output
 *
 * @param info - The raw output from FT.INFO command
 * @returns IndexSchema instance reconstructed from Redis index metadata
 */
export function buildRedisVLSchemaFromRedisIndexInfo(info: RedisIndexInfoReply): IndexSchema {
    const indexName = String(info.index_name);
    const indexDef = asRecord(info.index_definition);

    const storageType = parseStorageType(indexDef);
    const isJson = storageType === StorageType.JSON;
    const prefix = parsePrefix(indexName, indexDef);

    // Parse fields
    const fields: Record<string, BaseField> = {};

    for (const rawAttr of info.attributes) {
        const attr = asRecord(rawAttr);
        const fieldName = String(attr['identifier']);
        const fieldType = String(attr['type']);

        fields[fieldName] = parseField(fieldName, fieldType, attr, isJson);
    }

    // Create IndexInfo instance
    const indexInfo = new IndexInfo({
        name: indexName,
        prefix,
        storageType,
        // Redis FT.INFO does not expose the key separator used by the application.
        // Default to ':' (library default).
        keySeparator: ':',
    });

    return new IndexSchema({ index: indexInfo, fields });
}

// ================================
// Index-level parsing
// ================================

function parseStorageType(indexDef: Record<string, unknown>): StorageType {
    const keyType = String(indexDef['key_type']).toLowerCase();
    return keyType === 'json' ? StorageType.JSON : StorageType.HASH;
}

function parsePrefix(indexName: string, indexDef: Record<string, unknown>): string {
    const prefixesValue = indexDef['prefixes'];
    if (typeof prefixesValue === 'string') {
        return prefixesValue;
    }

    if (
        Array.isArray(prefixesValue) &&
        prefixesValue.length > 0 &&
        prefixesValue.every((p) => typeof p === 'string')
    ) {
        return prefixesValue[0];
    }

    throw new RedisVLError(
        `RedisIndexParseError: Invalid index definition for '${indexName}': missing or invalid 'prefixes' value.`
    );
}

// ================================
// Field dispatch
// ================================

type FieldParserFn = (
    fieldName: string,
    attr: Record<string, unknown>,
    isJson: boolean
) => BaseField;

function parseField(
    fieldName: string,
    fieldType: string,
    attr: Record<string, unknown>,
    isJson: boolean
): BaseField {
    const parser = FIELD_PARSERS[fieldType];
    if (!parser) {
        throw new RedisVLError(
            `RedisIndexParseError: Unsupported field type '${fieldType}' for field '${fieldName}' while rebuilding schema from index info.`
        );
    }
    return parser(fieldName, attr, isJson);
}

// ================================
// Common decoding helpers
// ================================

function asRecord(value: unknown): Record<string, unknown> {
    if (value === null || value === undefined || typeof value !== 'object') {
        throw new RedisVLError(
            'RedisIndexParseError: Invalid FT.INFO reply structure: expected an object.'
        );
    }
    return value as Record<string, unknown>;
}

function readString(attr: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const key of keys) {
        const value = attr[key];
        if (typeof value === 'string') {
            return value;
        }
    }
    return undefined;
}

function readNumber(attr: Record<string, unknown>, ...keys: string[]): number | undefined {
    for (const key of keys) {
        const value = attr[key];
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'string' && value.trim() !== '') {
            const parsed = Number(value);
            if (!Number.isNaN(parsed)) {
                return parsed;
            }
        }
    }
    return undefined;
}

function readFlag(attr: Record<string, unknown>, ...keys: string[]): boolean {
    for (const key of keys) {
        if (!(key in attr)) {
            continue;
        }

        const value = attr[key];
        if (value === true) {
            return true;
        }
        if (typeof value === 'string') {
            // Some replies use empty string to indicate a present flag
            return value === '' || value.toLowerCase() === 'true' || value === '1';
        }
        if (typeof value === 'number') {
            return value === 1;
        }

        // If the key exists and the value isn't a recognized boolean, treat presence as true
        return true;
    }
    return false;
}

function normalizeJsonPath(path: string): string {
    if (path.startsWith('$.')) {
        return path;
    }
    if (path.startsWith('$')) {
        return `$.${path.slice(1)}`;
    }
    return `$.${path}`;
}

function parseBaseFieldAttrs(
    attr: Record<string, unknown>,
    isJson: boolean,
    asName: string
): BaseFieldAttrs {
    const attrs: BaseFieldAttrs = {
        sortable: readFlag(attr, 'SORTABLE', 'sortable'),
        indexMissing: readFlag(attr, 'INDEXMISSING', 'index_missing', 'indexMissing'),
        indexEmpty: readFlag(attr, 'INDEXEMPTY', 'index_empty', 'indexEmpty'),
    };

    // Only include `as` for JSON storage.
    if (isJson) {
        attrs.as = asName;
    }

    return attrs;
}

function applyJsonPath(field: BaseField, attr: Record<string, unknown>, isJson: boolean): void {
    if (!isJson) {
        return;
    }

    const rawPath = readString(attr, 'attribute', 'ATTRIBUTE');
    if (!rawPath) {
        return;
    }

    field.path = normalizeJsonPath(rawPath);
}

class TextFieldParser {
    static parse(fieldName: string, attr: Record<string, unknown>, isJson: boolean): TextField {
        const baseAttrs = parseBaseFieldAttrs(attr, isJson, fieldName);

        const textAttrs: TextFieldAttrs = {
            ...baseAttrs,
            weight: readNumber(attr, 'WEIGHT', 'weight'),
            noStem: readFlag(attr, 'NOSTEM', 'no_stem', 'noStem'),
            phonetic: readString(attr, 'PHONETIC', 'phonetic') as TextFieldAttrs['phonetic'],
            withSuffixTrie: readFlag(attr, 'WITHSUFFIXTRIE', 'with_suffix_trie', 'withSuffixTrie'),
        };

        const field = new TextField(fieldName, textAttrs);
        applyJsonPath(field, attr, isJson);
        return field;
    }
}

class TagFieldParser {
    static parse(fieldName: string, attr: Record<string, unknown>, isJson: boolean): TagField {
        const baseAttrs = parseBaseFieldAttrs(attr, isJson, fieldName);

        const tagAttrs: TagFieldAttrs = {
            ...baseAttrs,
            separator: readString(attr, 'SEPARATOR', 'separator'),
            caseSensitive: readFlag(attr, 'CASESENSITIVE', 'case_sensitive', 'caseSensitive'),
        };

        const field = new TagField(fieldName, tagAttrs);
        applyJsonPath(field, attr, isJson);
        return field;
    }
}

class NumericFieldParser {
    static parse(fieldName: string, attr: Record<string, unknown>, isJson: boolean): NumericField {
        const baseAttrs: NumericFieldAttrs = parseBaseFieldAttrs(attr, isJson, fieldName);
        const field = new NumericField(fieldName, baseAttrs);
        applyJsonPath(field, attr, isJson);
        return field;
    }
}

class GeoFieldParser {
    static parse(fieldName: string, attr: Record<string, unknown>, isJson: boolean): GeoField {
        const baseAttrs: GeoFieldAttrs = parseBaseFieldAttrs(attr, isJson, fieldName);
        const field = new GeoField(fieldName, baseAttrs);
        applyJsonPath(field, attr, isJson);
        return field;
    }
}

class VectorFieldParser {
    static parse(fieldName: string, attr: Record<string, unknown>, isJson: boolean): VectorField {
        const dims = readNumber(attr, 'dim', 'DIM', 'dims', 'DIMS');
        const algorithmRaw = readString(attr, 'algorithm', 'ALGORITHM');
        const distanceMetricRaw = readString(attr, 'distance_metric', 'DISTANCE_METRIC');
        const dataTypeRaw = readString(attr, 'data_type', 'DATA_TYPE', 'TYPE');

        if (dims === undefined || !Number.isFinite(dims) || dims <= 0 || !Number.isInteger(dims)) {
            throw new RedisVLError(
                `RedisIndexParseError: Vector field '${fieldName}' is missing or has invalid dimension (DIM).`
            );
        }

        if (!algorithmRaw) {
            throw new RedisVLError(
                `RedisIndexParseError: Vector field '${fieldName}' is missing required 'algorithm' attribute`
            );
        }

        if (!distanceMetricRaw) {
            throw new RedisVLError(
                `RedisIndexParseError: Vector field '${fieldName}' is missing required 'distance_metric' attribute`
            );
        }

        if (!dataTypeRaw) {
            throw new RedisVLError(
                `RedisIndexParseError: Vector field '${fieldName}' is missing required 'data_type' attribute`
            );
        }

        const algorithm = VectorFieldParser.parseVectorAlgorithm(fieldName, algorithmRaw);
        const distanceMetric = VectorFieldParser.parseVectorDistanceMetric(
            fieldName,
            distanceMetricRaw
        );
        const datatype = VectorFieldParser.parseVectorDataType(fieldName, dataTypeRaw);

        const baseAttrs = parseBaseFieldAttrs(attr, isJson, fieldName);
        const options: VectorFieldAttrs = {
            ...baseAttrs,
            algorithm,
            dims,
            distanceMetric,
            datatype,
        };

        // Parse algorithm-specific parameters
        if (algorithm === 'hnsw') {
            const m = readNumber(attr, 'm', 'M');
            const efConstruction = readNumber(
                attr,
                'ef_construction',
                'EF_CONSTRUCTION',
                'efConstruction'
            );
            const efRuntime = readNumber(attr, 'ef_runtime', 'EF_RUNTIME', 'efRuntime');
            const epsilon = readNumber(attr, 'epsilon', 'EPSILON');

            if (m !== undefined) {
                options.m = Math.trunc(m);
            }
            if (efConstruction !== undefined) {
                options.efConstruction = Math.trunc(efConstruction);
            }
            if (efRuntime !== undefined) {
                options.efRuntime = Math.trunc(efRuntime);
            }
            if (epsilon !== undefined) {
                options.epsilon = epsilon;
            }
        }

        if (algorithm === 'flat') {
            const blockSize = readNumber(attr, 'block_size', 'BLOCK_SIZE', 'blockSize');
            const initialCap = readNumber(attr, 'initial_cap', 'INITIAL_CAP', 'initialCap');

            if (blockSize !== undefined) {
                options.blockSize = Math.trunc(blockSize);
            }
            if (initialCap !== undefined) {
                options.initialCap = Math.trunc(initialCap);
            }
        }

        const field = new VectorField(fieldName, options);
        applyJsonPath(field, attr, isJson);
        return field;
    }

    private static parseVectorAlgorithm(
        fieldName: string,
        algorithmRaw: string
    ): VectorFieldAttrs['algorithm'] {
        const algorithmKey = algorithmRaw.toUpperCase();
        if (algorithmKey === 'FLAT') {
            return 'flat';
        }
        if (algorithmKey === 'HNSW') {
            return 'hnsw';
        }
        throw new RedisVLError(
            `RedisIndexParseError: Vector field '${fieldName}' uses unsupported algorithm '${algorithmRaw}'.`
        );
    }

    private static parseVectorDistanceMetric(
        fieldName: string,
        metricRaw: string
    ): VectorDistanceMetric {
        const metricKey = metricRaw.toUpperCase();
        if (!(Object.values(VectorDistanceMetric) as string[]).includes(metricKey)) {
            throw new RedisVLError(
                `RedisIndexParseError: Vector field '${fieldName}' has unsupported distance metric '${metricRaw}'.`
            );
        }
        return metricKey as VectorDistanceMetric;
    }

    private static parseVectorDataType(fieldName: string, typeRaw: string): VectorDataType {
        const typeKey = typeRaw.toUpperCase();
        if (!(Object.values(VectorDataType) as string[]).includes(typeKey)) {
            throw new RedisVLError(
                `RedisIndexParseError: Vector field '${fieldName}' has unsupported data type '${typeRaw}'.`
            );
        }
        return typeKey as VectorDataType;
    }
}

const FIELD_PARSERS: Record<string, FieldParserFn> = {
    TEXT: TextFieldParser.parse,
    TAG: TagFieldParser.parse,
    NUMERIC: NumericFieldParser.parse,
    GEO: GeoFieldParser.parse,
    VECTOR: VectorFieldParser.parse,
};
