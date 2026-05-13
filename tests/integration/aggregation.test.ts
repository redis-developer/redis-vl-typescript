/**
 * Integration coverage for AggregationQuery against FT.AGGREGATE on a real
 * Redis instance (Testcontainer). Uses a fixed product fixture so reducer
 * outputs are deterministic.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type RedisClientType } from 'redis';
import { IndexSchema } from '../../src/schema/schema.js';
import { SearchIndex } from '../../src/indexes/search-index.js';
import {
    AggregationQuery,
    Count,
    CountDistinct,
    Sum,
    Avg,
    Max,
    ToList,
} from '../../src/query/aggregation.js';
import { Tag } from '../../src/query/filter.js';
import { AField } from '../../src/query/aggregation-expr.js';

interface Product extends Record<string, unknown> {
    id: string;
    title: string;
    brand: string;
    category: string;
    price: number;
    rating: number;
}

// Deterministic fixture so reducer outputs can be asserted exactly.
const PRODUCTS: Product[] = [
    { id: '1', title: 'Laptop', brand: 'acme', category: 'electronics', price: 1200, rating: 4.5 },
    { id: '2', title: 'Mouse', brand: 'acme', category: 'electronics', price: 25, rating: 4.2 },
    {
        id: '3',
        title: 'Keyboard',
        brand: 'omega',
        category: 'electronics',
        price: 150,
        rating: 4.7,
    },
    { id: '4', title: 'Chair', brand: 'ergo', category: 'furniture', price: 300, rating: 4.1 },
    { id: '5', title: 'Desk', brand: 'ergo', category: 'furniture', price: 500, rating: 4.3 },
    { id: '6', title: 'Monitor', brand: 'acme', category: 'electronics', price: 400, rating: 4.4 },
];

describe('AggregationQuery integration (FT.AGGREGATE)', () => {
    let client: RedisClientType;
    let index: SearchIndex;

    beforeAll(async () => {
        client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
        await client.connect();

        const schema = IndexSchema.fromObject({
            index: {
                name: 'redisvl-test-agg',
                prefix: 'rvl-test-agg',
                storageType: 'hash',
            },
            fields: [
                { name: 'title', type: 'text' },
                { name: 'brand', type: 'tag' },
                { name: 'category', type: 'tag' },
                { name: 'price', type: 'numeric', attrs: { sortable: true } },
                { name: 'rating', type: 'numeric', attrs: { sortable: true } },
            ],
        });

        index = new SearchIndex(schema, client);
        await index.create({ overwrite: true, drop: true });
        await index.load(PRODUCTS, { idField: 'id' });

        await new Promise((r) => setTimeout(r, 100));
    });

    afterAll(async () => {
        await index?.delete({ drop: true }).catch(() => {});
        await client?.quit();
    });

    describe('GROUPBY with core reducers', () => {
        it('counts documents per category', async () => {
            const q = new AggregationQuery({
                groupBy: { fields: ['category'], reducers: [Count().as('total')] },
                sortBy: [{ field: 'category', direction: 'ASC' }],
            });

            const { rows } = await index.aggregate<{
                category: string;
                total: string;
            }>(q);

            expect(rows).toHaveLength(2);
            expect(rows[0].category).toBe('electronics');
            expect(Number(rows[0].total)).toBe(4);
            expect(rows[1].category).toBe('furniture');
            expect(Number(rows[1].total)).toBe(2);
        });

        it('combines SUM, AVG, MIN, MAX, COUNT_DISTINCT, TOLIST in one GROUPBY', async () => {
            const q = new AggregationQuery({
                groupBy: {
                    fields: ['category'],
                    reducers: [
                        Sum('price').as('revenue'),
                        Avg('rating').as('avg_rating'),
                        Max('price').as('max_price'),
                        CountDistinct('brand').as('brand_count'),
                        ToList('brand').as('brands'),
                    ],
                },
                sortBy: [{ field: 'category', direction: 'ASC' }],
            });

            const { rows } = await index.aggregate<{
                category: string;
                revenue: string;
                avg_rating: string;
                max_price: string;
                brand_count: string;
                brands: string[];
            }>(q);

            expect(rows).toHaveLength(2);

            // Electronics: 1200 + 25 + 150 + 400 = 1775
            const electronics = rows[0];
            expect(electronics.category).toBe('electronics');
            expect(Number(electronics.revenue)).toBe(1775);
            expect(Number(electronics.max_price)).toBe(1200);
            // Brand distinct: acme, omega = 2
            expect(Number(electronics.brand_count)).toBe(2);
            // Avg rating: (4.5 + 4.2 + 4.7 + 4.4) / 4 = 4.45
            expect(Number(electronics.avg_rating)).toBeCloseTo(4.45, 2);

            // Furniture: 300 + 500 = 800
            const furniture = rows[1];
            expect(Number(furniture.revenue)).toBe(800);
            expect(Number(furniture.max_price)).toBe(500);
        });

        it('filters input via a FilterExpression before aggregating', async () => {
            // Only count acme-brand docs per category.
            const q = new AggregationQuery({
                filter: Tag('brand').eq('acme'),
                groupBy: { fields: ['category'], reducers: [Count().as('total')] },
            });

            const { rows } = await index.aggregate<{ category: string; total: string }>(q);
            expect(rows).toHaveLength(1);
            expect(rows[0].category).toBe('electronics');
            expect(Number(rows[0].total)).toBe(3); // laptop, mouse, monitor
        });
    });

    describe('APPLY post-GROUPBY', () => {
        it('emits a computed field after GROUPBY', async () => {
            const q = new AggregationQuery({
                groupBy: {
                    fields: ['category'],
                    reducers: [Count().as('n'), Sum('price').as('revenue')],
                },
                apply: [{ expression: '@revenue / @n', as: 'avg_price' }],
                sortBy: [{ field: 'category', direction: 'ASC' }],
            });

            const { rows } = await index.aggregate<{
                category: string;
                n: string;
                revenue: string;
                avg_price: string;
            }>(q);

            expect(rows).toHaveLength(2);
            // electronics: 1775 / 4 = 443.75
            expect(Number(rows[0].avg_price)).toBeCloseTo(443.75, 2);
            // furniture: 800 / 2 = 400
            expect(Number(rows[1].avg_price)).toBeCloseTo(400, 2);
        });
    });

    describe('SORTBY + LIMIT + post-FILTER', () => {
        it('paginates and applies a post-aggregation FILTER', async () => {
            const q = new AggregationQuery({
                groupBy: {
                    fields: ['brand'],
                    reducers: [Count().as('total'), Sum('price').as('revenue')],
                },
                sortBy: [{ field: 'revenue', direction: 'DESC' }],
                postFilter: '@total > 1',
                limit: 10,
            });

            const { rows } = await index.aggregate<{
                brand: string;
                total: string;
                revenue: string;
            }>(q);

            // Brand counts: acme=3 (1200+25+400=1625), ergo=2 (300+500=800),
            // omega=1 (150). FILTER drops omega; SORTBY revenue DESC -> acme, ergo.
            expect(rows.map((r) => r.brand)).toEqual(['acme', 'ergo']);
            expect(Number(rows[0].revenue)).toBe(1625);
            expect(Number(rows[1].revenue)).toBe(800);
        });

        it('paginates and applies a typed postFilter via the expression DSL', async () => {
            // Same query as above, but postFilter is built with the typed
            // AField DSL instead of a raw string. Exercises the round-trip
            // through renderAggregationExpr().
            const q = new AggregationQuery({
                groupBy: {
                    fields: ['brand'],
                    reducers: [Count().as('total'), Sum('price').as('revenue')],
                },
                sortBy: [{ field: 'revenue', direction: 'DESC' }],
                postFilter: AField('total').gt(1),
                limit: 10,
            });

            const { rows } = await index.aggregate<{
                brand: string;
                total: string;
            }>(q);
            expect(rows.map((r) => r.brand)).toEqual(['acme', 'ergo']);
        });
    });

    describe('aggregate() / aggregateStream() guardrails', () => {
        it('aggregate() rejects a cursor-configured query', async () => {
            const q = new AggregationQuery({
                groupBy: { fields: ['category'], reducers: [Count().as('total')] },
                cursor: { count: 100 },
            });
            await expect(index.aggregate(q)).rejects.toThrow(/aggregateStream/);
        });

        it('aggregateStream() rejects a non-cursor query', async () => {
            const q = new AggregationQuery({
                groupBy: { fields: ['category'], reducers: [Count().as('total')] },
            });
            const iter = index.aggregateStream(q);
            await expect(iter.next()).rejects.toThrow(/aggregate\(\)/);
        });
    });

    describe('cursored streaming', () => {
        it('yields batches until the cursor is exhausted', async () => {
            // No GROUPBY so each row is a raw document; combined with a small
            // cursor.count this guarantees more than one batch.
            const q = new AggregationQuery({
                load: ['title', 'price'],
                cursor: { count: 2 },
            });

            const batches: Array<{ rows: unknown[]; cursorId: number }> = [];
            for await (const batch of index.aggregateStream(q)) {
                batches.push({ rows: batch.rows, cursorId: batch.cursorId });
            }

            // We have 6 docs; at COUNT 2 that's at least 3 batches plus a
            // terminal batch with cursorId 0 (which may be empty or carry
            // the last residual rows). Total rows across all batches = 6.
            const totalRows = batches.reduce((sum, b) => sum + b.rows.length, 0);
            expect(totalRows).toBe(6);
            expect(batches[batches.length - 1].cursorId).toBe(0);
        });

        it('cleans up the cursor when the consumer breaks out early', async () => {
            const q = new AggregationQuery({
                load: ['title'],
                cursor: { count: 1 },
            });

            // Pull a single batch then bail. The finally-block in
            // aggregateStream should FT.CURSOR DEL the abandoned cursor.
            // We assert no error is thrown — the cleanup is best-effort.
            const iter = index.aggregateStream(q);
            const first = await iter.next();
            expect(first.value?.rows.length ?? 0).toBeGreaterThan(0);
            await iter.return?.(undefined);
        });
    });
});
