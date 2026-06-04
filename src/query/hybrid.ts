/**
 * Hybrid search query that combines text (BM25) and vector similarity in a
 * single Redis-side `FT.HYBRID` call with server-side score fusion.
 *
 * Unlike the Python redisvl `HybridQuery` (which issues two queries and fuses
 * client-side), this implementation delegates fusion entirely to Redis via
 * `FT.HYBRID`. That command was added in Redis Open Source 8.4.0, so the
 * connected server must be at least that version.
 *
 * @see https://redis.io/docs/latest/commands/ft.hybrid/
 *
 * @experimental The underlying `client.ft.hybrid()` is flagged experimental
 * by `@redis/search` — its arguments and reply shape may change in a future
 * release. Pin your `@redis/search` version if stability matters.
 */

import type { FtHybridOptions } from '@redis/search/dist/lib/commands/HYBRID.js';
import { QueryValidationError } from '../errors.js';
import { encodeVectorBuffer } from '../redis/utils.js';
import { TokenEscaper } from '../utils/token-escaper.js';
import {
    BaseVectorQuery,
    renderFilter,
    type BaseVectorQueryConfig,
    type FilterInput,
} from './base.js';
import type { TextScorer } from './text.js';

const escaper = new TokenEscaper();
const DEFAULT_COMBINE: HybridCombine = { type: 'RRF' };

/**
 * Vector retrieval method used by FT.HYBRID's VSIM clause.
 *
 * - `KNN` returns the top-k nearest neighbours.
 * - `RANGE` returns every vector within `radius` distance of the query.
 */
export type HybridVectorMethod =
    | { type: 'KNN'; k?: number; efRuntime?: number }
    | { type: 'RANGE'; radius: number; epsilon?: number };

/**
 * Score fusion strategy applied by FT.HYBRID's COMBINE clause.
 *
 * - `RRF` (Reciprocal Rank Fusion) — robust default; combines by rank, not
 *   raw scores.
 * - `LINEAR` — weighted sum of the (normalized) text and vector scores.
 *   `alpha` weights the text score, `beta` weights the vector score; both
 *   must lie in `[0, 1]`.
 */
export type HybridCombine =
    | { type: 'RRF'; constant?: number; window?: number }
    | { type: 'LINEAR'; alpha?: number; beta?: number; window?: number };

type HybridSortField = { field: string; direction?: 'ASC' | 'DESC' };

/** Configuration for {@link HybridQuery}. */
export interface HybridQueryConfig extends BaseVectorQueryConfig {
    /**
     * Text query body.
     *
     * - When {@link textFieldName} is provided the value is tokenized on
     *   whitespace, escaped, and OR-joined inside that field.
     * - When {@link textFieldName} is omitted the text is passed through
     *   verbatim, allowing full Redis Search syntax (e.g.
     *   `'@brand:{nike} hello'`).
     */
    text: string;

    /** Indexed text field name. When supplied, triggers tokenization. */
    textFieldName?: string;

    /**
     * Vector retrieval method. Defaults to `{ type: 'KNN', k: 10 }`.
     */
    vectorMethod?: HybridVectorMethod;

    /**
     * Pre-filter applied inside the VSIM clause (FT.HYBRID `VSIM ... FILTER`).
     *
     * Accepts either a {@link FilterExpression} built with the typed filter
     * DSL (`Tag('brand').eq('nike')`) or a raw filter string in the FT.SEARCH
     * filter dialect (`'@brand:{nike}'`, `'@price:[0 1000]'`).
     */
    vsimFilter?: FilterInput;

    /**
     * Post-filter applied after fusion (FT.HYBRID top-level `FILTER`).
     *
     * **Important**: this clause uses the FT.AGGREGATE expression dialect
     * (e.g. `'@price < 200'`, `'@score > 0.5'`), NOT the FT.SEARCH filter
     * dialect that {@link vsimFilter} accepts.
     */
    postFilter?: string;

    /** Text scorer (defaults to server default `BM25STD`). */
    textScorer?: TextScorer;

    /**
     * Score fusion configuration. Defaults to `{ type: 'RRF' }` (Reciprocal
     * Rank Fusion) — the library always emits a COMBINE clause so the
     * combined score is yielded under a stable alias regardless of any
     * server-side default changes.
     */
    combine?: HybridCombine;

    /** Alias for the SEARCH-side score (`SEARCH ... YIELD_SCORE_AS`). */
    textScoreAlias?: string;

