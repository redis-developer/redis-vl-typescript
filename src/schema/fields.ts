import { FieldType, VectorDistanceMetric, VectorDataType } from './types.js';
import type {
    SchemaTextField,
    SchemaTextFieldPhonetic,
    SchemaNumericField,
    SchemaGeoField,
    SchemaTagField,
    SchemaFlatVectorField,
    SchemaHNSWVectorField,
    SchemaVectorFieldType,
    SchemaVectorFieldDistanceMetric,
    RedisSchemaFieldType,
} from '../redis/schema-types.js';

/**
 * Base interface for all field attributes
 */
export interface BaseFieldAttrs {
    sortable?: boolean;
    indexMissing?: boolean;
    indexEmpty?: boolean;
}

/**
 * Base class for all field types
 */
export abstract class BaseField {
    public readonly name: string;
    public readonly type: string;
    public readonly attrs: BaseFieldAttrs;
    public path?: string | null;

    constructor(name: string, type: string, attrs: BaseFieldAttrs = {}) {
        this.name = name;
        this.type = type;
        this.attrs = attrs;
        this.path = undefined;
    }

    /**
     * Convert this field to Redis schema field format.
     * Each subclass must implement this method to return the appropriate Redis field type.
     * @param isJson - Whether the index uses JSON storage (affects field naming with $.prefix)
     */
    abstract toRedisField(isJson: boolean): RedisSchemaFieldType;
}

/**
 * TextField attributes
 */
export interface TextFieldAttrs extends BaseFieldAttrs {
    weight?: number;
    noStem?: boolean;
    phonetic?: SchemaTextFieldPhonetic;
    withSuffixTrie?: boolean;
}

/**
 * TextField for full-text search
 */
export class TextField extends BaseField {
    constructor(
        name: string,
        public readonly attrs: TextFieldAttrs = {}
    ) {
        super(name, 'text', attrs);
    }

    toRedisField(isJson: boolean): SchemaTextField {
        const field: SchemaTextField = {
            type: 'TEXT',
        };

        // Add AS field for JSON storage
        if (isJson) {
            field.AS = this.name;
        }

        // Add text-specific attributes
        if (this.attrs.weight !== undefined) {
            field.WEIGHT = this.attrs.weight;
        }
        if (this.attrs.noStem) {
            field.NOSTEM = true;
        }
        if (this.attrs.phonetic) {
            field.PHONETIC = this.attrs.phonetic; // Phonetic matcher string
        }
        if (this.attrs.withSuffixTrie) {
            field.WITHSUFFIXTRIE = true;
        }

        // Add common attributes
        if (this.attrs.sortable) {
            field.SORTABLE = true;
        }
        if (this.attrs.indexMissing) {
            field.INDEXMISSING = true;
        }
        if (this.attrs.indexEmpty) {
            field.INDEXEMPTY = true;
        }

        return field;
    }
}

/**
 * TagField attributes
 */
export interface TagFieldAttrs extends BaseFieldAttrs {
    separator?: string;
    caseSensitive?: boolean;
}

/**
 * TagField for exact matching
 */
export class TagField extends BaseField {
    constructor(
        name: string,
        public readonly attrs: TagFieldAttrs = {}
    ) {
        super(name, 'tag', attrs);
        // Set default separator if not provided
        if (!this.attrs.separator) {
            this.attrs.separator = ',';
        }
    }

    toRedisField(isJson: boolean): SchemaTagField {
        const field: SchemaTagField = {
            type: 'TAG',
        };

        // Add AS field for JSON storage
        if (isJson) {
            field.AS = this.name;
        }

        // Add tag-specific attributes
        if (this.attrs.separator) {
            field.SEPARATOR = this.attrs.separator;
        }
        if (this.attrs.caseSensitive) {
            field.CASESENSITIVE = true;
        }

        // Add common attributes
        if (this.attrs.sortable) {
            field.SORTABLE = true;
        }
        if (this.attrs.indexMissing) {
            field.INDEXMISSING = true;
        }
        if (this.attrs.indexEmpty) {
            field.INDEXEMPTY = true;
        }

        return field;
    }
}

/**
 * NumericField attributes
 */
export interface NumericFieldAttrs extends BaseFieldAttrs {}

/**
 * NumericField for range queries
 */
export class NumericField extends BaseField {
    constructor(
        name: string,
        public readonly attrs: NumericFieldAttrs = {}
    ) {
        super(name, 'numeric', attrs);
    }

    toRedisField(isJson: boolean): SchemaNumericField {
        const field: SchemaNumericField = {
            type: 'NUMERIC',
        };

        // Add AS field for JSON storage
        if (isJson) {
            field.AS = this.name;
        }

        // Add common attributes
        if (this.attrs.sortable) {
            field.SORTABLE = true;
        }
        if (this.attrs.indexMissing) {
            field.INDEXMISSING = true;
        }

        return field;
    }
}

/**
 * GeoField attributes
 */
export interface GeoFieldAttrs extends BaseFieldAttrs {}

/**
 * GeoField for geographic queries
 */
export class GeoField extends BaseField {
    constructor(
        name: string,
        public readonly attrs: GeoFieldAttrs = {}
    ) {
        super(name, 'geo', attrs);
    }

