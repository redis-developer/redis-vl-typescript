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

describe('IndexSchema.fromObject()', () => {
    it('should create IndexSchema from dict with fields as array', () => {
        const schema = IndexSchema.fromObject({
            index: {
                name: 'example_index',
                prefix: 'ex',
                key_separator: '|',  // snake_case input (from YAML/JSON)
                storage_type: StorageType.JSON,  // snake_case input (from YAML/JSON)
            },
            fields: [
                { name: 'example_text', type: 'text', attrs: { sortable: false } },
                { name: 'example_numeric', type: 'tag', attrs: { sortable: true } },
            ],
        });

        expect(schema.index.name).toBe('example_index');
        expect(schema.index.keySeparator).toBe('|');  // camelCase property
        expect(schema.index.prefix).toBe('ex');
        expect(schema.index.storageType).toBe(StorageType.JSON);  // camelCase property
        expect(schema.fieldNames).toHaveLength(2);  // camelCase property
        expect(schema.fieldNames).toContain('example_text');
        expect(schema.fieldNames).toContain('example_numeric');
    });

    it('should create IndexSchema from dict with IndexInfo instance', () => {
        const indexInfo = new IndexInfo({
            name: 'test-index',
            prefix: 'test',
            storageType: StorageType.HASH,  // camelCase input (TypeScript API)
        });

        const schema = IndexSchema.fromObject({
            index: indexInfo,
            fields: [{ name: 'field1', type: 'text' }],
        });

        expect(schema.index).toBe(indexInfo);
        expect(schema.fieldNames).toHaveLength(1);  // camelCase property
        expect(schema.fieldNames).toContain('field1');
    });

    it('should create IndexSchema from dict with fields as object', () => {
        const schema = IndexSchema.fromObject({
            index: {
                name: 'test-index',
                prefix: 'test',
            },
            fields: {
                title: { name: 'title', type: 'text' },
                price: { name: 'price', type: 'numeric' },
            },
        });

        expect(schema.fieldNames).toHaveLength(2);  // camelCase property
        expect(schema.fieldNames).toContain('title');
        expect(schema.fieldNames).toContain('price');
    });

    it('should throw error when field name in object does not match key', () => {
        expect(() => {
            IndexSchema.fromObject({
                index: {
                    name: 'test-index',
                    prefix: 'test',
                },
                fields: {
                    title: { name: 'wrong_name', type: 'text' },
                },
            });
        }).toThrow('Field name mismatch');
    });

    it('should create IndexSchema without fields', () => {
        const schema = IndexSchema.fromObject({
            index: {
                name: 'test-index',
                prefix: 'test',
            },
        });

        expect(schema.fieldNames).toHaveLength(0);  // camelCase property
    });

    it('should set version if provided', () => {
        const schema = IndexSchema.fromObject({
            index: {
                name: 'test-index',
                prefix: 'test',
            },
            version: '0.1.0',
        });

        expect(schema.version).toBe('0.1.0');
    });

    it('should handle JSON storage with auto-path setting', () => {
        const schema = IndexSchema.fromObject({
            index: {
                name: 'test-index',
                prefix: 'test',
                storage_type: StorageType.JSON,  // snake_case input (from YAML/JSON)
            },
            fields: [{ name: 'title', type: 'text' }],
        });

        expect(schema.fields['title'].path).toBe('$.title');
    });

    it('should handle HASH storage with null paths', () => {
        const schema = IndexSchema.fromObject({
            index: {
                name: 'test-index',
                prefix: 'test',
                storage_type: StorageType.HASH,  // snake_case input (from YAML/JSON)
            },
            fields: [{ name: 'title', type: 'text' }],
        });

        expect(schema.fields['title'].path).toBe(null);
    });
});