    /** Alias for the VSIM-side score (`VSIM ... YIELD_SCORE_AS`). */
    vectorScoreAlias?: string;

    /**
     * Alias for the combined fused score (`COMBINE ... YIELD_SCORE_AS`).
     * @default 'hybrid_score'
     */
    combinedScoreAlias?: string;

    /** Number of results to return. Defaults to 10. */
    numResults?: number;

    /** Sort specification (FT.HYBRID `SORTBY`). */
    sortBy?: Array<{ field: string; direction?: 'ASC' | 'DESC' }>;

    /** Disable result sorting (FT.HYBRID `NOSORT`). */
    noSort?: boolean;

    /** Server-side query timeout in milliseconds. */
    timeout?: number;
}

/** Output of {@link HybridQuery.toCommand}. */
export interface HybridCommand {
    /** Options to pass to `client.ft.hybrid(indexName, options)`. */
    options: FtHybridOptions;
}

/** Default parameter name for the encoded query vector. */
const VECTOR_PARAM_NAME = 'vector';

/**
 * Prefix a bare field name with `@` for the Redis Search field-reference
 * convention. `@field` and `$.json.path` are returned verbatim. A bare
 * `$name` (no dot) is rejected: it's either a PARAMS-style reference that
 * doesn't belong in a LOAD/SORTBY slot or a typo of `@name`/`$.name`.
 */
function prefixFieldRef(name: string): string {
    const field = name.trim();
    if (field.startsWith('@')) return field;
    if (field.startsWith('$')) {
        if (!field.startsWith('$.')) {
            throw new QueryValidationError(
                `Field reference '${field}' looks like a parameter ref or typo; ` +
                    `use '@${field.slice(1)}' for an index field or '$.${field.slice(1)}' for a JSONPath`
            );
        }
        return field;
    }
    return `@${field}`;
}

function assertNonEmptyString(value: string | undefined, label: string): void {
    if (value !== undefined && (typeof value !== 'string' || value.trim() === '')) {
        throw new QueryValidationError(`${label} cannot be empty`);
    }
}

function assertPositiveInteger(value: number | undefined, label: string): void {
    if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
        throw new QueryValidationError(`${label} must be a positive integer`);
    }
}

function assertNonNegativeInteger(value: number | undefined, label: string): void {
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        throw new QueryValidationError(`${label} must be a non-negative integer`);
    }
}

function assertNonNegativeNumber(value: number | undefined, label: string): void {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
        throw new QueryValidationError(`${label} must be non-negative`);
    }
}

function assertUnitInterval(value: number | undefined, label: string): void {
    if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 1)) {
        throw new QueryValidationError(`${label} must be in [0, 1]`);
    }
}

function validateSortBy(
    sortBy: Array<{ field: string; direction?: 'ASC' | 'DESC' }> | undefined
): Array<{ field: string; direction?: 'ASC' | 'DESC' }> | undefined {
    if (sortBy === undefined) return undefined;
    return sortBy.map((sort) => {
        assertNonEmptyString(sort.field, 'sort field');
        if (sort.direction !== undefined && sort.direction !== 'ASC' && sort.direction !== 'DESC') {
            throw new QueryValidationError('sort direction must be either ASC or DESC');
        }
        return { ...sort, field: sort.field.trim() };
    });
}

/**
 * Build an FT.HYBRID call from a high-level configuration object.
 *
 * @example
 * ```typescript
 * import { HybridQuery } from 'redis-vl';
 *
 * const q = new HybridQuery({
 *   text: 'machine learning',
 *   textFieldName: 'description',
 *   vector: embedding,
 *   vectorField: 'embedding',
 *   vectorMethod: { type: 'KNN', k: 20 },
 *   combine: { type: 'RRF', constant: 60 },
 *   vsimFilter: '@brand:{nike}',           // FT.SEARCH filter dialect
 *   postFilter: '@price < 1000',           // FT.AGGREGATE expression dialect
 *   returnFields: ['title', 'price'],
 * });
 *
 * const results = await index.hybridSearch(q);
 * ```
 */
export class HybridQuery extends BaseVectorQuery {
    public readonly text: string;
    public readonly textFieldName?: string;
    public readonly vectorMethod:
        | { type: 'KNN'; k: number; efRuntime?: number }
        | { type: 'RANGE'; radius: number; epsilon?: number };
    public readonly postFilter?: string;
    public readonly textScorer?: TextScorer;
    public readonly combine?: HybridCombine;
    public readonly textScoreAlias?: string;
    public readonly vectorScoreAlias?: string;
    public readonly combinedScoreAlias: string;
    public readonly numResults: number;
    public readonly noSort?: boolean;
    public readonly timeout?: number;
    private readonly _hybridSortBy?: HybridSortField[];

