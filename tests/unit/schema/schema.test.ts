import { describe, it, expect } from 'vitest';
import { IndexInfo, IndexSchema } from '../../../src/schema/schema.js';
import { StorageType } from '../../../src/schema/types.js';
import { TextField, TagField, NumericField } from '../../../src/schema/fields.js';

describe('IndexInfo Tests', () => {
    describe('IndexInfo Creation', () => {
        it('should create IndexInfo with required name field', () => {
            const indexInfo = new IndexInfo({ name: 'test-index' });

            expect(indexInfo.name).toBe('test-index');
        });

        it('should use default values for optional fields', () => {
            const indexInfo = new IndexInfo({ name: 'test-index' });

            expect(indexInfo.prefix).toBe('rvl');
            expect(indexInfo.keySeparator).toBe(':');
            expect(indexInfo.storageType).toBe(StorageType.HASH);
            expect(indexInfo.stopwords).toBeUndefined();
        });

        it('should accept custom prefix as string', () => {
            const indexInfo = new IndexInfo({
                name: 'user-index',
                prefix: 'user',
            });

            expect(indexInfo.prefix).toBe('user');
        });

        it('should accept custom prefix as array of strings', () => {
            const indexInfo = new IndexInfo({
                name: 'multi-index',
                prefix: ['user', 'product', 'order'],
            });

            expect(indexInfo.prefix).toEqual(['user', 'product', 'order']);
        });

        it('should accept custom keySeparator', () => {
            const indexInfo = new IndexInfo({
                name: 'test-index',
                keySeparator: '-',
            });

            expect(indexInfo.keySeparator).toBe('-');
        });

        it('should accept JSON storage type', () => {
            const indexInfo = new IndexInfo({
                name: 'test-index',
                storageType: StorageType.JSON,
            });

            expect(indexInfo.storageType).toBe(StorageType.JSON);
        });

        it('should accept stopwords as empty array (disabled)', () => {
            const indexInfo = new IndexInfo({
                name: 'test-index',
                stopwords: [],
            });

            expect(indexInfo.stopwords).toEqual([]);
        });

        it('should accept custom stopwords list', () => {
            const indexInfo = new IndexInfo({
                name: 'test-index',
                stopwords: ['the', 'a', 'an'],
            });

            expect(indexInfo.stopwords).toEqual(['the', 'a', 'an']);
        });
    });

    describe('IndexInfo Validation', () => {
        it('should throw error when name is missing', () => {
            expect(() => new IndexInfo({} as any)).toThrow();
        });

        it('should throw error when name is empty string', () => {
            expect(() => new IndexInfo({ name: '' })).toThrow();
        });
    });
});

describe('IndexSchema Tests', () => {
    describe('IndexSchema Creation', () => {
        it('should create IndexSchema with IndexInfo and empty fields', () => {
            const indexInfo = new IndexInfo({ name: 'test-index' });

            const schema = new IndexSchema({ index: indexInfo });

            expect(schema.index).toBe(indexInfo);
            expect(schema.fields).toEqual({});
            expect(schema.version).toBe('0.1.0');
        });

        it('should create IndexSchema with IndexInfo and fields', () => {
            const indexInfo = new IndexInfo({ name: 'user-index' });
            const fields = {
                username: new TagField({ name: 'username' }),
                bio: new TextField({ name: 'bio' }),
                age: new NumericField({ name: 'age' }),
            };

            const schema = new IndexSchema({ index: indexInfo, fields });

            expect(schema.index).toBe(indexInfo);
            expect(schema.fields).toEqual(fields);
            expect(Object.keys(schema.fields)).toHaveLength(3);
        });

        it('should access fields by name', () => {
            const indexInfo = new IndexInfo({ name: 'user-index' });
            const usernameField = new TagField({ name: 'username' });
            const fields = { username: usernameField };

            const schema = new IndexSchema({ index: indexInfo, fields });

            expect(schema.fields['username']).toBe(usernameField);
        });
    });

    describe('IndexSchema Properties', () => {
        it('should return empty array for fieldNames when no fields', () => {
            const indexInfo = new IndexInfo({ name: 'test-index' });
            const schema = new IndexSchema({ index: indexInfo });

            const fieldNames = schema.fieldNames;

            expect(fieldNames).toEqual([]);
        });

        it('should return array of field names', () => {
            const indexInfo = new IndexInfo({ name: 'user-index' });
            const fields = {
                username: new TagField({ name: 'username' }),
                bio: new TextField({ name: 'bio' }),
                age: new NumericField({ name: 'age' }),
            };
            const schema = new IndexSchema({ index: indexInfo, fields });

            const fieldNames = schema.fieldNames;

            expect(fieldNames).toHaveLength(3);
            expect(fieldNames).toContain('username');
            expect(fieldNames).toContain('bio');
            expect(fieldNames).toContain('age');
        });
    });
});

