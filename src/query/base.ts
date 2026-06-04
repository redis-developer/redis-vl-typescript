/**
 * @module Query
 * Query builders for Redis search operations.
 */

import { QueryValidationError, SchemaValidationError } from '../errors.js';
import { normalizeVectorDataType } from '../redis/utils.js';
import { VectorDataType } from '../schema/types.js';
import type { FilterExpression } from './filter.js';

/**
 * A filter clause supplied to a query - either a pre-built {@link FilterExpression}
 * or a raw Redis Search filter string (e.g. `'@category:{electronics}'`).
 */
export type FilterInput = string | FilterExpression;

/** Backward-compatible alias for shared query filters. */
export type QueryFilter = FilterInput;

/**
 * Render a {@link FilterInput} to its Redis Search string form, treating
 * `undefined` and the wildcard expression as "no filter" (`*`).
 */
export function renderFilter(filter: FilterInput | undefined): string {
    if (filter === undefined) return '*';
    return typeof filter === 'string' ? filter : filter.toString();
}

/**
 * Sort direction for Redis search results.
 */
export type SortDirection = 'ASC' | 'DESC';

/**
 * A normalized sort field specification.
 */
export interface SortField {
    field: string;
    direction: SortDirection;
}

/**
 * Common query configuration shared by all FT.SEARCH query types.
 */
export interface BaseQueryConfig {
    /** Filter expression used as the base Redis query string. */
    filter?: FilterInput;

    /** Fields to return in results. */
    returnFields?: string[];

    /** Offset for pagination. */
    offset?: number;

    /** Number of results to return. */
    limit?: number;
}

/**
 * Options for configuring returned fields.
 */
export interface ReturnFieldsOptions {
    /** Fields that should not be decoded by higher-level result processors. */
    skipDecode?: string | string[];
}

/**
 * Options for sorting query results.
 */
export interface SortByOptions {
    /** Sort direction. Defaults to ASC. */
    direction?: SortDirection;
}

/**
 * Base abstract class for all FT.SEARCH query types.
 *
 * This class owns shared query state. Subclasses remain responsible for
 * building the final Redis query string for their specific query mode.
 */
export abstract class BaseQuery {
    private _filter?: FilterInput;
    private _returnFields?: string[];
    private _skipDecodeFields?: string[];
    private _offset?: number;
    private _limit?: number;
    private readonly _sortFields: SortField[] = [];

    /** When true, ask Redis to return only document ids/counts (FT.SEARCH NOCONTENT). */
    noContent?: boolean;

    /** Optional RediSearch scorer to apply when ranking text results. */
    textScorer?: string;

    protected constructor(config: BaseQueryConfig = {}) {
        if (config.filter !== undefined) {
            this.setFilter(config.filter);
        }
        if (config.returnFields !== undefined) {
            this.setReturnFields(config.returnFields);
        }
        if (config.offset !== undefined || config.limit !== undefined) {
            this.setPagingFromConfig(config.offset, config.limit);
        }
    }

    /** Fields to return in results. */
    get returnFields(): string[] | undefined {
        return this._returnFields ? [...this._returnFields] : undefined;
    }

    /** Fields that should not be decoded by higher-level result processors. */
    get skipDecodeFields(): string[] | undefined {
        return this._skipDecodeFields ? [...this._skipDecodeFields] : undefined;
    }

    /** Sort fields collected for query execution. */
    get sortFields(): SortField[] {
        return this._sortFields.map((field) => ({ ...field }));
    }

    /** Offset for execution code that works with the abstract query base. */
    getOffset(): number | undefined {
        return this._offset;
    }

    /** Limit for execution code that works with the abstract query base. */
    getLimit(): number | undefined {
        return this._limit;
    }

    /** Filter expression used by subclasses when rendering query strings. */
    protected get queryFilter(): FilterInput | undefined {
        return this._filter;
    }

    /** Offset value exposed by concrete query classes. */
    protected get queryOffset(): number | undefined {
        return this._offset;
    }

    /** Limit value exposed by concrete query classes. */
    protected get queryLimit(): number | undefined {
        return this._limit;
    }

    /** Set or clear the query filter. */
    setFilter(filter?: FilterInput | null): this {
        if (filter === undefined || filter === null) {
            this._filter = undefined;
            return this;
        }

        const rendered = renderFilter(filter);
        if (rendered.trim() === '') {
            throw new QueryValidationError('filter cannot be empty');
        }
        this._filter = filter;
        return this;
    }

    /** Set or clear return fields. */
    setReturnFields(fields?: string[], options: ReturnFieldsOptions = {}): this {
        if (fields === undefined) {
            this._returnFields = undefined;
            this._skipDecodeFields = undefined;
            return this;
        }

        this._returnFields = validateStringList(fields, 'returnFields');

        if (options.skipDecode !== undefined) {
            const skipDecode = Array.isArray(options.skipDecode)
                ? options.skipDecode
                : [options.skipDecode];
            this._skipDecodeFields = validateStringList(skipDecode, 'skipDecode');
        } else {
            this._skipDecodeFields = undefined;
        }

        return this;
    }

