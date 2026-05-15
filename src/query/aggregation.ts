/**
 * General-purpose aggregation query that builds an `FT.AGGREGATE` call.
 *
 * Mirrors Python redisvl's `AggregationQuery` — a thin, fluent builder over
 * the FT.AGGREGATE pipeline (GROUPBY → REDUCE → APPLY → SORTBY → LIMIT →
 * FILTER). The hybrid (text + vector) aggregation variant is intentionally
 * out of scope here; that surface is already covered by {@link HybridQuery}
 * via `FT.HYBRID`.
 *
 * @see https://redis.io/docs/latest/commands/ft.aggregate/
 */

import type { FtAggregateOptions } from '@redis/search/dist/lib/commands/AGGREGATE.js';
import { QueryValidationError } from '../errors.js';
import { renderFilter, type FilterInput } from './base.js';

/** Output of {@link AggregationQuery.toCommand}. */
export interface AggregateCommand {
    /** The query string (filter) — the second argument to `ft.aggregate`. */
    query: string;
    /** Structured options passed to `client.ft.aggregate(indexName, query, options)`. */
    options: FtAggregateOptions;
}

/**
 * Sort specification entry for {@link AggregationQuery.sortBy}.
 *
 * Bare strings are treated as ascending sort on that field. To override
 * direction use the object form.
 */
export type SortSpec = string | { field: string; direction?: 'ASC' | 'DESC' };

/**
 * Field reference used with {@link AggregationQuery.load}.
 *
 * Strings are passed through (`@field` / `$.path` conventions apply); the
 * object form supports `AS` aliasing.
 */
export type LoadField = string | { identifier: string; as?: string };

/** Concrete REDUCE clause that {@link AggregationQuery.groupBy} accepts. */
export type Reducer =
    | { type: 'COUNT'; as?: string }
    | { type: 'COUNT_DISTINCT'; property: string; as?: string }
    | { type: 'COUNT_DISTINCTISH'; property: string; as?: string }
    | { type: 'SUM'; property: string; as?: string }
    | { type: 'MIN'; property: string; as?: string }
    | { type: 'MAX'; property: string; as?: string }
    | { type: 'AVG'; property: string; as?: string }
    | { type: 'STDDEV'; property: string; as?: string }
    | { type: 'QUANTILE'; property: string; quantile: number; as?: string }
    | { type: 'TOLIST'; property: string; as?: string }
    | {
          type: 'FIRST_VALUE';
          property: string;
          by?: string | { property: string; direction?: 'ASC' | 'DESC' };
          as?: string;
      }
    | { type: 'RANDOM_SAMPLE'; property: string; sampleSize: number; as?: string };

/**
 * Factory namespace mirroring Python `redis.commands.search.reducers`.
 *
 * Each factory returns a plain {@link Reducer} object you can pass to
 * {@link AggregationQuery.groupBy}. Use the optional second `as` argument to
 * give the reducer's output column a name.
 *
 * @example
 * ```typescript
 * import { AggregationQuery, Reducers } from 'redisvl';
 *
 * const q = new AggregationQuery('@category:{electronics}')
 *   .groupBy('@brand', [
 *     Reducers.count('total'),
 *     Reducers.avg('price', 'avg_price'),
 *   ]);
 * ```
 */
