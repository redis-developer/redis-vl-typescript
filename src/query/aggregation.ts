/**
 * FT.AGGREGATE query builder.
 *
 * Builds the structured options consumed by `client.ft.aggregate()` and
 * `client.ft.aggregateWithCursor()`. Filters use the same FT.SEARCH filter
 * dialect as the other query types — the typed filter DSL composes here
 * via `FilterInput`. The post-aggregation `FILTER` step uses a different
 * dialect (FT.AGGREGATE expression syntax) and is therefore a raw string.
 *
 * @see https://redis.io/docs/latest/commands/ft.aggregate/
 */

import type { FtAggregateOptions } from '@redis/search/dist/lib/commands/AGGREGATE.js';
import { renderFilter, type FilterInput } from './base.js';
import { renderAggregationExpr, type AggregationExprInput } from './aggregation-expr.js';
import { QueryValidationError } from '../errors.js';

// ---------- Reducer builders -------------------------------------------------

/**
 * Internal shape of a REDUCE clause inside FT.AGGREGATE GROUPBY. The node-redis
 * types model this as a discriminated union — we expose it through small
 * builder factories so the consumer side reads like the filter DSL.
 */
type ReducerSpec =
    | { type: 'COUNT'; AS?: string }
    | { type: 'COUNT_DISTINCT'; property: FieldRef; AS?: string }
    | { type: 'SUM'; property: FieldRef; AS?: string }
    | { type: 'AVG'; property: FieldRef; AS?: string }
    | { type: 'MIN'; property: FieldRef; AS?: string }
    | { type: 'MAX'; property: FieldRef; AS?: string }
    | { type: 'STDDEV'; property: FieldRef; AS?: string }
    | { type: 'QUANTILE'; property: FieldRef; quantile: number; AS?: string }
    | { type: 'TOLIST'; property: FieldRef; AS?: string }
    | {
          type: 'FIRST_VALUE';
          property: FieldRef;
          AS?: string;
          BY?: { property: FieldRef; direction?: 'ASC' | 'DESC' };
      };

/**
 * Builder returned by the reducer factory functions. `.as(alias)` sets the
 * `AS` clause; `.toReducer()` materialises the value object consumed by
 * {@link AggregationQuery}.
 */
export interface ReducerBuilder {
    as(alias: string): ReducerBuilder;
    toReducer(): ReducerSpec;
}

/**
 * Redis Search field reference — either an `@field` or a `$.json.path`.
 * Mirrors the `RediSearchProperty` shape exported by `@redis/search` so the
 * values we feed into FT.AGGREGATE options type-check cleanly.
 */
type FieldRef = `@${string}` | `$.${string}`;

function prefixFieldRef(name: string): FieldRef {
    if (name.startsWith('@') || name.startsWith('$')) {
        return name as FieldRef;
    }
    return `@${name}` as const;
}

function builder(spec: ReducerSpec): ReducerBuilder {
    return {
        as(alias: string) {
            return builder({ ...spec, AS: alias });
        },
        toReducer() {
            return spec;
        },
    };
}

/** `COUNT` — number of records in the group. */
export function Count(): ReducerBuilder {
    return builder({ type: 'COUNT' });
}

/** `COUNT_DISTINCT` — distinct values of a property in the group. */
export function CountDistinct(property: string): ReducerBuilder {
    return builder({ type: 'COUNT_DISTINCT', property: prefixFieldRef(property) });
}

/** `SUM` — sum of a numeric property. */
export function Sum(property: string): ReducerBuilder {
    return builder({ type: 'SUM', property: prefixFieldRef(property) });
}

/** `AVG` — arithmetic mean of a numeric property. */
export function Avg(property: string): ReducerBuilder {
    return builder({ type: 'AVG', property: prefixFieldRef(property) });
}

/** `MIN` — minimum value of a numeric property. */
export function Min(property: string): ReducerBuilder {
    return builder({ type: 'MIN', property: prefixFieldRef(property) });
}

/** `MAX` — maximum value of a numeric property. */
export function Max(property: string): ReducerBuilder {
    return builder({ type: 'MAX', property: prefixFieldRef(property) });
}

/** `STDDEV` — population standard deviation of a numeric property. */
export function Stddev(property: string): ReducerBuilder {
    return builder({ type: 'STDDEV', property: prefixFieldRef(property) });
}

/**
 * `QUANTILE` — value at the given quantile fraction `[0, 1]`. For example,
 * `Quantile('price', 0.95)` is the 95th-percentile price.
 */
