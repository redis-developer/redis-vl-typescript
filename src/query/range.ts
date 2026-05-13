import { renderFilter, type BaseQuery, type FilterInput } from './base.js';
import { VectorDataType, VectorDistanceMetric } from '../schema/types.js';
import { QueryValidationError, SchemaValidationError } from '../errors.js';
import { encodeVectorBuffer, normalizeVectorDataType } from '../redis/utils.js';
import type { HybridPolicy } from './vector.js';

/**
 * Configuration for {@link VectorRangeQuery}.
 */
export interface VectorRangeQueryConfig {
    /** Query vector. */
    vector: number[];

    /** Vector field name to search against. */
    vectorField: string;

    /**
     * Maximum allowed vector distance for results.
     *
     * For cosine distance the natural range is `[0, 2]`; for L2 it is
     * `[0, +inf)`. Documents with distance greater than this threshold are
     * excluded from results.
     *
     * @default 0.2
     */
    distanceThreshold?: number;

    /** Optional filter expression combined with the vector range clause via AND. */
    filter?: FilterInput;

    /** Fields to include in each result document. */
    returnFields?: string[];

    /** Distance metric used by the indexed field. Defaults to `COSINE`. */
    distanceMetric?: VectorDistanceMetric;

    /** Vector datatype for buffer encoding. Defaults to `FLOAT32`. */
    datatype?: VectorDataType | string;

    /** Pagination offset. */
    offset?: number;

    /** Pagination limit. */
    limit?: number;

    /** Score-field alias. Defaults to `vector_distance`. */
    scoreAlias?: string;

    /** Hybrid policy for combining the filter with the vector range scan. */
    hybridPolicy?: HybridPolicy;

    /** Batch size for the BATCHES hybrid policy. */
    batchSize?: number;

    /** Convert distance to similarity in `[0, 1]`. */
    normalizeDistance?: boolean;
}

/**
 * Vector similarity search by distance threshold rather than top-K.
 *
 * Returns every document whose vector is within `distanceThreshold` of the
 * query vector. Equivalent to Python `redisvl.query.VectorRangeQuery`
 * (formerly `RangeQuery`).
 *
 * @example
 * ```typescript
 * import { VectorRangeQuery, Tag } from 'redisvl';
 *
 * const q = new VectorRangeQuery({
 *   vector: embedding,
 *   vectorField: 'embedding',
 *   distanceThreshold: 0.3,
 *   filter: Tag('brand').eq('nike'),
 * });
 * const results = await index.search(q);
 * ```
 */
export class VectorRangeQuery implements BaseQuery {
    public readonly vector: number[];
    public readonly vectorField: string;
    public readonly distanceThreshold: number;
    public readonly filter?: FilterInput;
    public readonly returnFields?: string[];
    public readonly distanceMetric: VectorDistanceMetric;
    public readonly datatype: VectorDataType;
    public readonly offset?: number;
    public readonly limit?: number;
    public readonly scoreAlias: string;
    public readonly hybridPolicy?: HybridPolicy;
    public readonly batchSize?: number;
    public readonly normalizeDistance: boolean;

    constructor(config: VectorRangeQueryConfig) {
        if (!config.vector || config.vector.length === 0) {
            throw new QueryValidationError('Vector cannot be empty');
        }

        if (!config.vectorField) {
            throw new QueryValidationError('vectorField is required');
        }

        if (config.distanceThreshold !== undefined && config.distanceThreshold < 0) {
            throw new QueryValidationError('distanceThreshold must be non-negative');
        }

        if (config.hybridPolicy !== undefined) {
            if (config.hybridPolicy !== 'BATCHES' && config.hybridPolicy !== 'ADHOC_BF') {
                throw new QueryValidationError('hybridPolicy must be either BATCHES or ADHOC_BF');
            }
        }

        if (config.batchSize !== undefined) {
            if (config.hybridPolicy === undefined) {
                throw new QueryValidationError('batchSize can only be used with hybridPolicy');
            }
            if (config.batchSize <= 0) {
                throw new QueryValidationError('batchSize must be positive');
            }
        }

        this.vector = config.vector;
        this.vectorField = config.vectorField;
        this.distanceThreshold = config.distanceThreshold ?? 0.2;
        this.filter = config.filter;
        this.returnFields = config.returnFields;
        this.distanceMetric = config.distanceMetric ?? VectorDistanceMetric.COSINE;
        try {
            this.datatype = normalizeVectorDataType(config.datatype);
        } catch (error) {
            if (error instanceof SchemaValidationError) {
                throw new QueryValidationError(error.message);
            }
            throw error;
        }
        this.offset = config.offset;
        this.limit = config.limit;
        this.scoreAlias = config.scoreAlias ?? 'vector_distance';
        this.hybridPolicy = config.hybridPolicy;
        this.batchSize = config.batchSize;
        this.normalizeDistance = config.normalizeDistance ?? false;
    }

    buildQuery(): string {
        const rangeClause = `@${this.vectorField}:[VECTOR_RANGE $distance_threshold $vector]=>{$yield_distance_as: ${this.scoreAlias}}`;

        const filterStr = renderFilter(this.filter);
        if (filterStr === '*') {
            return rangeClause;
        }
        return `(${filterStr} ${rangeClause})`;
    }

    buildParams(): Record<string, unknown> {
        const params: Record<string, unknown> = {
            vector: encodeVectorBuffer(this.vector, this.datatype),
            distance_threshold: this.distanceThreshold,
        };

        if (this.hybridPolicy !== undefined) {
            params.HYBRID_POLICY = this.hybridPolicy;
        }
        if (this.batchSize !== undefined && this.hybridPolicy === 'BATCHES') {
            params.BATCH_SIZE = this.batchSize;
        }

        return params;
    }
}
