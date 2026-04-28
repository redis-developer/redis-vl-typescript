import { describe, it, expect } from 'vitest';
import {
    buildRedisVLSchemaFromRedisIndexInfo,
    type RedisIndexInfoReply,
} from '../../../src/redis/index-info-parser.js';
import { TextField, TagField, VectorField } from '../../../src/schema/fields.js';
import { RedisVLError } from '../../../src/errors.js';
import { VectorDistanceMetric, VectorDataType } from '../../../src/schema/types.js';

type MockInfoReply = RedisIndexInfoReply;

describe('buildRedisVLSchemaFromRedisIndexInfo', () => {
    describe('Basic index metadata parsing', () => {
        it('should parse index name, prefix, and storage type for HASH', () => {
            const info: MockInfoReply = {
                index_name: 'test-index',
                index_definition: {
                    key_type: 'HASH',
                    prefixes: ['doc:'],
                    default_score: '1',
                    indexes_all: 'false',
                },
                attributes: [],
            };

            const schema = buildRedisVLSchemaFromRedisIndexInfo(info);

            expect(schema.index.name).toBe('test-index');
            expect(schema.index.prefix).toBe('doc:');
            expect(schema.index.storageType).toBe('hash');
        });

        it('should parse index name, prefix, and storage type for JSON', () => {
            const info: MockInfoReply = {
                index_name: 'json-index',
                index_definition: {
                    key_type: 'JSON',
                    prefixes: ['product:'],
                    default_score: '1',
                    indexes_all: 'false',
                },
                attributes: [],
            };

            const schema = buildRedisVLSchemaFromRedisIndexInfo(info);

            expect(schema.index.name).toBe('json-index');
            expect(schema.index.prefix).toBe('product:');
            expect(schema.index.storageType).toBe('json');
        });

        it('should handle multiple prefixes', () => {
            const info: MockInfoReply = {
                index_name: 'multi-prefix-index',
                index_definition: {
                    key_type: 'HASH',
                    prefixes: ['prefix_a:', 'prefix_b:', 'prefix_c:'],
                    default_score: '1',
                    indexes_all: 'false',
                },
                attributes: [],
            };

            const schema = buildRedisVLSchemaFromRedisIndexInfo(info);

            expect(schema.index.name).toBe('multi-prefix-index');
            // First prefix should be used as default
            expect(schema.index.prefix).toBe('prefix_a:');
        });
    });

    describe('TEXT field parsing', () => {
        it('should parse basic TEXT field', () => {
            const info: MockInfoReply = {
                index_name: 'test-index',
                index_definition: {
                    key_type: 'HASH',
                    prefixes: ['doc:'],
                    default_score: '1',
                    indexes_all: 'false',
                },
                attributes: [
                    {
                        identifier: 'title',
                        attribute: 'title',
                        type: 'TEXT',
                        WEIGHT: '1',
                    },
                ],
            };

            const schema = buildRedisVLSchemaFromRedisIndexInfo(info);

            expect(schema.fields.title).toBeDefined();
            expect(schema.fields.title.type).toBe('text');
            expect(schema.fields.title.name).toBe('title');
        });

        it('should parse TEXT field with WEIGHT, NOSTEM, PHONETIC', () => {
            const info: MockInfoReply = {
                index_name: 'test-index',
                index_definition: {
                    key_type: 'HASH',
                    prefixes: ['doc:'],
                    default_score: '1',
                    indexes_all: 'false',
                },
                attributes: [
                    {
                        identifier: 'description',
                        attribute: 'description',
                        type: 'TEXT',
                        WEIGHT: '2.0',
                        NOSTEM: '',
                        PHONETIC: 'dm:en',
                    },
                ],
            };

            const schema = buildRedisVLSchemaFromRedisIndexInfo(info);

            expect(schema.fields.description).toBeDefined();
            expect(schema.fields.description.type).toBe('text');

            const field = schema.fields.description as TextField;
            expect(field.attrs.weight).toBe(2);
            expect(field.attrs.noStem).toBe(true);
            expect(field.attrs.phonetic).toBe('dm:en');
        });
    });

    describe('TAG field parsing', () => {
        it('should parse basic TAG field', () => {
            const info: MockInfoReply = {
                index_name: 'test-index',
                index_definition: {
                    key_type: 'HASH',
                    prefixes: ['doc:'],
                    default_score: '1',
                    indexes_all: 'false',
                },
                attributes: [
                    {
                        identifier: 'category',
                        attribute: 'category',
                        type: 'TAG',
                        SEPARATOR: ',',
                    },
                ],
            };

            const schema = buildRedisVLSchemaFromRedisIndexInfo(info);

            expect(schema.fields.category).toBeDefined();
            expect(schema.fields.category.type).toBe('tag');

            const field = schema.fields.category as TagField;
            expect(field.attrs.separator).toBe(',');
        });
    });

    describe('JSON path handling', () => {
        it('should set field.path and attrs.as for JSON storage', () => {
            const info: MockInfoReply = {
                index_name: 'json-index',
                index_definition: {
                    key_type: 'JSON',
                    prefixes: ['doc:'],
                },
                attributes: [
                    {
                        identifier: 'title',
                        attribute: '$.title',
                        type: 'TEXT',
                        SORTABLE: '',
                    },
                ],
            };

            const schema = buildRedisVLSchemaFromRedisIndexInfo(info);
            const field = schema.fields.title as TextField;

            expect(field.path).toBe('$.title');
            expect(field.attrs.as).toBe('title');
            expect(field.attrs.sortable).toBe(true);
        });
    });

    describe('Unsupported field types', () => {
        it('should throw for unknown field types', () => {
            const info: MockInfoReply = {
                index_name: 'test-index',
                index_definition: {
                    key_type: 'HASH',
                    prefixes: ['doc:'],
                },
                attributes: [
                    {
                        identifier: 'blob',
                        attribute: 'blob',
                        type: 'BLOB',
                    },
                ],
            };

            expect(() => buildRedisVLSchemaFromRedisIndexInfo(info)).toThrow(RedisVLError);
        });
    });

    describe('NUMERIC field parsing', () => {
        it('should parse NUMERIC field', () => {
            const info: MockInfoReply = {
                index_name: 'test-index',
                index_definition: {
                    key_type: 'HASH',
                    prefixes: ['doc:'],
                    default_score: '1',
                    indexes_all: 'false',
                },
                attributes: [
                    {
                        identifier: 'price',
                        attribute: 'price',
                        type: 'NUMERIC',
                    },
                ],
            };

            const schema = buildRedisVLSchemaFromRedisIndexInfo(info);

            expect(schema.fields.price).toBeDefined();
            expect(schema.fields.price.type).toBe('numeric');
        });
    });

    describe('GEO field parsing', () => {
        it('should parse GEO field', () => {
            const info: MockInfoReply = {
                index_name: 'test-index',
                index_definition: {
                    key_type: 'HASH',
                    prefixes: ['doc:'],
                    default_score: '1',
                    indexes_all: 'false',
                },
                attributes: [
                    {
                        identifier: 'location',
                        attribute: 'location',
                        type: 'GEO',
                    },
                ],
            };

            const schema = buildRedisVLSchemaFromRedisIndexInfo(info);

            expect(schema.fields.location).toBeDefined();
            expect(schema.fields.location.type).toBe('geo');
        });
    });

    describe('VECTOR field parsing', () => {
        it('should parse FLAT vector field', () => {
            const info: MockInfoReply = {
                index_name: 'test-index',
                index_definition: {
                    key_type: 'HASH',
                    prefixes: ['doc:'],
                    default_score: '1',
                    indexes_all: 'false',
                },
                attributes: [
                    {
                        identifier: 'embedding',
                        attribute: 'embedding',
                        type: 'VECTOR',
                        algorithm: 'FLAT',
                        data_type: 'FLOAT32',
                        dim: 384,
                        distance_metric: 'COSINE',
                        block_size: 1000,
                        initial_cap: 2000,
                    },
                ],
            };

            const schema = buildRedisVLSchemaFromRedisIndexInfo(info);

            expect(schema.fields.embedding).toBeDefined();
            expect(schema.fields.embedding.type).toBe('vector');

            const field = schema.fields.embedding as VectorField;
            expect(field.attrs.algorithm).toBe('flat');
            expect(field.attrs.distanceMetric).toBe(VectorDistanceMetric.COSINE);
            expect(field.attrs.datatype).toBe(VectorDataType.FLOAT32);
            expect(field.attrs.blockSize).toBe(1000);
            expect(field.attrs.initialCap).toBe(2000);
        });

        it('should parse HNSW vector field', () => {
            const info: MockInfoReply = {
                index_name: 'test-index',
                index_definition: {
                    key_type: 'HASH',
                    prefixes: ['doc:'],
                    default_score: '1',
                    indexes_all: 'false',
                },
                attributes: [
                    {
                        identifier: 'embedding',
                        attribute: 'embedding',
                        type: 'VECTOR',
                        algorithm: 'HNSW',
                        data_type: 'FLOAT32',
                        dim: 768,
                        distance_metric: 'L2',
                        m: 16,
                        ef_construction: 200,
                        ef_runtime: 42,
                        epsilon: 0.123,
                    },
                ],
            };

            const schema = buildRedisVLSchemaFromRedisIndexInfo(info);

            expect(schema.fields.embedding).toBeDefined();
            expect(schema.fields.embedding.type).toBe('vector');

            const field = schema.fields.embedding as VectorField;
            expect(field.attrs.algorithm).toBe('hnsw');
            expect(field.attrs.distanceMetric).toBe(VectorDistanceMetric.L2);
            expect(field.attrs.datatype).toBe(VectorDataType.FLOAT32);
            expect(field.attrs.m).toBe(16);
            expect(field.attrs.efConstruction).toBe(200);
            expect(field.attrs.efRuntime).toBe(42);
            expect(field.attrs.epsilon).toBeCloseTo(0.123);
        });

        it('should throw for unsupported vector algorithm', () => {
            const info: MockInfoReply = {
                index_name: 'test-index',
                index_definition: {
                    key_type: 'HASH',
                    prefixes: ['doc:'],
                },
                attributes: [
                    {
                        identifier: 'embedding',
                        attribute: 'embedding',
                        type: 'VECTOR',
                        algorithm: 'SVS-VAMANA',
                        data_type: 'FLOAT32',
                        dim: 3,
                        distance_metric: 'COSINE',
                    },
                ],
            };

            expect(() => buildRedisVLSchemaFromRedisIndexInfo(info)).toThrow(RedisVLError);
        });

        it('should throw for unsupported vector distance metric', () => {
            const info: MockInfoReply = {
                index_name: 'test-index',
                index_definition: {
                    key_type: 'HASH',
                    prefixes: ['doc:'],
                },
                attributes: [
                    {
                        identifier: 'embedding',
                        attribute: 'embedding',
                        type: 'VECTOR',
                        algorithm: 'FLAT',
                        data_type: 'FLOAT32',
                        dim: 3,
                        distance_metric: 'HAMMING',
                    },
                ],
            };

            expect(() => buildRedisVLSchemaFromRedisIndexInfo(info)).toThrow(RedisVLError);
        });

        it('should throw for unsupported vector data type', () => {
            const info: MockInfoReply = {
                index_name: 'test-index',
                index_definition: {
                    key_type: 'HASH',
                    prefixes: ['doc:'],
                },
                attributes: [
                    {
                        identifier: 'embedding',
                        attribute: 'embedding',
                        type: 'VECTOR',
                        algorithm: 'FLAT',
                        data_type: 'FLOAT128',
                        dim: 3,
                        distance_metric: 'COSINE',
                    },
                ],
            };

            expect(() => buildRedisVLSchemaFromRedisIndexInfo(info)).toThrow(RedisVLError);
        });
    });

    describe('JSON storage with paths', () => {
        it('should parse fields with JSON paths', () => {
            const info: MockInfoReply = {
                index_name: 'json-index',
                index_definition: {
                    key_type: 'JSON',
                    prefixes: ['user:'],
                    default_score: '1',
                    indexes_all: 'false',
                },
                attributes: [
                    {
                        identifier: 'user',
                        attribute: '$.user',
                        type: 'TAG',
                        SEPARATOR: ',',
                    },
                    {
                        identifier: 'age',
                        attribute: '$.metadata.age',
                        type: 'NUMERIC',
                    },
                ],
            };

            const schema = buildRedisVLSchemaFromRedisIndexInfo(info);

            expect(schema.fields.user).toBeDefined();
            expect(schema.fields.age).toBeDefined();
        });
    });

    describe('Complex schema with all field types', () => {
        it('should parse schema with TEXT, TAG, NUMERIC, and VECTOR fields', () => {
            const info: MockInfoReply = {
                index_name: 'complex-index',
                index_definition: {
                    key_type: 'HASH',
                    prefixes: ['product:'],
                    default_score: '1',
                    indexes_all: 'false',
                },
                attributes: [
                    {
                        identifier: 'title',
                        attribute: 'title',
                        type: 'TEXT',
                        WEIGHT: '1',
                    },
                    {
                        identifier: 'category',
                        attribute: 'category',
                        type: 'TAG',
                        SEPARATOR: ',',
                    },
                    {
                        identifier: 'price',
                        attribute: 'price',
                        type: 'NUMERIC',
                    },
                    {
                        identifier: 'embedding',
                        attribute: 'embedding',
                        type: 'VECTOR',
                        algorithm: 'FLAT',
                        data_type: 'FLOAT32',
                        dim: 384,
                        distance_metric: 'COSINE',
                    },
                ],
            };

            const schema = buildRedisVLSchemaFromRedisIndexInfo(info);

            expect(Object.keys(schema.fields)).toHaveLength(4);
            expect(schema.fields.title.type).toBe('text');
            expect(schema.fields.category.type).toBe('tag');
            expect(schema.fields.price.type).toBe('numeric');
            expect(schema.fields.embedding.type).toBe('vector');
        });
    });
});
