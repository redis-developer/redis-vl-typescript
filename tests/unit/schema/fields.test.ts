import { describe, it, expect } from 'vitest';
import {
    FieldFactory,
    TextField,
    TagField,
    NumericField,
    GeoField,
    VectorField,
    FlatVectorField,
    HNSWVectorField,
} from '../../../src/schema/fields.js';
import { VectorDistanceMetric, VectorDataType } from '../../../src/schema/types.js';
import { SchemaValidationError } from '../../../src/errors.js';

describe('Field Creation Tests', () => {
    describe('Standard Field Creation', () => {
        it.each([
            ['tag', TagField, 'example_field'],
            ['text', TextField, 'example_field'],
            ['numeric', NumericField, 'example_field'],
            ['geo', GeoField, 'example_field'],
        ])('should create %s field', (fieldType, expectedClass, fieldName) => {
            const field = FieldFactory.createField(fieldType, fieldName);
            expect(field).toBeInstanceOf(expectedClass);
            expect(field.name).toBe(fieldName);
        });
    });

    describe('Vector Field Creation', () => {
        it.each([
            ['flat', FlatVectorField, 'example_vector_field'],
            ['hnsw', HNSWVectorField, 'example_vector_field'],
        ])('should create %s vector field', (algorithm, expectedClass, fieldName) => {
            const field = FieldFactory.createField('vector', fieldName, {
                algorithm: algorithm as 'flat' | 'hnsw',
                dims: 128,
            });
            expect(field).toBeInstanceOf(expectedClass);
            expect(field.name).toBe(fieldName);
        });

        it('should throw SchemaValidationError for unknown vector field algorithm', () => {
            expect(() => {
                FieldFactory.createField('vector', 'example_vector_field', {
                    algorithm: 'unknown' as any,
                    dims: 128,
                });
            }).toThrow(SchemaValidationError);
            expect(() => {
                FieldFactory.createField('vector', 'example_vector_field', {
                    algorithm: 'unknown' as any,
                    dims: 128,
                });
            }).toThrow(/Unknown vector field algorithm: unknown/);
        });

        it('should throw SchemaValidationError for missing vector field algorithm', () => {
            expect(() => {
                FieldFactory.createField('vector', 'example_vector_field', {
                    dims: 128,
                } as any); // Intentionally incomplete for error testing
            }).toThrow(SchemaValidationError);
            expect(() => {
                FieldFactory.createField('vector', 'example_vector_field', {
                    dims: 128,
                } as any);
            }).toThrow(/Must provide algorithm param/);
        });

        it('should throw SchemaValidationError for missing vector field dims', () => {
            expect(() => {
                FieldFactory.createField('vector', 'example_vector_field', {
                    algorithm: 'flat',
                } as any); // Intentionally incomplete for error testing
            }).toThrow(SchemaValidationError);
            expect(() => {
                FieldFactory.createField('vector', 'example_vector_field', {
                    algorithm: 'flat',
                } as any);
            }).toThrow(/Must provide dims param/);
        });
    });

    describe('Unknown Field Type', () => {
        it('should throw SchemaValidationError for unknown field type', () => {
            expect(() => {
                FieldFactory.createField('unknown', 'example_field');
            }).toThrow(SchemaValidationError);
            expect(() => {
                FieldFactory.createField('unknown', 'example_field');
            }).toThrow(/Unknown field type: unknown/);
        });
    });
});

describe('TextField Tests', () => {
    it('should create TextField with name', () => {
        const field = new TextField('example_textfield');
        expect(field.name).toBe('example_textfield');
        expect(field.type).toBe('text');
    });

    it('should create TextField with attributes', () => {
        const field = new TextField('example_textfield', {
            sortable: true,
            weight: 2.0,
        });
        expect(field.name).toBe('example_textfield');
        expect(field.attrs.sortable).toBe(true);
        expect(field.attrs.weight).toBe(2.0);
    });
});

describe('TagField Tests', () => {
    it('should create TagField with name', () => {
        const field = new TagField('example_tagfield');
        expect(field.name).toBe('example_tagfield');
        expect(field.type).toBe('tag');
    });

    it('should create TagField with attributes', () => {
        const field = new TagField('example_tagfield', {
            sortable: true,
            separator: '|',
        });
        expect(field.name).toBe('example_tagfield');
        expect(field.attrs.sortable).toBe(true);
        expect(field.attrs.separator).toBe('|');
    });

    it('should use default separator', () => {
        const field = new TagField('example_tagfield');
        expect(field.attrs.separator).toBe(',');
    });
});

