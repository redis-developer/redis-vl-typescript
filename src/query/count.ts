import { BaseQuery, renderFilter, type FilterInput } from './base.js';

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
 * import { CountQuery, Tag } from 'redis-vl';
 *
 * const total = (await index.search(new CountQuery({ filter: Tag('brand').eq('nike') }))).total;
 * ```
 */
export class CountQuery extends BaseQuery {
    public readonly noContent = true;

    constructor(config: CountQueryConfig = {}) {
        super({ filter: config.filter });
    }

    get filter(): FilterInput | undefined {
        return this.queryFilter;
    }

    get offset(): number {
        return 0;
    }

    get limit(): number {
        return 0;
    }

    buildQuery(): string {
        return renderFilter(this.filter);
    }
}
