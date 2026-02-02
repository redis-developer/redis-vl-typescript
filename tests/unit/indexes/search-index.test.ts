import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchIndex } from '../../../src/indexes/search-index.js';
import { IndexSchema, IndexInfo } from '../../../src/schema/schema.js';
import { StorageType } from '../../../src/schema/types.js';
import type { RedisClientType } from 'redis';

describe('SearchIndex', () => {
    let schema: IndexSchema;
    let mockClient: RedisClientType;

    beforeEach(() => {
        // Create a basic schema for testing
        const indexInfo = new IndexInfo({
            name: 'test-index',
            prefix: 'test',
            storageType: StorageType.HASH, // camelCase input (TypeScript API)
        });

        schema = new IndexSchema({ index: indexInfo });
        schema.addField({ name: 'id', type: 'tag' }); // camelCase method
        schema.addField({ name: 'title', type: 'text' }); // camelCase method

        // Create a mock Redis client
        const mockPipeline = {
            hSet: vi.fn().mockReturnThis(),
            expire: vi.fn().mockReturnThis(),
            execAsPipeline: vi.fn().mockResolvedValue([]),
            json: {
                set: vi.fn().mockReturnThis(),
            },
        };

        mockClient = {
            ft: {
                create: vi.fn(),
                _list: vi.fn(),
                dropIndex: vi.fn(),
                info: vi.fn(),
            },
            multi: vi.fn().mockReturnValue(mockPipeline),
            hSet: vi.fn().mockResolvedValue(1),
            expire: vi.fn().mockResolvedValue(1),
            json: {
                set: vi.fn().mockResolvedValue('OK'),
            },
        } as unknown as RedisClientType;

        // Store pipeline reference for test assertions
        (mockClient as any).mockPipeline = mockPipeline;
    });

    describe('constructor', () => {
        it('should create a SearchIndex with schema and client', () => {
            const index = new SearchIndex(schema, mockClient);

            expect(index).toBeDefined();
            expect(index.schema).toBe(schema);
            expect(index.name).toBe('test-index');
        });

        it('should throw error if schema is not an IndexSchema instance', () => {
            expect(() => {
                new SearchIndex({} as IndexSchema, mockClient);
            }).toThrow('Must provide a valid IndexSchema object');
        });

        it('should throw error if client is not provided', () => {
            expect(() => {
                new SearchIndex(schema, null as unknown as RedisClientType);
            }).toThrow('Must provide a valid Redis client');
        });
    });

    describe('create()', () => {
        it('should create an index in Redis', async () => {
            (mockClient.ft.create as any).mockResolvedValue('OK');
            (mockClient.ft.info as any).mockRejectedValue(new Error('Unknown index')); // Index doesn't exist

            const index = new SearchIndex(schema, mockClient);
            await index.create();

            expect(mockClient.ft.create).toHaveBeenCalledWith(
                'test-index',
                expect.objectContaining({
                    title: expect.objectContaining({ type: 'TEXT' }),
                }),
                expect.objectContaining({
                    ON: 'HASH',
                    PREFIX: 'test',
                })
            );
        });

        it('should throw error if no fields are defined', async () => {
            const emptySchema = new IndexSchema({
                index: new IndexInfo({
                    name: 'empty',
                    prefix: 'empty',
                    storageType: StorageType.HASH,
                }),
            });

            const index = new SearchIndex(emptySchema, mockClient);

            await expect(index.create()).rejects.toThrow('No fields defined for index');
        });

        it('should not overwrite existing index by default', async () => {
            (mockClient.ft.create as any).mockResolvedValue('OK');
            (mockClient.ft.info as any).mockResolvedValue({ index_name: 'test-index' }); // Index exists

            const index = new SearchIndex(schema, mockClient);
            await index.create();

            // Should check if exists and not create
            expect(mockClient.ft.info).toHaveBeenCalled();
            expect(mockClient.ft.create).not.toHaveBeenCalled();
        });

        it('should overwrite existing index when overwrite=true', async () => {
            (mockClient.ft.create as any).mockResolvedValue('OK');
            (mockClient.ft.dropIndex as any).mockResolvedValue('OK');
            (mockClient.ft._list as any).mockResolvedValue(['test-index']); // Index exists

            const index = new SearchIndex(schema, mockClient);
            await index.create({ overwrite: true });

            expect(mockClient.ft.dropIndex).toHaveBeenCalledWith('test-index');
            expect(mockClient.ft.create).toHaveBeenCalled();
        });

        it('should drop data when overwrite=true and drop=true', async () => {
            (mockClient.ft.create as any).mockResolvedValue('OK');
            (mockClient.ft.dropIndex as any).mockResolvedValue('OK');
            (mockClient.ft._list as any).mockResolvedValue(['test-index']); // Index exists

            const index = new SearchIndex(schema, mockClient);
            await index.create({ overwrite: true, drop: true });

            expect(mockClient.ft.dropIndex).toHaveBeenCalledWith('test-index', { DD: true });
            expect(mockClient.ft.create).toHaveBeenCalled();
        });
    });

    describe('exists()', () => {
        it('should return true if index exists', async () => {
            (mockClient.ft.info as any).mockResolvedValue({ index_name: 'test-index' });

            const index = new SearchIndex(schema, mockClient);
            const exists = await index.exists();

            expect(exists).toBe(true);
            expect(mockClient.ft.info).toHaveBeenCalledWith('test-index');
        });

        it('should return false if index does not exist', async () => {
            (mockClient.ft.info as any).mockRejectedValue(new Error('Unknown index'));

            const index = new SearchIndex(schema, mockClient);
            const exists = await index.exists();

            expect(exists).toBe(false);
        });
    });

    describe('delete()', () => {
        it('should delete index without dropping data by default', async () => {
            (mockClient.ft.dropIndex as any).mockResolvedValue('OK');

            const index = new SearchIndex(schema, mockClient);
            await index.delete();

            expect(mockClient.ft.dropIndex).toHaveBeenCalledWith('test-index');
        });

        it('should drop data when drop=true', async () => {
            (mockClient.ft.dropIndex as any).mockResolvedValue('OK');

            const index = new SearchIndex(schema, mockClient);
            await index.delete({ drop: true });

            expect(mockClient.ft.dropIndex).toHaveBeenCalledWith('test-index', { DD: true });
        });

        it('should handle errors when deleting non-existent index', async () => {
            (mockClient.ft.dropIndex as any).mockRejectedValue(new Error('Unknown index name'));

            const index = new SearchIndex(schema, mockClient);

            await expect(index.delete()).rejects.toThrow();
        });
    });

    describe('info()', () => {
        it('should return index information', async () => {
            const mockInfo = {
                index_name: 'test-index',
                num_docs: 100,
                num_records: 100,
            };

            (mockClient.ft.info as any).mockResolvedValue(mockInfo);

            const index = new SearchIndex(schema, mockClient);
            const info = await index.info();

            expect(info).toEqual(mockInfo);
            expect(mockClient.ft.info).toHaveBeenCalledWith('test-index');
        });

        it('should handle errors when fetching info for non-existent index', async () => {
            (mockClient.ft.info as any).mockRejectedValue(new Error('Unknown index name'));

            const index = new SearchIndex(schema, mockClient);

            await expect(index.info()).rejects.toThrow();
        });
    });

    describe('load()', () => {
        let hashSchema: IndexSchema;
        let jsonSchema: IndexSchema;

        beforeEach(() => {
            // HASH storage schema
            const hashIndexInfo = new IndexInfo({
                name: 'hash-index',
                prefix: 'doc',
                storageType: StorageType.HASH,
            });
            hashSchema = new IndexSchema({ index: hashIndexInfo });
            hashSchema.addField({ name: 'id', type: 'tag' });
            hashSchema.addField({ name: 'title', type: 'text' });
            hashSchema.addField({ name: 'score', type: 'numeric' });

            // JSON storage schema
            const jsonIndexInfo = new IndexInfo({
                name: 'json-index',
                prefix: 'doc',
                storageType: StorageType.JSON,
            });
            jsonSchema = new IndexSchema({ index: jsonIndexInfo });
            jsonSchema.addField({ name: 'id', type: 'tag' });
            jsonSchema.addField({ name: 'title', type: 'text' });
            jsonSchema.addField({ name: 'score', type: 'numeric' });

            // Mock HASH operations
            (mockClient as any).hSet = vi.fn().mockResolvedValue(1);
            (mockClient as any).expire = vi.fn().mockResolvedValue(1);

            // Mock JSON operations
            (mockClient as any).json = {
                set: vi.fn().mockResolvedValue('OK'),
            };
        });

        describe('HASH storage', () => {
            it('should load documents with auto-generated keys', async () => {
                const index = new SearchIndex(hashSchema, mockClient);
                const data = [
                    { id: '1', title: 'Document 1', score: 100 },
                    { id: '2', title: 'Document 2', score: 200 },
                ];

                const keys = await index.load(data);

                expect(keys).toHaveLength(2);
                expect(keys[0]).toMatch(/^doc:/); // Should start with prefix
                expect(keys[1]).toMatch(/^doc:/);
                expect((mockClient as any).mockPipeline.hSet).toHaveBeenCalledTimes(2);
                expect((mockClient as any).mockPipeline.execAsPipeline).toHaveBeenCalled();
            });

            it('should load documents with idField extraction', async () => {
                const index = new SearchIndex(hashSchema, mockClient);
                const data = [
                    { id: 'user1', title: 'Document 1', score: 100 },
                    { id: 'user2', title: 'Document 2', score: 200 },
                ];

                const keys = await index.load(data, { idField: 'id' });

                expect(keys).toEqual(['doc:user1', 'doc:user2']);
                expect((mockClient as any).mockPipeline.hSet).toHaveBeenCalledTimes(2);
                expect((mockClient as any).mockPipeline.hSet).toHaveBeenCalledWith(
                    'doc:user1',
                    expect.objectContaining({ id: 'user1', title: 'Document 1', score: 100 })
                );
            });

            it('should load documents with explicit keys', async () => {
                const index = new SearchIndex(hashSchema, mockClient);
                const data = [
                    { title: 'Document 1', score: 100 },
                    { title: 'Document 2', score: 200 },
                ];
                const customKeys = ['doc:custom1', 'doc:custom2'];

                const keys = await index.load(data, { keys: customKeys });

                expect(keys).toEqual(customKeys);
                expect((mockClient as any).mockPipeline.hSet).toHaveBeenCalledTimes(2);
                expect((mockClient as any).mockPipeline.hSet).toHaveBeenCalledWith(
                    'doc:custom1',
                    expect.objectContaining({ title: 'Document 1', score: 100 })
                );
            });

            it('should load documents with TTL', async () => {
                const index = new SearchIndex(hashSchema, mockClient);
                const data = [{ title: 'Document 1', score: 100 }];

                await index.load(data, { ttl: 3600 });

                expect((mockClient as any).mockPipeline.hSet).toHaveBeenCalledTimes(1);
                expect((mockClient as any).mockPipeline.expire).toHaveBeenCalledWith(
                    expect.any(String),
                    3600
                );
            });

            it('should load documents with preprocessing', async () => {
                const index = new SearchIndex(hashSchema, mockClient);
                const data = [
                    { title: 'Document 1', score: 100 },
                    { title: 'Document 2', score: 200 },
                ];

                const preprocess = (doc: Record<string, unknown>) => ({
                    ...doc,
                    processed: true,
                    timestamp: Date.now(),
                });

                await index.load(data, { preprocess });

                expect((mockClient as any).mockPipeline.hSet).toHaveBeenCalledTimes(2);
                expect((mockClient as any).mockPipeline.hSet).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({ processed: true, timestamp: expect.any(Number) })
                );
            });

            it('should throw error if idField not found in document', async () => {
                const index = new SearchIndex(hashSchema, mockClient);
                const data = [{ title: 'Document 1', score: 100 }]; // Missing 'userId' field

                await expect(index.load(data, { idField: 'userId' })).rejects.toThrow();
            });

            it('should throw error if keys length does not match data length', async () => {
                const index = new SearchIndex(hashSchema, mockClient);
                const data = [{ title: 'Document 1' }, { title: 'Document 2' }];
                const keys = ['doc:1']; // Only 1 key for 2 documents

                await expect(index.load(data, { keys })).rejects.toThrow();
            });
        });

        describe('JSON storage', () => {
            it('should load documents with auto-generated keys', async () => {
                const index = new SearchIndex(jsonSchema, mockClient);
                const data = [
                    { id: '1', title: 'Document 1', score: 100 },
                    { id: '2', title: 'Document 2', score: 200 },
                ];

                const keys = await index.load(data);

                expect(keys).toHaveLength(2);
                expect(keys[0]).toMatch(/^doc:/);
                expect(keys[1]).toMatch(/^doc:/);
                expect((mockClient as any).mockPipeline.json.set).toHaveBeenCalledTimes(2);
                expect((mockClient as any).mockPipeline.execAsPipeline).toHaveBeenCalled();
            });

            it('should load documents with idField extraction', async () => {
                const index = new SearchIndex(jsonSchema, mockClient);
                const data = [
                    { id: 'user1', title: 'Document 1', score: 100 },
                    { id: 'user2', title: 'Document 2', score: 200 },
                ];

                const keys = await index.load(data, { idField: 'id' });

                expect(keys).toEqual(['doc:user1', 'doc:user2']);
                expect((mockClient as any).mockPipeline.json.set).toHaveBeenCalledTimes(2);
                expect((mockClient as any).mockPipeline.json.set).toHaveBeenCalledWith(
                    'doc:user1',
                    '$',
                    expect.objectContaining({ id: 'user1', title: 'Document 1', score: 100 })
                );
            });

            it('should load documents with explicit keys', async () => {
                const index = new SearchIndex(jsonSchema, mockClient);
                const data = [
                    { title: 'Document 1', score: 100 },
                    { title: 'Document 2', score: 200 },
                ];
                const customKeys = ['doc:custom1', 'doc:custom2'];

                const keys = await index.load(data, { keys: customKeys });

                expect(keys).toEqual(customKeys);
                expect((mockClient as any).mockPipeline.json.set).toHaveBeenCalledTimes(2);
            });

            it('should load documents with TTL', async () => {
                const index = new SearchIndex(jsonSchema, mockClient);
                const data = [{ title: 'Document 1', score: 100 }];

                await index.load(data, { ttl: 3600 });

                expect((mockClient as any).mockPipeline.json.set).toHaveBeenCalledTimes(1);
                expect((mockClient as any).mockPipeline.expire).toHaveBeenCalledWith(
                    expect.any(String),
                    3600
                );
            });

            it('should load documents with preprocessing', async () => {
                const index = new SearchIndex(jsonSchema, mockClient);
                const data = [
                    { title: 'Document 1', score: 100 },
                    { title: 'Document 2', score: 200 },
                ];

                const preprocess = (doc: Record<string, unknown>) => ({
                    ...doc,
                    processed: true,
                });

                await index.load(data, { preprocess });

                expect((mockClient as any).mockPipeline.json.set).toHaveBeenCalledTimes(2);
                expect((mockClient as any).mockPipeline.json.set).toHaveBeenCalledWith(
                    expect.any(String),
                    '$',
                    expect.objectContaining({ processed: true })
                );
            });
        });

        it('should return empty array when loading empty data', async () => {
            const index = new SearchIndex(hashSchema, mockClient);
            const keys = await index.load([]);

            expect(keys).toEqual([]);
            expect(mockClient.hSet).not.toHaveBeenCalled();
        });
    });

    describe('Data Fetching', () => {
        describe('fetch()', () => {
            it('should fetch single document by key (HASH storage)', async () => {
                // Create index with HASH storage
                const indexInfo = new IndexInfo({
                    name: 'user-index',
                    prefix: 'user',
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });
                hashSchema.addField({ name: 'name', type: 'text' });
                hashSchema.addField({ name: 'age', type: 'numeric' });

                // Mock document
                const mockDoc = { id: '123', name: 'John Doe', age: '30' };

                // Mock pipeline for get operation
                const mockHGetAll = vi.fn();
                const mockPipeline = {
                    hGetAll: mockHGetAll,
                    execAsPipeline: vi.fn().mockResolvedValue([mockDoc]),
                };

                (mockClient as any).multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(hashSchema, mockClient);

                // Fetch the document
                const result = await index.fetch('123');

                // Assert document matches
                expect(result).toEqual(mockDoc);
                expect(mockHGetAll).toHaveBeenCalledWith('user:123');
            });

            it('should fetch single document by key (JSON storage)', async () => {
                // Create index with JSON storage
                const indexInfo = new IndexInfo({
                    name: 'product-index',
                    prefix: 'product',
                    storageType: StorageType.JSON,
                });
                const jsonSchema = new IndexSchema({ index: indexInfo });
                jsonSchema.addField({ name: 'id', type: 'tag' });
                jsonSchema.addField({ name: 'title', type: 'text' });
                jsonSchema.addField({ name: 'price', type: 'numeric' });

                // Mock document
                const mockDoc = { id: '456', title: 'Laptop', price: 999 };

                // Mock pipeline for JSON get operation
                const mockJsonGet = vi.fn();
                const mockPipeline = {
                    json: {
                        get: mockJsonGet,
                    },
                    execAsPipeline: vi.fn().mockResolvedValue([mockDoc]),
                };

                (mockClient as any).multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(jsonSchema, mockClient);

                // Fetch the document
                const result = await index.fetch('456');

                // Assert document matches
                expect(result).toEqual(mockDoc);
                expect(mockJsonGet).toHaveBeenCalledWith('product:456');
            });

            it('should return null for non-existent key (HASH storage)', async () => {
                const indexInfo = new IndexInfo({
                    name: 'user-index',
                    prefix: 'user',
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });

                // Mock hGetAll to return empty object (key doesn't exist)
                const mockHGetAll = vi.fn();
                const mockPipeline = {
                    hGetAll: mockHGetAll,
                    execAsPipeline: vi.fn().mockResolvedValue([{}]),
                };

                (mockClient as any).multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(hashSchema, mockClient);

                // Fetch non-existent key
                const result = await index.fetch('999');

                // Assert returns null
                expect(result).toBeNull();
                expect(mockHGetAll).toHaveBeenCalledWith('user:999');
            });

            it('should return null for non-existent key (JSON storage)', async () => {
                const indexInfo = new IndexInfo({
                    name: 'product-index',
                    prefix: 'product',
                    storageType: StorageType.JSON,
                });
                const jsonSchema = new IndexSchema({ index: indexInfo });
                jsonSchema.addField({ name: 'id', type: 'tag' });

                // Mock json.get to return null (key doesn't exist)
                const mockJsonGet = vi.fn();
                const mockPipeline = {
                    json: {
                        get: mockJsonGet,
                    },
                    execAsPipeline: vi.fn().mockResolvedValue([null]),
                };

                (mockClient as any).multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(jsonSchema, mockClient);

                // Fetch non-existent key
                const result = await index.fetch('999');

                // Assert returns null
                expect(result).toBeNull();
                expect(mockJsonGet).toHaveBeenCalledWith('product:999');
            });

            it('should handle keys with custom separator', async () => {
                const indexInfo = new IndexInfo({
                    name: 'user-index',
                    prefix: 'user',
                    keySeparator: '::',
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });

                const mockDoc = { id: '123', name: 'John' };
                const mockHGetAll = vi.fn();
                const mockPipeline = {
                    hGetAll: mockHGetAll,
                    execAsPipeline: vi.fn().mockResolvedValue([mockDoc]),
                };

                (mockClient as any).multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(hashSchema, mockClient);
                const result = await index.fetch('123');

                expect(result).toEqual(mockDoc);
                expect(mockHGetAll).toHaveBeenCalledWith('user::123');
            });

            it('should handle array prefix (use first prefix)', async () => {
                const indexInfo = new IndexInfo({
                    name: 'user-index',
                    prefix: ['user', 'person'],
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });

                const mockDoc = { id: '123', name: 'John' };
                const mockHGetAll = vi.fn();
                const mockPipeline = {
                    hGetAll: mockHGetAll,
                    execAsPipeline: vi.fn().mockResolvedValue([mockDoc]),
                };

                (mockClient as any).multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(hashSchema, mockClient);
                const result = await index.fetch('123');

                expect(result).toEqual(mockDoc);
                // Should use first prefix 'user'
                expect(mockHGetAll).toHaveBeenCalledWith('user:123');
            });
        });

        describe('fetchMany()', () => {
            it('should fetch multiple documents (HASH storage)', async () => {
                const indexInfo = new IndexInfo({
                    name: 'user-index',
                    prefix: 'user',
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });
                hashSchema.addField({ name: 'name', type: 'text' });

                // Mock pipeline for batch fetching
                const mockDocs = [
                    { id: '1', name: 'Alice' },
                    { id: '2', name: 'Bob' },
                    { id: '3', name: 'Charlie' },
                ];

                const mockPipeline = {
                    hGetAll: vi
                        .fn()
                        .mockReturnValueOnce(Promise.resolve(mockDocs[0]))
                        .mockReturnValueOnce(Promise.resolve(mockDocs[1]))
                        .mockReturnValueOnce(Promise.resolve(mockDocs[2])),
                    execAsPipeline: vi.fn().mockResolvedValue(mockDocs),
                };

                mockClient.multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(hashSchema, mockClient);
                const results = await index.fetchMany(['1', '2', '3']);

                expect(results).toHaveLength(3);
                expect(results[0]).toEqual(mockDocs[0]);
                expect(results[1]).toEqual(mockDocs[1]);
                expect(results[2]).toEqual(mockDocs[2]);
            });

            it('should fetch multiple documents (JSON storage)', async () => {
                const indexInfo = new IndexInfo({
                    name: 'product-index',
                    prefix: 'product',
                    storageType: StorageType.JSON,
                });
                const jsonSchema = new IndexSchema({ index: indexInfo });
                jsonSchema.addField({ name: 'id', type: 'tag' });
                jsonSchema.addField({ name: 'title', type: 'text' });

                // Mock pipeline for batch fetching
                const mockDocs = [
                    { id: '1', title: 'Laptop' },
                    { id: '2', title: 'Mouse' },
                    { id: '3', title: 'Keyboard' },
                ];

                const mockPipeline = {
                    json: {
                        get: vi
                            .fn()
                            .mockReturnValueOnce(Promise.resolve(mockDocs[0]))
                            .mockReturnValueOnce(Promise.resolve(mockDocs[1]))
                            .mockReturnValueOnce(Promise.resolve(mockDocs[2])),
                    },
                    execAsPipeline: vi.fn().mockResolvedValue(mockDocs),
                };

                mockClient.multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(jsonSchema, mockClient);
                const results = await index.fetchMany(['1', '2', '3']);

                expect(results).toHaveLength(3);
                expect(results[0]).toEqual(mockDocs[0]);
                expect(results[1]).toEqual(mockDocs[1]);
                expect(results[2]).toEqual(mockDocs[2]);
            });

            it('should return null for missing keys in array', async () => {
                const indexInfo = new IndexInfo({
                    name: 'user-index',
                    prefix: 'user',
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });

                // Mock pipeline - key '2' doesn't exist (returns empty object)
                const mockPipeline = {
                    hGetAll: vi.fn(),
                    execAsPipeline: vi.fn().mockResolvedValue([
                        { id: '1', name: 'Alice' },
                        {}, // Missing key
                        { id: '3', name: 'Charlie' },
                    ]),
                };

                mockClient.multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(hashSchema, mockClient);
                const results = await index.fetchMany(['1', '2', '3']);

                expect(results).toHaveLength(3);
                expect(results[0]).toEqual({ id: '1', name: 'Alice' });
                expect(results[1]).toBeNull(); // Missing key
                expect(results[2]).toEqual({ id: '3', name: 'Charlie' });
            });

            it('should return empty array for empty keys array', async () => {
                const indexInfo = new IndexInfo({
                    name: 'user-index',
                    prefix: 'user',
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });

                const index = new SearchIndex(hashSchema, mockClient);
                const results = await index.fetchMany([]);

                expect(results).toEqual([]);
                expect(mockClient.multi).not.toHaveBeenCalled();
            });

            it('should maintain order of results', async () => {
                const indexInfo = new IndexInfo({
                    name: 'user-index',
                    prefix: 'user',
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });

                // Mock pipeline - fetch in order: c, a, b
                const mockPipeline = {
                    hGetAll: vi.fn(),
                    execAsPipeline: vi.fn().mockResolvedValue([
                        { id: 'c', name: 'Charlie' },
                        { id: 'a', name: 'Alice' },
                        { id: 'b', name: 'Bob' },
                    ]),
                };

                mockClient.multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(hashSchema, mockClient);
                const results = await index.fetchMany(['c', 'a', 'b']);

                // Results should match requested order
                expect(results[0]).toEqual({ id: 'c', name: 'Charlie' });
                expect(results[1]).toEqual({ id: 'a', name: 'Alice' });
                expect(results[2]).toEqual({ id: 'b', name: 'Bob' });
            });

            it('should use custom batch size', async () => {
                const indexInfo = new IndexInfo({
                    name: 'user-index',
                    prefix: 'user',
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });

                // Create 5 documents
                const mockDocs = Array.from({ length: 5 }, (_, i) => ({
                    id: String(i + 1),
                    name: `User ${i + 1}`,
                }));

                const mockPipeline = {
                    hGetAll: vi.fn(),
                    execAsPipeline: vi
                        .fn()
                        .mockResolvedValueOnce([mockDocs[0], mockDocs[1]]) // Batch 1: docs 0-1
                        .mockResolvedValueOnce([mockDocs[2], mockDocs[3]]) // Batch 2: docs 2-3
                        .mockResolvedValueOnce([mockDocs[4]]), // Batch 3: doc 4
                };

                mockClient.multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(hashSchema, mockClient);
                const results = await index.fetchMany(['1', '2', '3', '4', '5'], 2);

                expect(results).toHaveLength(5);
                // With batchSize=2, should execute pipeline 3 times (2+2+1)
                expect(mockPipeline.execAsPipeline).toHaveBeenCalledTimes(3);
            });
        });
    });
});
