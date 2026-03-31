import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type RedisClientType } from 'redis';
import { IndexSchema } from '../../src/schema/schema.js';
import { SearchIndex } from '../../src/indexes/search-index.js';
import { VectorQuery } from '../../src/query/vector.js';
import { HuggingFaceVectorizer } from '../../src/vectorizers/index.js';

describe('Vector Search Integration', () => {
    let client: RedisClientType;
    let index: SearchIndex;
    let vectorizer: HuggingFaceVectorizer;

    beforeAll(async () => {
        // Connect to Redis
        client = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        });
        await client.connect();

        // Create vectorizer
        vectorizer = new HuggingFaceVectorizer({
            model: 'Xenova/all-MiniLM-L6-v2',
        });

        // Create schema for product search
        const schema = IndexSchema.fromObject({
            index: {
                name: 'products-vector-test',
                prefix: 'product:',
                storageType: 'hash',
            },
            fields: [
                { name: 'title', type: 'text' },
                { name: 'category', type: 'tag' },
                { name: 'price', type: 'numeric' },
                {
                    name: 'embedding',
                    type: 'vector',
                    attrs: {
                        dims: 384,
                        algorithm: 'hnsw',
                        distanceMetric: 'cosine',
                    },
                },
            ],
        });

        // Create index
        index = new SearchIndex(schema, client);

        // Clean up any existing index
        try {
            await index.delete({ drop: true });
        } catch {
            // Ignore if index doesn't exist
        }

        await index.create();

        // Load test data with embeddings
        const products = [
            {
                id: '1',
                title: 'Laptop computer for programming',
                category: 'electronics',
                price: 1200,
            },
            { id: '2', title: 'Wireless mouse', category: 'electronics', price: 25 },
            { id: '3', title: 'Mechanical keyboard', category: 'electronics', price: 150 },
            { id: '4', title: 'Office desk chair', category: 'furniture', price: 300 },
            { id: '5', title: 'Standing desk', category: 'furniture', price: 500 },
            { id: '6', title: 'Monitor screen 27 inch', category: 'electronics', price: 400 },
        ];

        await index.load(products, {
            idField: 'id',
            preprocess: async (doc) => {
                const embedding = await vectorizer.embed(doc.title as string);
                return { ...doc, embedding };
            },
        });

        // Give Redis time to index
        await new Promise((resolve) => setTimeout(resolve, 100));
    });

    afterAll(async () => {
        // Clean up
        if (index) {
            await index.delete({ drop: true });
        }
        if (client) {
            await client.quit();
        }
    });

    it('should perform basic vector similarity search', async () => {
        // Search for "desktop computer"
        const queryEmbedding = await vectorizer.embed('desktop computer');

        const query = new VectorQuery({
            vector: queryEmbedding,
            vectorField: 'embedding',
            numResults: 3,
        });

        const results = await index.search(query);

        expect(results.total).toBeGreaterThan(0);
        expect(results.documents).toHaveLength(3);

        // Most similar should be the laptop
        expect(results.documents[0].value.title).toContain('Laptop');
        expect(results.documents[0].score).toBeDefined();
        expect(results.documents[0].score).toBeGreaterThan(0);
    });

    it('should return specified fields only', async () => {
        const queryEmbedding = await vectorizer.embed('computer');

        const query = new VectorQuery({
            vector: queryEmbedding,
            vectorField: 'embedding',
            numResults: 2,
            returnFields: ['title', 'price'],
        });

        const results = await index.search(query);

        expect(results.documents[0].value).toHaveProperty('title');
        expect(results.documents[0].value).toHaveProperty('price');
    });

    it('should filter by category and perform vector search', async () => {
        const queryEmbedding = await vectorizer.embed('desk');

        const query = new VectorQuery({
            vector: queryEmbedding,
            vectorField: 'embedding',
            filter: '@category:{furniture}',
            numResults: 5,
        });

        const results = await index.search(query);

        expect(results.total).toBeGreaterThan(0);
        // All results should be furniture
        results.documents.forEach((doc) => {
            expect(doc.value.category).toBe('furniture');
        });
    });

    it('should support pagination', async () => {
        const queryEmbedding = await vectorizer.embed('electronics');

        const query = new VectorQuery({
            vector: queryEmbedding,
            vectorField: 'embedding',
            numResults: 10,
            offset: 1,
            limit: 2,
        });

        const results = await index.search(query);

        // Should return at most 2 results (skipping the first)
        expect(results.documents.length).toBeLessThanOrEqual(2);
    });
});

