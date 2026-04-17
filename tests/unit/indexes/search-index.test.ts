import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchIndex } from '../../../src/indexes/search-index.js';
import { IndexSchema, IndexInfo } from '../../../src/schema/schema.js';
import { StorageType } from '../../../src/schema/types.js';
import type { RedisClientType } from 'redis';
import { RedisVLError, SchemaValidationError } from '../../../src/errors.js';

describe('SearchIndex', () => {
    let schema: IndexSchema;
    let mockClient: RedisClientType;

    beforeEach(() => {
        // Create a basic schema for testing
        const indexInfo = new IndexInfo({
            name: 'redisvl-test-index',
            prefix: 'rvl-test',
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
            expect(index.name).toBe('redisvl-test-index');
        });

        it('should throw RedisVLError if schema is not an IndexSchema instance', () => {
            expect(() => {
                new SearchIndex({} as IndexSchema, mockClient);
            }).toThrow(RedisVLError);
            expect(() => {
                new SearchIndex({} as IndexSchema, mockClient);
            }).toThrow(/Must provide a valid IndexSchema object/);
        });

        it('should throw RedisVLError if client is not provided', () => {
            expect(() => {
                new SearchIndex(schema, null as unknown as RedisClientType);
            }).toThrow(RedisVLError);
            expect(() => {
                new SearchIndex(schema, null as unknown as RedisClientType);
            }).toThrow(/Must provide a valid Redis client/);
        });
    });

    describe('create()', () => {
        it('should create an index in Redis', async () => {
            (mockClient.ft.create as any).mockResolvedValue('OK');
            (mockClient.ft.info as any).mockRejectedValue(new Error('Unknown index')); // Index doesn't exist

            const index = new SearchIndex(schema, mockClient);
            await index.create();

            expect(mockClient.ft.create).toHaveBeenCalledWith(
                'redisvl-test-index',
                expect.objectContaining({
                    id: expect.objectContaining({ type: 'TAG' }),
                    title: expect.objectContaining({ type: 'TEXT' }),
                }),
                expect.objectContaining({
                    ON: 'HASH',
                    PREFIX: 'rvl-test',
                })
            );
        });

        it('should throw error if no fields are defined', async () => {
            const emptySchema = new IndexSchema({
                index: new IndexInfo({
                    name: 'redisvl-test-nofield',
                    prefix: 'rvl-test-nofield',
                    storageType: StorageType.HASH,
                }),
            });

            const index = new SearchIndex(emptySchema, mockClient);

            await expect(index.create()).rejects.toThrow(SchemaValidationError);
            await expect(index.create()).rejects.toThrow(/No fields defined for index/);
        });

        it('should not overwrite existing index by default', async () => {
            (mockClient.ft.create as any).mockResolvedValue('OK');
            (mockClient.ft.info as any).mockResolvedValue({ index_name: 'redisvl-test-index' }); // Index exists

            const index = new SearchIndex(schema, mockClient);
            await index.create();

            // Should check if exists and not create
            expect(mockClient.ft.info).toHaveBeenCalled();
            expect(mockClient.ft.create).not.toHaveBeenCalled();
        });

        it('should overwrite existing index when overwrite=true', async () => {
            (mockClient.ft.create as any).mockResolvedValue('OK');
            (mockClient.ft.dropIndex as any).mockResolvedValue('OK');
            (mockClient.ft._list as any).mockResolvedValue(['redisvl-test-index']); // Index exists

            const index = new SearchIndex(schema, mockClient);
            await index.create({ overwrite: true });

            expect(mockClient.ft.dropIndex).toHaveBeenCalledWith('redisvl-test-index');
            expect(mockClient.ft.create).toHaveBeenCalled();
        });

        it('should drop data when overwrite=true and drop=true', async () => {
            (mockClient.ft.create as any).mockResolvedValue('OK');
            (mockClient.ft.dropIndex as any).mockResolvedValue('OK');
            (mockClient.ft._list as any).mockResolvedValue(['redisvl-test-index']); // Index exists

            const index = new SearchIndex(schema, mockClient);
            await index.create({ overwrite: true, drop: true });

            expect(mockClient.ft.dropIndex).toHaveBeenCalledWith('redisvl-test-index', {
                DD: true,
            });
            expect(mockClient.ft.create).toHaveBeenCalled();
        });
    });

    describe('exists()', () => {
        it('should return true if index exists', async () => {
            (mockClient.ft.info as any).mockResolvedValue({ index_name: 'redisvl-test-index' });

            const index = new SearchIndex(schema, mockClient);
            const exists = await index.exists();

            expect(exists).toBe(true);
            expect(mockClient.ft.info).toHaveBeenCalledWith('redisvl-test-index');
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

            expect(mockClient.ft.dropIndex).toHaveBeenCalledWith('redisvl-test-index');
        });

        it('should drop data when drop=true', async () => {
            (mockClient.ft.dropIndex as any).mockResolvedValue('OK');

            const index = new SearchIndex(schema, mockClient);
            await index.delete({ drop: true });

            expect(mockClient.ft.dropIndex).toHaveBeenCalledWith('redisvl-test-index', {
                DD: true,
            });
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
                index_name: 'redisvl-test-index',
                num_docs: 100,
                num_records: 100,
            };

            (mockClient.ft.info as any).mockResolvedValue(mockInfo);

            const index = new SearchIndex(schema, mockClient);
            const info = await index.info();

            expect(info).toEqual(mockInfo);
            expect(mockClient.ft.info).toHaveBeenCalledWith('redisvl-test-index');
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
                name: 'redisvl-test-hash',
                prefix: 'rvl-test-hash',
                storageType: StorageType.HASH,
            });
            hashSchema = new IndexSchema({ index: hashIndexInfo });
            hashSchema.addField({ name: 'id', type: 'tag' });
            hashSchema.addField({ name: 'title', type: 'text' });
            hashSchema.addField({ name: 'score', type: 'numeric' });

            // JSON storage schema
            const jsonIndexInfo = new IndexInfo({
                name: 'redisvl-test-json',
                prefix: 'rvl-test-json',
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
                expect(keys[0]).toMatch(/^rvl-test-hash:/); // Should start with prefix
                expect(keys[1]).toMatch(/^rvl-test-hash:/);
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

                expect(keys).toEqual(['rvl-test-hash:user1', 'rvl-test-hash:user2']);
                expect((mockClient as any).mockPipeline.hSet).toHaveBeenCalledTimes(2);
                expect((mockClient as any).mockPipeline.hSet).toHaveBeenCalledWith(
                    'rvl-test-hash:user1',
                    expect.objectContaining({ id: 'user1', title: 'Document 1', score: 100 })
                );
            });

            it('should load documents with explicit keys', async () => {
                const index = new SearchIndex(hashSchema, mockClient);
                const data = [
                    { title: 'Document 1', score: 100 },
                    { title: 'Document 2', score: 200 },
                ];
                const customKeys = ['rvl-test-hash:custom1', 'rvl-test-hash:custom2'];

                const keys = await index.load(data, { keys: customKeys });

                expect(keys).toEqual(customKeys);
                expect((mockClient as any).mockPipeline.hSet).toHaveBeenCalledTimes(2);
                expect((mockClient as any).mockPipeline.hSet).toHaveBeenCalledWith(
                    'rvl-test-hash:custom1',
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

                const preprocess = async (doc: Record<string, unknown>) => ({
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
                expect(keys[0]).toMatch(/^rvl-test-json:/);
                expect(keys[1]).toMatch(/^rvl-test-json:/);
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

                expect(keys).toEqual(['rvl-test-json:user1', 'rvl-test-json:user2']);
                expect((mockClient as any).mockPipeline.json.set).toHaveBeenCalledTimes(2);
                expect((mockClient as any).mockPipeline.json.set).toHaveBeenCalledWith(
                    'rvl-test-json:user1',
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
                const customKeys = ['rvl-test-json:custom1', 'rvl-test-json:custom2'];

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

                const preprocess = async (doc: Record<string, unknown>) => ({
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
                    name: 'redisvl-test-data-fetch-hash',
                    prefix: 'rvl-test-data-fetch-hash',
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
                expect(mockHGetAll).toHaveBeenCalledWith('rvl-test-data-fetch-hash:123');
            });

            it('should fetch single document by key (JSON storage)', async () => {
                // Create index with JSON storage
                const indexInfo = new IndexInfo({
                    name: 'redisvl-test-data-fetch-json',
                    prefix: 'rvl-test-data-fetch-json',
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
                expect(mockJsonGet).toHaveBeenCalledWith('rvl-test-data-fetch-json:456');
            });

            it('should return null for non-existent key (HASH storage)', async () => {
                const indexInfo = new IndexInfo({
                    name: 'redisvl-test-data-fetch-hash',
                    prefix: 'rvl-test-data-fetch-hash',
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
                expect(mockHGetAll).toHaveBeenCalledWith('rvl-test-data-fetch-hash:999');
            });

            it('should return null for non-existent key (JSON storage)', async () => {
                const indexInfo = new IndexInfo({
                    name: 'redisvl-test-fetch-nonexistent-json',
                    prefix: 'rvl-test-fetch-nonexistent-json',
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
                expect(mockJsonGet).toHaveBeenCalledWith('rvl-test-fetch-nonexistent-json:999');
            });

            it('should handle keys with custom separator', async () => {
                const indexInfo = new IndexInfo({
                    name: 'redisvl-test-custom-separator-hash',
                    prefix: 'rvl-test-custom-separator-hash',
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
                expect(mockHGetAll).toHaveBeenCalledWith('rvl-test-custom-separator-hash::123');
            });

            it('should handle array prefix (use first prefix)', async () => {
                const indexInfo = new IndexInfo({
                    name: 'redisvl-test-array-prefix',
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
                    name: 'redisvl-test-data-fetch-many-hash',
                    prefix: 'rvl-test-data-fetch-many-hash',
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
                    name: 'redisvl-test-data-fetch-many-json',
                    prefix: 'rvl-test-data-fetch-many-json',
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
                    name: 'redisvl-test-fetch-many-missing-keys',
                    prefix: 'rvl-test-fetch-many-missing-keys',
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
                    name: 'redisvl-test-fetch-many-empty-keys',
                    prefix: 'rvl-test-fetch-many-empty-keys',
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
                    name: 'redisvl-test-fetch-many-order',
                    prefix: 'rvl-test-fetch-many-order',
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
                    name: 'redisvl-test-fetch-many-batch-size',
                    prefix: 'rvl-test-fetch-many-batch-size',
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

    describe('Data Preprocessing', () => {
        describe('load() with preprocess option', () => {
            it('should apply preprocess function to each document', async () => {
                const indexInfo = new IndexInfo({
                    name: 'redisvl-test-data-preprocess',
                    prefix: 'rvl-test-data-preprocess',
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });
                hashSchema.addField({ name: 'name', type: 'text' });
                hashSchema.addField({ name: 'email', type: 'text' });

                const mockPipeline = {
                    hSet: vi.fn().mockResolvedValue(1),
                    execAsPipeline: vi.fn().mockResolvedValue([]),
                };
                (mockClient as any).multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(hashSchema, mockClient);

                const rawData = [
                    { id: '1', name: 'John', email: 'JOHN@EXAMPLE.COM' },
                    { id: '2', name: 'Jane', email: 'JANE@EXAMPLE.COM' },
                ];

                // Preprocess: lowercase email
                await index.load(rawData, {
                    keys: ['user:1', 'user:2'], // Provide explicit full keys with prefix
                    preprocess: async (doc) => ({
                        ...doc,
                        email: (doc.email as string).toLowerCase(),
                    }),
                });

                // Verify hSet was called with preprocessed data
                expect(mockPipeline.hSet).toHaveBeenCalledWith(
                    'user:1',
                    expect.objectContaining({ email: 'john@example.com' })
                );
                expect(mockPipeline.hSet).toHaveBeenCalledWith(
                    'user:2',
                    expect.objectContaining({ email: 'jane@example.com' })
                );
            });

            it('should add computed fields via preprocess', async () => {
                const indexInfo = new IndexInfo({
                    name: 'redisvl-test-computed-fields',
                    prefix: 'rvl-test-computed-fields',
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });
                hashSchema.addField({ name: 'firstName', type: 'text' });
                hashSchema.addField({ name: 'lastName', type: 'text' });
                hashSchema.addField({ name: 'fullName', type: 'text' });

                const mockPipeline = {
                    hSet: vi.fn().mockResolvedValue(1),
                    execAsPipeline: vi.fn().mockResolvedValue([]),
                };
                (mockClient as any).multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(hashSchema, mockClient);

                const rawData = [{ id: '1', firstName: 'John', lastName: 'Doe' }];

                // Preprocess: add fullName field
                await index.load(rawData, {
                    keys: ['user:1'], // Provide explicit full key with prefix
                    preprocess: async (doc) => ({
                        ...doc,
                        fullName: `${doc.firstName} ${doc.lastName}`,
                    }),
                });

                // Verify fullName was added
                expect(mockPipeline.hSet).toHaveBeenCalledWith(
                    'user:1',
                    expect.objectContaining({ fullName: 'John Doe' })
                );
            });

            it('should transform field names via preprocess', async () => {
                const indexInfo = new IndexInfo({
                    name: 'redisvl-test-field-transform',
                    prefix: 'rvl-test-field-transform',
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });
                hashSchema.addField({ name: 'name', type: 'text' });
                hashSchema.addField({ name: 'price', type: 'numeric' });

                const mockPipeline = {
                    hSet: vi.fn().mockResolvedValue(1),
                    execAsPipeline: vi.fn().mockResolvedValue([]),
                };
                (mockClient as any).multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(hashSchema, mockClient);

                const rawData = [{ product_id: '1', title: 'Laptop', price_string: '999.99' }];

                // Preprocess: rename and transform fields
                await index.load(rawData, {
                    keys: ['product:1'], // Provide explicit full key with prefix
                    preprocess: async (doc) => ({
                        id: doc.product_id,
                        name: doc.title,
                        price: parseFloat(doc.price_string as string),
                    }),
                });

                // Verify transformed data
                expect(mockPipeline.hSet).toHaveBeenCalledWith(
                    'product:1',
                    expect.objectContaining({
                        id: '1',
                        name: 'Laptop',
                        price: 999.99,
                    })
                );
            });

            it('should apply preprocess before validation', async () => {
                const indexInfo = new IndexInfo({
                    name: 'redisvl-test-preprocess-before-validation',
                    prefix: 'rvl-test-preprocess-before-validation',
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });
                hashSchema.addField({ name: 'age', type: 'numeric' });

                const mockPipeline = {
                    hSet: vi.fn().mockResolvedValue(1),
                    execAsPipeline: vi.fn().mockResolvedValue([]),
                };
                (mockClient as any).multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(hashSchema, mockClient, true);

                const rawData = [{ id: '1', age: '30' }]; // age is string

                // Preprocess: convert string to number (so validation passes)
                await index.load(rawData, {
                    keys: ['user:1'], // Provide explicit full key with prefix
                    validateOnLoad: true,
                    preprocess: async (doc) => ({
                        ...doc,
                        age: parseInt(doc.age as string),
                    }),
                });

                // Should not throw validation error because preprocess runs first
                expect(mockPipeline.hSet).toHaveBeenCalledWith(
                    'user:1',
                    expect.objectContaining({ age: 30 })
                );
            });

            it('should support async preprocess function', async () => {
                const indexInfo = new IndexInfo({
                    name: 'redisvl-test-async-preprocess',
                    prefix: 'rvl-test-async-preprocess',
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });
                hashSchema.addField({ name: 'text', type: 'text' });
                hashSchema.addField({ name: 'processed', type: 'text' });

                const mockPipeline = {
                    hSet: vi.fn().mockResolvedValue(1),
                    execAsPipeline: vi.fn().mockResolvedValue([]),
                };
                (mockClient as any).multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(hashSchema, mockClient);

                const rawData = [{ id: '1', text: 'hello world' }];

                // Async preprocess: simulate async operation (e.g., API call)
                await index.load(rawData, {
                    keys: ['doc:1'], // Provide explicit full key with prefix
                    preprocess: async (doc) => {
                        // Simulate async operation
                        await new Promise((resolve) => setTimeout(resolve, 10));
                        return {
                            ...doc,
                            processed: (doc.text as string).toUpperCase(),
                        };
                    },
                });

                // Verify async preprocessing worked
                expect(mockPipeline.hSet).toHaveBeenCalledWith(
                    'doc:1',
                    expect.objectContaining({ processed: 'HELLO WORLD' })
                );
            });

            it('should work without preprocess (undefined)', async () => {
                const indexInfo = new IndexInfo({
                    name: 'redisvl-test-no-preprocess',
                    prefix: 'rvl-test-no-preprocess',
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });
                hashSchema.addField({ name: 'name', type: 'text' });

                const mockPipeline = {
                    hSet: vi.fn().mockResolvedValue(1),
                    execAsPipeline: vi.fn().mockResolvedValue([]),
                };
                (mockClient as any).multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(hashSchema, mockClient);

                const rawData = [{ id: '1', name: 'John' }];

                // Load without preprocess
                await index.load(rawData, { keys: ['user:1'] });

                // Data should be unchanged
                expect(mockPipeline.hSet).toHaveBeenCalledWith(
                    'user:1',
                    expect.objectContaining({ id: '1', name: 'John' })
                );
            });

            it('should handle preprocess errors gracefully', async () => {
                const indexInfo = new IndexInfo({
                    name: 'redisvl-test-preprocess-errors',
                    prefix: 'rvl-test-preprocess-errors',
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });

                const index = new SearchIndex(hashSchema, mockClient);

                const rawData = [{ id: '1' }];

                // Preprocess that throws error
                await expect(
                    index.load(rawData, {
                        preprocess: async () => {
                            throw new Error('Preprocessing failed');
                        },
                    })
                ).rejects.toThrow('Preprocessing failed');
            });

            it('should apply preprocess to all documents in batch', async () => {
                const indexInfo = new IndexInfo({
                    name: 'redisvl-test-preprocess-batch',
                    prefix: 'rvl-test-preprocess-batch',
                    storageType: StorageType.HASH,
                });
                const hashSchema = new IndexSchema({ index: indexInfo });
                hashSchema.addField({ name: 'id', type: 'tag' });
                hashSchema.addField({ name: 'count', type: 'numeric' });

                const mockPipeline = {
                    hSet: vi.fn().mockResolvedValue(1),
                    execAsPipeline: vi.fn().mockResolvedValue([]),
                };
                (mockClient as any).multi = vi.fn().mockReturnValue(mockPipeline);

                const index = new SearchIndex(hashSchema, mockClient);

                const rawData = [
                    { id: '1', count: 0 },
                    { id: '2', count: 0 },
                    { id: '3', count: 0 },
                ];

                let counter = 0;

                // Preprocess: increment counter for each document
                await index.load(rawData, {
                    keys: ['user:1', 'user:2', 'user:3'], // Provide explicit full keys with prefix
                    preprocess: async (doc) => ({
                        ...doc,
                        count: ++counter,
                    }),
                });

                // Verify all documents were preprocessed
                expect(mockPipeline.hSet).toHaveBeenCalledWith(
                    'user:1',
                    expect.objectContaining({ count: 1 })
                );
                expect(mockPipeline.hSet).toHaveBeenCalledWith(
                    'user:2',
                    expect.objectContaining({ count: 2 })
                );
                expect(mockPipeline.hSet).toHaveBeenCalledWith(
                    'user:3',
                    expect.objectContaining({ count: 3 })
                );
            });
        });
    });
});
