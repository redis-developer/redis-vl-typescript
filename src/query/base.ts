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
