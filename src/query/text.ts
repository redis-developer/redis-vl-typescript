import { renderFilter, type BaseQuery, type FilterInput } from './base.js';
import { TokenEscaper } from '../utils/token-escaper.js';
import { QueryValidationError } from '../errors.js';
import { resolveStopwords, type StopwordsInput } from '../utils/stopwords/resolve.js';

const escaper = new TokenEscaper();

const STRIP_LEADING_TRAILING_COMMAS = /^,+|,+$/g;
const TYPOGRAPHIC_QUOTES = /[“”]/g;

function normalizeToken(token: string): string {
    return token
        .trim()
        .replace(STRIP_LEADING_TRAILING_COMMAS, '')
        .replace(TYPOGRAPHIC_QUOTES, '')
        .toLowerCase();
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
    if (typeof spec === 'string') {
        if (spec.length === 0) {
            throw new QueryValidationError('textFieldName is required');
        }
        return Object.freeze({ [spec]: 1.0 }) as Record<string, number>;
    }
    if (spec === null || typeof spec !== 'object' || Array.isArray(spec)) {
        throw new QueryValidationError(
            'textFieldName must be a string or a record of field:weight mappings'
        );
    }
    const entries = Object.entries(spec);
    if (entries.length === 0) {
        throw new QueryValidationError('textFieldName record must contain at least one field');
    }
    const normalized: Record<string, number> = {};
    for (const [field, weight] of entries) {
        if (typeof field !== 'string' || field.length === 0) {
            throw new QueryValidationError('textFieldName keys must be non-empty strings');
        }
        if (typeof weight !== 'number' || !Number.isFinite(weight) || weight <= 0) {
            throw new QueryValidationError(
                `textFieldName weight for '${field}' must be a finite number > 0, got ${String(weight)}`
            );
        }
        normalized[field] = weight;
    }
    return Object.freeze(normalized);
}

/**
 * Full-text search query with optional filter.
 *
 * Tokenises the input on whitespace, normalizes each token (trim, strip
 * leading/trailing commas, strip typographic quotes, lowercase), escapes
 * Redis Search special characters, drops stopwords, and OR-joins the
 * survivors inside the target field. Use `filter` to scope the search to
 * a subset of documents (e.g. by tag or numeric range).
 *
 * **Note:** per-field and per-token weights from Python's
 * `redisvl.query.TextQuery` are not yet ported.
 *
 * @example
 * ```typescript
 * import { TextQuery, Tag } from 'redis-vl';
 *
 * const q = new TextQuery({
 *   text: 'machine learning',
 *   textFieldName: 'description',
 *   filter: Tag('category').eq('tech'),
 * });
 * const results = await index.search(q);
 * ```
 */
export class TextQuery implements BaseQuery {
    public readonly text: string;
    public readonly fieldWeights: Readonly<Record<string, number>>;
    /** @internal — replaced in Task 5 with Python-compat getter */
    public readonly textFieldName: string;
    public readonly textScorer: TextScorer;
    public readonly filter?: FilterInput;
    public readonly returnFields?: string[];
    public readonly numResults: number;
    public readonly offset?: number;
    public readonly limit?: number;
    public readonly stopwords: ReadonlySet<string> | null;

    constructor(config: TextQueryConfig) {
        this.text = config.text;
        this.fieldWeights = parseFieldWeights(config.textFieldName);
        const firstField = Object.keys(this.fieldWeights)[0];
        this.textFieldName = firstField;
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
        const tokens: string[] = [];
        for (const raw of this.text.split(/\s+/)) {
            const norm = normalizeToken(raw);
            if (norm.length === 0) continue;
            const escaped = escaper.escape(norm);
            if (stopwordSet && stopwordSet.has(escaped)) continue;
            tokens.push(escaped);
        }

        const textClause = `@${this.textFieldName}:(${tokens.join(' | ')})`;
        const filterStr = renderFilter(this.filter);
        if (filterStr === '*') {
            return textClause;
        }
        return `(${filterStr} ${textClause})`;
    }

    buildParams(): Record<string, unknown> {
        return {};
    }
}
