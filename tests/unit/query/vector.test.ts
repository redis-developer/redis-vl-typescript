import { describe, it, expect } from 'vitest';
import { VectorQuery } from '../../../src/query/vector.js';
import { QueryValidationError } from '../../../src/errors.js';
import { VectorDistanceMetric } from '../../../src/schema/types.js';

describe('VectorQuery', () => {
    describe('constructor', () => {
        it('should create VectorQuery with vector array', () => {
            const query = new VectorQuery({
                vector: [0.1, 0.2, 0.3],
                vectorField: 'embedding',
                returnFields: ['title', 'score'],
                numResults: 10,
            });

            expect(query).toBeInstanceOf(VectorQuery);
            expect(query.numResults).toBe(10);
            expect(query.vectorField).toBe('embedding');
            expect(query.returnFields).toEqual(['title', 'score']);
        });

        it('should throw QueryValidationError if vector is empty', () => {
            expect(() => {
                new VectorQuery({ vector: [], vectorField: 'embedding' });
            }).toThrow(QueryValidationError);
        });

        it('should throw QueryValidationError if vectorField is missing', () => {
            expect(() => {
                new VectorQuery({ vector: [0.1, 0.2] } as any);
            }).toThrow(QueryValidationError);
        });

        it('should default numResults to 10', () => {
            const query = new VectorQuery({
                vector: [0.1, 0.2, 0.3],
                vectorField: 'embedding',
            });

            expect(query.numResults).toBe(10);
        });

        it('should default distance metric to COSINE', () => {
            const query = new VectorQuery({
                vector: [0.1, 0.2, 0.3],
                vectorField: 'embedding',
            });

            expect(query.distanceMetric).toBe(VectorDistanceMetric.COSINE);
        });
    });

    describe('buildQuery', () => {
        it('should build KNN query string with default filter', () => {
            const query = new VectorQuery({
                vector: [0.1, 0.2, 0.3],
                vectorField: 'embedding',
                numResults: 5,
            });

            const queryString = query.buildQuery();
            expect(queryString).toBe('*=>[KNN 5 @embedding $vector AS vector_distance]');
        });

        it('should include filter expression if provided', () => {
            const query = new VectorQuery({
                vector: [0.1, 0.2, 0.3],
                vectorField: 'embedding',
                filter: '@category:{electronics}',
                numResults: 5,
            });

            const queryString = query.buildQuery();
            expect(queryString).toBe(
                '(@category:{electronics})=>[KNN 5 @embedding $vector AS vector_distance]'
            );
        });

        it('should use default score alias vector_distance', () => {
            const query = new VectorQuery({
                vector: [0.1, 0.2, 0.3],
                vectorField: 'embedding',
                numResults: 5,
            });

            expect(query.scoreAlias).toBe('vector_distance');
            const queryString = query.buildQuery();
            expect(queryString).toContain('AS vector_distance');
        });

        it('should build query with custom score alias', () => {
            const query = new VectorQuery({
                vector: [0.1, 0.2, 0.3],
                vectorField: 'embedding',
                numResults: 5,
                scoreAlias: 'similarity',
            });

            expect(query.scoreAlias).toBe('similarity');
            const queryString = query.buildQuery();
            expect(queryString).toContain('AS similarity');
        });
    });

    describe('buildParams', () => {
        it('should convert vector to buffer', () => {
            const vector = [0.1, 0.2, 0.3];
            const query = new VectorQuery({
                vector,
                vectorField: 'embedding',
            });

            const params = query.buildParams();
            expect(params).toHaveProperty('vector');
            expect(params.vector).toBeInstanceOf(Buffer);
        });

        it('should create buffer from Float32Array', () => {
            const vector = [0.1, 0.2, 0.3];
            const query = new VectorQuery({
                vector,
                vectorField: 'embedding',
            });

            const params = query.buildParams();
            const buffer = params.vector as Buffer;
            const float32Array = new Float32Array(
                buffer.buffer,
                buffer.byteOffset,
                buffer.byteLength / 4
            );

            expect(float32Array.length).toBe(3);
            expect(float32Array[0]).toBeCloseTo(0.1);
            expect(float32Array[1]).toBeCloseTo(0.2);
            expect(float32Array[2]).toBeCloseTo(0.3);
        });
    });

    describe('pagination', () => {
        it('should support offset and limit', () => {
            const query = new VectorQuery({
                vector: [0.1, 0.2, 0.3],
                vectorField: 'embedding',
                numResults: 10,
                offset: 20,
                limit: 10,
            });

            expect(query.offset).toBe(20);
            expect(query.limit).toBe(10);
        });
    });

    describe('returnFields', () => {
        it('should specify which fields to return', () => {
            const query = new VectorQuery({
                vector: [0.1, 0.2, 0.3],
                vectorField: 'embedding',
                returnFields: ['title', 'price', 'score'],
            });

            expect(query.returnFields).toEqual(['title', 'price', 'score']);
        });

        it('should return undefined if not specified', () => {
            const query = new VectorQuery({
                vector: [0.1, 0.2, 0.3],
                vectorField: 'embedding',
            });

            expect(query.returnFields).toBeUndefined();
        });
    });
});