describe('Vector Search with JSON Storage Integration', () => {
    let client: RedisClientType;
    let index: SearchIndex;
    let vectorizer: HuggingFaceVectorizer;

    beforeAll(async () => {
        // Connect to Redis
        client = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        });
        await client.connect();

        // Create vectorizer
        vectorizer = new HuggingFaceVectorizer({
            model: 'Xenova/all-MiniLM-L6-v2',
        });

        // Create schema for product search with JSON storage
        const schema = IndexSchema.fromObject({
            index: {
                name: 'products-json-test',
                prefix: 'product:json:',
                storageType: 'json',
            },
            fields: [
                { name: '$.title', type: 'text', attrs: { as: 'title' } },
                { name: '$.category', type: 'tag', attrs: { as: 'category' } },
                { name: '$.price', type: 'numeric', attrs: { as: 'price' } },
                { name: '$.metadata.rating', type: 'numeric', attrs: { as: 'rating' } },
                {
                    name: '$.embedding',
                    type: 'vector',
                    attrs: {
                        as: 'embedding',
                        dims: 384,
                        algorithm: 'hnsw',
                        distanceMetric: 'cosine',
                    },
                },
            ],
        });

        // Create index
        index = new SearchIndex(schema, client);

        // Clean up any existing index
        try {
            await index.delete({ drop: true });
        } catch {
            // Ignore if index doesn't exist
        }

        await index.create();

        // Load test data with embeddings and nested JSON
        const products = [
            {
                id: '1',
                title: 'Gaming Laptop',
                category: 'electronics',
                price: 1500,
                metadata: { brand: 'Dell', rating: 4.5 },
            },
            {
                id: '2',
                title: 'Wireless Gaming Mouse',
                category: 'electronics',
                price: 80,
                metadata: { brand: 'Logitech', rating: 4.7 },
            },
            {
                id: '3',
                title: 'Office Desk',
                category: 'furniture',
                price: 350,
                metadata: { brand: 'IKEA', rating: 4.2 },
            },
        ];

        await index.load(products, {
            idField: 'id',
            preprocess: async (doc) => {
                const embedding = await vectorizer.embed(doc.title as string);
                return { ...doc, embedding };
            },
        });

        // Give Redis time to index
        await new Promise((resolve) => setTimeout(resolve, 100));
    });

    afterAll(async () => {
        // Clean up
        if (index) {
            await index.delete({ drop: true });
        }
        if (client) {
            await client.quit();
        }
    });

    it('should perform vector search with JSON storage', async () => {
        const queryEmbedding = await vectorizer.embed('computer');

        const query = new VectorQuery({
            vector: queryEmbedding,
            vectorField: 'embedding',
            numResults: 2,
        });

        const results = await index.search(query);

        expect(results.total).toBeGreaterThan(0);
        expect(results.documents[0].value.title).toContain('Laptop');
        expect(results.documents[0].score).toBeDefined();
    });

    it('should filter by nested JSON fields', async () => {
        const queryEmbedding = await vectorizer.embed('gaming');

        const query = new VectorQuery({
            vector: queryEmbedding,
            vectorField: 'embedding',
            filter: '@rating:[4.5 +inf]',
            numResults: 5,
        });

        const results = await index.search(query);

        expect(results.total).toBeGreaterThan(0);
        // Should only return high-rated items
        results.documents.forEach((doc) => {
            const rating = (doc.value as any).metadata?.rating || (doc.value as any).rating;
            if (rating) {
                expect(rating).toBeGreaterThanOrEqual(4.5);
            }
        });
    });
});