    constructor(config: HybridQueryConfig) {
        if (!config.text || config.text.trim() === '') {
            throw new QueryValidationError('text cannot be empty');
        }
        assertNonEmptyString(config.textFieldName, 'textFieldName');
        assertNonEmptyString(config.postFilter, 'postFilter');
        assertNonEmptyString(config.textScoreAlias, 'textScoreAlias');
        assertNonEmptyString(config.vectorScoreAlias, 'vectorScoreAlias');
        assertNonEmptyString(config.combinedScoreAlias, 'combinedScoreAlias');

        const method = config.vectorMethod ?? { type: 'KNN', k: 10 };
        if (method.type === 'KNN') {
            assertPositiveInteger(method.k, 'vectorMethod.k');
            assertPositiveInteger(method.efRuntime, 'vectorMethod.efRuntime');
        } else {
            assertNonNegativeNumber(method.radius, 'vectorMethod.radius');
            assertNonNegativeNumber(method.epsilon, 'vectorMethod.epsilon');
        }

        if (config.combine?.type === 'LINEAR') {
            const { alpha, beta } = config.combine;
            assertUnitInterval(alpha, 'combine.alpha');
            assertUnitInterval(beta, 'combine.beta');
            assertPositiveInteger(config.combine.window, 'combine.window');
        } else if (config.combine?.type === 'RRF') {
            assertPositiveInteger(config.combine.constant, 'combine.constant');
            assertPositiveInteger(config.combine.window, 'combine.window');
        }

        assertPositiveInteger(config.numResults ?? 10, 'numResults');
        assertNonNegativeInteger(config.offset ?? 0, 'offset');
        assertPositiveInteger(config.timeout, 'timeout');
        const sortBy = validateSortBy(config.sortBy);
        if (config.noSort && sortBy && sortBy.length > 0) {
            throw new QueryValidationError('noSort cannot be used with sortBy');
        }

        // Pre-validate that tokenization will produce something useful when
        // the user opted in to it. Empty tokens after splitting would yield
        // a malformed `@field:()` clause.
        if (config.textFieldName !== undefined) {
            const tokens = config.text.split(/\s+/).filter((t) => t.length > 0);
            if (tokens.length === 0) {
                throw new QueryValidationError(
                    'text yielded no tokens after whitespace split — supply at least one non-empty token'
                );
            }
        }

        const vsimFilter = config.vsimFilter ?? config.filter;
        super({
            ...config,
            filter: vsimFilter,
            offset: config.offset ?? 0,
            limit: config.numResults ?? 10,
        });

        this.text = config.text;
        this.textFieldName = config.textFieldName;
        this.vectorMethod =
            method.type === 'KNN'
                ? { type: 'KNN', k: method.k ?? 10, efRuntime: method.efRuntime }
                : method;
        this.postFilter = config.postFilter;
        this.textScorer = config.textScorer;
        this.combine = config.combine;
        this.textScoreAlias = config.textScoreAlias;
        this.vectorScoreAlias = config.vectorScoreAlias;
        this.combinedScoreAlias = config.combinedScoreAlias ?? 'hybrid_score';
        this.numResults = config.numResults ?? 10;
        this._hybridSortBy = sortBy;
        this.noSort = config.noSort;
        this.timeout = config.timeout;
    }

    /** VSIM filter used to pre-filter vector candidates. */
    get vsimFilter(): FilterInput | undefined {
        return this.filter;
    }

    /** The SEARCH clause query body. */
    buildQuery(): string {
        return this.renderTextBody();
    }