export function Quantile(property: string, quantile: number): ReducerBuilder {
    if (quantile < 0 || quantile > 1) {
        throw new QueryValidationError(`Quantile fraction must be in [0, 1] (got ${quantile})`);
    }
    return builder({ type: 'QUANTILE', property: prefixFieldRef(property), quantile });
}

/** `TOLIST` — collect all values of a property in the group into a list. */
export function ToList(property: string): ReducerBuilder {
    return builder({ type: 'TOLIST', property: prefixFieldRef(property) });
}

/**
 * `FIRST_VALUE` — first value of `property` in the group, optionally sorted
 * by another field first.
 */
export function FirstValue(
    property: string,
    sortBy?: { field: string; direction?: 'ASC' | 'DESC' }
): ReducerBuilder {
    const spec: ReducerSpec = {
        type: 'FIRST_VALUE',
        property: prefixFieldRef(property),
    };
    if (sortBy) {
        spec.BY = {
            property: prefixFieldRef(sortBy.field),
            ...(sortBy.direction ? { direction: sortBy.direction } : {}),
        };
    }
    return builder(spec);
}

// ---------- AggregationQuery -------------------------------------------------

/**
 * Configuration for the cursored variant. When supplied, the query must be
 * dispatched through {@link SearchIndex.aggregateStream} — `aggregate()`
 * rejects cursor-configured queries.
 */
export interface CursorConfig {
    /** Number of records to return per cursor batch. */
    count?: number;
    /** Maximum idle time for the cursor in milliseconds. */
    maxIdle?: number;
}

/** A single APPLY pipeline step (computed field). */
export interface AggregationApply {
    /**
     * FT.AGGREGATE expression — either an {@link AggregationExpr} built with
     * the typed expression DSL or a raw string (e.g. `'@revenue / @total'`).
     *
     * Note: the v1 DSL covers comparison + logical operators only; arithmetic
     * expressions like `@revenue / @total` still require a raw string until
     * the DSL grows arithmetic support.
     */
    expression: AggregationExprInput;
    /** Alias for the computed field in subsequent steps. */
    as: string;
}

/** GROUPBY clause: which fields to group on, and the reducers to apply. */
export interface AggregationGroupBy {
    /** Field names to group by. Bare names are auto-prefixed with `@`. */
    fields: string[];
    /** Reducer expressions, built via {@link Count}, {@link Sum}, etc. */
    reducers: ReducerBuilder[];
}

/** Sort specification for the post-aggregation SORTBY step. */
export interface AggregationSortField {
    field: string;
    direction?: 'ASC' | 'DESC';
}

/** Configuration for {@link AggregationQuery}. */
export interface AggregationQueryConfig {
    /**
     * Pre-aggregation filter. Same FT.SEARCH dialect as `FilterQuery.filter`.
     * Defaults to `*` (match everything).
     */
    filter?: FilterInput;

    /** Fields to LOAD into the aggregation pipeline. */
    load?: string[];

    /**
     * GROUPBY step. v1 supports a single group-by block; multiple GROUPBYs
     * (re-grouping the results of an earlier GROUPBY) aren't yet exposed.
     */
    groupBy?: AggregationGroupBy;

    /** APPLY steps emitted after GROUPBY, in order. */
    apply?: AggregationApply[];

    /** SORTBY step. */
    sortBy?: AggregationSortField[];

    /** Pagination size. */
    limit?: number;

    /** Pagination offset. Defaults to 0 when `limit` is set. */
    offset?: number;

    /**
     * Post-aggregation FILTER step. Accepts either an {@link AggregationExpr}
     * built with the typed expression DSL (`AField('total').gt(10)`) or a
     * raw string (`'@total > 10'`). Uses the FT.AGGREGATE expression dialect,
     * NOT the FT.SEARCH filter dialect that {@link AggregationQueryConfig.filter}
     * accepts.
     */
    postFilter?: AggregationExprInput;

    /**
     * Enable cursored streaming via FT.AGGREGATE WITHCURSOR. When set, the
     * query must be dispatched through {@link SearchIndex.aggregateStream};
     * {@link SearchIndex.aggregate} rejects cursor-configured queries.
     */
    cursor?: CursorConfig;

    /** Bind parameters substituted into the filter and expressions. */
    params?: Record<string, string | number | Buffer>;

    /** Server-side query timeout in milliseconds. */
    timeout?: number;
}

/** Output of {@link AggregationQuery.toCommand}. */
export interface AggregationCommand {
    /** The FT.SEARCH-dialect filter string. */
    query: string;
    /** Options to pass to `client.ft.aggregate()` / `client.ft.aggregateWithCursor()`. */
    options: FtAggregateOptions;
}

