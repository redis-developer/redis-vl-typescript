import { BaseQuery, renderFilter, type FilterInput } from './base.js';

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
 * import { FilterQuery, Tag, Num } from 'redisvl';
 *
 * const q = new FilterQuery({
 *   filter: Tag('brand').eq('nike').and(Num('price').lt(100)),
 *   returnFields: ['title', 'price'],
 * });
 * const results = await index.search(q);
 * ```
 */
export class FilterQuery extends BaseQuery {
    public readonly numResults: number;

    constructor(config: FilterQueryConfig = {}) {
        const numResults = config.numResults ?? 10;
        super({
            filter: config.filter,
            returnFields: config.returnFields,
            offset: config.offset,
            limit: config.limit ?? numResults,
        });
        this.numResults = numResults;
    }

    buildQuery(): string {
        return renderFilter(this.filter);
    }
}
