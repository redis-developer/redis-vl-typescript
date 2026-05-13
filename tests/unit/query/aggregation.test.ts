import { describe, it, expect } from 'vitest';
import {
    AggregationQuery,
    Count,
    CountDistinct,
    Sum,
    Avg,
    Min,
    Max,
    Stddev,
    Quantile,
    ToList,
    FirstValue,
} from '../../../src/query/aggregation.js';
import { Tag, Num } from '../../../src/query/filter.js';
import { Expr } from '../../../src/query/aggregation-expr.js';
import { QueryValidationError } from '../../../src/errors.js';

const empty = { filter: '*' as const };

describe('Reducer builders', () => {
    it('Count() produces a COUNT reducer', () => {
        expect(Count().as('total').toReducer()).toEqual({ type: 'COUNT', AS: 'total' });
    });

    it('Count() works without .as()', () => {
        expect(Count().toReducer()).toEqual({ type: 'COUNT' });
    });

    it('CountDistinct() includes the property and auto-prefixes', () => {
        expect(CountDistinct('brand').as('brands').toReducer()).toEqual({
            type: 'COUNT_DISTINCT',
            property: '@brand',
            AS: 'brands',
        });
    });

    it('Sum/Avg/Min/Max/Stddev/ToList produce property-bearing reducers', () => {
        expect(Sum('price').as('revenue').toReducer()).toEqual({
            type: 'SUM',
            property: '@price',
            AS: 'revenue',
        });
        expect(Avg('rating').as('avg_rating').toReducer()).toEqual({
            type: 'AVG',
            property: '@rating',
            AS: 'avg_rating',
        });
        expect(Min('price').toReducer()).toEqual({ type: 'MIN', property: '@price' });
        expect(Max('price').toReducer()).toEqual({ type: 'MAX', property: '@price' });
        expect(Stddev('price').toReducer()).toEqual({ type: 'STDDEV', property: '@price' });
        expect(ToList('brand').toReducer()).toEqual({ type: 'TOLIST', property: '@brand' });
    });

    it('Quantile() includes the quantile fraction', () => {
        expect(Quantile('price', 0.95).as('p95').toReducer()).toEqual({
            type: 'QUANTILE',
            property: '@price',
            quantile: 0.95,
            AS: 'p95',
        });
    });

    it('Quantile() rejects out-of-range quantile values', () => {
        expect(() => Quantile('price', 1.5)).toThrow(QueryValidationError);
        expect(() => Quantile('price', -0.1)).toThrow(QueryValidationError);
    });

    it('FirstValue() supports an optional BY sort spec', () => {
        expect(FirstValue('title').toReducer()).toEqual({
            type: 'FIRST_VALUE',
            property: '@title',
        });
        expect(FirstValue('title', { field: 'created_at', direction: 'DESC' }).toReducer()).toEqual(
            {
                type: 'FIRST_VALUE',
                property: '@title',
                BY: { property: '@created_at', direction: 'DESC' },
            }
        );
    });

    it('preserves explicit @ and $ prefixes on reducer properties', () => {
        expect(Sum('@already_prefixed').toReducer()).toEqual({
            type: 'SUM',
            property: '@already_prefixed',
        });
        expect(Avg('$.json.path').toReducer()).toEqual({
            type: 'AVG',
            property: '$.json.path',
        });
    });
});

describe('AggregationQuery — constructor validation', () => {
    it('defaults filter to * when not supplied', () => {
        const q = new AggregationQuery();
        expect(q.toCommand().query).toBe('*');
    });

    it('rejects a negative limit', () => {
        expect(() => new AggregationQuery({ ...empty, limit: -1 })).toThrow(QueryValidationError);
    });

    it('rejects a negative offset', () => {
        expect(() => new AggregationQuery({ ...empty, offset: -5 })).toThrow(QueryValidationError);
    });

    it('rejects cursor.count <= 0', () => {
        expect(() => new AggregationQuery({ ...empty, cursor: { count: 0 } })).toThrow(
            QueryValidationError
        );
    });

    it('rejects cursor.maxIdle <= 0', () => {
        expect(
            () => new AggregationQuery({ ...empty, cursor: { count: 100, maxIdle: 0 } })
        ).toThrow(QueryValidationError);
    });
});

