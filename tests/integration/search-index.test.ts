import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type RedisClientType } from 'redis';
import { IndexSchema, SearchIndex } from '../../src/index.js';

describe('SearchIndex CRUD Operations (Integration)', () => {
    let client: RedisClientType;
    let index: SearchIndex;

    beforeAll(async () => {
        client = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        });
        await client.connect();
    });

    afterAll(async () => {
        if (index) {
            try {
                await index.delete();
            } catch (error) {
                // Ignore if already deleted
            }
        }
        await client.quit();
    });

    describe('fetch()', () => {
        it('should fetch documents with prefix ending with separator (regression test for double colon)', async () => {
            // Create schema with prefix ending in colon
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-fetch',
                    prefix: 'rvl-test-fetch:',
                    storage_type: 'hash',
                },
                fields: [
                    { name: 'title', type: 'text' },
                    { name: 'content', type: 'text' },
                    { name: 'category', type: 'tag' },
                ],
            });

            index = new SearchIndex(schema, client);
            await index.create();

            // Load data (auto-generates ULID keys)
            const sampleData = [
                {
                    title: 'Document 1',
                    content: 'This is the first document',
                    category: 'test',
                },
                {
                    title: 'Document 2',
                    content: 'This is the second document',
                    category: 'test',
                },
                {
                    title: 'Document 3',
                    content: 'This is the third document',
                    category: 'test',
                },
            ];

            const keys = await index.load(sampleData);

            // Verify keys were generated correctly (single colon, not double ::)
            expect(keys).toHaveLength(3);
            expect(keys[0]).toMatch(/^rvl-test-fetch:[A-Z0-9_-]+$/); // Single colon
            expect(keys[0]).not.toContain('::'); // No double colon

            // Extract IDs from keys (remove prefix)
            const id1 = keys[0].split(':')[1];
            const id2 = keys[1].split(':')[1];
            const id3 = keys[2].split(':')[1];

            // Test fetch()
            const doc1 = await index.fetch(id1);
            expect(doc1).toBeDefined();
            expect(doc1).not.toBeNull();
            expect(doc1?.title).toBe('Document 1');

            const doc2 = await index.fetch(id2);
            expect(doc2).toBeDefined();
            expect(doc2).not.toBeNull();
            expect(doc2?.title).toBe('Document 2');

            const doc3 = await index.fetch(id3);
            expect(doc3).toBeDefined();
            expect(doc3).not.toBeNull();
            expect(doc3?.title).toBe('Document 3');

            // Verify data exists in Redis using raw client (should work)
            const rawDoc = await client.hGetAll(keys[0]);
            expect(rawDoc).toBeDefined();
            expect(rawDoc.title).toBe('Document 1');
        });

        it('should fetch documents with prefix without trailing separator', async () => {
            // Create schema with prefix NOT ending in colon
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-fetch-without-colon',
                    prefix: 'rvl-test-fetch-no-colon', // No trailing :
                    storage_type: 'hash',
                },
                fields: [
                    { name: 'title', type: 'text' },
                    { name: 'content', type: 'text' },
                ],
            });

            index = new SearchIndex(schema, client);
            await index.create();

            const data = [
                { title: 'Test 1', content: 'Content 1' },
                { title: 'Test 2', content: 'Content 2' },
            ];

            const keys = await index.load(data);

            // Verify keys have correct format
            expect(keys[0]).toMatch(/^rvl-test-fetch-no-colon:[A-Z0-9_-]+$/);
            expect(keys[0]).not.toContain('::');

            // Extract IDs and fetch
            const id1 = keys[0].split(':')[1];
            const doc1 = await index.fetch(id1);

            expect(doc1).toBeDefined();
            expect(doc1).not.toBeNull();
            expect(doc1?.title).toBe('Test 1');
        });

        it('should fetch documents with custom ID field', async () => {
            // Create schema with custom ID field
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-fetch-customid',
                    prefix: 'rvl-test-searchindex-fetch-customid',
                    storage_type: 'hash',
                },
                fields: [
                    { name: 'id', type: 'tag' },
                    { name: 'name', type: 'text' },
                    { name: 'price', type: 'numeric' },
                ],
            });

            index = new SearchIndex(schema, client);
            await index.create();

            // Load data with custom IDs
            const products = [
                { id: 'P001', name: 'Product 1', price: 10.99 },
                { id: 'P002', name: 'Product 2', price: 20.99 },
                { id: 'P003', name: 'Product 3', price: 30.99 },
            ];

            await index.load(products, { idField: 'id' });

            // Test fetch() with custom IDs
            const product1 = await index.fetch('P001');
            expect(product1).toBeDefined();
            expect(product1).not.toBeNull();
            expect(product1?.name).toBe('Product 1');
            expect(product1?.price).toBe('10.99'); // Redis returns strings

            const product2 = await index.fetch('P002');
            expect(product2).toBeDefined();
            expect(product2?.name).toBe('Product 2');
        });
    });

    describe('fetchMany()', () => {
        it('should fetch multiple documents at once', async () => {
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-fetchmany',
                    prefix: 'rvl-test-searchindex-fetchmany',
                    storage_type: 'hash',
                },
                fields: [
                    { name: 'name', type: 'text' },
                    { name: 'value', type: 'numeric' },
                ],
            });

            index = new SearchIndex(schema, client);
            await index.create();

            const items = [
                { name: 'Item A', value: 100 },
                { name: 'Item B', value: 200 },
                { name: 'Item C', value: 300 },
            ];

            const keys = await index.load(items);
            const ids = keys.map((key: string) => key.split(':')[1]);

            // Test fetchMany()
            const docs = await index.fetchMany([ids[0], ids[1]]);
            expect(docs).toHaveLength(2);
            expect(docs[0]).toBeDefined();
            expect(docs[0]?.name).toBe('Item A');
            expect(docs[1]).toBeDefined();
            expect(docs[1]?.name).toBe('Item B');
        });
    });
});
