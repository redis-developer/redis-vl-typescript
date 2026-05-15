import { describe, it, expect } from 'vitest';
import { AggregationQuery, Reducers } from '../../../src/query/aggregation.js';
import { Tag, Num } from '../../../src/query/filter.js';
import { QueryValidationError } from '../../../src/errors.js';

describe('AggregationQuery', () => {
    describe('query string', () => {
        it('defaults to wildcard when no filter is supplied', () => {
            const q = new AggregationQuery();
            expect(q.toCommand().query).toBe('*');
        });

        it('accepts a string filter', () => {
            const q = new AggregationQuery('@brand:{nike}');
            expect(q.toCommand().query).toBe('@brand:{nike}');
        });

        it('accepts a FilterExpression', () => {
            const q = new AggregationQuery(Tag('brand').eq('nike'));
            expect(q.toCommand().query).toBe('@brand:{nike}');
        });
    });

    describe('groupBy + reducers', () => {
        it('renders a single-property GROUPBY with a COUNT reducer', () => {
            const q = new AggregationQuery().groupBy('brand', Reducers.count('total'));
            const { options } = q.toCommand();
            expect(options.STEPS).toEqual([
                {
                    type: 'GROUPBY',
                    properties: ['@brand'],
                    REDUCE: [{ type: 'COUNT', AS: 'total' }],
                },
            ]);
        });

        it('accepts multiple properties and reducers as arrays', () => {
            const q = new AggregationQuery().groupBy(
                ['brand', 'category'],
                [Reducers.sum('price', 'revenue'), Reducers.avg('price', 'avg_price')]
            );
            const { options } = q.toCommand();
            expect(options.STEPS).toEqual([
                {
                    type: 'GROUPBY',
                    properties: ['@brand', '@category'],
                    REDUCE: [
                        { type: 'SUM', AS: 'revenue', property: '@price' },
                        { type: 'AVG', AS: 'avg_price', property: '@price' },
                    ],
                },
            ]);
        });

        it('preserves explicit @ and $ prefixes on properties', () => {
            const q = new AggregationQuery().groupBy(['@brand', '$.category'], []);
            const { options } = q.toCommand();
            expect((options.STEPS![0] as { properties: string[] }).properties).toEqual([
                '@brand',
                '$.category',
            ]);
        });

        it('renders QUANTILE with its quantile arg', () => {
            const q = new AggregationQuery().groupBy(
                'brand',
                Reducers.quantile('price', 0.95, 'p95')
            );
            const reducer = (
                q.toCommand().options.STEPS![0] as unknown as {
                    REDUCE: Array<Record<string, unknown>>;
                }
            ).REDUCE[0];
            expect(reducer).toEqual({
                type: 'QUANTILE',
                AS: 'p95',
                property: '@price',
                quantile: 0.95,
            });
        });

        it('renders FIRST_VALUE with BY direction', () => {
            const q = new AggregationQuery().groupBy(
                'brand',
                Reducers.firstValue('name', { property: 'price', direction: 'DESC' }, 'top')
            );
            const reducer = (
                q.toCommand().options.STEPS![0] as unknown as {
                    REDUCE: Array<Record<string, unknown>>;
                }
            ).REDUCE[0];
            expect(reducer).toMatchObject({
                type: 'FIRST_VALUE',
                AS: 'top',
                property: '@name',
                BY: { property: '@price', direction: 'DESC' },
            });
        });

        it('rejects an empty property list', () => {
            expect(() => new AggregationQuery().groupBy([])).toThrow(QueryValidationError);
        });

        it('rejects QUANTILE outside [0, 1]', () => {
            expect(() => Reducers.quantile('price', 1.5)).toThrow(QueryValidationError);
        });
    });

    describe('apply / sortBy / limit / filter', () => {
        it('renders APPLY with expression and alias', () => {
            const q = new AggregationQuery().apply('@price * @quantity', 'total');
            expect(q.toCommand().options.STEPS).toEqual([
                { type: 'APPLY', expression: '@price * @quantity', AS: 'total' },
            ]);
        });

        it('renders bare-string SORTBY as ascending field reference', () => {
            const q = new AggregationQuery().sortBy('revenue');
            expect(q.toCommand().options.STEPS).toEqual([{ type: 'SORTBY', BY: ['@revenue'] }]);
        });

        it('renders directional SORTBY entries', () => {
            const q = new AggregationQuery().sortBy(
                [
                    { field: 'revenue', direction: 'DESC' },
                    { field: 'brand', direction: 'ASC' },
                ],
                5
            );
            expect(q.toCommand().options.STEPS).toEqual([
                {
                    type: 'SORTBY',
                    BY: [
                        { BY: '@revenue', DIRECTION: 'DESC' },
                        { BY: '@brand', DIRECTION: 'ASC' },
                    ],
                    MAX: 5,
                },
            ]);
        });

        it('renders LIMIT', () => {
            const q = new AggregationQuery().limit(20, 10);
            expect(q.toCommand().options.STEPS).toEqual([{ type: 'LIMIT', from: 20, size: 10 }]);
        });

        it('renders post-aggregation FILTER (FT.AGGREGATE expression dialect)', () => {
            const q = new AggregationQuery().filter('@revenue > 1000');
            expect(q.toCommand().options.STEPS).toEqual([
                { type: 'FILTER', expression: '@revenue > 1000' },
            ]);
        });

        it('rejects negative LIMIT offset', () => {
            expect(() => new AggregationQuery().limit(-1, 10)).toThrow(QueryValidationError);
        });

        it('rejects zero LIMIT count', () => {
            expect(() => new AggregationQuery().limit(0, 0)).toThrow(QueryValidationError);
        });

        it('rejects non-ASC/DESC sort directions', () => {
            expect(() =>
                new AggregationQuery().sortBy([{ field: 'x', direction: 'BOGUS' as 'ASC' }])
            ).toThrow(QueryValidationError);
        });
    });

    describe('step ordering', () => {
        it('preserves the order in which builder methods were called', () => {
            const q = new AggregationQuery()
                .groupBy('brand', Reducers.sum('price', 'revenue'))
                .apply('@revenue / 100', 'revenue_hundreds')
                .filter('@revenue > 0')
                .sortBy([{ field: 'revenue', direction: 'DESC' }])
                .limit(0, 5);
            const kinds = q.toCommand().options.STEPS!.map((s) => (s as { type: string }).type);
            expect(kinds).toEqual(['GROUPBY', 'APPLY', 'FILTER', 'SORTBY', 'LIMIT']);
        });
    });

    describe('LOAD', () => {
        it('renders bare LOAD field with @ prefix', () => {
            const q = new AggregationQuery().load('title');
            expect(q.toCommand().options.LOAD).toEqual(['@title']);
        });

        it('renders LOAD with identifier + AS', () => {
            const q = new AggregationQuery().load({ identifier: 'title', as: 't' });
            expect(q.toCommand().options.LOAD).toEqual([{ identifier: '@title', AS: 't' }]);
        });

        it('appends across multiple load() calls', () => {
            const q = new AggregationQuery().load('a').load(['b', 'c']);
            expect(q.toCommand().options.LOAD).toEqual(['@a', '@b', '@c']);
        });
    });

    describe('top-level options', () => {
        it('threads PARAMS through and lets the query reference $params', () => {
            const q = new AggregationQuery(Num('price').gt(0).and(Tag('brand').eq('nike')))
                .params({ minRev: 1000 })
                .filter('@revenue > $minRev');
            const { options } = q.toCommand();
            expect(options.PARAMS).toEqual({ minRev: 1000 });
        });

        it('threads DIALECT and TIMEOUT and verbatim/addScores flags', () => {
            const q = new AggregationQuery().dialect(2).timeout(500).verbatim().addScores();
            const { options } = q.toCommand();
            expect(options.DIALECT).toBe(2);
            expect(options.TIMEOUT).toBe(500);
            expect(options.VERBATIM).toBe(true);
            expect(options.ADDSCORES).toBe(true);
        });

        it('omits unset options', () => {
            const { options } = new AggregationQuery().toCommand();
            expect(options).toEqual({});
        });
    });
});