describe('AggregationQuery — toCommand() query rendering', () => {
    it('renders a raw filter string verbatim', () => {
        const q = new AggregationQuery({ filter: '@brand:{nike}' });
        expect(q.toCommand().query).toBe('@brand:{nike}');
    });

    it('renders a FilterExpression via the same DSL used by VectorQuery', () => {
        const q = new AggregationQuery({
            filter: Tag('brand').eq('nike').and(Num('price').lt(100)),
        });
        expect(q.toCommand().query).toBe('(@brand:{nike} @price:[-inf (100])');
    });
});

describe('AggregationQuery — toCommand() options shape', () => {
    it('emits LOAD with @-prefixed fields when supplied', () => {
        const q = new AggregationQuery({ ...empty, load: ['title', 'price'] });
        expect(q.toCommand().options.LOAD).toEqual(['@title', '@price']);
    });

    it('preserves explicit @ and $ prefixes in load', () => {
        const q = new AggregationQuery({
            ...empty,
            load: ['@already_prefixed', '$.json.path'],
        });
        expect(q.toCommand().options.LOAD).toEqual(['@already_prefixed', '$.json.path']);
    });

    it('omits LOAD when not supplied', () => {
        const q = new AggregationQuery(empty);
        expect(q.toCommand().options.LOAD).toBeUndefined();
    });

    it('emits PARAMS when supplied', () => {
        const q = new AggregationQuery({ ...empty, params: { foo: 'bar', n: 5 } });
        expect(q.toCommand().options.PARAMS).toEqual({ foo: 'bar', n: 5 });
    });

    it('emits TIMEOUT when supplied', () => {
        const q = new AggregationQuery({ ...empty, timeout: 500 });
        expect(q.toCommand().options.TIMEOUT).toBe(500);
    });
});

