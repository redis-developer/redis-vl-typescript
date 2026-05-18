/**
 * Integration coverage for AggregationQuery / SearchIndex.aggregate.
 *
 * Seeds a small product fixture so GROUPBY / SUM / AVG / APPLY / SORTBY /
 * FILTER all produce predictable values.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type RedisClientType } from 'redis';
import { IndexSchema } from '../../src/schema/schema.js';
import { SearchIndex } from '../../src/indexes/search-index.js';
import { AggregationQuery, Reducers } from '../../src/query/aggregation.js';
import { Tag } from '../../src/query/filter.js';

interface Product extends Record<string, unknown> {
    id: string;
    brand: string;
    category: string;
    price: number;
    quantity: number;
}

describe('AggregationQuery integration', () => {
    let client: RedisClientType;
    let index: SearchIndex;

    beforeAll(async () => {
        client = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        });
        await client.connect();

        const schema = IndexSchema.fromObject({
            index: {
                name: 'redisvl-test-aggregate',
                prefix: 'rvl-test-agg',
                storageType: 'hash',
            },
            fields: [
                { name: 'brand', type: 'tag' },
                { name: 'category', type: 'tag' },
                { name: 'price', type: 'numeric' },
                { name: 'quantity', type: 'numeric' },
            ],
        });

        index = new SearchIndex(schema, client);
        await index.create({ overwrite: true, drop: true });

        const products: Product[] = [
            { id: '1', brand: 'acme', category: 'electronics', price: 1200, quantity: 2 },
            { id: '2', brand: 'acme', category: 'electronics', price: 25, quantity: 10 },
            { id: '3', brand: 'omega', category: 'electronics', price: 150, quantity: 4 },
            { id: '4', brand: 'ergo', category: 'furniture', price: 300, quantity: 3 },
            { id: '5', brand: 'ergo', category: 'furniture', price: 500, quantity: 1 },
            { id: '6', brand: 'acme', category: 'electronics', price: 400, quantity: 5 },
        ];

        await index.load(products, { idField: 'id' });
        await new Promise((r) => setTimeout(r, 100));
    });

    afterAll(async () => {
        await index?.delete({ drop: true }).catch(() => {});
        await client?.quit();
    });

    it('groups by brand with COUNT and SUM reducers', async () => {
        const q = new AggregationQuery()
            .groupBy('brand', [Reducers.count('total'), Reducers.sum('price', 'revenue')])
            .sortBy([{ field: 'brand', direction: 'ASC' }]);

        const { total, results } = await index.aggregate(q);

        expect(total).toBeGreaterThan(0);
        const byBrand = Object.fromEntries(results.map((r) => [r.brand, r]));
        expect(byBrand['acme']).toMatchObject({ total: '3', revenue: '1625' });
        expect(byBrand['omega']).toMatchObject({ total: '1', revenue: '150' });
        expect(byBrand['ergo']).toMatchObject({ total: '2', revenue: '800' });
    });

    it('honors the constructor query string as a pre-aggregation filter', async () => {
        const q = new AggregationQuery(Tag('category').eq('electronics')).groupBy(
            'brand',
            Reducers.count('total')
        );

        const { results } = await index.aggregate(q);
        const brands = new Set(results.map((r) => r.brand));
        expect(brands.has('acme')).toBe(true);
        expect(brands.has('omega')).toBe(true);
        expect(brands.has('ergo')).toBe(false);
    });

    it('supports APPLY to derive a field, plus SORTBY + LIMIT', async () => {
        const q = new AggregationQuery()
            .groupBy('brand', [Reducers.sum('price', 'revenue'), Reducers.sum('quantity', 'units')])
            .apply('@revenue / @units', 'avg_unit_price')
            .sortBy([{ field: 'avg_unit_price', direction: 'DESC' }])
            .limit(0, 1);

        const { results } = await index.aggregate(q);
        expect(results).toHaveLength(1);
        // ergo: revenue=800 / units=4 = 200 — highest avg unit price.
        // (acme is 1625/17 ≈ 95.6, omega is 150/4 = 37.5.)
        expect(results[0].brand).toBe('ergo');
        expect(Number(results[0].avg_unit_price)).toBe(200);
    });

    it('applies post-aggregation FILTER (FT.AGGREGATE expression dialect)', async () => {
        const q = new AggregationQuery()
            .groupBy('brand', Reducers.sum('price', 'revenue'))
            .filter('@revenue > 200');

        const { results } = await index.aggregate(q);
        const brands = new Set(results.map((r) => r.brand));
        // acme (1625) and ergo (800) pass; omega (150) is filtered out.
        expect(brands.has('acme')).toBe(true);
        expect(brands.has('ergo')).toBe(true);
        expect(brands.has('omega')).toBe(false);
    });

    it('binds PARAMS for parameterized filter strings', async () => {
        const q = new AggregationQuery('@brand:{$brandName}')
            .params({ brandName: 'omega' })
            .dialect(2)
            .groupBy('brand', Reducers.count('total'));

        const { results } = await index.aggregate(q);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({ brand: 'omega', total: '1' });
    });

    it('preserves TOLIST array values', async () => {
        const q = new AggregationQuery()
            .groupBy('category', Reducers.toList('brand', 'brands'))
            .sortBy([{ field: 'category', direction: 'ASC' }]);

        const { results } = await index.aggregate(q);
        const byCategory = Object.fromEntries(results.map((r) => [r.category as string, r]));

        const electronicsBrands = byCategory['electronics'].brands;
        expect(Array.isArray(electronicsBrands)).toBe(true);
        // Order isn't guaranteed by Redis — assert as a set.
        expect(new Set(electronicsBrands as string[])).toEqual(new Set(['acme', 'omega']));

        const furnitureBrands = byCategory['furniture'].brands;
        expect(Array.isArray(furnitureBrands)).toBe(true);
        expect(new Set(furnitureBrands as string[])).toEqual(new Set(['ergo']));
    });

    it('supports GROUPBY 0 for global reducers (whole-result aggregation)', async () => {
        const q = new AggregationQuery().groupBy(
            [],
            [Reducers.sum('price', 'total_revenue'), Reducers.count('order_count')]
        );

        const { results } = await index.aggregate(q);
        expect(results).toHaveLength(1);
        // 1200 + 25 + 150 + 300 + 500 + 400 = 2575 across all 6 rows.
        expect(Number(results[0].total_revenue)).toBe(2575);
        expect(results[0].order_count).toBe('6');
    });
});
