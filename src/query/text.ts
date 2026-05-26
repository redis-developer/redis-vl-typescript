import { renderFilter, type BaseQuery, type FilterInput } from './base.js';
import { TokenEscaper } from '../utils/token-escaper.js';
import { QueryValidationError } from '../errors.js';
import { resolveStopwords, type StopwordsInput } from '../utils/stopwords/resolve.js';

const escaper = new TokenEscaper();

function normalizeToken(token: string): string {
    let t = token.trim();
    while (t.startsWith(',')) t = t.slice(1);
    while (t.endsWith(',')) t = t.slice(0, -1);
    return t.replaceAll('“', '').replaceAll('”', '').toLowerCase();
}

/**
 * A Redis Search built-in text scorer.
 * @see https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/scoring/
 */
export type TextScorer = 'BM25' | 'BM25STD' | 'TFIDF' | 'TFIDF.DOCNORM' | 'DISMAX' | 'DOCSCORE';

/**
 * Configuration for {@link TextQuery}.
 */
export interface TextQueryConfig {
    /** Free-text query. Tokenised on whitespace, normalized (lowercase, comma + curly-quote strip), stopword-filtered, then OR-joined. */
    text: string;

    /**
     * Indexed text field to search against. Pass a string to search a single
     * field, or a `Record<field, weight>` to search multiple fields with
     * per-field weighting. Weights must be finite numbers > 0.
     */
    textFieldName: string | Record<string, number>;

    /**
     * Scorer to apply when ranking results. Defaults to `BM25STD`.
     * Has no effect unless the index field is configured as TEXT.
     */
    textScorer?: TextScorer;

    /** Optional filter expression combined with the text clause via AND. */
    filter?: FilterInput;

    /** Fields to include in each result document. */
    returnFields?: string[];

    /** Number of results to return. Defaults to 10. */
    numResults?: number;

    /** Pagination offset. */
    offset?: number;

    /** Pagination limit. Defaults to numResults. */
    limit?: number;

    /**
     * Per-token weight map. Keys are individual words (no inner whitespace) and
     * are matched case-insensitively against the lowercased query tokens. Values
     * must be finite numbers >= 0. A weight of 0 effectively suppresses scoring
     * for that token. When omitted, no per-token weighting is applied.
     */
    textWeights?: Record<string, number>;

    /**
     * Stopwords to drop before OR-joining tokens.
     *
     * - `'english'` (default): use the embedded NLTK English list (198 words, BSD-3-Clause Snowball).
     * - `readonly string[]` or `ReadonlySet<string>`: explicit list. Stored as-is — pass lowercase
     *   entries because tokens are lowercased before lookup. `['The']` will NOT filter `'the'`.
     * - `null`: skip filtering entirely.
     *
     * The language identifier is matched strictly (lowercase, exact). `'English'` throws.
     * Non-string members of iterables throw at construction.
     */
    stopwords?: StopwordsInput;
}

function parseFieldWeights(spec: string | Record<string, number>): Record<string, number> {
    if (spec == null || spec === '') {
        throw new QueryValidationError('textFieldName is required');
    }
    if (typeof spec === 'string') {
        return { [spec]: 1.0 };
    }
    for (const [field, weight] of Object.entries(spec)) {
        if (!Number.isFinite(weight) || weight <= 0) {
            throw new QueryValidationError(
                `textFieldName weight for '${field}' must be a finite number > 0, got ${weight}`
            );
        }
    }
    return spec;
}

function parseTextWeights(weights: Record<string, number> | undefined): Record<string, number> {
    const parsed: Record<string, number> = {};
    if (!weights) return parsed;
    for (const [rawKey, weight] of Object.entries(weights)) {
        const key = rawKey.trim().toLowerCase();
        if (!key || key.includes(' ')) {
            throw new QueryValidationError(
                `Only individual words may be weighted. Got { ${rawKey}:${weight} }`
            );
        }
        if (!Number.isFinite(weight) || weight < 0) {
            throw new QueryValidationError(
                `Weights must be a positive number. Got { ${key}:${weight} }`
            );
        }
        parsed[key] = weight;
    }
    return parsed;
}

