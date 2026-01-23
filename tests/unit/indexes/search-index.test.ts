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
});
