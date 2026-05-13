import { BaseQuery, renderFilter, type FilterInput } from './base.js';
import { TokenEscaper } from '../utils/token-escaper.js';
import { QueryValidationError } from '../errors.js';

const escaper = new TokenEscaper();

/**
 * A Redis Search built-in text scorer.
 * @see https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/scoring/
 */
export type TextScorer = 'BM25' | 'BM25STD' | 'TFIDF' | 'TFIDF.DOCNORM' | 'DISMAX' | 'DOCSCORE';

/**
 * Configuration for {@link TextQuery}.
 */
export interface TextQueryConfig {
    /** Free-text query. Tokenised on whitespace and OR-joined. */
    text: string;

    /** Indexed text field to search against. */
    textFieldName: string;

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
}

/**
 * Full-text search query with optional filter.
 *
 * Tokenises the input on whitespace, escapes Redis Search special characters
 * in each token, and OR-joins the result inside the target field. Use
 * `filter` to scope the search to a subset of documents (e.g. by tag or
 * numeric range).
 *
 * **Note:** stopword removal and per-field/per-token weights from Python's
 * `redisvl.query.TextQuery` are not yet ported. Tokens are passed through
 * verbatim after escaping.
 *
 * @example
 * ```typescript
 * import { TextQuery, Tag } from 'redisvl';
 *
 * const q = new TextQuery({
 *   text: 'machine learning',
 *   textFieldName: 'description',
 *   filter: Tag('category').eq('tech'),
 * });
 * const results = await index.search(q);
 * ```
 */
export class TextQuery extends BaseQuery {
    public readonly text: string;
    public readonly textFieldName: string;
    public readonly textScorer: TextScorer;
    public readonly numResults: number;

    constructor(config: TextQueryConfig) {
        if (!config.text || config.text.trim() === '') {
            throw new QueryValidationError('text cannot be empty');
        }

        if (!config.textFieldName) {
            throw new QueryValidationError('textFieldName is required');
        }

        const numResults = config.numResults ?? 10;
        super({
            filter: config.filter,
            returnFields: config.returnFields,
            offset: config.offset,
            limit: config.limit ?? numResults,
        });
        this.text = config.text;
        this.textFieldName = config.textFieldName;
        this.textScorer = config.textScorer ?? 'BM25STD';
        this.numResults = numResults;
    }

    buildQuery(): string {
        const tokens = this.text
            .split(/\s+/)
            .filter((token) => token.length > 0)
            .map((token) => escaper.escape(token));

        if (tokens.length === 0) {
            // Defensive: constructor already rejects empty/whitespace-only text.
            throw new QueryValidationError('text yielded no tokens after splitting');
        }

        const textClause = `@${this.textFieldName}:(${tokens.join(' | ')})`;
        const filterStr = renderFilter(this.filter);
        if (filterStr === '*') {
            return textClause;
        }
        return `(${filterStr} ${textClause})`;
    }
}
