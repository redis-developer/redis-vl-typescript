/**
 * Integration coverage for HybridQuery against the FT.HYBRID command on a
 * real Redis 8.4+ instance (Testcontainer). Uses deterministic 4-d unit
 * vectors so we can reason precisely about the cosine ordering.
 *
 * @experimental FT.HYBRID itself is flagged experimental upstream — its
 * argument shape and reply format may shift in a future release.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type RedisClientType } from 'redis';
import { IndexSchema } from '../../src/schema/schema.js';
import { SearchIndex } from '../../src/indexes/search-index.js';
import { HybridQuery } from '../../src/query/hybrid.js';
import { Tag, Num } from '../../src/query/filter.js';

interface Product extends Record<string, unknown> {
    id: string;
    title: string;
    brand: string;
    category: string;
    price: number;
    embedding: number[];
}

const VEC_LAPTOP = [1, 0, 0, 0];
const VEC_KEYBOARD = [0.95, 0.31225, 0, 0];
const VEC_MOUSE = [0.7071, 0.7071, 0, 0];
const VEC_DESK = [0, 0, 1, 0];
const VEC_CHAIR = [0, 0, 0.7071, 0.7071];
const VEC_MONITOR = [0.866, 0.5, 0, 0];

const describeHybrid = process.env.REDISVL_SKIP_HYBRID === 'true' ? describe.skip : describe;

describeHybrid('HybridQuery integration (FT.HYBRID)', () => {
    let client: RedisClientType;
    let index: SearchIndex;

    beforeAll(async () => {
        client = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        });
        await client.connect();

        const schema = IndexSchema.fromObject({
            index: {
                name: 'redisvl-test-hybrid',
                prefix: 'rvl-test-hybrid',
                storageType: 'hash',
            },
            fields: [
                { name: 'title', type: 'text' },
                { name: 'description', type: 'text' },
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
                description: 'A powerful laptop ideal for programming and machine learning',
                brand: 'acme',
                category: 'electronics',
                price: 1200,
                embedding: VEC_LAPTOP,
            },
            {
                id: '2',
                title: 'Wireless mouse',
                description: 'Ergonomic wireless mouse for everyday computing',
                brand: 'acme',
                category: 'electronics',
                price: 25,
                embedding: VEC_MOUSE,
            },
            {
                id: '3',
                title: 'Mechanical keyboard',
                description: 'Tactile mechanical keyboard with RGB lighting for programming',
                brand: 'omega',
                category: 'electronics',
                price: 150,
                embedding: VEC_KEYBOARD,
            },
            {
                id: '4',
                title: 'Office desk chair',
                description: 'Ergonomic office chair with lumbar support',
                brand: 'ergo',
                category: 'furniture',
                price: 300,
                embedding: VEC_CHAIR,
            },
            {
                id: '5',
                title: 'Standing desk',
                description: 'Height-adjustable standing desk for ergonomic working',
                brand: 'ergo',
                category: 'furniture',
                price: 500,
                embedding: VEC_DESK,
            },
            {
                id: '6',
                title: 'Monitor screen 27 inch',
                description: 'High-resolution monitor for design and development work',
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

    describe('default fusion (RRF) with KNN', () => {
        it('returns scores when COMBINE is omitted from user config', async () => {
            const q = new HybridQuery({
                text: 'programming',
                textFieldName: 'description',
                vector: VEC_LAPTOP,
                vectorField: 'embedding',
                vectorMethod: { type: 'KNN', k: 10 },
                returnFields: ['title'],
            });

            const results = await index.hybridSearch(q);

            expect(results.documents.length).toBeGreaterThan(0);
            results.documents.forEach((doc) => {
                expect(doc.score).toBeDefined();
                expect(Number.isFinite(doc.score)).toBe(true);
            });
        });

        it('returns documents ranked by fused score with id, value, score, executionTime', async () => {
            const q = new HybridQuery({
                text: 'programming',
                textFieldName: 'description',
                vector: VEC_LAPTOP,
                vectorField: 'embedding',
                vectorMethod: { type: 'KNN', k: 10 },
                combine: { type: 'RRF' },
                returnFields: ['title', 'brand'],
            });

            const results = await index.hybridSearch(q);

            expect(results.total).toBeGreaterThan(0);
            expect(results.documents.length).toBeGreaterThan(0);
            expect(results.executionTime).toBeDefined();
            expect(results.executionTime).toBeGreaterThanOrEqual(0);

            results.documents.forEach((doc) => {
                expect(doc.id).toMatch(/^rvl-test-hybrid:/);
                expect(doc.score).toBeDefined();
                expect(doc.value).toHaveProperty('title');
                expect(doc.value).toHaveProperty('brand');
            });

            // Top result should be either the laptop (vector match) or the
            // keyboard (text "programming" + close vector). Both contain
            // "programming" in their description.
            const topId = results.documents[0].id;
            expect(['rvl-test-hybrid:1', 'rvl-test-hybrid:3']).toContain(topId);
        });
    });

    describe('LINEAR fusion', () => {
        it('uses ALPHA/BETA weights and yields scores under the configured alias', async () => {
            const q = new HybridQuery({
                text: 'ergonomic',
                textFieldName: 'description',
                vector: VEC_DESK,
                vectorField: 'embedding',
                vectorMethod: { type: 'KNN', k: 5 },
                combine: { type: 'LINEAR', alpha: 0.5, beta: 0.5 },
                combinedScoreAlias: 'fusion_score',
                returnFields: ['title'],
            });

            const results = await index.hybridSearch(q);

            expect(results.total).toBeGreaterThan(0);
            results.documents.forEach((doc) => {
                expect(doc.score).toBeDefined();
                expect(Number.isFinite(doc.score)).toBe(true);
            });
        });
    });

    describe('RANGE vector method', () => {
        it('limits vector candidates by radius before fusion', async () => {
            // Tight radius around VEC_LAPTOP — only laptop, keyboard,
            // monitor are within 0.2 cosine distance. With a text query
            // for "programming" the union is {laptop, keyboard, monitor}.
            const q = new HybridQuery({
                text: 'programming',
                textFieldName: 'description',
                vector: VEC_LAPTOP,
                vectorField: 'embedding',
                vectorMethod: { type: 'RANGE', radius: 0.2 },
                combine: { type: 'RRF' },
                returnFields: ['title'],
            });

            const results = await index.hybridSearch(q);

            const allowed = new Set([
                'rvl-test-hybrid:1', // laptop
                'rvl-test-hybrid:3', // keyboard
                'rvl-test-hybrid:6', // monitor
            ]);
            results.documents.forEach((doc) => expect(allowed.has(doc.id)).toBe(true));
        });
    });

    describe('vsimFilter (pre-filter on vector candidates)', () => {
        it('restricts the vector side to documents matching the filter', async () => {
            // FT.HYBRID returns the union of SEARCH candidates + VSIM
            // candidates fused via COMBINE. vsimFilter only constrains
            // VSIM. We isolate its effect by using a text query that
            // matches nothing — then the result set comes entirely from
            // the vector side, and every result should satisfy vsimFilter.
            const q = new HybridQuery({
                text: 'qqzzgibberishxx',
                textFieldName: 'description',
                vector: VEC_DESK,
                vectorField: 'embedding',
                vectorMethod: { type: 'KNN', k: 5 },
                vsimFilter: '@category:{furniture}',
                combine: { type: 'RRF' },
                returnFields: ['title', 'category'],
            });

            const results = await index.hybridSearch(q);

            expect(results.documents.length).toBeGreaterThan(0);
            results.documents.forEach((doc) => {
                expect(doc.value.category).toBe('furniture');
            });
        });

        it('accepts a FilterExpression from the typed filter DSL', async () => {
            // Same isolation strategy as the string-form test above: a
            // gibberish text query forces every result through the VSIM
            // side, so `vsimFilter` becomes the sole gate on the result
            // set. Among the furniture docs (chair=300, desk=500), only
            // the chair satisfies price < 400.
            const q = new HybridQuery({
                text: 'qqzzgibberishxx',
                textFieldName: 'description',
                vector: VEC_DESK,
                vectorField: 'embedding',
                vectorMethod: { type: 'KNN', k: 5 },
                vsimFilter: Tag('category').eq('furniture').and(Num('price').lt(400)),
                combine: { type: 'RRF' },
                returnFields: ['title', 'category', 'price'],
            });

            const results = await index.hybridSearch(q);

            expect(results.documents.length).toBeGreaterThan(0);
            results.documents.forEach((doc) => {
                expect(doc.value.category).toBe('furniture');
                expect(Number(doc.value.price)).toBeLessThan(400);
            });
        });
    });

    describe('postFilter (top-level FILTER)', () => {
        it('drops documents that fail the post-fusion filter', async () => {
            // FT.HYBRID's top-level FILTER uses the FT.AGGREGATE expression
            // dialect, not the FT.SEARCH filter dialect.
            const q = new HybridQuery({
                text: 'computing',
                textFieldName: 'description',
                vector: VEC_LAPTOP,
                vectorField: 'embedding',
                vectorMethod: { type: 'KNN', k: 5 },
                postFilter: '@price < 200',
                combine: { type: 'RRF' },
                returnFields: ['title', 'price'],
            });

            const results = await index.hybridSearch(q);

            results.documents.forEach((doc) => {
                expect(Number(doc.value.price)).toBeLessThan(200);
            });
        });
    });

    describe('verbatim text body (no textFieldName)', () => {
        it('passes the text body through and the embedded tag clause restricts SEARCH candidates', async () => {
            // When textFieldName is omitted, the text body is sent to
            // FT.HYBRID's SEARCH clause verbatim. FT.HYBRID merges
            // SEARCH + VSIM candidates, so a SEARCH-side tag clause only
            // narrows SEARCH candidates. We pair it with a VSIM that
            // targets a vector belonging to the omega brand, so the
            // SEARCH-restricted omega doc shows up in the fused result set.
            const q = new HybridQuery({
                text: '@brand:{omega} programming',
                vector: VEC_KEYBOARD,
                vectorField: 'embedding',
                vectorMethod: { type: 'KNN', k: 5 },
                combine: { type: 'RRF' },
                returnFields: ['title', 'brand'],
            });

            const results = await index.hybridSearch(q);

            const brands = results.documents.map((d) => d.value.brand);
            expect(brands).toContain('omega');
        });
    });

    describe('score aliases and LIMIT', () => {
        it('honours numResults via FT.HYBRID LIMIT', async () => {
            const q = new HybridQuery({
                text: 'work',
                textFieldName: 'description',
                vector: VEC_LAPTOP,
                vectorField: 'embedding',
                numResults: 2,
                combine: { type: 'RRF' },
            });

            const results = await index.hybridSearch(q);
            expect(results.documents.length).toBeLessThanOrEqual(2);
        });
    });
});
