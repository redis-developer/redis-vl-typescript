import { BaseQuery } from './base.js';
import { VectorDistanceMetric } from '../schema/types.js';
import { QueryValidationError } from '../errors.js';

/**
 * Configuration for VectorQuery
 */
export interface VectorQueryConfig {
    /** Vector to search with */
    vector: number[];

    /** Name of the vector field in the index */
    vectorField: string;

    /** Number of results to return */
    numResults?: number;

    /** Filter expression (e.g., '@category:{electronics}') */
    filter?: string;

    /** Fields to return in results */
    returnFields?: string[];

    /** Distance metric to use */
    distanceMetric?: VectorDistanceMetric;

    /** Pagination offset */
    offset?: number;

    /** Pagination limit */
    limit?: number;

    /**
     * Alias for the score field in results
     * @default 'vector_distance'
     */
    scoreAlias?: string;

    /**
     * HNSW ef_runtime parameter - controls recall vs speed tradeoff
     * Higher values provide better recall but slower search
     * @default undefined (uses index default)
     */
    efRuntime?: number;

    /**
     * HNSW epsilon parameter - range search approximation factor
     * Used for range-based vector queries
     * @default undefined
     */
    epsilon?: number;
}

/**
 * Vector similarity search query using KNN (K-Nearest Neighbors)
 *
 * Performs semantic search by finding documents with vectors similar to the query vector.
 *
 * @example
 * ```typescript
 * import { VectorQuery } from 'redisvl';
 *
 * // Basic vector search
 * const query = new VectorQuery({
 *   vector: [0.1, 0.2, 0.3, ...],
 *   vectorField: 'embedding',
 *   numResults: 10
 * });
 *
 * const results = await index.search(query);
 * ```
 *
 * @example
 * ```typescript
 * // Vector search with metadata filtering
 * const query = new VectorQuery({
 *   vector: embedding,
 *   vectorField: 'embedding',
 *   filter: '@category:{electronics} @price:[0 1000]',
 *   numResults: 5,
 *   returnFields: ['title', 'price']
 * });
 *
 * const results = await index.search(query);
 * ```
 */
export class VectorQuery implements BaseQuery {
    public readonly vector: number[];
    public readonly vectorField: string;
    public readonly numResults: number;
    public readonly filter?: string;
    public readonly returnFields?: string[];
    public readonly distanceMetric: VectorDistanceMetric;
    public readonly offset?: number;
    public readonly limit?: number;
    public readonly scoreAlias: string;
    public readonly efRuntime?: number;
    public readonly epsilon?: number;

    constructor(config: VectorQueryConfig) {
        // Validate vector
        if (!config.vector || config.vector.length === 0) {
            throw new QueryValidationError('Vector cannot be empty');
        }

        // Validate vectorField
        if (!config.vectorField) {
            throw new QueryValidationError('vectorField is required');
        }

        // Validate HNSW parameters
        if (config.efRuntime !== undefined && config.efRuntime <= 0) {
            throw new QueryValidationError('efRuntime must be positive');
        }

        if (config.epsilon !== undefined && config.epsilon < 0) {
            throw new QueryValidationError('epsilon must be non-negative');
        }

        this.vector = config.vector;
        this.vectorField = config.vectorField;
        this.numResults = config.numResults ?? 10;
        this.filter = config.filter;
        this.returnFields = config.returnFields;
        this.distanceMetric = config.distanceMetric ?? VectorDistanceMetric.COSINE;
        this.offset = config.offset;
        this.limit = config.limit;
        this.scoreAlias = config.scoreAlias ?? 'vector_distance';
        this.efRuntime = config.efRuntime;
        this.epsilon = config.epsilon;
    }

    /**
     * Build the Redis KNN query string
     *
     * Format: (filter)=>[KNN K @vector_field $vector AS score EF_RUNTIME $ef_runtime EPSILON $epsilon]
     *
     * @returns Redis FT.SEARCH query string
     */
    buildQuery(): string {
        const filterPart = this.filter ? `(${this.filter})` : '*';
        let knnPart = `=>[KNN ${this.numResults} @${this.vectorField} $vector AS ${this.scoreAlias}`;

        // Add HNSW parameters if provided
        if (this.efRuntime !== undefined) {
            knnPart += ' EF_RUNTIME $ef_runtime';
        }
        if (this.epsilon !== undefined) {
            knnPart += ' EPSILON $epsilon';
        }

        knnPart += ']';
        return `${filterPart}${knnPart}`;
    }

    /**
     * Build query parameters for Redis FT.SEARCH
     *
     * Converts the vector to a binary buffer as expected by Redis.
     * Includes HNSW parameters if provided.
     *
     * @returns Query parameters object with vector buffer and HNSW params
     */
    buildParams(): Record<string, unknown> {
        // Convert vector to Float32Array buffer (Redis expects binary data)
        const vectorBuffer = Buffer.from(new Float32Array(this.vector).buffer);

        const params: Record<string, unknown> = {
            vector: vectorBuffer,
        };

        // Add HNSW parameters if provided
        if (this.efRuntime !== undefined) {
            params.ef_runtime = this.efRuntime;
        }
        if (this.epsilon !== undefined) {
            params.epsilon = this.epsilon;
        }

        return params;
    }
}