describe('NumericField Tests', () => {
    it('should create NumericField with name', () => {
        const field = new NumericField('example_numericfield');
        expect(field.name).toBe('example_numericfield');
        expect(field.type).toBe('numeric');
    });

    it('should create NumericField with attributes', () => {
        const field = new NumericField('example_numericfield', {
            sortable: true,
        });
        expect(field.name).toBe('example_numericfield');
        expect(field.attrs.sortable).toBe(true);
    });
});

describe('GeoField Tests', () => {
    it('should create GeoField with name', () => {
        const field = new GeoField('example_geofield');
        expect(field.name).toBe('example_geofield');
        expect(field.type).toBe('geo');
    });

    it('should create GeoField with attributes', () => {
        const field = new GeoField('example_geofield', {
            sortable: false,
        });
        expect(field.name).toBe('example_geofield');
        expect(field.attrs.sortable).toBe(false);
    });
});

describe('FlatVectorField Tests', () => {
    it('should create FlatVectorField with required params', () => {
        const field = new FlatVectorField('example_flatvectorfield', {
            algorithm: 'flat',
            dims: 128,
        });
        expect(field.name).toBe('example_flatvectorfield');
        expect(field.type).toBe('vector');
        expect(field.attrs.algorithm).toBe('flat');
        expect(field.attrs.dims).toBe(128);
    });

    it('should create FlatVectorField with optional params', () => {
        const field = new FlatVectorField('example_flatvectorfield', {
            algorithm: 'flat',
            dims: 128,
            distanceMetric: VectorDistanceMetric.COSINE,
            datatype: VectorDataType.FLOAT32,
            blockSize: 100,
        });
        expect(field.attrs.distanceMetric).toBe(VectorDistanceMetric.COSINE);
        expect(field.attrs.datatype).toBe(VectorDataType.FLOAT32);
        expect(field.attrs.blockSize).toBe(100);
    });

    it('should not include blockSize if not set', () => {
        const field = new FlatVectorField('example_vector', {
            algorithm: 'flat',
            dims: 128,
        });
        expect(field.attrs.blockSize).toBeUndefined();
    });
});

describe('HNSWVectorField Tests', () => {
    it('should create HNSWVectorField with required params', () => {
        const field = new HNSWVectorField('example_hnswvectorfield', {
            algorithm: 'hnsw',
            dims: 128,
        });
        expect(field.name).toBe('example_hnswvectorfield');
        expect(field.type).toBe('vector');
        expect(field.attrs.algorithm).toBe('hnsw');
        expect(field.attrs.dims).toBe(128);
    });

    it('should use default HNSW parameters when not set', () => {
        const field = new HNSWVectorField('example_vector', {
            algorithm: 'hnsw',
            dims: 128,
        });
        expect(field.attrs.m).toBe(16);
        expect(field.attrs.efConstruction).toBe(200);
        expect(field.attrs.efRuntime).toBe(10);
        expect(field.attrs.epsilon).toBe(0.01);
    });

    it('should create HNSWVectorField with custom params', () => {
        const field = new HNSWVectorField('example_vector', {
            algorithm: 'hnsw',
            dims: 128,
            m: 24,
            efConstruction: 300,
            efRuntime: 20,
            epsilon: 0.02,
        });
        expect(field.attrs.m).toBe(24);
        expect(field.attrs.efConstruction).toBe(300);
        expect(field.attrs.efRuntime).toBe(20);
        expect(field.attrs.epsilon).toBe(0.02);
    });
});