describe('AggregationQuery — toCommand() STEPS canonical order', () => {
    it('emits GROUPBY with @-prefixed fields and the configured reducers', () => {
        const q = new AggregationQuery({
            ...empty,
            groupBy: {
                fields: ['category'],
                reducers: [Count().as('total'), Sum('price').as('revenue')],
            },
        });
        const steps = q.toCommand().options.STEPS!;
        expect(steps).toHaveLength(1);
        expect(steps[0]).toEqual({
            type: 'GROUPBY',
            properties: ['@category'],
            REDUCE: [
                { type: 'COUNT', AS: 'total' },
                { type: 'SUM', property: '@price', AS: 'revenue' },
            ],
        });
    });

    it('emits multiple APPLY steps in input order, after GROUPBY', () => {
        const q = new AggregationQuery({
            ...empty,
            groupBy: { fields: ['category'], reducers: [Count().as('total')] },
            apply: [
                { expression: '@total * 2', as: 'doubled' },
                { expression: '@doubled + 1', as: 'incremented' },
            ],
        });
        const steps = q.toCommand().options.STEPS!;
        expect(steps.map((s) => s.type)).toEqual(['GROUPBY', 'APPLY', 'APPLY']);
        expect(steps[1]).toEqual({ type: 'APPLY', expression: '@total * 2', AS: 'doubled' });
        expect(steps[2]).toEqual({
            type: 'APPLY',
            expression: '@doubled + 1',
            AS: 'incremented',
        });
    });

    it('emits SORTBY with @-prefixed fields and direction', () => {
        const q = new AggregationQuery({
            ...empty,
            sortBy: [{ field: 'revenue', direction: 'DESC' }],
        });
        const steps = q.toCommand().options.STEPS!;
        expect(steps).toEqual([
            {
                type: 'SORTBY',
                BY: [{ BY: '@revenue', DIRECTION: 'DESC' }],
            },
        ]);
    });

    it('emits LIMIT with offset and size', () => {
        const q = new AggregationQuery({ ...empty, offset: 5, limit: 25 });
        const steps = q.toCommand().options.STEPS!;
        expect(steps).toEqual([{ type: 'LIMIT', from: 5, size: 25 }]);
    });

    it('emits LIMIT with offset=0 when only limit is set', () => {
        const q = new AggregationQuery({ ...empty, limit: 25 });
        const steps = q.toCommand().options.STEPS!;
        expect(steps).toEqual([{ type: 'LIMIT', from: 0, size: 25 }]);
    });

    it('emits FILTER (FT.AGGREGATE expression dialect, verbatim string)', () => {
        const q = new AggregationQuery({ ...empty, postFilter: '@total > 10' });
        const steps = q.toCommand().options.STEPS!;
        expect(steps).toEqual([{ type: 'FILTER', expression: '@total > 10' }]);
    });

    it('emits FILTER from an AggregationExpr (typed DSL)', () => {
        const q = new AggregationQuery({
            ...empty,
            postFilter: Expr('total').gt(10).and(Expr('revenue').lt(1000)),
        });
        const steps = q.toCommand().options.STEPS!;
        expect(steps).toEqual([{ type: 'FILTER', expression: '(@total > 10 && @revenue < 1000)' }]);
    });

    it('emits APPLY from an AggregationExpr alongside a raw string', () => {
        const q = new AggregationQuery({
            ...empty,
            apply: [
                { expression: '@a + @b', as: 'sum' },
                { expression: Expr('flag').eq(1), as: 'is_flagged' },
            ],
        });
        const steps = q.toCommand().options.STEPS!;
        expect(steps).toEqual([
            { type: 'APPLY', expression: '@a + @b', AS: 'sum' },
            { type: 'APPLY', expression: '@flag == 1', AS: 'is_flagged' },
        ]);
    });

    it('emits all steps in canonical order: GROUPBY → APPLY → SORTBY → LIMIT → FILTER', () => {
        const q = new AggregationQuery({
            filter: Tag('category').eq('electronics'),
            groupBy: { fields: ['brand'], reducers: [Count().as('total')] },
            apply: [{ expression: '@total * 1.1', as: 'inflated' }],
            sortBy: [{ field: 'inflated', direction: 'DESC' }],
            offset: 0,
            limit: 10,
            postFilter: '@total > 5',
        });
        const steps = q.toCommand().options.STEPS!;
        expect(steps.map((s) => s.type)).toEqual(['GROUPBY', 'APPLY', 'SORTBY', 'LIMIT', 'FILTER']);
    });

    it('omits STEPS entirely when no pipeline steps are configured', () => {
        const q = new AggregationQuery(empty);
        expect(q.toCommand().options.STEPS).toBeUndefined();
    });
});

describe('AggregationQuery — cursor configuration', () => {
    it('cursor is undefined by default', () => {
        const q = new AggregationQuery(empty);
        expect(q.cursor).toBeUndefined();
    });

    it('exposes the configured cursor settings', () => {
        const q = new AggregationQuery({
            ...empty,
            cursor: { count: 100, maxIdle: 60_000 },
        });
        expect(q.cursor).toEqual({ count: 100, maxIdle: 60_000 });
    });

    it('cursor.count defaults to undefined (let the server pick) when only maxIdle is set', () => {
        const q = new AggregationQuery({ ...empty, cursor: { maxIdle: 30_000 } });
        expect(q.cursor).toEqual({ maxIdle: 30_000 });
    });
});

describe('AggregationQuery — auto field prefixing', () => {
    it('prefixes bare names in groupBy.fields with @', () => {
        const q = new AggregationQuery({
            ...empty,
            groupBy: { fields: ['brand', '@already', '$.json.path'], reducers: [Count()] },
        });
        const step = q.toCommand().options.STEPS![0] as {
            properties: string[];
        };
        expect(step.properties).toEqual(['@brand', '@already', '$.json.path']);
    });
});