    /**
     * Convert this query into the structured options expected by
     * `client.ft.hybrid(indexName, options)`.
     */
    toCommand(): HybridCommand {
        const options: FtHybridOptions = {
            SEARCH: this.buildSearchClause(),
            VSIM: this.buildVsimClause(),
            PARAMS: { [VECTOR_PARAM_NAME]: encodeVectorBuffer(this.vector, this.datatype) },
            LIMIT: { offset: this.offset ?? 0, count: this.limit ?? this.numResults },
        };

        // Always yield a known combined score alias so result mapping is stable
        // even when callers rely on Redis' default fusion behavior.
        options.COMBINE = this.buildCombineClause();

        // FT.HYBRID does not include @__key in result rows by default —
        // it has to be in LOAD for the document key to round-trip back as
        // doc.id. Score aliases declared via YIELD_SCORE_AS are already
        // injected into each row by Redis; LOAD'ing them again would error
        // with "score alias already exists".
        const loadFields = new Set<string>(['@__key']);
        if (this.returnFields) {
            for (const f of this.returnFields) loadFields.add(prefixFieldRef(f));
        }
        options.LOAD = [...loadFields];

        const sortFields = this.getHybridSortFields();
        if (this.noSort && sortFields.length > 0) {
            throw new QueryValidationError('noSort cannot be used with sortBy');
        }

        if (sortFields.length > 0) {
            // SORTBY uses the same field-reference convention as LOAD —
            // `@field` for hash fields, `$.path` for JSON paths.
            options.SORTBY = {
                fields: sortFields.map((s) => ({
                    field: prefixFieldRef(s.field as string),
                    ...(s.direction ? { direction: s.direction } : {}),
                })),
            };
        }

        if (this.noSort) options.NOSORT = true;

        if (this.postFilter !== undefined) {
            // FT.HYBRID's top-level FILTER uses FT.AGGREGATE expression
            // syntax (`@price < 200`), distinct from the FT.SEARCH filter
            // syntax used by vsimFilter. We pass the user's string through.
            options.FILTER = this.postFilter;
        }

        if (this.timeout !== undefined) options.TIMEOUT = this.timeout;

        return { options };
    }

    private buildSearchClause(): FtHybridOptions['SEARCH'] {
        const search: FtHybridOptions['SEARCH'] = {
            query: this.renderTextBody(),
        };
        if (this.textScorer !== undefined) search.SCORER = this.textScorer;
        if (this.textScoreAlias !== undefined) search.YIELD_SCORE_AS = this.textScoreAlias;
        return search;
    }

    private renderTextBody(): string {
        if (this.textFieldName === undefined) {
            return this.text;
        }
        const tokens = this.text
            .split(/\s+/)
            .filter((t) => t.length > 0)
            .map((t) => escaper.escape(t));
        return `@${this.textFieldName}:(${tokens.join(' | ')})`;
    }

    private buildVsimClause(): FtHybridOptions['VSIM'] {
        const vsim: FtHybridOptions['VSIM'] = {
            field: `@${this.vectorField}`,
            vector: `$${VECTOR_PARAM_NAME}`,
            method: this.encodeVectorMethod(),
        };
        if (this.vsimFilter !== undefined) vsim.FILTER = renderFilter(this.vsimFilter);
        if (this.vectorScoreAlias !== undefined) vsim.YIELD_SCORE_AS = this.vectorScoreAlias;
        return vsim;
    }

    private getHybridSortFields(): HybridSortField[] {
        return [...(this._hybridSortBy ?? []), ...this.sortFields];
    }

    private encodeVectorMethod(): NonNullable<FtHybridOptions['VSIM']['method']> {
        const m = this.vectorMethod;
        if (m.type === 'KNN') {
            const out: { type: 'KNN'; K: number; EF_RUNTIME?: number } = {
                type: 'KNN',
                K: m.k,
            };
            if (m.efRuntime !== undefined) out.EF_RUNTIME = m.efRuntime;
            return out;
        }
        const out: { type: 'RANGE'; RADIUS: number; EPSILON?: number } = {
            type: 'RANGE',
            RADIUS: m.radius,
        };
        if (m.epsilon !== undefined) out.EPSILON = m.epsilon;
        return out;
    }

    private buildCombineClause(): FtHybridOptions['COMBINE'] {
        const combine = this.combine ?? DEFAULT_COMBINE;
        const yieldAs = this.combinedScoreAlias;
        if (combine.type === 'RRF') {
            const method: { type: 'RRF'; CONSTANT?: number; WINDOW?: number } = { type: 'RRF' };
            if (combine.constant !== undefined) method.CONSTANT = combine.constant;
            if (combine.window !== undefined) method.WINDOW = combine.window;
            return { method, YIELD_SCORE_AS: yieldAs };
        }
        const method: {
            type: 'LINEAR';
            ALPHA?: number;
            BETA?: number;
            WINDOW?: number;
        } = { type: 'LINEAR' };
        if (combine.alpha !== undefined) method.ALPHA = combine.alpha;
        if (combine.beta !== undefined) method.BETA = combine.beta;
        if (combine.window !== undefined) method.WINDOW = combine.window;
        return { method, YIELD_SCORE_AS: yieldAs };
    }
}