export const Reducers = {
    count(as?: string): Reducer {
        return { type: 'COUNT', as };
    },
    countDistinct(property: string, as?: string): Reducer {
        return { type: 'COUNT_DISTINCT', property, as };
    },
    countDistinctish(property: string, as?: string): Reducer {
        return { type: 'COUNT_DISTINCTISH', property, as };
    },
    sum(property: string, as?: string): Reducer {
        return { type: 'SUM', property, as };
    },
    min(property: string, as?: string): Reducer {
        return { type: 'MIN', property, as };
    },
    max(property: string, as?: string): Reducer {
        return { type: 'MAX', property, as };
    },
    avg(property: string, as?: string): Reducer {
        return { type: 'AVG', property, as };
    },
    stddev(property: string, as?: string): Reducer {
        return { type: 'STDDEV', property, as };
    },
    quantile(property: string, quantile: number, as?: string): Reducer {
        if (!Number.isFinite(quantile) || quantile < 0 || quantile > 1) {
            throw new QueryValidationError('quantile must be in [0, 1]');
        }
        return { type: 'QUANTILE', property, quantile, as };
    },
    toList(property: string, as?: string): Reducer {
        return { type: 'TOLIST', property, as };
    },
    firstValue(
        property: string,
        by?: string | { property: string; direction?: 'ASC' | 'DESC' },
        as?: string
    ): Reducer {
        return { type: 'FIRST_VALUE', property, by, as };
    },
    randomSample(property: string, sampleSize: number, as?: string): Reducer {
        if (!Number.isInteger(sampleSize) || sampleSize <= 0) {
            throw new QueryValidationError('randomSample sampleSize must be a positive integer');
        }
        return { type: 'RANDOM_SAMPLE', property, sampleSize, as };
    },
} as const;

interface GroupByStep {
    kind: 'GROUPBY';
    properties: string[];
    reducers: Reducer[];
}
interface ApplyStep {
    kind: 'APPLY';
    expression: string;
    as: string;
}
interface SortByStep {
    kind: 'SORTBY';
    by: SortSpec[];
    max?: number;
}
interface LimitStep {
    kind: 'LIMIT';
    offset: number;
    count: number;
}
interface FilterStep {
    kind: 'FILTER';
    expression: string;
}
type Step = GroupByStep | ApplyStep | SortByStep | LimitStep | FilterStep;

function prefixFieldRef(name: string): string {
    return name.startsWith('@') || name.startsWith('$') ? name : `@${name}`;
}

function assertNonEmpty(value: string | undefined, label: string): void {
    if (value === undefined || value.trim() === '') {
        throw new QueryValidationError(`${label} cannot be empty`);
    }
}

function assertNonNegativeInteger(value: number | undefined, label: string): void {
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        throw new QueryValidationError(`${label} must be a non-negative integer`);
    }
}

function assertPositiveInteger(value: number | undefined, label: string): void {
    if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
        throw new QueryValidationError(`${label} must be a positive integer`);
    }
}

/**
 * Fluent builder for `FT.AGGREGATE`.
 *
 * Steps are recorded in the order you call them — `.groupBy()` then
 * `.apply()` is *not* the same as `.apply()` then `.groupBy()`, because each
 * stage operates on the output of the previous one. This mirrors how
 * Redis itself pipelines an aggregate request.
 *
 * @example
 * ```typescript
 * import { AggregationQuery, Reducers, Tag } from 'redisvl';
 *
 * const q = new AggregationQuery(Tag('category').eq('electronics'))
 *   .groupBy('@brand', [Reducers.sum('price', 'revenue'), Reducers.count('orders')])
 *   .apply('@revenue / @orders', 'avg_order_value')
 *   .sortBy([{ field: 'revenue', direction: 'DESC' }])
 *   .limit(0, 10);
 *
 * const { total, results } = await index.aggregate(q);
 * ```
 */
export class AggregationQuery {
    private readonly _query: string;
    private readonly steps: Step[] = [];
    private _load?: LoadField[];
    private _params?: Record<string, string | number>;
    private _dialect?: number;
    private _timeout?: number;
    private _verbatim = false;
    private _addScores = false;

    /**
     * @param query Either a {@link FilterExpression}, a raw filter string, or
     *   omitted/`'*'` for no filtering. The same {@link FilterInput} contract
     *   the rest of the query DSL uses.
     */
    constructor(query?: FilterInput) {
        this._query = renderFilter(query);
    }