describe('IndexSchema.toObject()', () => {
    it('should serialize IndexSchema to dictionary', () => {
        const indexInfo = new IndexInfo({
            name: 'test-index',
            prefix: 'test',
            keySeparator: ':',  // camelCase input (TypeScript API)
            storageType: StorageType.HASH,  // camelCase input (TypeScript API)
        });
        const schema = new IndexSchema({ index: indexInfo });
        schema.addFields([  // camelCase method
            { name: 'title', type: 'text' },
            { name: 'category', type: 'tag' },
        ]);

        const dict = schema.toObject();

        expect(dict.index.name).toBe('test-index');
        expect(dict.index.prefix).toBe('test');
        expect(dict.index.key_separator).toBe(':');  // snake_case in output (YAML/JSON)
        expect(dict.index.storage_type).toBe('hash');  // snake_case in output (YAML/JSON)
        expect(dict.fields).toBeInstanceOf(Array);
        expect(dict.fields).toHaveLength(2);
        expect(dict.version).toBe('0.1.0');
    });

    it('should serialize fields as array with all properties', () => {
        const indexInfo = new IndexInfo({ name: 'test-index' });
        const schema = new IndexSchema({ index: indexInfo });
        schema.addField({ name: 'title', type: 'text', attrs: { sortable: true } });  // camelCase method

        const dict = schema.toObject();

        expect(dict.fields[0].name).toBe('title');
        expect(dict.fields[0].type).toBe('text');
        expect(dict.fields[0].attrs).toEqual({ sortable: true });
    });

    it('should handle prefix as array', () => {
        const indexInfo = new IndexInfo({
            name: 'test-index',
            prefix: ['user', 'product'],
        });
        const schema = new IndexSchema({ index: indexInfo });

        const dict = schema.toObject();

        expect(dict.index.prefix).toEqual(['user', 'product']);
    });

    it('should handle stopwords', () => {
        const indexInfo = new IndexInfo({
            name: 'test-index',
            stopwords: ['the', 'a', 'an'],
        });
        const schema = new IndexSchema({ index: indexInfo });

        const dict = schema.toObject();

        expect(dict.index.stopwords).toEqual(['the', 'a', 'an']);
    });

    it('should be able to recreate schema from toObject output', () => {
        const indexInfo = new IndexInfo({
            name: 'test-index',
            prefix: 'test',
            storageType: StorageType.JSON,  // camelCase input (TypeScript API)
        });
        const schema = new IndexSchema({ index: indexInfo });
        schema.addFields([  // camelCase method
            { name: 'title', type: 'text' },
            { name: 'price', type: 'numeric' },
        ]);

        const dict = schema.toObject();
        const recreated = IndexSchema.fromObject(dict);

        expect(recreated.index.name).toBe(schema.index.name);
        expect(recreated.index.prefix).toBe(schema.index.prefix);
        expect(recreated.index.storageType).toBe(schema.index.storageType);  // camelCase property
        expect(recreated.fieldNames).toEqual(schema.fieldNames);  // camelCase property
    });
});

describe('IndexSchema.toYAML()', () => {
    it('should write schema to YAML file', async () => {
        const indexInfo = new IndexInfo({
            name: 'test-index',
            prefix: 'test',
            storageType: StorageType.HASH,  // camelCase input (TypeScript API)
        });
        const schema = new IndexSchema({ index: indexInfo });
        schema.addFields([  // camelCase method
            { name: 'title', type: 'text' },
            { name: 'category', type: 'tag' },
        ]);

        const filePath = 'test-schema.yaml';
        await schema.toYAML(filePath);

        const fs = await import('fs/promises');
        const fileExists = await fs
            .access(filePath)
            .then(() => true)
            .catch(() => false);
        expect(fileExists).toBe(true);

        await fs.unlink(filePath);
    });

    it('should throw error if file exists and overwrite is false', async () => {
        const indexInfo = new IndexInfo({ name: 'test-index' });
        const schema = new IndexSchema({ index: indexInfo });

        const filePath = 'test-schema-exists.yaml';
        await schema.toYAML(filePath);

        await expect(schema.toYAML(filePath, false)).rejects.toThrow('already exists');

        const fs = await import('fs/promises');
        await fs.unlink(filePath);
    });

    it('should overwrite file if overwrite is true', async () => {
        const indexInfo = new IndexInfo({ name: 'test-index' });
        const schema = new IndexSchema({ index: indexInfo });

        const filePath = 'test-schema-overwrite.yaml';
        await schema.toYAML(filePath);
        await schema.toYAML(filePath, true);

        const fs = await import('fs/promises');
        const fileExists = await fs
            .access(filePath)
            .then(() => true)
            .catch(() => false);
        expect(fileExists).toBe(true);

        await fs.unlink(filePath);
    });
});