    toRedisField(isJson: boolean): SchemaGeoField {
        const field: SchemaGeoField = {
            type: 'GEO',
        };

        // Add AS field for JSON storage
        if (isJson) {
            field.AS = this.name;
        }

        // Add common attributes
        if (this.attrs.sortable) {
            field.SORTABLE = true;
        }
        if (this.attrs.indexMissing) {
            field.INDEXMISSING = true;
        }

        return field;
    }
}

/**
 * Base vector field attributes
 */
export interface VectorFieldAttrs extends BaseFieldAttrs {
    algorithm: string;
    dims: number;
    distanceMetric?: VectorDistanceMetric;
    datatype?: VectorDataType;
}

/**
 * FlatVectorField attributes
 */
export interface FlatVectorFieldAttrs extends VectorFieldAttrs {
    algorithm: 'flat';
    blockSize?: number;
    initialCap?: number;
}

/**
 * FlatVectorField for FLAT algorithm
 */
export class FlatVectorField extends BaseField {
    constructor(
        name: string,
        public readonly attrs: FlatVectorFieldAttrs
    ) {
        super(name, 'vector', attrs);
    }

    toRedisField(isJson: boolean): SchemaFlatVectorField {
        const field: SchemaFlatVectorField = {
            type: 'VECTOR',
            ALGORITHM: 'FLAT',
            TYPE: (this.attrs.datatype || 'FLOAT32').toUpperCase() as SchemaVectorFieldType,
            DIM: this.attrs.dims,
            DISTANCE_METRIC: (
                this.attrs.distanceMetric || 'COSINE'
            ).toUpperCase() as SchemaVectorFieldDistanceMetric,
        };

        // Add AS field for JSON storage
        if (isJson) {
            field.AS = this.name;
        }

        // Add FLAT-specific attributes
        if (this.attrs.blockSize !== undefined) {
            field.BLOCK_SIZE = this.attrs.blockSize;
        }
        if (this.attrs.initialCap !== undefined) {
            field.INITIAL_CAP = this.attrs.initialCap;
        }

        return field;
    }
}

/**
 * HNSWVectorField attributes
 */
export interface HNSWVectorFieldAttrs extends VectorFieldAttrs {
    algorithm: 'hnsw';
    m?: number;
    efConstruction?: number;
    efRuntime?: number;
    epsilon?: number;
}

/**
 * HNSWVectorField for HNSW algorithm
 */
export class HNSWVectorField extends BaseField {
    constructor(
        name: string,
        public readonly attrs: HNSWVectorFieldAttrs
    ) {
        super(name, 'vector', attrs);
        // Set default HNSW parameters
        if (this.attrs.m === undefined) this.attrs.m = 16;
        if (this.attrs.efConstruction === undefined) this.attrs.efConstruction = 200;
        if (this.attrs.efRuntime === undefined) this.attrs.efRuntime = 10;
        if (this.attrs.epsilon === undefined) this.attrs.epsilon = 0.01;
    }

    toRedisField(isJson: boolean): SchemaHNSWVectorField {
        const field: SchemaHNSWVectorField = {
            type: 'VECTOR',
            ALGORITHM: 'HNSW',
            TYPE: (this.attrs.datatype || 'FLOAT32').toUpperCase() as SchemaVectorFieldType,
            DIM: this.attrs.dims,
            DISTANCE_METRIC: (
                this.attrs.distanceMetric || 'COSINE'
            ).toUpperCase() as SchemaVectorFieldDistanceMetric,
        };

        // Add AS field for JSON storage
        if (isJson) {
            field.AS = this.name;
        }

        // Add HNSW-specific attributes
        if (this.attrs.m !== undefined) {
            field.M = this.attrs.m;
        }
        if (this.attrs.efConstruction !== undefined) {
            field.EF_CONSTRUCTION = this.attrs.efConstruction;
        }
        if (this.attrs.efRuntime !== undefined) {
            field.EF_RUNTIME = this.attrs.efRuntime;
        }

        return field;
    }
}

/**
 * Factory for creating field instances
 */
export class FieldFactory {
    static createField(
        fieldType: string,
        name: string,
        attrs?: BaseFieldAttrs | VectorFieldAttrs
    ): BaseField {
        switch (fieldType) {
            case FieldType.TAG:
                return new TagField(name, attrs as TagFieldAttrs);
            case FieldType.TEXT:
                return new TextField(name, attrs as TextFieldAttrs);
            case FieldType.NUMERIC:
                return new NumericField(name, attrs as NumericFieldAttrs);
            case FieldType.GEO:
                return new GeoField(name, attrs as GeoFieldAttrs);
            case FieldType.VECTOR:
                return this.createVectorField(name, attrs as VectorFieldAttrs);
            default:
                throw new Error(`Unknown field type: ${fieldType}`);
        }
    }

    private static createVectorField(name: string, attrs: VectorFieldAttrs): BaseField {
        if (!attrs) {
            throw new Error('Vector field requires attrs parameter');
        }

        if (!attrs.algorithm) {
            throw new Error('Must provide algorithm param');
        }

        if (attrs.dims === undefined) {
            throw new Error('Must provide dims param');
        }

        switch (attrs.algorithm) {
            case 'flat':
                return new FlatVectorField(name, attrs as FlatVectorFieldAttrs);
            case 'hnsw':
                return new HNSWVectorField(name, attrs as HNSWVectorFieldAttrs);
            default:
                throw new Error(`Unknown vector field algorithm: ${attrs.algorithm}`);
        }
    }
}
