import { VectorDistanceMetric, VectorDataType } from './types.js';

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

    constructor(name: string, type: string, attrs: BaseFieldAttrs = {}) {
        this.name = name;
        this.type = type;
        this.attrs = attrs;
    }
}

/**
 * TextField attributes
 */
export interface TextFieldAttrs extends BaseFieldAttrs {
    weight?: number;
    noStem?: boolean;
    phonetic?: string;
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
            case 'tag':
                return new TagField(name, attrs as TagFieldAttrs);
            case 'text':
                return new TextField(name, attrs as TextFieldAttrs);
            case 'numeric':
                return new NumericField(name, attrs as NumericFieldAttrs);
            case 'geo':
                return new GeoField(name, attrs as GeoFieldAttrs);
            case 'vector':
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
