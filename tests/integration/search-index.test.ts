import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type RedisClientType } from 'redis';
import { IndexSchema, SearchIndex, StorageType } from '../../src/index.js';

// Use naming convention (redisvl-test-*, rvl-test-*) to identify test data.
describe('SearchIndex Integration Tests', () => {
    let client: RedisClientType;

    beforeAll(async () => {
        client = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        });
        await client.connect();
    });

    afterAll(async () => {
        await client.quit();
    });

    describe('create() and exists()', () => {
        it('should create SearchIndex from IndexSchema.fromObject()', async () => {
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-fromobject',
                    prefix: 'rvl-test-fromobject',
                    storage_type: 'hash',
                },
                fields: [
                    { name: 'title', type: 'text' },
                    { name: 'price', type: 'numeric' },
                ],
            });

            const index = new SearchIndex(schema, client);
            const createResult = await index.create();

            // Verify create succeeded
            expect(['OK', undefined]).toContain(createResult);
            expect(await index.exists()).toBe(true);
            expect(index.schema.index.name).toBe('redisvl-test-searchindex-fromobject');
        });

        it('should create SearchIndex from IndexSchema.fromYAML()', async () => {
            // First, create a test YAML file
            const yaml = require('yaml');
            const fs = require('fs');
            const path = require('path');

            const testYamlPath = path.join(__dirname, 'test-schema.yaml');
            const schemaData = {
                index: {
                    name: 'redisvl-test-searchindex-fromyaml',
                    prefix: 'rvl-test-fromyaml',
                    storage_type: 'hash',
                },
                fields: [
                    { name: 'title', type: 'text' },
                    { name: 'description', type: 'text' },
                    { name: 'category', type: 'tag' },
                ],
            };

            // Write YAML file
            fs.writeFileSync(testYamlPath, yaml.stringify(schemaData));

            const index = new SearchIndex(await IndexSchema.fromYAML(testYamlPath), client);

            const createResult = await index.create();

            // Verify create succeeded
            expect(['OK', undefined]).toContain(createResult);
            expect(await index.exists()).toBe(true);
            expect(index.schema.index.name).toBe('redisvl-test-searchindex-fromyaml');

            // Test that we can use it - verify full integration
            const loadedKeys = await index.load([
                { title: 'Test', description: 'YAML test', category: 'test' },
            ]);
            expect(loadedKeys.length).toBe(1);

            const keys = await client.keys('rvl-test-fromyaml:*');
            expect(keys.length).toBeGreaterThan(0);

            // Cleanup YAML file
            if (fs.existsSync(testYamlPath)) {
                fs.unlinkSync(testYamlPath);
            }
        });

        it('should check that non-existent index does not exist', async () => {
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-nonexistent',
                    prefix: 'rvl-test-nonexistent',
                    storage_type: 'hash',
                },
                fields: [{ name: 'title', type: 'text' }],
            });

            const index = new SearchIndex(schema, client);
            const exists = await index.exists();
            expect(exists).toBe(false);
            // No cleanup needed - index was never created
        });

        it('should overwrite existing index when overwrite=true', async () => {
            const schema1 = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-overwrite',
                    prefix: 'rvl-test-overwrite',
                    storage_type: 'hash',
                },
                fields: [{ name: 'title', type: 'text' }],
            });

            const index = new SearchIndex(schema1, client);
            await index.create();

            // Add some data to the first index
            const loadedKeys = await index.load([{ title: 'Original document' }]);
            expect(loadedKeys.length).toBe(1);

            // Verify data exists before overwrite
            const keysBefore = await client.keys('rvl-test-overwrite:*');
            expect(keysBefore.length).toBeGreaterThan(0);

            // Create a new schema with DIFFERENT fields
            const schema2 = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-overwrite',
                    prefix: 'rvl-test-overwrite',
                    storage_type: 'hash',
                },
                fields: [
                    { name: 'title', type: 'text' },
                    { name: 'description', type: 'text' }, // NEW FIELD
                    { name: 'category', type: 'tag' }, // ANOTHER NEW FIELD
                ],
            });

            const newIndex = new SearchIndex(schema2, client);

            // Overwrite with new schema (drop old data)
            await newIndex.create({ overwrite: true, drop: true });

            // Verify index still exists
            expect(await newIndex.exists()).toBe(true);

            // Verify old data was dropped
            const keysAfter = await client.keys('rvl-test-overwrite:*');
            expect(keysAfter.length).toBe(0);

            // Verify we can load data with the NEW schema (has description and category fields)
            const newKeys = await newIndex.load([
                { title: 'New doc', description: 'Test', category: 'test' },
            ]);
            expect(newKeys.length).toBe(1);
        });

        it('should NOT overwrite when overwrite=false and index exists', async () => {
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-no-overwrite',
                    prefix: 'rvl-test-no-overwrite',
                    storage_type: 'hash',
                },
                fields: [{ name: 'title', type: 'text' }],
            });

            const index = new SearchIndex(schema, client);

            await index.create({ overwrite: true, drop: true }); // Clean start

            // Add data
            const keysAdded = await index.load([{ title: 'Original' }]);
            const keyCountBefore = keysAdded.length;

            // Try to create again without overwrite (should be a no-op)
            await index.create({ overwrite: false });

            // Data should still be there - same count as before
            const keys = await client.keys('rvl-test-no-overwrite:*');
            expect(keys.length).toBe(keyCountBefore);
        });

        describe('fromExisting()', () => {
            it('should load existing simple index with fromExisting()', async () => {
                // Create a simple index first
                const schema = IndexSchema.fromObject({
                    index: {
                        name: 'redisvl-test-fromexisting',
                        prefix: 'rvl-test-fromexisting',
                        storage_type: 'hash',
                    },
                    fields: [
                        { name: 'name', type: 'text' },
                        { name: 'age', type: 'numeric' },
                    ],
                });

                const index = new SearchIndex(schema, client);
                await index.create({ overwrite: true });
                expect(await index.exists()).toBe(true);

                try {
                    // Load from existing
                    const index2 = await SearchIndex.fromExisting(
                        'redisvl-test-fromexisting',
                        client
                    );
                    expect(await index2.exists()).toBe(true);

                    // Verify index name matches
                    expect(index2.name).toBe('redisvl-test-fromexisting');

                    // Verify storage type matches
                    expect(index2.schema.index.storageType).toBe(schema.index.storageType);

                    // Verify fields were reconstructed
                    expect(index2.schema.fields).toBeDefined();
                    expect(Object.keys(index2.schema.fields)).toHaveLength(2);
                    expect(index2.schema.fields.name.type).toBe('text');
                    expect(index2.schema.fields.age.type).toBe('numeric');

                    // Verify we can use the reconstructed index
                    const keys = await index2.load([
                        { name: 'Alice', age: 30 },
                        { name: 'Bob', age: 25 },
                    ]);
                    expect(keys).toHaveLength(2);

                    // Clean up
                    await index2.delete({ drop: true });
                } finally {
                    // Ensure index is deleted
                    try {
                        await index.delete({ drop: true });
                    } catch {
                        // Ignore if already deleted
                    }
                }
            });

            it('should load existing complex index with all field types', async () => {
                // Create complex schema with all field types
                const schema = IndexSchema.fromObject({
                    index: {
                        name: 'redisvl-test-fromexisting-complex',
                        prefix: 'rvl-test-fe-complex',
                        storage_type: 'hash',
                    },
                    fields: [
                        { name: 'title', type: 'text' },
                        { name: 'category', type: 'tag' },
                        { name: 'price', type: 'numeric' },
                        {
                            name: 'embedding',
                            type: 'vector',
                            attrs: {
                                algorithm: 'flat',
                                dims: 3,
                                distance_metric: 'cosine',
                                datatype: 'float32',
                            },
                        },
                    ],
                });

                const index = new SearchIndex(schema, client);
                await index.create({ overwrite: true });
                expect(await index.exists()).toBe(true);

                try {
                    // Load from existing
                    const index2 = await SearchIndex.fromExisting(
                        'redisvl-test-fromexisting-complex',
                        client
                    );
                    expect(await index2.exists()).toBe(true);

                    // Verify index metadata
                    expect(index2.name).toBe('redisvl-test-fromexisting-complex');
                    expect(index2.schema.index.storageType).toBe(schema.index.storageType);

                    // Verify all fields were reconstructed
                    expect(Object.keys(index2.schema.fields)).toHaveLength(4);
                    expect(index2.schema.fields.title.type).toBe('text');
                    expect(index2.schema.fields.category.type).toBe('tag');
                    expect(index2.schema.fields.price.type).toBe('numeric');
                    expect(index2.schema.fields.embedding.type).toBe('vector');

                    // Clean up
                    await index2.delete({ drop: true });
                } finally {
                    try {
                        await index.delete({ drop: true });
                    } catch {
                        // Ignore
                    }
                }
            });

            it('should preserve multiple prefixes when loading existing index', async () => {
                const indexName = 'redisvl-test-multiprefix';

                try {
                    // Create index using raw FT.CREATE command with multiple prefixes
                    await client.sendCommand([
                        'FT.CREATE',
                        indexName,
                        'ON',
                        'HASH',
                        'PREFIX',
                        '3',
                        'prefix_a:',
                        'prefix_b:',
                        'prefix_c:',
                        'SCHEMA',
                        'user',
                        'TAG',
                        'text',
                        'TEXT',
                    ]);

                    const loadedIndex = await SearchIndex.fromExisting(indexName, client);
                    expect(await loadedIndex.exists()).toBe(true);

                    // Verify index name
                    expect(loadedIndex.name).toBe(indexName);

                    // Verify storage type
                    expect(loadedIndex.schema.index.storageType).toBe(StorageType.HASH);

                    // Verify all prefixes are preserved on round-trip
                    expect(loadedIndex.schema.index.prefix).toEqual([
                        'prefix_a:',
                        'prefix_b:',
                        'prefix_c:',
                    ]);

                    // Verify fields
                    expect(loadedIndex.schema.fields.user).toBeDefined();
                    expect(loadedIndex.schema.fields.text).toBeDefined();

                    // Clean up
                    await loadedIndex.delete({ drop: true });
                } catch (error) {
                    // Clean up on error
                    try {
                        await client.sendCommand(['FT.DROPINDEX', indexName]);
                    } catch {
                        // Ignore
                    }
                    throw error;
                }
            });

            it("should allow fetch() when index prefix ends with ':'", async () => {
                const indexName = 'redisvl-test-fromexisting-prefix-colon';
                const prefix = 'rvl-test-fe-colon:';

                try {
                    await client.sendCommand([
                        'FT.CREATE',
                        indexName,
                        'ON',
                        'HASH',
                        'PREFIX',
                        '1',
                        prefix,
                        'SCHEMA',
                        'name',
                        'TEXT',
                    ]);

                    // Insert a document under a key that matches the prefix + ':' + id
                    await client.hSet(`${prefix}1`, { name: 'Alice' });

                    const loadedIndex = await SearchIndex.fromExisting(indexName, client);
                    expect(await loadedIndex.exists()).toBe(true);

                    const doc = await loadedIndex.fetch('1');
                    expect(doc).toBeDefined();
                    expect(doc?.name).toBe('Alice');

                    await loadedIndex.delete({ drop: true });
                } finally {
                    // Ensure cleanup even if test fails
                    try {
                        await client.sendCommand(['FT.DROPINDEX', indexName, 'DD']);
                    } catch {
                        // Ignore
                    }
                }
            });

            it("should allow fetch() when index prefix does not end with ':'", async () => {
                const indexName = 'redisvl-test-fromexisting-prefix-nocolon';
                const prefix = 'rvl-test-fe-nocolon';

                try {
                    await client.sendCommand([
                        'FT.CREATE',
                        indexName,
                        'ON',
                        'HASH',
                        'PREFIX',
                        '1',
                        prefix,
                        'SCHEMA',
                        'name',
                        'TEXT',
                    ]);

                    // Insert a document under a key that matches the normalized key building: prefix + ':' + id
                    await client.hSet(`${prefix}:1`, { name: 'Bob' });

                    const loadedIndex = await SearchIndex.fromExisting(indexName, client);
                    expect(await loadedIndex.exists()).toBe(true);

                    const doc = await loadedIndex.fetch('1');
                    expect(doc).toBeDefined();
                    expect(doc?.name).toBe('Bob');

                    await loadedIndex.delete({ drop: true });
                } finally {
                    // Ensure cleanup even if test fails
                    try {
                        await client.sendCommand(['FT.DROPINDEX', indexName, 'DD']);
                    } catch {
                        // Ignore
                    }
                }
            });
        });
    });

    describe('delete()', () => {
        it('should delete index without dropping documents', async () => {
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-delete',
                    prefix: 'rvl-test-delete',
                    storage_type: 'hash',
                },
                fields: [{ name: 'title', type: 'text' }],
            });

            const index = new SearchIndex(schema, client);
            await index.create();

            // Load some data
            const loadedKeys = await index.load([{ title: 'Test Document' }]);
            expect(loadedKeys.length).toBe(1);

            // Delete index without dropping docs
            const deleteResult = await index.delete({ drop: false });

            // Verify delete returned OK
            expect(deleteResult).toBe('OK');

            // Index should not exist
            expect(await index.exists()).toBe(false);

            // But keys should still exist in Redis
            const keys = await client.keys('rvl-test-delete:*');
            expect(keys.length).toBeGreaterThan(0);
        });

        it('should delete index and drop documents when drop=true', async () => {
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-delete-drop',
                    prefix: 'rvl-test-delete-drop',
                    storage_type: 'hash',
                },
                fields: [{ name: 'title', type: 'text' }],
            });

            const index = new SearchIndex(schema, client);
            await index.create();

            // Load some data
            const loadedKeys = await index.load([{ title: 'Test Document' }]);
            expect(loadedKeys.length).toBe(1);

            // Delete index and drop docs
            const deleteResult = await index.delete({ drop: true });

            // Verify delete returned OK
            expect(deleteResult).toBe('OK');

            // Index should not exist
            expect(await index.exists()).toBe(false);

            // Keys should be deleted
            const keys = await client.keys('rvl-test-delete-drop:*');
            expect(keys.length).toBe(0);

            // No cleanup needed - everything was deleted
        });
    });

    describe('info()', () => {
        it('should return index information', async () => {
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-info',
                    prefix: 'rvl-test-info',
                    storage_type: 'hash',
                },
                fields: [
                    { name: 'title', type: 'text' },
                    { name: 'category', type: 'tag' },
                ],
            });

            const index = new SearchIndex(schema, client);
            await index.create();

            const info = await index.info();

            // Verify basic index info
            expect(info.index_name).toBe('redisvl-test-searchindex-info');
            expect(info.attributes).toBeDefined();
            expect(Array.isArray(info.attributes)).toBe(true);
        });

        it('should throw error when getting info for non-existent index', async () => {
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-info-nonexistent',
                    prefix: 'rvl-test-info-nonexistent',
                    storage_type: 'hash',
                },
                fields: [{ name: 'title', type: 'text' }],
            });

            const nonExistentIndex = new SearchIndex(schema, client);

            await expect(nonExistentIndex.info()).rejects.toThrow();
        });
    });

    describe('load()', () => {
        it('should load documents and return generated keys', async () => {
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-load',
                    prefix: 'rvl-test-load',
                    storage_type: 'hash',
                },
                fields: [
                    { name: 'title', type: 'text' },
                    { name: 'content', type: 'text' },
                ],
            });

            const index = new SearchIndex(schema, client);

            await index.create();

            const data = [
                { title: 'Doc 1', content: 'Content 1' },
                { title: 'Doc 2', content: 'Content 2' },
            ];

            const keys = await index.load(data);

            // Should return array of keys
            expect(keys).toHaveLength(2);
            expect(keys[0]).toMatch(/^rvl-test-load:[A-Z0-9_-]+$/);

            // Verify data was loaded
            const fetchedDoc = await index.fetch(keys[0].split(':')[1]);
            expect(fetchedDoc).toMatchObject({ title: 'Doc 1', content: 'Content 1' });
        });

        it('should load documents with custom ID field', async () => {
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-load-customid',
                    prefix: 'rvl-test-load-customid',
                    storage_type: 'hash',
                },
                fields: [
                    { name: 'product_id', type: 'tag' },
                    { name: 'title', type: 'text' },
                ],
            });

            const index = new SearchIndex(schema, client);
            await index.create();

            const data = [
                { product_id: 'PROD-001', title: 'Product 1' },
                { product_id: 'PROD-002', title: 'Product 2' },
            ];

            const keys = await index.load(data, { idField: 'product_id' });

            // Should use custom IDs
            expect(keys).toContain('rvl-test-load-customid:PROD-001');
            expect(keys).toContain('rvl-test-load-customid:PROD-002');

            // Verify we can fetch by custom ID
            const doc = await index.fetch('PROD-001');
            expect(doc).toMatchObject({ product_id: 'PROD-001', title: 'Product 1' });
        });

        it('should load documents with preprocessing function', async () => {
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-load-preprocess',
                    prefix: 'rvl-test-load-preprocess',
                    storage_type: 'hash',
                },
                fields: [
                    { name: 'title', type: 'text' },
                    { name: 'uppercase_title', type: 'text' },
                ],
            });

            const index = new SearchIndex(schema, client);
            await index.create();

            const data = [{ title: 'hello world' }];

            const preprocess = async (doc: Record<string, unknown>) => {
                return {
                    ...doc,
                    uppercase_title: (doc.title as string).toUpperCase(),
                };
            };

            const keys = await index.load(data, { preprocess });

            // Verify preprocessing was applied
            const fetchedDoc = await index.fetch(keys[0].split(':')[1]);
            expect(fetchedDoc).toMatchObject({
                title: 'hello world',
                uppercase_title: 'HELLO WORLD',
            });
        });

        it('should validate data when validateOnLoad=true', async () => {
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-validate',
                    prefix: 'rvl-test-validate',
                    storage_type: 'hash',
                },
                fields: [
                    { name: 'title', type: 'text' },
                    { name: 'price', type: 'numeric' },
                ],
            });

            const index = new SearchIndex(schema, client, true);
            await index.create();

            const validData = [{ title: 'Product 1', price: 100 }];
            const invalidData = [{ title: 'Product 2', price: 'not-a-number' }];

            // Valid data should load and return keys
            const keys = await index.load(validData);
            expect(keys).toBeDefined();
            expect(keys.length).toBe(1);

            // Invalid data should throw
            await expect(index.load(invalidData)).rejects.toThrow();
        });

        it('should skip validation when validateOnLoad=false', async () => {
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-novalidate',
                    prefix: 'rvl-test-novalidate',
                    storage_type: 'hash',
                },
                fields: [
                    { name: 'title', type: 'text' },
                    { name: 'price', type: 'numeric' },
                ],
            });

            const index = new SearchIndex(schema, client, false);
            await index.create();

            const invalidData = [{ title: 'Product', price: 'not-a-number' }];

            // Should NOT throw even with invalid data, and should return keys
            const keys = await index.load(invalidData);
            expect(keys).toBeDefined();
            expect(keys.length).toBe(1);
        });

        it('should set TTL on loaded documents when ttl option is provided', async () => {
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-ttl',
                    prefix: 'rvl-test-ttl',
                    storage_type: 'hash',
                },
                fields: [{ name: 'title', type: 'text' }],
            });

            const index = new SearchIndex(schema, client);
            await index.create();

            const data = [{ title: 'Expiring Document' }];
            const keys = await index.load(data, { ttl: 30 });

            // Check TTL was set (should be around 30 seconds)
            const ttl = await client.ttl(keys[0]);
            expect(ttl).toBeGreaterThan(0);
            expect(ttl).toBeLessThanOrEqual(30);
        });

        it('should not set TTL when ttl option is not provided', async () => {
            const schema = IndexSchema.fromObject({
                index: {
                    name: 'redisvl-test-searchindex-nottl',
                    prefix: 'rvl-test-nottl',
                    storage_type: 'hash',
                },
                fields: [{ name: 'title', type: 'text' }],
            });

            const index = new SearchIndex(schema, client);
            await index.create();

            const data = [{ title: 'Persistent Document' }];
            const keys = await index.load(data);

            // TTL should be -1 (no expiration)
            const ttl = await client.ttl(keys[0]);
            expect(ttl).toBe(-1);
        });
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

            const index = new SearchIndex(schema, client);
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

            const index = new SearchIndex(schema, client);
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

            const index = new SearchIndex(schema, client);
            await index.create();

            // Load data with custom IDs
            const products = [
                { id: 'P001', name: 'Product 1', price: 10.99 },
                { id: 'P002', name: 'Product 2', price: 20.99 },
                { id: 'P003', name: 'Product 3', price: 30.99 },
            ];

            const loadedKeys = await index.load(products, { idField: 'id' });
            expect(loadedKeys.length).toBe(3);

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

            const index = new SearchIndex(schema, client);
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