    /** GROUPBY with one or more reducers. Properties are auto-prefixed with `@`. */
    groupBy(properties: string | string[], reducers: Reducer | Reducer[] = []): this {
        const props = Array.isArray(properties) ? properties : [properties];
        if (props.length === 0) {
            throw new QueryValidationError('groupBy requires at least one property');
        }
        for (const p of props) assertNonEmpty(p, 'groupBy property');
        const reducerList = Array.isArray(reducers) ? reducers : [reducers];
        this.steps.push({
            kind: 'GROUPBY',
            properties: props.map(prefixFieldRef),
            reducers: reducerList,
        });
        return this;
    }

    /** APPLY expression AS alias. Both arguments are required. */
    apply(expression: string, as: string): this {
        assertNonEmpty(expression, 'apply expression');
        assertNonEmpty(as, 'apply alias');
        this.steps.push({ kind: 'APPLY', expression, as });
        return this;
    }

    /** SORTBY one or more fields. Bare strings sort ASC. */
    sortBy(by: SortSpec | SortSpec[], max?: number): this {
        const list = Array.isArray(by) ? by : [by];
        if (list.length === 0) {
            throw new QueryValidationError('sortBy requires at least one field');
        }
        for (const entry of list) {
            const field = typeof entry === 'string' ? entry : entry.field;
            assertNonEmpty(field, 'sortBy field');
            if (typeof entry !== 'string' && entry.direction !== undefined) {
                if (entry.direction !== 'ASC' && entry.direction !== 'DESC') {
                    throw new QueryValidationError('sortBy direction must be ASC or DESC');
                }
            }
        }
        assertPositiveInteger(max, 'sortBy max');
        this.steps.push({ kind: 'SORTBY', by: list, max });
        return this;
    }

    /** LIMIT offset, count. */
    limit(offset: number, count: number): this {
        assertNonNegativeInteger(offset, 'limit offset');
        assertPositiveInteger(count, 'limit count');
        this.steps.push({ kind: 'LIMIT', offset, count });
        return this;
    }

    /**
     * FILTER applied at this point in the pipeline, using the FT.AGGREGATE
     * expression dialect (e.g. `'@revenue > 1000'`). Distinct from the
     * constructor's query string, which uses the FT.SEARCH filter dialect.
     */
    filter(expression: string): this {
        assertNonEmpty(expression, 'filter expression');
        this.steps.push({ kind: 'FILTER', expression });
        return this;
    }

    /**
     * LOAD specific fields from the source documents.
     *
     * Each entry can be a bare field name (auto-prefixed with `@`) or an
     * `{ identifier, as }` pair for aliasing.
     */
    load(fields: LoadField | LoadField[]): this {
        const list = Array.isArray(fields) ? fields : [fields];
        for (const f of list) {
            if (typeof f === 'string') {
                assertNonEmpty(f, 'load field');
            } else {
                assertNonEmpty(f.identifier, 'load identifier');
                if (f.as !== undefined) assertNonEmpty(f.as, 'load alias');
            }
        }
        this._load = [...(this._load ?? []), ...list];
        return this;
    }

    /** Bind PARAMS for `$param` references in the query string. */
    params(params: Record<string, string | number>): this {
        this._params = { ...(this._params ?? {}), ...params };
        return this;
    }

    /** Set the DIALECT. Defaults to the server's current default when omitted. */
    dialect(dialect: number): this {
        if (!Number.isInteger(dialect) || dialect <= 0) {
            throw new QueryValidationError('dialect must be a positive integer');
        }
        this._dialect = dialect;
        return this;
    }

    /** Server-side query TIMEOUT in milliseconds. */
    timeout(ms: number): this {
        assertPositiveInteger(ms, 'timeout');
        this._timeout = ms;
        return this;
    }

    /** Disable stemming for the query string (VERBATIM). */
    verbatim(): this {
        this._verbatim = true;
        return this;
    }

    /** Include the document's `@__score` in the output (ADDSCORES). */
    addScores(): this {
        this._addScores = true;
        return this;
    }