describe('IndexSchema.fromYAML()', () => {
    it('should load schema from YAML file', async () => {
        const indexInfo = new IndexInfo({
            name: 'test-index',
            prefix: 'test',
            storageType: StorageType.HASH,  // camelCase input (TypeScript API)
        });
        const schema = new IndexSchema({ index: indexInfo });
        schema.addFields([  // camelCase method
            { name: 'title', type: 'text' },
            { name: 'category', type: 'tag' },
        ]);

        const filePath = 'test-from-yaml.yaml';
        await schema.toYAML(filePath);

        const loaded = await IndexSchema.fromYAML(filePath);

        expect(loaded.index.name).toBe('test-index');
        expect(loaded.index.prefix).toBe('test');
        expect(loaded.index.storageType).toBe(StorageType.HASH);  // camelCase property
        expect(loaded.fieldNames).toEqual(['title', 'category']);  // camelCase property

        const fs = await import('fs/promises');
        await fs.unlink(filePath);
    });

    it('should throw error if file does not exist', async () => {
        await expect(IndexSchema.fromYAML('nonexistent-file.yaml')).rejects.toThrow(
            'does not exist',
        );
    });

    it('should handle round-trip: toYAML -> fromYAML', async () => {
        const indexInfo = new IndexInfo({
            name: 'round-trip-test',
            prefix: ['user', 'product'],
            keySeparator: '|',  // camelCase input (TypeScript API)
            storageType: StorageType.JSON,  // camelCase input (TypeScript API)
            stopwords: ['the', 'a'],
        });
        const schema = new IndexSchema({ index: indexInfo });
        schema.addFields([  // camelCase method
            { name: 'title', type: 'text', attrs: { sortable: true } },
            { name: 'price', type: 'numeric' },
        ]);

        const filePath = 'test-round-trip.yaml';
        await schema.toYAML(filePath);

        const loaded = await IndexSchema.fromYAML(filePath);

        expect(loaded.index.name).toBe(schema.index.name);
        expect(loaded.index.prefix).toEqual(schema.index.prefix);
        expect(loaded.index.keySeparator).toBe(schema.index.keySeparator);  // camelCase property
        expect(loaded.index.storageType).toBe(schema.index.storageType);  // camelCase property
        expect(loaded.index.stopwords).toEqual(schema.index.stopwords);
        expect(loaded.fieldNames).toEqual(schema.fieldNames);  // camelCase property
        expect(loaded.toObject()).toEqual(schema.toObject());

        const fs = await import('fs/promises');
        await fs.unlink(filePath);
    });

    it('should load YAML with fields as array', async () => {
        const yamlContent = `index:
  name: test-index
  prefix: test
  key_separator: ':'
  storage_type: hash
fields:
  - name: title
    type: text
  - name: category
    type: tag
version: 0.1.0
`;
        const filePath = 'test-array-fields.yaml';
        const fs = await import('fs/promises');
        await fs.writeFile(filePath, yamlContent, 'utf-8');

        const loaded = await IndexSchema.fromYAML(filePath);

        expect(loaded.index.name).toBe('test-index');
        expect(loaded.fieldNames).toEqual(['title', 'category']);  // camelCase property

        await fs.unlink(filePath);
    });
});