/**
 * Full-text search query with optional filter.
 *
 * Tokenises the input on whitespace, normalises each token (trim, strip
 * leading/trailing commas, strip typographic quotes, lowercase), drops
 * stopwords, escapes Redis Search special characters, and OR-joins the
 * survivors inside the target field. Use `filter` to scope the search to
 * a subset of documents (e.g. by tag or numeric range).
 *
 * Supports per-token weighting via `textWeights` and per-field weighting by
 * passing a `Record<field, weight>` to `textFieldName`. Both render using
 * Redis Search's `=> { $weight: N }` syntax (dialect 2).
 *
 * @example Single-field, default weights
 * ```typescript
 * import { TextQuery, Tag } from 'redis-vl';
 *
 * const q = new TextQuery({
 *   text: 'machine learning',
 *   textFieldName: 'description',
 * });
 * ```
 *
 * @example Multi-field weighted
 * ```typescript
 * new TextQuery({
 *   text: 'machine learning',
 *   textFieldName: { title: 5.0, body: 1.0 },
 * });
 * ```
 *
 * @example Per-token weighted
 * ```typescript
 * new TextQuery({
 *   text: 'apple orange pear',
 *   textFieldName: 'description',
 *   textWeights: { apple: 2.0, orange: 0.5 },
 * });
 * ```
 */
export class TextQuery implements BaseQuery {
    public readonly text: string;
    /**
     * Per-field weights. Iteration follows insertion order, which determines
     * the order of field clauses in the rendered query. A single field with
     * weight 1.0 renders identically to passing a bare string for `textFieldName`.
     */
    public readonly fieldWeights: Readonly<Record<string, number>>;
    /** Per-token weights. Keys are normalised to lowercase, whitespace-trimmed single tokens. */
    public readonly textWeights: Readonly<Record<string, number>>;
    public readonly textScorer: TextScorer;
    public readonly filter?: FilterInput;
    public readonly returnFields?: string[];
    public readonly numResults: number;
    public readonly offset?: number;
    public readonly limit?: number;
    public readonly stopwords: ReadonlySet<string> | null;

    constructor(config: TextQueryConfig) {
        if (!config.text || config.text.trim() === '') {
            throw new QueryValidationError('text cannot be empty');
        }

        this.text = config.text;
        this.fieldWeights = parseFieldWeights(config.textFieldName);
        this.textWeights = parseTextWeights(config.textWeights);
        this.textScorer = config.textScorer ?? 'BM25STD';
        this.filter = config.filter;
        this.returnFields = config.returnFields;
        this.numResults = config.numResults ?? 10;
        this.offset = config.offset;
        this.limit = config.limit ?? this.numResults;
        this.stopwords = resolveStopwords(config.stopwords);
    }

    buildQuery(): string {
        const stopwordSet = this.stopwords;
        const weights = this.textWeights;
        const tokens: string[] = [];
        for (const raw of this.text.split(/\s+/)) {
            const norm = normalizeToken(raw);
            if (norm.length === 0) continue;
            if (stopwordSet && stopwordSet.has(norm)) continue;
            const escaped = escaper.escape(norm);
            if (Object.hasOwn(weights, norm)) {
                tokens.push(`${escaped}=>{$weight:${weights[norm]}}`);
            } else {
                tokens.push(escaped);
            }
        }

        if (tokens.length === 0) {
            throw new QueryValidationError(
                'text yielded no tokens after normalization and stopword filtering'
            );
        }

        const orList = tokens.join(' | ');

        const fieldClauses: string[] = [];
        for (const [field, weight] of Object.entries(this.fieldWeights)) {
            if (weight === 1.0) {
                fieldClauses.push(`@${field}:(${orList})`);
            } else {
                fieldClauses.push(`@${field}:(${orList}) => { $weight: ${weight} }`);
            }
        }

        const textClause =
            fieldClauses.length === 1 ? fieldClauses[0] : `(${fieldClauses.join(' | ')})`;

        const filterStr = renderFilter(this.filter);
        if (filterStr === '*') {
            return textClause;
        }
        return `(${filterStr} ${textClause})`;
    }

    buildParams(): Record<string, unknown> {
        return {};
    }

    /**
     * Returns the configured text field. A bare string is returned when exactly
     * one field is configured with weight 1.0. Otherwise returns a copy of the
     * normalised field-weight record. Mirrors Python's `text_field_name`
     * property for cross-language compatibility.
     */
    get textFieldName(): string | Readonly<Record<string, number>> {
        const entries = Object.entries(this.fieldWeights);
        if (entries.length === 1) {
            const [field, weight] = entries[0];
            if (weight === 1.0) {
                return field;
            }
        }
        return { ...this.fieldWeights };
    }
}
