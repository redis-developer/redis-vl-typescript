/**
 * Integration coverage for the FilterQuery / CountQuery / VectorRangeQuery /
 * TextQuery surface introduced alongside the filter DSL.
 *
 * The four queries share a single HASH-storage index loaded with a small
 * fixture of products. Vectors are hand-crafted 4-d unit vectors so cosine
 * distances are deterministic and we don't need to spin up a vectorizer
 * model just to exercise the query string.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type RedisClientType } from 'redis';
import { IndexSchema } from '../../src/schema/schema.js';
import { SearchIndex } from '../../src/indexes/search-index.js';
import { FilterQuery } from '../../src/query/filter-query.js';
import { CountQuery } from '../../src/query/count.js';
import { VectorRangeQuery } from '../../src/query/range.js';
import { TextQuery } from '../../src/query/text.js';
import { Tag, Num, Text } from '../../src/query/filter.js';

interface Product extends Record<string, unknown> {
    id: string;
    title: string;
    brand: string;
    category: string;
    price: number;
    embedding: number[];
}

// 4-d unit vectors, deterministic so cosine distance is easy to reason about.
const VEC_LAPTOP: number[] = [1, 0, 0, 0];
const VEC_KEYBOARD: number[] = [0.95, 0.31225, 0, 0]; // ~18° off VEC_LAPTOP
const VEC_MOUSE: number[] = [0.7071, 0.7071, 0, 0]; // 45° off
const VEC_DESK: number[] = [0, 0, 1, 0]; // orthogonal to laptop
const VEC_CHAIR: number[] = [0, 0, 0.7071, 0.7071];
const VEC_MONITOR: number[] = [0.866, 0.5, 0, 0]; // 30° off laptop

describe('Query types integration (FilterQuery / CountQuery / VectorRangeQuery / TextQuery)', () => {
    let client: RedisClientType;
    let index: SearchIndex;

    beforeAll(async () => {
        client = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        });
        await client.connect();

        const schema = IndexSchema.fromObject({
            index: {
                name: 'redisvl-test-query-types',
                prefix: 'rvl-test-qt',
                storageType: 'hash',
            },
            fields: [
                { name: 'title', type: 'text' },
                { name: 'brand', type: 'tag' },
                { name: 'category', type: 'tag' },
                { name: 'price', type: 'numeric' },
                {
                    name: 'embedding',
                    type: 'vector',
                    attrs: { dims: 4, algorithm: 'flat', distanceMetric: 'cosine' },
                },
            ],
        });

        index = new SearchIndex(schema, client);
        await index.create({ overwrite: true, drop: true });

        const products: Product[] = [
            {
                id: '1',
                title: 'Laptop computer for programming',
                brand: 'acme',
                category: 'electronics',
                price: 1200,
                embedding: VEC_LAPTOP,
            },
            {
                id: '2',
                title: 'Wireless mouse',
                brand: 'acme',
                category: 'electronics',
                price: 25,
                embedding: VEC_MOUSE,
            },
            {
                id: '3',
                title: 'Mechanical keyboard',
                brand: 'omega',
                category: 'electronics',
                price: 150,
                embedding: VEC_KEYBOARD,
            },
            {
                id: '4',
                title: 'Office desk chair',
                brand: 'ergo',
                category: 'furniture',
                price: 300,
                embedding: VEC_CHAIR,
            },
            {
                id: '5',
                title: 'Standing desk',
                brand: 'ergo',
                category: 'furniture',
                price: 500,
                embedding: VEC_DESK,
            },
            {
                id: '6',
                title: 'Monitor screen 27 inch',
                brand: 'acme',
                category: 'electronics',
                price: 400,
                embedding: VEC_MONITOR,
            },
        ];

        await index.load(products, { idField: 'id' });

        // Give Redis a moment to index.
        await new Promise((r) => setTimeout(r, 100));
    });

    afterAll(async () => {
        await index?.delete({ drop: true }).catch(() => {});
        await client?.quit();
    });

    describe('FilterQuery', () => {
        it('returns all documents for the wildcard filter', async () => {
            const results = await index.search(new FilterQuery({ numResults: 100 }));
            expect(results.total).toBe(6);
            expect(results.documents).toHaveLength(6);
        });

        it('filters by a single tag value', async () => {
            const q = new FilterQuery({ filter: Tag('category').eq('furniture') });
            const results = await index.search(q);

            expect(results.total).toBe(2);
            results.documents.forEach((d) => expect(d.value.category).toBe('furniture'));
        });

        it('combines tag + numeric filters via and()', async () => {
            const q = new FilterQuery({
                filter: Tag('category').eq('electronics').and(Num('price').lt(200)),
            });
            const results = await index.search(q);

            expect(results.total).toBe(2); // mouse @ 25, keyboard @ 150
            results.documents.forEach((d) => {
                expect(d.value.category).toBe('electronics');
                expect(Number(d.value.price)).toBeLessThan(200);
            });
        });

        it('combines tag filters via or()', async () => {
            const q = new FilterQuery({
                filter: Tag('brand').eq('omega').or(Tag('brand').eq('ergo')),
                numResults: 100,
            });
            const results = await index.search(q);

            expect(results.total).toBe(3); // 1 omega + 2 ergo
            const brands = results.documents.map((d) => d.value.brand).sort();
            expect(brands).toEqual(['ergo', 'ergo', 'omega']);
        });

        it('supports between() on numeric fields', async () => {
            const q = new FilterQuery({
                filter: Num('price').between(100, 500),
                numResults: 100,
            });
            const results = await index.search(q);

            expect(results.total).toBe(4); // keyboard, chair, desk, monitor
            results.documents.forEach((d) => {
                const price = Number(d.value.price);
                expect(price).toBeGreaterThanOrEqual(100);
                expect(price).toBeLessThanOrEqual(500);
            });
        });

        it('returns the requested fields only', async () => {
            const q = new FilterQuery({
                filter: Tag('category').eq('furniture'),
                returnFields: ['title', 'price'],
            });
            const results = await index.search(q);

            expect(results.total).toBe(2);
            results.documents.forEach((d) => {
                expect(d.value).toHaveProperty('title');
                expect(d.value).toHaveProperty('price');
                // Brand and category were not requested, so Redis omits them.
                expect(d.value).not.toHaveProperty('brand');
                expect(d.value).not.toHaveProperty('category');
            });
        });
    });

    describe('CountQuery', () => {
        it('returns the total without payloads', async () => {
            const q = new CountQuery({ filter: Tag('category').eq('electronics') });
            const results = await index.search(q);

            expect(results.total).toBe(4);
            // NOCONTENT + LIMIT 0 0 means the response carries no documents.
            expect(results.documents).toHaveLength(0);
        });

        it('counts the wildcard match (every doc in the index)', async () => {
            const results = await index.search(new CountQuery());
            expect(results.total).toBe(6);
            expect(results.documents).toHaveLength(0);
        });

        it('counts a composed filter expression', async () => {
            const q = new CountQuery({
                filter: Tag('brand').eq('acme').and(Num('price').gt(100)),
            });
            const results = await index.search(q);

            // acme docs above $100: laptop @ 1200, monitor @ 400 = 2
            expect(results.total).toBe(2);
        });
    });

    describe('VectorRangeQuery', () => {
        it('returns only documents within the distance threshold of the query vector', async () => {
            // Query vector = VEC_LAPTOP. With cosine, identical vectors give
            // distance 0; orthogonal give distance 1. A threshold of 0.2 should
            // capture laptop (0), keyboard (~0.05), monitor (~0.13), excluding
            // mouse (~0.29), chair (1.0), and desk (1.0).
            const q = new VectorRangeQuery({
                vector: VEC_LAPTOP,
                vectorField: 'embedding',
                distanceThreshold: 0.2,
                limit: 10,
            });
            const results = await index.search(q);

            const titles = results.documents.map((d) => d.value.title).sort();
            expect(titles).toEqual([
                'Laptop computer for programming',
                'Mechanical keyboard',
                'Monitor screen 27 inch',
            ]);

            results.documents.forEach((d) => {
                expect(d.score).toBeDefined();
                expect(d.score!).toBeLessThanOrEqual(0.2 + 1e-6);
            });
        });

        it('combines a tag filter with the vector range clause', async () => {
            // Same threshold as above, but restricted to brand=acme.
            // From the in-range set { laptop, keyboard, monitor }, only laptop
            // and monitor are acme.
            const q = new VectorRangeQuery({
                vector: VEC_LAPTOP,
                vectorField: 'embedding',
                distanceThreshold: 0.2,
                filter: Tag('brand').eq('acme'),
                limit: 10,
            });
            const results = await index.search(q);

            const titles = results.documents.map((d) => d.value.title).sort();
            expect(titles).toEqual(['Laptop computer for programming', 'Monitor screen 27 inch']);
        });

        it('returns nothing when the threshold is tighter than the closest doc', async () => {
            // Only the laptop itself sits at distance 0 from VEC_LAPTOP.
            // A 0 threshold should yield exactly one match.
            const q = new VectorRangeQuery({
                vector: VEC_LAPTOP,
                vectorField: 'embedding',
                distanceThreshold: 0.0,
            });
            const results = await index.search(q);
            expect(results.total).toBe(1);
            expect(results.documents[0].value.title).toBe('Laptop computer for programming');
        });
    });

    describe('TextQuery', () => {
        it('matches documents containing the search token', async () => {
            const q = new TextQuery({ text: 'keyboard', textFieldName: 'title' });
            const results = await index.search(q);

            expect(results.total).toBe(1);
            expect(results.documents[0].value.title).toBe('Mechanical keyboard');
        });

        it('OR-joins multiple tokens and matches any of them', async () => {
            // "desk" matches the chair + standing desk; "monitor" matches the monitor.
            const q = new TextQuery({
                text: 'desk monitor',
                textFieldName: 'title',
                numResults: 10,
            });
            const results = await index.search(q);

            const titles = results.documents.map((d) => d.value.title).sort();
            expect(titles).toEqual([
                'Monitor screen 27 inch',
                'Office desk chair',
                'Standing desk',
            ]);
        });

        it('combines a text clause with a tag filter via AND', async () => {
            // "desk" appears in two titles; restricting to brand=ergo keeps both.
            const q = new TextQuery({
                text: 'desk',
                textFieldName: 'title',
                filter: Tag('brand').eq('ergo'),
                numResults: 10,
            });
            const results = await index.search(q);

            expect(results.total).toBe(2);
            results.documents.forEach((d) => expect(d.value.brand).toBe('ergo'));
        });

        it('combines a text clause with a numeric filter', async () => {
            // "computer" appears in the laptop title; price > 1000 keeps it.
            const q = new TextQuery({
                text: 'computer',
                textFieldName: 'title',
                filter: Num('price').gt(1000),
            });
            const results = await index.search(q);

            expect(results.total).toBe(1);
            expect(results.documents[0].value.title).toBe('Laptop computer for programming');
        });

        it('plays well with the Text filter helper used as a sub-clause', async () => {
            // Use Text(...).like(...) inside the filter to attach a wildcard
            // clause alongside the tokenised TextQuery body.
            const q = new TextQuery({
                text: 'screen',
                textFieldName: 'title',
                filter: Text('title').like('Monitor*'),
            });
            const results = await index.search(q);

            expect(results.total).toBe(1);
            expect(results.documents[0].value.title).toBe('Monitor screen 27 inch');
        });

        it('default stopwords let stopword-bearing queries still match documents', async () => {
            // "for" is in the default English stopword list and gets stripped
            // before the query reaches Redis, leaving just "programming".
            const q = new TextQuery({
                text: 'for programming',
                textFieldName: 'title',
                returnFields: ['title'],
            });

            // Verify the rendered query: stopword filtering must actually run
            // here. Without this assertion, the test passes whether or not
            // filtering happens — Redis would match the document on
            // 'programming' alone in either case.
            expect(q.buildQuery()).toBe('@title:(programming)');

            const results = await index.search(q);
            const titles = results.documents.map((d) => d.value.title);
            expect(titles).toContain('Laptop computer for programming');
        });
    });

    describe('TextQuery — per-field weights', () => {
        it('ranks docs by per-field weight when the same terms appear in different fields', async () => {
            // Stand up a dedicated two-text-field index so we can place
            // identical match tokens in different fields and observe the
            // per-field weight steering the ranking.
            const indexName = `redisvl-test-text-weights-${Date.now()}`;
            const schema = IndexSchema.fromObject({
                index: {
                    name: indexName,
                    prefix: `rvl-test-tw-${Date.now()}`,
                    storageType: 'hash',
                },
                fields: [
                    { name: 'title', type: 'text' },
                    { name: 'body', type: 'text' },
                ],
            });

            const weightedIndex = new SearchIndex(schema, client);
            await weightedIndex.create({ overwrite: true, drop: true });

            try {
                await weightedIndex.load(
                    [
                        { id: 'a', title: 'foo bar', body: 'zzz zzz' },
                        { id: 'b', title: 'zzz zzz', body: 'foo bar' },
                    ],
                    { idField: 'id' }
                );

                // Let Redis index the two new docs.
                await new Promise((r) => setTimeout(r, 100));

                // Heavy ratio (10:1) keeps the assertion robust against
                // BM25 quirks on a 2-doc corpus.
                const q = new TextQuery({
                    text: 'foo bar',
                    textFieldName: { title: 10.0, body: 1.0 },
                    returnFields: ['id'],
                    textScorer: 'BM25STD',
                });

                const results = await weightedIndex.search(q);
                expect(results.documents.length).toBeGreaterThanOrEqual(2);
                // Doc A's match is in the higher-weighted `title` field, so
                // it must rank above Doc B whose match is in `body`.
                expect(results.documents[0].id).toContain('a');
                expect(results.documents[1].id).toContain('b');
            } finally {
                await weightedIndex.delete({ drop: true }).catch(() => {});
            }
        });
    });
});
