import { describe, it, expect } from 'vitest';
import { TextQuery } from '../../../src/query/text.js';
import { Tag } from '../../../src/query/filter.js';
import { QueryValidationError } from '../../../src/errors.js';

const textScorers = ['BM25', 'BM25STD', 'TFIDF', 'TFIDF.DOCNORM', 'DISMAX', 'DOCSCORE'] as const;

describe('TextQuery', () => {
    describe('constructor', () => {
        it('accepts empty text (Python parity — emits @field:() at buildQuery)', () => {
            // redis-vl-python does not validate text at construction; empty
            // or whitespace-only input renders as @field:() and surfaces at
            // index.search() time as a ResponseError from Redis.
            const q = new TextQuery({ text: '', textFieldName: 'description' });
            expect(q.buildQuery()).toBe('@description:()');
        });

        it('throws if textFieldName is missing', () => {
            expect(() => new TextQuery({ text: 'hello' } as any)).toThrow(
                /textFieldName is required/
            );
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

        it('renders a single field with weight 1.0 without a $weight clause', () => {
            const q = new TextQuery({
                text: 'quick fox',
                textFieldName: { description: 1.0 },
            });
            expect(q.buildQuery()).toBe('@description:(quick | fox)');
        });

        it('renders a single field with non-default weight using $weight syntax', () => {
            const q = new TextQuery({
                text: 'quick fox',
                textFieldName: { description: 5 },
            });
            expect(q.buildQuery()).toBe('@description:(quick | fox) => { $weight: 5 }');
        });

        it('renders multiple fields OR-joined with mixed weights', () => {
            const q = new TextQuery({
                text: 'quick fox',
                textFieldName: { title: 3, body: 1.0 },
            });
            expect(q.buildQuery()).toBe(
                '(@title:(quick | fox) => { $weight: 3 } | @body:(quick | fox))'
            );
        });

        it('renders multiple fields with all weights 1.0 wrapped in outer parens', () => {
            const q = new TextQuery({
                text: 'quick fox',
                textFieldName: { title: 1.0, body: 1.0 },
            });
            expect(q.buildQuery()).toBe('(@title:(quick | fox) | @body:(quick | fox))');
        });

        it('combines multi-field weighted text clause with a filter via AND', () => {
            const q = new TextQuery({
                text: 'engineer',
                textFieldName: { title: 2, summary: 1.0 },
                filter: Tag('active').eq('true'),
            });
            expect(q.buildQuery()).toBe(
                '(@active:{true} (@title:(engineer) => { $weight: 2 } | @summary:(engineer)))'
            );
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

        it('keeps escaped contractions in the rendered query (Python parity)', () => {
            const q = new TextQuery({ text: "don't run", textFieldName: 'description' });
            // Python at redisvl/query/query.py:1444-1450 escapes tokens
            // before checking the stopword set. The escaped form (don\'t)
            // is not in the unescaped NLTK list, so the contraction
            // survives into the rendered query. Result sets against Redis
            // are unchanged because Redis tokenizes "don't" on the
            // apostrophe at index time, so the escaped term matches zero
            // documents and the OR collapses to just "run".
            expect(q.buildQuery()).toBe("@description:(don\\'t | run)");
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

        it('emits @field:() when all tokens are filtered (Python parity)', () => {
            // Matches redis-vl-python. Redis rejects @d:() at parse time,
            // so this string is unsearchable — the failure surfaces as
            // ResponseError from index.search() rather than locally.
            const q = new TextQuery({ text: 'the and is', textFieldName: 'd' });
            expect(q.buildQuery()).toBe('@d:()');
        });

        it('emits @field:() for comma-only input (Python parity)', () => {
            const q = new TextQuery({ text: ',,,', textFieldName: 'd', stopwords: null });
            expect(q.buildQuery()).toBe('@d:()');
        });

        it('emits @field:() for whitespace-only input (Python parity)', () => {
            const q = new TextQuery({ text: '   ', textFieldName: 'd', stopwords: null });
            expect(q.buildQuery()).toBe('@d:()');
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

    describe('text weights (per-token)', () => {
        it('defaults textWeights to an empty record', () => {
            const q = new TextQuery({ text: 'hello', textFieldName: 'd' });
            expect(q.textWeights).toEqual({});
        });

        it('lowercases keys when parsing textWeights', () => {
            const q = new TextQuery({
                text: 'hello',
                textFieldName: 'd',
                textWeights: { Apple: 2, ORANGE: 0.5 },
            });
            expect(q.textWeights).toEqual({ apple: 2, orange: 0.5 });
        });

        it('trims whitespace around textWeights keys', () => {
            const q = new TextQuery({
                text: 'hello',
                textFieldName: 'd',
                textWeights: { '  apple  ': 2 },
            });
            expect(q.textWeights).toEqual({ apple: 2 });
        });

        it('rejects textWeights keys containing inner whitespace', () => {
            expect(
                () =>
                    new TextQuery({
                        text: 'hello',
                        textFieldName: 'd',
                        textWeights: { 'two words': 2 },
                    })
            ).toThrow(QueryValidationError);
        });

        it('accepts a token weight of 0', () => {
            const q = new TextQuery({
                text: 'apple',
                textFieldName: 'd',
                textWeights: { apple: 0 },
            });
            expect(q.textWeights).toEqual({ apple: 0 });
            expect(q.buildQuery()).toBe('@d:(apple=>{$weight:0})');
        });

        it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects token weight %p', (weight) => {
            expect(
                () =>
                    new TextQuery({
                        text: 'apple',
                        textFieldName: 'd',
                        textWeights: { apple: weight },
                    })
            ).toThrow(QueryValidationError);
        });

        it('renders per-token weights inside the OR list', () => {
            const q = new TextQuery({
                text: 'apple orange pear',
                textFieldName: 'd',
                textWeights: { apple: 2, orange: 0.5 },
            });
            expect(q.buildQuery()).toBe('@d:(apple=>{$weight:2} | orange=>{$weight:0.5} | pear)');
        });

        it('matches token-weight keys case-insensitively against input text', () => {
            const q = new TextQuery({
                text: 'Apple ORANGE pear',
                textFieldName: 'd',
                textWeights: { apple: 2, orange: 0.5 },
            });
            // Tokens are lowercased before lookup (and before escape).
            expect(q.buildQuery()).toBe('@d:(apple=>{$weight:2} | orange=>{$weight:0.5} | pear)');
        });

        it('combines per-token and per-field weights', () => {
            const q = new TextQuery({
                text: 'apple pear',
                textFieldName: { title: 3, body: 1.0 },
                textWeights: { apple: 2 },
            });
            expect(q.buildQuery()).toBe(
                '(@title:(apple=>{$weight:2} | pear) => { $weight: 3 } | @body:(apple=>{$weight:2} | pear))'
            );
        });

        it('does not resolve inherited keys via prototype chain (default textWeights)', () => {
            const q = new TextQuery({
                text: 'constructor toString hasOwnProperty',
                textFieldName: 'd',
            });
            // Without prototype-null hardening, 'constructor' would resolve to the
            // Object constructor and render as garbage. All three tokens must render
            // bare.
            expect(q.buildQuery()).toBe('@d:(constructor | tostring | hasownproperty)');
        });
    });

    describe('textFieldName property', () => {
        it('returns a bare string when single field has weight 1.0', () => {
            const q = new TextQuery({ text: 'hello', textFieldName: 'description' });
            expect(q.textFieldName).toBe('description');
        });

        it('returns a bare string when a single-field record has weight 1.0 (Python parity)', () => {
            const q = new TextQuery({ text: 'hello', textFieldName: { description: 1.0 } });
            expect(q.textFieldName).toBe('description');
        });

        it('returns the record when single field has non-default weight', () => {
            const q = new TextQuery({
                text: 'hello',
                textFieldName: { description: 5 },
            });
            expect(q.textFieldName).toEqual({ description: 5 });
        });

        it('returns the record when multiple fields are configured', () => {
            const q = new TextQuery({
                text: 'hello',
                textFieldName: { title: 1.0, body: 1.0 },
            });
            expect(q.textFieldName).toEqual({ title: 1.0, body: 1.0 });
        });
    });
});
