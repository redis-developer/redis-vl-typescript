import { renderFilter, type BaseQuery, type FilterInput } from './base.js';

/**
 * Configuration for {@link CountQuery}.
 */
export interface CountQueryConfig {
    /** Filter to count matches against. Defaults to `*` (count everything). */
    filter?: FilterInput;
}

/**
 * Counts the documents matched by a filter expression. Internally configures
 * the request as `FT.SEARCH ... LIMIT 0 0 NOCONTENT` so Redis returns only
 * the total without payload data.
 *
 * Equivalent to Python `redisvl.query.CountQuery`.
 *
 * @example
 * ```typescript
 * import { CountQuery, Tag } from 'redisvl';
 *
 * const total = (await index.search(new CountQuery({ filter: Tag('brand').eq('nike') }))).total;
 * ```
 */
export class CountQuery implements BaseQuery {
    public readonly filter?: FilterInput;
    public readonly offset = 0;
    public readonly limit = 0;
    public readonly noContent = true;

    constructor(config: CountQueryConfig = {}) {
        this.filter = config.filter;
    }

    buildQuery(): string {
        return renderFilter(this.filter);
    }

    buildParams(): Record<string, unknown> {
        return {};
    }
}