describe('Generic VectorField Tests', () => {
    describe('VectorField with FLAT algorithm', () => {
        it('should create VectorField with FLAT algorithm', () => {
            const field = new VectorField('embedding', {
                algorithm: 'flat',
                dims: 512,
                distanceMetric: VectorDistanceMetric.COSINE,
            });

            expect(field.name).toBe('embedding');
            expect(field.type).toBe('vector');
            expect(field.attrs.algorithm).toBe('flat');
            expect(field.attrs.dims).toBe(512);
            expect(field.attrs.distanceMetric).toBe(VectorDistanceMetric.COSINE);
        });

        it('should delegate to FlatVectorField for toRedisField()', () => {
            const field = new VectorField('embedding', {
                algorithm: 'flat',
                dims: 256,
                distanceMetric: VectorDistanceMetric.L2,
                blockSize: 1024,
                initialCap: 5000,
            });

            const redisField = field.toRedisField(false);

            expect(redisField.type).toBe('VECTOR');
            expect(redisField.ALGORITHM).toBe('FLAT');
            expect(redisField.DIM).toBe(256);
            expect(redisField.DISTANCE_METRIC).toBe('L2');
            if (redisField.ALGORITHM === 'FLAT') {
                expect(redisField.BLOCK_SIZE).toBe(1024);
                expect(redisField.INITIAL_CAP).toBe(5000);
            }
        });

        it('should support all FLAT-specific attributes', () => {
            const field = new VectorField('vec', {
                algorithm: 'flat',
                dims: 128,
                datatype: VectorDataType.FLOAT32,
                blockSize: 512,
                initialCap: 1000,
            });

            const redisField = field.toRedisField(false);

            expect(redisField.TYPE).toBe('FLOAT32');
            if (redisField.ALGORITHM === 'FLAT') {
                expect(redisField.BLOCK_SIZE).toBe(512);
                expect(redisField.INITIAL_CAP).toBe(1000);
            }
        });
    });

    describe('VectorField with HNSW algorithm', () => {
        it('should create VectorField with HNSW algorithm', () => {
            const field = new VectorField('embedding', {
                algorithm: 'hnsw',
                dims: 768,
                distanceMetric: VectorDistanceMetric.COSINE,
            });

            expect(field.name).toBe('embedding');
            expect(field.type).toBe('vector');
            expect(field.attrs.algorithm).toBe('hnsw');
            expect(field.attrs.dims).toBe(768);
            expect(field.attrs.distanceMetric).toBe(VectorDistanceMetric.COSINE);
        });

        it('should delegate to HNSWVectorField for toRedisField()', () => {
            const field = new VectorField('embedding', {
                algorithm: 'hnsw',
                dims: 384,
                distanceMetric: VectorDistanceMetric.IP,
                m: 32,
                efConstruction: 400,
            });

            const redisField = field.toRedisField(false);

            expect(redisField.type).toBe('VECTOR');
            expect(redisField.ALGORITHM).toBe('HNSW');
            expect(redisField.DIM).toBe(384);
            expect(redisField.DISTANCE_METRIC).toBe('IP');
            if (redisField.ALGORITHM === 'HNSW') {
                expect(redisField.M).toBe(32);
                expect(redisField.EF_CONSTRUCTION).toBe(400);
            }
        });

        it('should support all HNSW-specific attributes', () => {
            const field = new VectorField('vec', {
                algorithm: 'hnsw',
                dims: 512,
                m: 24,
                efConstruction: 300,
                efRuntime: 20,
                epsilon: 0.05,
            });

            const redisField = field.toRedisField(false);

            if (redisField.ALGORITHM === 'HNSW') {
                expect(redisField.M).toBe(24);
                expect(redisField.EF_CONSTRUCTION).toBe(300);
                expect(redisField.EF_RUNTIME).toBe(20);
            }
            // Note: epsilon is not in Redis field, it's a query parameter
        });

        it('should apply HNSW defaults when not specified', () => {
            const field = new VectorField('embedding', {
                algorithm: 'hnsw',
                dims: 768,
            });

            // Defaults should be set by HNSWVectorField constructor
            const redisField = field.toRedisField(false);

            if (redisField.ALGORITHM === 'HNSW') {
                expect(redisField.M).toBe(16); // default
                expect(redisField.EF_CONSTRUCTION).toBe(200); // default
                expect(redisField.EF_RUNTIME).toBe(10); // default
            }
        });
    });

    describe('VectorField JSON storage support', () => {
        it('should support JSON storage with AS alias for FLAT', () => {
            const field = new VectorField('embedding', {
                algorithm: 'flat',
                dims: 256,
                as: '$.vector',
            });

            const redisField = field.toRedisField(true);

            expect(redisField.AS).toBe('$.vector');
        });

        it('should support JSON storage with AS alias for HNSW', () => {
            const field = new VectorField('embedding', {
                algorithm: 'hnsw',
                dims: 512,
                as: '$.embedding',
            });

            const redisField = field.toRedisField(true);

            expect(redisField.AS).toBe('$.embedding');
        });
    });

    describe('VectorField algorithm switching', () => {
        it('should produce different Redis fields for different algorithms', () => {
            const flatField = new VectorField('vec', {
                algorithm: 'flat',
                dims: 128,
            });

            const hnswField = new VectorField('vec', {
                algorithm: 'hnsw',
                dims: 128,
            });

            const flatRedis = flatField.toRedisField(false);
            const hnswRedis = hnswField.toRedisField(false);

            expect(flatRedis.ALGORITHM).toBe('FLAT');
            expect(hnswRedis.ALGORITHM).toBe('HNSW');
        });
    });
});