    /** Set pagination values. */
    paging(offset: number, limit: number): this {
        validateOffset(offset);
        validateLimit(limit);
        this._offset = offset;
        this._limit = limit;
        return this;
    }

    /** Add a sort field. */
    sortBy(field: string, options: SortByOptions = {}): this {
        validateNonEmptyString(field, 'sort field');
        const direction = options.direction ?? 'ASC';
        if (direction !== 'ASC' && direction !== 'DESC') {
            throw new QueryValidationError('sort direction must be either ASC or DESC');
        }
        this._sortFields.push({ field, direction });
        return this;
    }

    /** Build the Redis query string. */
    abstract buildQuery(): string;

    /** Build the query parameters for Redis. */
    buildParams(): Record<string, unknown> {
        return {};
    }

    private setPagingFromConfig(offset?: number, limit?: number): void {
        if (offset !== undefined) {
            validateOffset(offset);
            this._offset = offset;
        }
        if (limit !== undefined) {
            validateLimit(limit);
            this._limit = limit;
        }
    }
}

/**
 * Common vector query configuration.
 */
export interface BaseVectorQueryConfig extends BaseQueryConfig {
    /** Vector to search with. */
    vector: number[];

    /** Name of the vector field in the index. */
    vectorField: string;

    /** Vector datatype to use when serializing the query vector. */
    datatype?: VectorDataType | string;

    /** Whether to normalize distances during result processing. */
    normalizeDistance?: boolean;
}

/**
 * Base abstract class for vector-backed query types.
 */
export abstract class BaseVectorQuery extends BaseQuery {
    private readonly _vector: number[];
    private readonly _vectorField: string;
    private readonly _datatype: VectorDataType;
    private readonly _normalizeDistance: boolean;

    protected constructor(config: BaseVectorQueryConfig) {
        super(config);

        if (!config.vector || config.vector.length === 0) {
            throw new QueryValidationError('Vector cannot be empty');
        }

        if (!config.vectorField || config.vectorField.trim() === '') {
            throw new QueryValidationError('vectorField is required');
        }

        this._vector = [...config.vector];
        this._vectorField = config.vectorField;
        this._normalizeDistance = config.normalizeDistance ?? false;

        try {
            this._datatype = normalizeVectorDataType(config.datatype);
        } catch (error) {
            if (error instanceof SchemaValidationError) {
                throw new QueryValidationError(error.message);
            }
            throw error;
        }
    }

    /** Vector to search with. */
    get vector(): number[] {
        return [...this._vector];
    }

    /** Filter expression used by the query. */
    get filter(): FilterInput | undefined {
        return this.queryFilter;
    }

    /** Offset for pagination. */
    get offset(): number | undefined {
        return this.queryOffset;
    }

    /** Number of results to return. */
    get limit(): number | undefined {
        return this.queryLimit;
    }

    /** Name of the vector field in the index. */
    get vectorField(): string {
        return this._vectorField;
    }

    /** Vector datatype used when serializing the query vector. */
    get datatype(): VectorDataType {
        return this._datatype;
    }

    /** Whether to normalize distances during result processing. */
    get normalizeDistance(): boolean {
        return this._normalizeDistance;
    }
}

function validateStringList(values: string[], label: string): string[] {
    return values.map((value) => {
        validateNonEmptyString(value, label);
        return value;
    });
}

function validateNonEmptyString(value: string, label: string): void {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new QueryValidationError(`${label} cannot be empty`);
    }
}

function validateOffset(offset: number): void {
    if (!Number.isInteger(offset) || offset < 0) {
        throw new QueryValidationError('offset must be a non-negative integer');
    }
}

function validateLimit(limit: number): void {
    if (!Number.isInteger(limit) || limit <= 0) {
        throw new QueryValidationError('limit must be a positive integer');
    }
}

/**
 * Search result document with optional score.
 */
export interface SearchDocument<T = Record<string, unknown>> {
    /** Document fields. */
    value: T;

    /** Relevance score (for vector search). */
    score?: number;

    /** Document ID. */
    id: string;
}

/**
 * Search result structure.
 */
export interface SearchResult<T = Record<string, unknown>> {
    /** Total number of results. */
    total: number;

    /** Retrieved documents. */
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
 * Options for query execution.
 */
export interface QueryOptions {
    /** Redis DIALECT version (default: 2 for KNN). */
    dialect?: number;

    /** Sort by field. */
    sortBy?: string;

    /** Sort order. */
    sortOrder?: 'ASC' | 'DESC';
}
