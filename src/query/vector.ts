import { BaseVectorQuery, renderFilter, type BaseVectorQueryConfig } from './base.js';
import { VectorDistanceMetric } from '../schema/types.js';
import { QueryValidationError } from '../errors.js';
import { encodeVectorBuffer } from '../redis/utils.js';

/**
 * Hybrid policy options for vector search with filters
 */
export type HybridPolicy = 'BATCHES' | 'ADHOC_BF';

/**
 * USE_SEARCH_HISTORY options for SVS-VAMANA indexes
 */
export type UseSearchHistory = 'OFF' | 'ON' | 'AUTO';

/**
 * Configuration for VectorQuery
 */
export interface VectorQueryConfig extends BaseVectorQueryConfig {
    /** Number of results to return */
    numResults?: number;

    /** Distance metric to use */
    distanceMetric?: VectorDistanceMetric;

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
     * Hybrid policy for combining vector search with filters
     * - BATCHES: Process filters in batches (better for large result sets)
     * - ADHOC_BF: Ad-hoc brute force (better for small result sets)
     * @default undefined
     */
    hybridPolicy?: HybridPolicy;

    /**
     * Batch size when using BATCHES hybrid policy
     * Controls memory usage vs performance tradeoff
     * Only applies when hybridPolicy is "BATCHES"
     * @default undefined
     */
    batchSize?: number;

    /**
     * Normalize vector distance to similarity score between 0 and 1
     *
     * Redis distance metrics have different ranges:
     * - COSINE: 0 to 2
     * - L2: 0 to infinity
     * - IP: Depends on vector magnitude
     *
     * When true, converts distances to similarity scores where:
     * - 1.0 = perfect match (most similar)
     * - 0.0 = completely different (least similar)
     *
     * Note: IP (Inner Product) cannot be normalized. Use COSINE instead,
     * which is normalized IP by definition.
     *
     * @default false
     */
    normalizeDistance?: boolean;

    /**
     * SVS-VAMANA search window size parameter
     *
     * Controls the size of the search window for SVS-VAMANA KNN searches.
     * Increasing this value generally yields more accurate but slower search results.
     *
     * Only applies when using SVS-VAMANA algorithm indexes.
     *
     * @default undefined (uses index default)
     */
    searchWindowSize?: number;

    /**
     * SVS-VAMANA USE_SEARCH_HISTORY parameter
     *
     * For SVS-VAMANA indexes, controls whether to use the search buffer
     * or entire search history.
     *
     * Options:
     * - OFF: Don't use search history
     * - ON: Use search history
     * - AUTO: Automatically decide based on query characteristics
     *
     * Only applies when using SVS-VAMANA algorithm indexes.
     *
     * @default undefined
     */
    useSearchHistory?: UseSearchHistory;

    /**
     * SVS-VAMANA SEARCH_BUFFER_CAPACITY parameter
     *
     * Tuning parameter for SVS-VAMANA indexes using two-level compression.
     * Determines the number of vector candidates to collect in the first level
     * of search before the re-ranking level.
     *
     * Higher values may improve recall at the cost of performance.
     *
     * Only applies when using SVS-VAMANA algorithm indexes with two-level compression.
     *
     * @default undefined
     */
    searchBufferCapacity?: number;
}

