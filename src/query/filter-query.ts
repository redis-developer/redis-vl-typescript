import { renderFilter, type BaseQuery, type FilterInput } from './base.js';

/**
 * Configuration for {@link FilterQuery}.
 */
export interface FilterQueryConfig {
    /** Filter expression — either a {@link FilterExpression} or raw Redis Search string. */
    filter?: FilterInput;

    /** Fields to include in each result document. */
    returnFields?: string[];

    /** Number of results to return. Defaults to 10. */
    numResults?: number;

    /** Pagination offset. */
    offset?: number;

    /** Pagination limit. Defaults to {@link FilterQueryConfig.numResults}. */
    limit?: number;
}

/**
 * Filter-only search — returns matching documents without any vector or
 * full-text scoring. Equivalent to Python `redisvl.query.FilterQuery`.
 *
 * @example
 * ```typescript
 * import { FilterQuery, Tag, Num } from 'redis-vl';
 *
 * const q = new FilterQuery({
 *   filter: Tag('brand').eq('nike').and(Num('price').lt(100)),
 *   returnFields: ['title', 'price'],
 * });
 * const results = await index.search(q);
 * ```
 */
export class FilterQuery implements BaseQuery {
    public readonly filter?: FilterInput;
    public readonly returnFields?: string[];
    public readonly numResults: number;
    public readonly offset?: number;
    public readonly limit?: number;

    constructor(config: FilterQueryConfig = {}) {
        this.filter = config.filter;
        this.returnFields = config.returnFields;
        this.numResults = config.numResults ?? 10;
        this.offset = config.offset;
        this.limit = config.limit ?? this.numResults;
    }

    buildQuery(): string {
        return renderFilter(this.filter);
    }

    buildParams(): Record<string, unknown> {
        return {};
    }
}