    /** The rendered query string this aggregation will use. */
    get query(): string {
        return this._query;
    }

    /** Build the structured options for `client.ft.aggregate(indexName, query, options)`. */
    toCommand(): AggregateCommand {
        const options: FtAggregateOptions = {};

        if (this._verbatim) options.VERBATIM = true;
        if (this._addScores) options.ADDSCORES = true;
        if (this._timeout !== undefined) options.TIMEOUT = this._timeout;
        if (this._dialect !== undefined) options.DIALECT = this._dialect;
        if (this._params !== undefined) options.PARAMS = this._params;

        if (this._load && this._load.length > 0) {
            // The Redis client types LOAD entries with template-literal types
            // (`@${string}` / `$.${string}`). We've already enforced that
            // contract via prefixFieldRef, but TS can't see through the
            // string return — cast at the boundary.
            options.LOAD = this._load.map((f) =>
                typeof f === 'string'
                    ? prefixFieldRef(f)
                    : f.as !== undefined
                      ? { identifier: prefixFieldRef(f.identifier), AS: f.as }
                      : prefixFieldRef(f.identifier)
            ) as FtAggregateOptions['LOAD'];
        }

        if (this.steps.length > 0) {
            options.STEPS = this.steps.map((step) =>
                this.renderStep(step)
            ) as FtAggregateOptions['STEPS'];
        }

        return { query: this._query, options };
    }

    private renderStep(step: Step): unknown {
        switch (step.kind) {
            case 'GROUPBY':
                return {
                    type: 'GROUPBY',
                    properties: step.properties,
                    REDUCE: step.reducers.map((r) => this.renderReducer(r)),
                };
            case 'APPLY':
                return { type: 'APPLY', expression: step.expression, AS: step.as };
            case 'SORTBY': {
                const out: { type: 'SORTBY'; BY: unknown; MAX?: number } = {
                    type: 'SORTBY',
                    BY: step.by.map((entry) => {
                        const field = typeof entry === 'string' ? entry : entry.field;
                        const ref = prefixFieldRef(field);
                        const direction = typeof entry === 'string' ? undefined : entry.direction;
                        return direction ? { BY: ref, DIRECTION: direction } : ref;
                    }),
                };
                if (step.max !== undefined) out.MAX = step.max;
                return out;
            }
            case 'LIMIT':
                return { type: 'LIMIT', from: step.offset, size: step.count };
            case 'FILTER':
                return { type: 'FILTER', expression: step.expression };
        }
    }

    private renderReducer(r: Reducer): unknown {
        const base: { type: string; AS?: string } = { type: r.type };
        if (r.as !== undefined) base.AS = r.as;
        switch (r.type) {
            case 'COUNT':
                return base;
            case 'COUNT_DISTINCT':
            case 'COUNT_DISTINCTISH':
            case 'SUM':
            case 'MIN':
            case 'MAX':
            case 'AVG':
            case 'STDDEV':
            case 'TOLIST':
                return { ...base, property: prefixFieldRef(r.property) };
            case 'QUANTILE':
                return {
                    ...base,
                    property: prefixFieldRef(r.property),
                    quantile: r.quantile,
                };
            case 'FIRST_VALUE':
                return {
                    ...base,
                    property: prefixFieldRef(r.property),
                    ...(r.by !== undefined
                        ? {
                              BY:
                                  typeof r.by === 'string'
                                      ? prefixFieldRef(r.by)
                                      : {
                                            property: prefixFieldRef(r.by.property),
                                            ...(r.by.direction
                                                ? { direction: r.by.direction }
                                                : {}),
                                        },
                          }
                        : {}),
                };
            case 'RANDOM_SAMPLE':
                return {
                    ...base,
                    property: prefixFieldRef(r.property),
                    sampleSize: r.sampleSize,
                };
        }
    }
}

// Used in JSDoc @example blocks above.
export type { FilterInput };
