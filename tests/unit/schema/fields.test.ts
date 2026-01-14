import { describe, it, expect } from 'vitest';
import {
    FieldFactory,
    TextField,
    TagField,
    NumericField,
    GeoField,
    FlatVectorField,
    HNSWVectorField,
} from '../../../src/schema/fields.js';

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
                algorithm,
                dims: 128,
            });
            expect(field).toBeInstanceOf(expectedClass);
            expect(field.name).toBe(fieldName);
        });

        it('should throw error for unknown vector field algorithm', () => {
            expect(() => {
                FieldFactory.createField('vector', 'example_vector_field', {
                    algorithm: 'unknown',
                    dims: 128,
                });
            }).toThrow('Unknown vector field algorithm');
        });

        it('should throw error for missing vector field algorithm', () => {
            expect(() => {
                FieldFactory.createField('vector', 'example_vector_field', {
                    dims: 128,
                });
            }).toThrow('Must provide algorithm param');
        });

        it('should throw error for missing vector field dims', () => {
            expect(() => {
                FieldFactory.createField('vector', 'example_vector_field', {
                    algorithm: 'flat',
                });
            }).toThrow('Must provide dims param');
        });
    });

    describe('Unknown Field Type', () => {
        it('should throw error for unknown field type', () => {
            expect(() => {
                FieldFactory.createField('unknown', 'example_field');
            }).toThrow('Unknown field type: unknown');
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
            distanceMetric: 'COSINE',
            datatype: 'FLOAT32',
            blockSize: 100,
        });
        expect(field.attrs.distanceMetric).toBe('COSINE');
        expect(field.attrs.datatype).toBe('FLOAT32');
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
