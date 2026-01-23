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
        mockClient = {
            ft: {
                create: vi.fn(),
                _list: vi.fn(),
                dropIndex: vi.fn(),
                info: vi.fn(),
            },
        } as unknown as RedisClientType;
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
});
