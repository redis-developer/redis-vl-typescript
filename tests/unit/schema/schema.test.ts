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

    describe('IndexSchema Field Management', () => {
        it('should add a single field using addField', () => {
            const indexInfo = new IndexInfo({ name: 'test-index' });
            const schema = new IndexSchema({ index: indexInfo });

            schema.addField({ name: 'title', type: 'text' });

            expect(schema.fields['title']).toBeDefined();
            expect(schema.fields['title']).toBeInstanceOf(TextField);
            expect(schema.fieldNames).toContain('title');
        });

        it('should add multiple fields using addFields', () => {
            const indexInfo = new IndexInfo({ name: 'test-index' });
            const schema = new IndexSchema({ index: indexInfo });

            schema.addFields([
                { name: 'title', type: 'text' },
                { name: 'category', type: 'tag' },
                { name: 'price', type: 'numeric' },
            ]);

            expect(schema.fieldNames).toHaveLength(3);
            expect(schema.fields['title']).toBeInstanceOf(TextField);
            expect(schema.fields['category']).toBeInstanceOf(TagField);
            expect(schema.fields['price']).toBeInstanceOf(NumericField);
        });

        it('should throw error when adding duplicate field name', () => {
            const indexInfo = new IndexInfo({ name: 'test-index' });
            const schema = new IndexSchema({ index: indexInfo });
            schema.addField({ name: 'title', type: 'text' });

            expect(() => {
                schema.addField({ name: 'title', type: 'tag' });
            }).toThrow('Duplicate field name');
        });

        it('should remove a field using removeField', () => {
            const indexInfo = new IndexInfo({ name: 'test-index' });
            const schema = new IndexSchema({ index: indexInfo });
            schema.addField({ name: 'title', type: 'text' });

            schema.removeField('title');

            expect(schema.fields['title']).toBeUndefined();
            expect(schema.fieldNames).not.toContain('title');
        });

        it('should not throw error when removing non-existent field', () => {
            const indexInfo = new IndexInfo({ name: 'test-index' });
            const schema = new IndexSchema({ index: indexInfo });

            expect(() => {
                schema.removeField('non-existent');
            }).not.toThrow();
        });
    });

    describe('IndexSchema Field Path Validation', () => {
        it('should auto-set path to $.fieldname for JSON storage', () => {
            const indexInfo = new IndexInfo({
                name: 'test-index',
                storageType: StorageType.JSON,
            });
            const schema = new IndexSchema({ index: indexInfo });

            schema.addField({ name: 'title', type: 'text' });

            expect(schema.fields['title'].path).toBe('$.title');
        });

        it('should use custom path for JSON storage if provided', () => {
            const indexInfo = new IndexInfo({
                name: 'test-index',
                storageType: StorageType.JSON,
            });
            const schema = new IndexSchema({ index: indexInfo });

            schema.addField({ name: 'bio', type: 'text', path: '$.profile.bio' });

            expect(schema.fields['bio'].path).toBe('$.profile.bio');
        });

        it('should set path to null for HASH storage', () => {
            const indexInfo = new IndexInfo({
                name: 'test-index',
                storageType: StorageType.HASH,
            });
            const schema = new IndexSchema({ index: indexInfo });

            schema.addField({ name: 'title', type: 'text' });

            expect(schema.fields['title'].path).toBeNull();
        });

        it('should ignore custom path for HASH storage', () => {
            const indexInfo = new IndexInfo({
                name: 'test-index',
                storageType: StorageType.HASH,
            });
            const schema = new IndexSchema({ index: indexInfo });

            schema.addField({ name: 'title', type: 'text', path: '$.title' });

            expect(schema.fields['title'].path).toBeNull();
        });
    });
});

