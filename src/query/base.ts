/**
 * @module Query
 * Query builders for Redis search operations.
 */

/**
 * Base interface for all query types
 */
export interface BaseQuery {
    /** Fields to return in results */
    returnFields?: string[];

    /** Number of results to return */
    limit?: number;

    /** Offset for pagination */
    offset?: number;

    /** Build the Redis query string */
    buildQuery(): string;

    /** Build the query parameters for Redis */
    buildParams(): Record<string, unknown>;
}

/**
 * Search result document with optional score
 */
export interface SearchDocument<T = Record<string, unknown>> {
    /** Document fields */
    value: T;

    /** Relevance score (for vector search) */
    score?: number;

    /** Document ID */
    id: string;
}

/**
 * Search result structure
 */
export interface SearchResult<T = Record<string, unknown>> {
    /** Total number of results */
    total: number;

    /** Retrieved documents */
    documents: SearchDocument<T>[];
}

/**
 * Result returned by {@link SearchIndex.hybridSearch}. Adds the FT.HYBRID
 * specific fields (`executionTime`, `warnings`) on top of the standard
 * {@link SearchResult} shape.
 */
export interface HybridSearchResult<T = Record<string, unknown>> extends SearchResult<T> {
    /** Server-reported query execution time in milliseconds. */
    executionTime?: number;

    /** Warnings emitted by the server (e.g. truncated KNN, missing scorer). */
    warnings?: string[];
}

/**
 * Options for query execution
 */
export interface QueryOptions {
    /** Redis DIALECT version (default: 2 for KNN) */
    dialect?: number;

    /** Sort by field */
    sortBy?: string;

    /** Sort order */
    sortOrder?: 'ASC' | 'DESC';
}
