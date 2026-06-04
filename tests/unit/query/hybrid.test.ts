import { describe, it, expect } from 'vitest';
import { BaseQuery, BaseVectorQuery } from '../../../src/query/base.js';
import { HybridQuery } from '../../../src/query/hybrid.js';
import { Tag, Num } from '../../../src/query/filter.js';
import { QueryValidationError } from '../../../src/errors.js';
import { VectorDataType } from '../../../src/schema/types.js';

const VECTOR = [0.1, 0.2, 0.3, 0.4];

describe('HybridQuery', () => {
    describe('constructor validation', () => {
        it('throws when vector is empty', () => {
            expect(
                () =>
                    new HybridQuery({
                        text: 'foo',
                        vector: [],
                        vectorField: 'embedding',
                    })
            ).toThrow(QueryValidationError);
        });

        it('extends the shared query base classes', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
            });

            expect(q).toBeInstanceOf(BaseVectorQuery);
            expect(q).toBeInstanceOf(BaseQuery);
        });

        it('throws when vectorField is missing', () => {
            expect(
                () =>
                    new HybridQuery({
                        text: 'foo',
                        vector: VECTOR,
                    } as any)
            ).toThrow(QueryValidationError);
        });

        it('throws when text is empty', () => {
            expect(
                () =>
                    new HybridQuery({
                        text: '',
                        vector: VECTOR,
                        vectorField: 'embedding',
                    })
            ).toThrow(QueryValidationError);
        });

        it('throws when textFieldName is supplied but produces no tokens', () => {
            expect(
                () =>
                    new HybridQuery({
                        text: '   ',
                        textFieldName: 'description',
                        vector: VECTOR,
                        vectorField: 'embedding',
                    })
            ).toThrow(QueryValidationError);
        });

        it('throws when textFieldName is empty', () => {
            expect(
                () =>
                    new HybridQuery({
                        text: 'foo',
                        textFieldName: '   ',
                        vector: VECTOR,
                        vectorField: 'embedding',
                    })
            ).toThrow(QueryValidationError);
        });

        it('throws when LINEAR alpha is outside [0, 1]', () => {
            expect(
                () =>
                    new HybridQuery({
                        text: 'foo',
                        vector: VECTOR,
                        vectorField: 'embedding',
                        combine: { type: 'LINEAR', alpha: 1.5 },
                    })
            ).toThrow(QueryValidationError);
        });

        it('throws when LINEAR beta is outside [0, 1]', () => {
            expect(
                () =>
                    new HybridQuery({
                        text: 'foo',
                        vector: VECTOR,
                        vectorField: 'embedding',
                        combine: { type: 'LINEAR', beta: -0.1 },
                    })
            ).toThrow(QueryValidationError);
        });

        it('throws when KNN k is non-positive', () => {
            expect(
                () =>
                    new HybridQuery({
                        text: 'foo',
                        vector: VECTOR,
                        vectorField: 'embedding',
                        vectorMethod: { type: 'KNN', k: 0 },
                    })
            ).toThrow(QueryValidationError);
        });

        it('throws when RANGE radius is negative', () => {
            expect(
                () =>
                    new HybridQuery({
                        text: 'foo',
                        vector: VECTOR,
                        vectorField: 'embedding',
                        vectorMethod: { type: 'RANGE', radius: -0.1 },
                    })
            ).toThrow(QueryValidationError);
        });

        it('throws when numResults is not positive', () => {
            expect(
                () =>
                    new HybridQuery({
                        text: 'foo',
                        vector: VECTOR,
                        vectorField: 'embedding',
                        numResults: 0,
                    })
            ).toThrow(QueryValidationError);
        });

        it('throws when offset is negative', () => {
            expect(
                () =>
                    new HybridQuery({
                        text: 'foo',
                        vector: VECTOR,
                        vectorField: 'embedding',
                        offset: -1,
                    })
            ).toThrow(QueryValidationError);
        });

        it('throws when timeout is not positive', () => {
            expect(
                () =>
                    new HybridQuery({
                        text: 'foo',
                        vector: VECTOR,
                        vectorField: 'embedding',
                        timeout: 0,
                    })
            ).toThrow(QueryValidationError);
        });

        it('throws when returnFields includes an empty field', () => {
            expect(
                () =>
                    new HybridQuery({
                        text: 'foo',
                        vector: VECTOR,
                        vectorField: 'embedding',
                        returnFields: ['title', ''],
                    })
            ).toThrow(QueryValidationError);
        });

        it('throws when sortBy includes an empty field', () => {
            expect(
                () =>
                    new HybridQuery({
                        text: 'foo',
                        vector: VECTOR,
                        vectorField: 'embedding',
                        sortBy: [{ field: '   ' }],
                    })
            ).toThrow(QueryValidationError);
        });

        it('throws when sortBy direction is invalid at runtime', () => {
            expect(
                () =>
                    new HybridQuery({
                        text: 'foo',
                        vector: VECTOR,
                        vectorField: 'embedding',
                        sortBy: [{ field: 'price', direction: 'DOWN' as any }],
                    })
            ).toThrow(QueryValidationError);
        });

        it('rejects a bare $name reference (parameter ref or typo) in returnFields', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                returnFields: ['$price'],
            });
            expect(() => q.toCommand()).toThrow(/parameter ref or typo/);
        });

        it('rejects a bare $name reference in sortBy', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                sortBy: [{ field: '$price' }],
            });
            expect(() => q.toCommand()).toThrow(/parameter ref or typo/);
        });
    });

    describe('toCommand() — SEARCH clause', () => {
        it('passes the text body verbatim when textFieldName is not provided', () => {
            const q = new HybridQuery({
                text: '@brand:{nike} hello world',
                vector: VECTOR,
                vectorField: 'embedding',
            });
            const { options } = q.toCommand();
            expect(options.SEARCH.query).toBe('@brand:{nike} hello world');
        });

        it('tokenizes + escapes + OR-joins when textFieldName is provided', () => {
            const q = new HybridQuery({
                text: 'machine learning',
                textFieldName: 'description',
                vector: VECTOR,
                vectorField: 'embedding',
            });
            const { options } = q.toCommand();
            expect(options.SEARCH.query).toBe('@description:(machine | learning)');
        });

        it('escapes special characters in tokens', () => {
            const q = new HybridQuery({
                text: 'hello, world',
                textFieldName: 'description',
                vector: VECTOR,
                vectorField: 'embedding',
            });
            const { options } = q.toCommand();
            expect(options.SEARCH.query).toBe('@description:(hello\\, | world)');
        });

        it('emits SCORER when textScorer is provided', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                textScorer: 'BM25',
            });
            const { options } = q.toCommand();
            expect(options.SEARCH.SCORER).toBe('BM25');
        });

        it('omits SCORER by default (lets the server pick BM25STD)', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
            });
            const { options } = q.toCommand();
            expect(options.SEARCH.SCORER).toBeUndefined();
        });

        it('emits YIELD_SCORE_AS on SEARCH when textScoreAlias is provided', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                textScoreAlias: 'text_score',
            });
            const { options } = q.toCommand();
            expect(options.SEARCH.YIELD_SCORE_AS).toBe('text_score');
        });
    });

    describe('toCommand() — VSIM clause', () => {
        it('produces a vector parameter binding and an @-prefixed field reference', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
            });
            const { options } = q.toCommand();
            expect(options.VSIM.field).toBe('@embedding');
            expect(options.VSIM.vector).toMatch(/^\$/); // $-prefixed param ref
            // The parameter the field references must exist in PARAMS as a Buffer.
            const paramName = (options.VSIM.vector as string).slice(1);
            expect(options.PARAMS).toBeDefined();
            expect(options.PARAMS![paramName]).toBeInstanceOf(Buffer);
        });

        it('encodes the vector as FLOAT32 by default (4 bytes per element)', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
            });
            const { options } = q.toCommand();
            const paramName = (options.VSIM.vector as string).slice(1);
            expect((options.PARAMS![paramName] as Buffer).byteLength).toBe(VECTOR.length * 4);
        });

        it('honours the datatype option (FLOAT64 -> 8 bytes per element)', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                datatype: VectorDataType.FLOAT64,
            });
            const { options } = q.toCommand();
            const paramName = (options.VSIM.vector as string).slice(1);
            expect((options.PARAMS![paramName] as Buffer).byteLength).toBe(VECTOR.length * 8);
        });

        it('defaults to KNN with k=10', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
            });
            const { options } = q.toCommand();
            expect(options.VSIM.method).toEqual({ type: 'KNN', K: 10 });
        });

        it('emits KNN with EF_RUNTIME when configured', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                vectorMethod: { type: 'KNN', k: 25, efRuntime: 200 },
            });
            const { options } = q.toCommand();
            expect(options.VSIM.method).toEqual({ type: 'KNN', K: 25, EF_RUNTIME: 200 });
        });

        it('emits RANGE with RADIUS + EPSILON when configured', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                vectorMethod: { type: 'RANGE', radius: 0.3, epsilon: 0.05 },
            });
            const { options } = q.toCommand();
            expect(options.VSIM.method).toEqual({ type: 'RANGE', RADIUS: 0.3, EPSILON: 0.05 });
        });

        it('emits VSIM FILTER from a raw filter string', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                vsimFilter: '@brand:{nike}',
            });
            const { options } = q.toCommand();
            expect(options.VSIM.FILTER).toBe('@brand:{nike}');
        });

        it('emits VSIM FILTER from a FilterExpression', () => {
            // The widening to FilterInput lets callers compose with the typed
            // filter DSL instead of hand-crafting filter strings.
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                vsimFilter: Tag('brand').eq('nike').and(Num('price').lt(100)),
            });
            const { options } = q.toCommand();
            expect(options.VSIM.FILTER).toBe('(@brand:{nike} @price:[-inf (100])');
        });

        it('emits YIELD_SCORE_AS on VSIM when vectorScoreAlias is provided', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                vectorScoreAlias: 'vec_score',
            });
            const { options } = q.toCommand();
            expect(options.VSIM.YIELD_SCORE_AS).toBe('vec_score');
        });
    });

    describe('toCommand() — COMBINE clause', () => {
        it('emits default RRF COMBINE so the combined score is yielded predictably', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
            });
            const { options } = q.toCommand();
            expect(options.COMBINE).toEqual({
                method: { type: 'RRF' },
                YIELD_SCORE_AS: 'hybrid_score',
            });
        });

        it('emits RRF with default combinedScoreAlias of hybrid_score', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                combine: { type: 'RRF' },
            });
            const { options } = q.toCommand();
            expect(options.COMBINE).toEqual({
                method: { type: 'RRF' },
                YIELD_SCORE_AS: 'hybrid_score',
            });
        });

        it('emits RRF with CONSTANT and WINDOW when supplied', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                combine: { type: 'RRF', constant: 50, window: 100 },
            });
            const { options } = q.toCommand();
            expect(options.COMBINE).toEqual({
                method: { type: 'RRF', CONSTANT: 50, WINDOW: 100 },
                YIELD_SCORE_AS: 'hybrid_score',
            });
        });

        it('emits LINEAR with ALPHA, BETA, WINDOW, and a custom alias', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                combine: { type: 'LINEAR', alpha: 0.7, beta: 0.3, window: 50 },
                combinedScoreAlias: 'fusion',
            });
            const { options } = q.toCommand();
            expect(options.COMBINE).toEqual({
                method: { type: 'LINEAR', ALPHA: 0.7, BETA: 0.3, WINDOW: 50 },
                YIELD_SCORE_AS: 'fusion',
            });
        });
    });

    describe('toCommand() — output options', () => {
        it('emits LOAD with @-prefixed field references and always includes @__key', () => {
            // @__key has to be explicitly loaded for the document key to
            // round-trip back as `doc.id`. Score aliases declared via
            // YIELD_SCORE_AS are NOT loaded here — Redis already injects
            // them into each row, and LOADing them again errors with
            // "score alias already exists".
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                returnFields: ['title', 'price'],
            });
            const { options } = q.toCommand();
            expect(options.LOAD).toEqual(['@__key', '@title', '@price']);
        });

        it('LOAD does NOT include yielded score aliases (they auto-appear in rows)', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                combine: { type: 'RRF' },
                textScoreAlias: 'text_s',
                vectorScoreAlias: 'vec_s',
                returnFields: ['title'],
            });
            const { options } = q.toCommand();
            expect(options.LOAD).toEqual(['@__key', '@title']);
        });

        it('LOAD is just @__key when no returnFields are supplied', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
            });
            const { options } = q.toCommand();
            expect(options.LOAD).toEqual(['@__key']);
        });

        it('preserves explicit @ and $ prefixes in returnFields', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                returnFields: ['@already_prefixed', '$.json.path'],
            });
            const { options } = q.toCommand();
            expect(options.LOAD).toEqual(['@__key', '@already_prefixed', '$.json.path']);
        });

        it('trims whitespace from returnFields and sortBy entries during normalization', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                returnFields: ['  price  '],
                sortBy: [{ field: '  price  ', direction: 'ASC' }],
            });
            const { options } = q.toCommand();
            expect(options.LOAD).toEqual(['@__key', '@price']);
            expect(options.SORTBY).toEqual({
                fields: [{ field: '@price', direction: 'ASC' }],
            });
        });

        it('emits LIMIT with the configured offset and num', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                offset: 5,
                numResults: 25,
            });
            const { options } = q.toCommand();
            expect(options.LIMIT).toEqual({ offset: 5, count: 25 });
        });

        it('defaults LIMIT to offset=0, count=10', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
            });
            const { options } = q.toCommand();
            expect(options.LIMIT).toEqual({ offset: 0, count: 10 });
        });

        it('emits SORTBY with @-prefixed field + direction', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                sortBy: [{ field: 'price', direction: 'DESC' }],
            });
            const { options } = q.toCommand();
            expect(options.SORTBY).toEqual({
                fields: [{ field: '@price', direction: 'DESC' }],
            });
        });

        it('emits NOSORT when noSort is true', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                noSort: true,
            });
            const { options } = q.toCommand();
            expect(options.NOSORT).toBe(true);
        });

        it('emits top-level FILTER (FT.AGGREGATE expression dialect, raw string)', () => {
            // postFilter uses the FT.AGGREGATE expression syntax, distinct
            // from the FT.SEARCH filter syntax that vsimFilter accepts.
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                postFilter: '@price < 1000',
            });
            const { options } = q.toCommand();
            expect(options.FILTER).toBe('@price < 1000');
        });

        it('emits TIMEOUT when supplied', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                timeout: 500,
            });
            const { options } = q.toCommand();
            expect(options.TIMEOUT).toBe(500);
        });
    });

    describe('combinedScoreAlias accessor', () => {
        it('exposes the alias used for the combined score (defaults to hybrid_score)', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
            });
            expect(q.combinedScoreAlias).toBe('hybrid_score');
        });

        it('uses the user-supplied alias when configured', () => {
            const q = new HybridQuery({
                text: 'foo',
                vector: VECTOR,
                vectorField: 'embedding',
                combinedScoreAlias: 'fusion_score',
            });
            expect(q.combinedScoreAlias).toBe('fusion_score');
        });
    });
});