/**
 * Build an FT.AGGREGATE call from a high-level configuration object.
 *
 * Steps are emitted in the canonical order GROUPBY → APPLY → SORTBY → LIMIT
 * → FILTER. Most aggregation pipelines fit cleanly into this order. Users who
 * need interleaved APPLY/SORTBY rounds should drop down to the underlying
 * `client.ft.aggregate()` directly.
 *
 * @example
 * ```typescript
 * import { AggregationQuery, Count, Sum, Tag } from 'redisvl';
 *
 * const q = new AggregationQuery({
 *   filter: Tag('category').eq('electronics'),
 *   groupBy: {
 *     fields: ['brand'],
 *     reducers: [Count().as('total'), Sum('price').as('revenue')],
 *   },
 *   sortBy: [{ field: 'revenue', direction: 'DESC' }],
 *   limit: 25,
 * });
 *
 * const { total, rows } = await index.aggregate(q);
 * ```
 */
export class AggregationQuery {
    public readonly filter?: FilterInput;
    public readonly load?: string[];
    public readonly groupBy?: AggregationGroupBy;
    public readonly apply?: AggregationApply[];
    public readonly sortBy?: AggregationSortField[];
    public readonly limit?: number;
    public readonly offset: number;
    public readonly postFilter?: AggregationExprInput;
    public readonly cursor?: CursorConfig;
    public readonly params?: Record<string, string | number | Buffer>;
    public readonly timeout?: number;

    constructor(config: AggregationQueryConfig = {}) {
        if (config.limit !== undefined && config.limit < 0) {
            throw new QueryValidationError('limit must be non-negative');
        }
        if (config.offset !== undefined && config.offset < 0) {
            throw new QueryValidationError('offset must be non-negative');
        }
        if (config.cursor) {
            if (config.cursor.count !== undefined && config.cursor.count <= 0) {
                throw new QueryValidationError('cursor.count must be positive');
            }
            if (config.cursor.maxIdle !== undefined && config.cursor.maxIdle <= 0) {
                throw new QueryValidationError('cursor.maxIdle must be positive');
            }
        }

        this.filter = config.filter;
        this.load = config.load;
        this.groupBy = config.groupBy;
        this.apply = config.apply;
        this.sortBy = config.sortBy;
        this.limit = config.limit;
        this.offset = config.offset ?? 0;
        this.postFilter = config.postFilter;
        this.cursor = config.cursor;
        this.params = config.params;
        this.timeout = config.timeout;
    }

    /** Render the query into the structured arguments for `client.ft.aggregate()`. */
    toCommand(): AggregationCommand {
        const options: FtAggregateOptions = {};

        if (this.load && this.load.length > 0) {
            options.LOAD = this.load.map((f) => prefixFieldRef(f));
        }

        const steps = this.buildSteps();
        if (steps.length > 0) {
            options.STEPS = steps;
        }

        if (this.params !== undefined) options.PARAMS = this.params;
        if (this.timeout !== undefined) options.TIMEOUT = this.timeout;

        return { query: renderFilter(this.filter), options };
    }

    private buildSteps(): NonNullable<FtAggregateOptions['STEPS']> {
        const steps: NonNullable<FtAggregateOptions['STEPS']> = [];

        if (this.groupBy) {
            steps.push({
                type: 'GROUPBY',
                properties: this.groupBy.fields.map((f) => prefixFieldRef(f)),
                REDUCE: this.groupBy.reducers.map((r) => r.toReducer()),
            });
        }

        if (this.apply) {
            for (const a of this.apply) {
                const expr = renderAggregationExpr(a.expression);
                if (expr === undefined) continue;
                steps.push({ type: 'APPLY', expression: expr, AS: a.as });
            }
        }

        if (this.sortBy && this.sortBy.length > 0) {
            steps.push({
                type: 'SORTBY',
                BY: this.sortBy.map((s) => ({
                    BY: prefixFieldRef(s.field),
                    ...(s.direction ? { DIRECTION: s.direction } : {}),
                })),
            });
        }

        if (this.limit !== undefined) {
            steps.push({ type: 'LIMIT', from: this.offset, size: this.limit });
        }

        const postFilterExpr = renderAggregationExpr(this.postFilter);
        if (postFilterExpr !== undefined) {
            // The FT.AGGREGATE expression dialect (e.g. `@total > 10`),
            // distinct from the FT.SEARCH filter dialect that `filter` uses.
            steps.push({ type: 'FILTER', expression: postFilterExpr });
        }

        return steps;
    }
}
