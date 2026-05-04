import { BaseQuery } from './base.js';
import { VectorDataType, VectorDistanceMetric } from '../schema/types.js';
import { QueryValidationError, SchemaValidationError } from '../errors.js';
import { encodeVectorBuffer, normalizeVectorDataType } from '../redis/utils.js';

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

    /**
     * Vector datatype to use when serializing the query vector.
     * Must match the datatype declared on the schema's vector field.
     * @default 'FLOAT32'
     */
    datatype?: VectorDataType | string;

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
    public readonly datatype: VectorDataType;
    public readonly offset?: number;
    public readonly limit?: number;
    public readonly scoreAlias: string;
    public readonly efRuntime?: number;
    public readonly epsilon?: number;
    public readonly hybridPolicy?: HybridPolicy;
    public readonly batchSize?: number;
    public readonly normalizeDistance: boolean;
    public readonly searchWindowSize?: number;
    public readonly useSearchHistory?: UseSearchHistory;
    public readonly searchBufferCapacity?: number;

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

        this.vector = config.vector;
        this.vectorField = config.vectorField;
        this.numResults = config.numResults ?? 10;
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
        this.efRuntime = config.efRuntime;
        this.epsilon = config.epsilon;
        this.hybridPolicy = config.hybridPolicy;
        this.batchSize = config.batchSize;
        this.normalizeDistance = config.normalizeDistance ?? false;
        this.searchWindowSize = config.searchWindowSize;
        this.useSearchHistory = config.useSearchHistory;
        this.searchBufferCapacity = config.searchBufferCapacity;
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

        // Add hybrid policy parameters if provided
        if (this.hybridPolicy !== undefined) {
            knnPart += ` HYBRID_POLICY ${this.hybridPolicy}`;
        }
        if (this.batchSize !== undefined && this.hybridPolicy === 'BATCHES') {
            knnPart += ` BATCH_SIZE ${this.batchSize}`;
        }

        // Add SVS-VAMANA parameters if provided
        if (this.searchWindowSize !== undefined) {
            knnPart += ' SEARCH_WINDOW_SIZE $search_window_size';
        }
        if (this.useSearchHistory !== undefined) {
            knnPart += ` USE_SEARCH_HISTORY ${this.useSearchHistory}`;
        }
        if (this.searchBufferCapacity !== undefined) {
            knnPart += ' SEARCH_BUFFER_CAPACITY $search_buffer_capacity';
        }

        knnPart += ']';
        return `${filterPart}${knnPart}`;
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
            vector: vectorBuffer,
        };

        // Add HNSW parameters if provided
        if (this.efRuntime !== undefined) {
            params.ef_runtime = this.efRuntime;
        }
        if (this.epsilon !== undefined) {
            params.epsilon = this.epsilon;
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