/**
 * Vector similarity search query using KNN (K-Nearest Neighbors)
 *
 * Performs semantic search by finding documents with vectors similar to the query vector.
 *
 * @example
 * ```typescript
 * import { VectorQuery } from 'redis-vl';
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
export class VectorQuery extends BaseVectorQuery {
    public readonly numResults: number;
    public readonly distanceMetric: VectorDistanceMetric;
    public readonly scoreAlias: string;
    public readonly efRuntime?: number;
    public readonly hybridPolicy?: HybridPolicy;
    public readonly batchSize?: number;
    public readonly searchWindowSize?: number;
    public readonly useSearchHistory?: UseSearchHistory;
    public readonly searchBufferCapacity?: number;

    constructor(config: VectorQueryConfig) {
        super(config);

        // Validate HNSW parameters
        if (config.efRuntime !== undefined && config.efRuntime <= 0) {
            throw new QueryValidationError('efRuntime must be positive');
        }

        // Validate hybrid policy parameters
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

        // Validate normalizeDistance with IP metric
        if (config.normalizeDistance && config.distanceMetric === VectorDistanceMetric.IP) {
            console.warn(
                'Attempting to normalize inner product distance metric. ' +
                    'Use cosine distance instead which is normalized inner product by definition.'
            );
        }

        // Validate SVS-VAMANA parameters
        if (config.searchWindowSize !== undefined && config.searchWindowSize <= 0) {
            throw new QueryValidationError('searchWindowSize must be positive');
        }

        if (config.useSearchHistory !== undefined) {
            const validValues: UseSearchHistory[] = ['OFF', 'ON', 'AUTO'];
            if (!validValues.includes(config.useSearchHistory)) {
                throw new QueryValidationError('useSearchHistory must be one of: OFF, ON, AUTO');
            }
        }

        if (config.searchBufferCapacity !== undefined && config.searchBufferCapacity <= 0) {
            throw new QueryValidationError('searchBufferCapacity must be positive');
        }

        this.numResults = config.numResults ?? 10;
        this.distanceMetric = config.distanceMetric ?? VectorDistanceMetric.COSINE;
        this.scoreAlias = config.scoreAlias ?? 'vector_distance';
        this.efRuntime = config.efRuntime;
        this.hybridPolicy = config.hybridPolicy;
        this.batchSize = config.batchSize;
        this.searchWindowSize = config.searchWindowSize;
        this.useSearchHistory = config.useSearchHistory;
        this.searchBufferCapacity = config.searchBufferCapacity;
    }

    /**
     * Build the Redis KNN query string
     *
     * Format: (filter)=>[KNN K @vector_field $vector <attributes> AS score]
     * The AS clause is fixed in the return template and must remain the last
     * token inside the bracket; all runtime attributes appear before it.
     *
     * @returns Redis FT.SEARCH query string
     */
    buildQuery(): string {
        const filterStr = renderFilter(this.filter);
        const filterPart = filterStr === '*' ? '*' : `(${filterStr})`;

        // Build clauses in canonical Redis order.
        const parts: string[] = [`KNN ${this.numResults} @${this.vectorField} $vector`];

        if (this.hybridPolicy !== undefined) {
            parts.push(`HYBRID_POLICY ${this.hybridPolicy}`);
        }
        if (this.batchSize !== undefined && this.hybridPolicy === 'BATCHES') {
            parts.push(`BATCH_SIZE ${this.batchSize}`);
        }
        if (this.efRuntime !== undefined) {
            parts.push('EF_RUNTIME $ef_runtime');
        }
        if (this.searchWindowSize !== undefined) {
            parts.push('SEARCH_WINDOW_SIZE $search_window_size');
        }
        if (this.useSearchHistory !== undefined) {
            parts.push(`USE_SEARCH_HISTORY ${this.useSearchHistory}`);
        }
        if (this.searchBufferCapacity !== undefined) {
            parts.push('SEARCH_BUFFER_CAPACITY $search_buffer_capacity');
        }

        return `${filterPart}=>[${parts.join(' ')} AS ${this.scoreAlias}]`;
    }

    /**
     * Build query parameters for Redis FT.SEARCH
     *
     * Converts the vector to a binary buffer as expected by Redis.
     * Includes HNSW and SVS-VAMANA parameters if provided.
     *
     * @returns Query parameters object with vector buffer and algorithm params
     */
    buildParams(): Record<string, unknown> {
        const vectorBuffer = encodeVectorBuffer(this.vector, this.datatype);

        const params: Record<string, unknown> = {
            ...super.buildParams(),
            vector: vectorBuffer,
        };

        // Add HNSW parameters if provided
        if (this.efRuntime !== undefined) {
            params.ef_runtime = this.efRuntime;
        }

        // Add SVS-VAMANA parameters if provided
        if (this.searchWindowSize !== undefined) {
            params.search_window_size = this.searchWindowSize;
        }
        if (this.searchBufferCapacity !== undefined) {
            params.search_buffer_capacity = this.searchBufferCapacity;
        }

        return params;
    }
}
