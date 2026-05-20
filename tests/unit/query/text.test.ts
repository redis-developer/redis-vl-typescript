import { describe, it, expect } from 'vitest';
import { TextQuery } from '../../../src/query/text.js';
import { Tag } from '../../../src/query/filter.js';
import { QueryValidationError } from '../../../src/errors.js';

const textScorers = ['BM25', 'BM25STD', 'TFIDF', 'TFIDF.DOCNORM', 'DISMAX', 'DOCSCORE'] as const;

describe('TextQuery', () => {
    describe('constructor', () => {
        it('throws if text is empty', () => {
            expect(() => new TextQuery({ text: '', textFieldName: 'description' })).toThrow(
                QueryValidationError
            );
        });

        it('throws if textFieldName is missing', () => {
            expect(() => new TextQuery({ text: 'hello' } as any)).toThrow(QueryValidationError);
        });

        it('defaults numResults to 10', () => {
            const q = new TextQuery({ text: 'hello', textFieldName: 'description' });
            expect(q.numResults).toBe(10);
        });

        it('defaults textScorer to BM25STD', () => {
            const q = new TextQuery({ text: 'hello', textFieldName: 'description' });
            expect(q.textScorer).toBe('BM25STD');
        });

        it.each(textScorers)('accepts textScorer %s', (textScorer) => {
            const q = new TextQuery({ text: 'hello', textFieldName: 'description', textScorer });
            expect(q.textScorer).toBe(textScorer);
        });
    });

    describe('buildQuery', () => {
        it('tokenises text on whitespace and OR-joins terms in the field', () => {
            const q = new TextQuery({
                text: 'quick brown fox',
                textFieldName: 'description',
            });
            expect(q.buildQuery()).toBe('@description:(quick | brown | fox)');
        });

        it('strips leading/trailing commas during normalization (Python parity)', () => {
            // The comma is stripped from the token before escape, so no escaped comma
            // appears in the rendered query. Mirrors Python's
            // _tokenize_and_escape_query (query.py:1445).
            const q = new TextQuery({
                text: 'hello, world',
                textFieldName: 'description',
                stopwords: null,
            });
            expect(q.buildQuery()).toBe('@description:(hello | world)');
        });

        it('combines a string filter with the text clause via AND', () => {
            const q = new TextQuery({
                text: 'engineer',
                textFieldName: 'job',
                filter: '@active:{true}',
            });
            expect(q.buildQuery()).toBe('(@active:{true} @job:(engineer))');
        });

        it('combines a FilterExpression with the text clause via AND', () => {
            const q = new TextQuery({
                text: 'engineer',
                textFieldName: 'job',
                filter: Tag('active').eq('true'),
            });
            expect(q.buildQuery()).toBe('(@active:{true} @job:(engineer))');
        });

        it('skips empty tokens caused by extra whitespace', () => {
            const q = new TextQuery({
                text: '  quick   fox ',
                textFieldName: 'description',
            });
            expect(q.buildQuery()).toBe('@description:(quick | fox)');
        });
    });

    describe('buildParams', () => {
        it('returns an empty params object', () => {
            const q = new TextQuery({ text: 'hello', textFieldName: 'description' });
            expect(q.buildParams()).toEqual({});
        });
    });

    describe('stopwords', () => {
        it('default "english" drops common stopwords', () => {
            const q = new TextQuery({ text: 'the quick brown fox', textFieldName: 'description' });
            expect(q.buildQuery()).toBe('@description:(quick | brown | fox)');
        });

        it('default drops contractions like "don\'t"', () => {
            const q = new TextQuery({ text: "don't run", textFieldName: 'description' });
            // "don't" is in the NLTK list; only "run" survives.
            expect(q.buildQuery()).toBe('@description:(run)');
        });

        it('lowercases tokens before comparison', () => {
            const q = new TextQuery({ text: 'The Quick', textFieldName: 'description' });
            // "The" → "the" → dropped; "Quick" → "quick" → kept.
            expect(q.buildQuery()).toBe('@description:(quick)');
        });

        it('strips typographic quotes (U+201C / U+201D)', () => {
            const q = new TextQuery({
                text: '“smart” quotes',
                textFieldName: 'description',
                stopwords: null,
            });
            expect(q.buildQuery()).toBe('@description:(smart | quotes)');
        });

        it('skips filtering entirely when stopwords is null', () => {
            const q = new TextQuery({
                text: 'the quick',
                textFieldName: 'description',
                stopwords: null,
            });
            expect(q.buildQuery()).toBe('@description:(the | quick)');
        });

        it('explicit array overrides (does NOT extend) the default', () => {
            const q = new TextQuery({
                text: 'the quick fox',
                textFieldName: 'description',
                stopwords: ['quick'],
            });
            // 'the' is kept because the explicit list is ['quick'] only.
            expect(q.buildQuery()).toBe('@description:(the | fox)');
        });

        it('matches lowercase entries against normalized tokens', () => {
            const q = new TextQuery({
                text: 'Quick fox',
                textFieldName: 'description',
                stopwords: new Set(['quick']),
            });
            // "Quick" normalizes to "quick", which is in the set.
            expect(q.buildQuery()).toBe('@description:(fox)');
        });

        it('Python-parity foot-gun: uppercase entries do NOT match lowercased tokens', () => {
            const q = new TextQuery({
                text: 'quick fox',
                textFieldName: 'description',
                stopwords: new Set(['Quick']),
            });
            // Set holds "Quick"; token is "quick". No match — mirrors query.py:1426/:1450.
            expect(q.buildQuery()).toBe('@description:(quick | fox)');
        });

        it('"english" explicit matches default behavior', () => {
            const a = new TextQuery({ text: 'the quick fox', textFieldName: 'd' });
            const b = new TextQuery({
                text: 'the quick fox',
                textFieldName: 'd',
                stopwords: 'english',
            });
            expect(a.buildQuery()).toBe(b.buildQuery());
        });

        it('rejects non-lowercase language identifier at construction', () => {
            expect(
                () => new TextQuery({ text: 'x', textFieldName: 'd', stopwords: 'English' })
            ).toThrow(QueryValidationError);
        });

        it('rejects unknown language at construction', () => {
            expect(
                () => new TextQuery({ text: 'x', textFieldName: 'd', stopwords: 'spanish' })
            ).toThrow(QueryValidationError);
        });

        it('rejects non-string iterable members at construction', () => {
            expect(
                () =>
                    new TextQuery({
                        text: 'x',
                        textFieldName: 'd',
                        stopwords: ['ok', 42 as unknown as string],
                    })
            ).toThrow(QueryValidationError);
        });

        it('empty array is a no-op (not an error)', () => {
            const q = new TextQuery({
                text: 'the quick',
                textFieldName: 'description',
                stopwords: [],
            });
            expect(q.buildQuery()).toBe('@description:(the | quick)');
        });

        it('throws at buildQuery() (not constructor) when all tokens are filtered', () => {
            const q = new TextQuery({ text: 'the and is', textFieldName: 'd' });
            expect(() => q.buildQuery()).toThrow(QueryValidationError);
            expect(() => q.buildQuery()).toThrow(
                /text yielded no tokens after normalization and stopword filtering/
            );
        });

        it('filter clause still composes correctly when stopwords drop tokens', () => {
            const q = new TextQuery({
                text: 'the engineer',
                textFieldName: 'description',
                filter: Tag('active').eq('true'),
            });
            expect(q.buildQuery()).toBe('(@active:{true} @description:(engineer))');
        });

        it('exposes the english set via the public stopwords namespace', async () => {
            const { stopwords } = await import('../../../src/index.js');
            expect(stopwords.english).toBeInstanceOf(Set);
            expect(stopwords.english.size).toBe(198);
            expect(stopwords.english.has('the')).toBe(true);
        });
    });

    describe('field weights', () => {
        it('normalises a string textFieldName to weight 1.0 in fieldWeights', () => {
            const q = new TextQuery({ text: 'hello', textFieldName: 'description' });
            expect(q.fieldWeights).toEqual({ description: 1.0 });
        });

        it('accepts a Record<string, number> for textFieldName', () => {
            const q = new TextQuery({
                text: 'hello',
                textFieldName: { title: 5.0, body: 1.0 },
            });
            expect(q.fieldWeights).toEqual({ title: 5.0, body: 1.0 });
        });

        it('freezes fieldWeights to enforce readonly at runtime', () => {
            const q = new TextQuery({ text: 'hello', textFieldName: { title: 2.0 } });
            expect(Object.isFrozen(q.fieldWeights)).toBe(true);
        });

        it('rejects an empty fieldWeights record', () => {
            expect(() => new TextQuery({ text: 'hello', textFieldName: {} })).toThrow(
                QueryValidationError
            );
        });

        it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
            'rejects field weight %p',
            (weight) => {
                expect(
                    () =>
                        new TextQuery({
                            text: 'hello',
                            textFieldName: { title: weight },
                        })
                ).toThrow(QueryValidationError);
            }
        );

        it('rejects a non-numeric field weight', () => {
            expect(
                () =>
                    new TextQuery({
                        text: 'hello',
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        textFieldName: { title: 'five' as any },
                    })
            ).toThrow(QueryValidationError);
        });

        it('rejects an array for textFieldName', () => {
            expect(
                () =>
                    new TextQuery({
                        text: 'hello',
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        textFieldName: ['title'] as any,
                    })
            ).toThrow(QueryValidationError);
        });
    });
});
