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

    constructor(config: VectorQueryConfig) {
        // Validate vector
        if (!config.vector || config.vector.length === 0) {
            throw new QueryValidationError('Vector cannot be empty');
        }

        // Validate vectorField
        if (!config.vectorField) {
            throw new QueryValidationError('vectorField is required');
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
    }

    /**
     * Build the Redis KNN query string
     *
     * Format: (filter)=>[KNN K @vector_field $vector AS score]
     *
     * @returns Redis FT.SEARCH query string
     */
    buildQuery(): string {
        const filterPart = this.filter ? `(${this.filter})` : '*';
        const knnPart = `=>[KNN ${this.numResults} @${this.vectorField} $vector AS ${this.scoreAlias}]`;
        return `${filterPart}${knnPart}`;
    }

    /**
     * Build query parameters for Redis FT.SEARCH
     *
     * Converts the vector to a binary buffer as expected by Redis.
     *
     * @returns Query parameters object with vector buffer
     */
    buildParams(): Record<string, unknown> {
        // Convert vector to Float32Array buffer (Redis expects binary data)
        const vectorBuffer = Buffer.from(new Float32Array(this.vector).buffer);

        return {
            vector: vectorBuffer,
        };
    }
}
