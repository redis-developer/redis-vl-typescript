import { describe, it, expect } from 'vitest';
import { BaseQuery, BaseVectorQuery } from '../../../src/query/base.js';
import { VectorRangeQuery } from '../../../src/query/range.js';
import { Tag } from '../../../src/query/filter.js';
import { QueryValidationError } from '../../../src/errors.js';
import { VectorDataType } from '../../../src/schema/types.js';

describe('VectorRangeQuery', () => {
    const vec = [0.1, 0.2, 0.3];

    describe('constructor', () => {
        it('throws if vector is empty', () => {
            expect(() => new VectorRangeQuery({ vector: [], vectorField: 'embedding' })).toThrow(
                QueryValidationError
            );
        });

        it('throws if vectorField is missing', () => {
            expect(() => new VectorRangeQuery({ vector: vec } as any)).toThrow(
                QueryValidationError
            );
        });

        it('defaults distanceThreshold to 0.2', () => {
            const q = new VectorRangeQuery({ vector: vec, vectorField: 'embedding' });
            expect(q).toBeInstanceOf(BaseVectorQuery);
            expect(q).toBeInstanceOf(BaseQuery);
            expect(q.distanceThreshold).toBe(0.2);
        });

        it('rejects negative distanceThreshold', () => {
            expect(
                () =>
                    new VectorRangeQuery({
                        vector: vec,
                        vectorField: 'embedding',
                        distanceThreshold: -0.1,
                    })
            ).toThrow(QueryValidationError);
        });
    });

    describe('buildQuery', () => {
        it('renders a basic range query', () => {
            const q = new VectorRangeQuery({
                vector: vec,
                vectorField: 'embedding',
                distanceThreshold: 0.5,
            });
            expect(q.buildQuery()).toBe(
                '@embedding:[VECTOR_RANGE $distance_threshold $vector]=>{$yield_distance_as: vector_distance}'
            );
        });

        it('combines a filter expression with a vector range clause', () => {
            const q = new VectorRangeQuery({
                vector: vec,
                vectorField: 'embedding',
                filter: Tag('brand').eq('nike'),
            });
            expect(q.buildQuery()).toBe(
                '(@brand:{nike} @embedding:[VECTOR_RANGE $distance_threshold $vector]=>{$yield_distance_as: vector_distance})'
            );
        });

        it('uses a custom score alias', () => {
            const q = new VectorRangeQuery({
                vector: vec,
                vectorField: 'embedding',
                scoreAlias: 'similarity',
            });
            expect(q.buildQuery()).toContain('$yield_distance_as: similarity');
        });
    });

    describe('buildParams', () => {
        it('encodes the vector and emits distance_threshold', () => {
            const q = new VectorRangeQuery({
                vector: vec,
                vectorField: 'embedding',
                distanceThreshold: 0.4,
            });
            const params = q.buildParams();
            expect(params.vector).toBeInstanceOf(Buffer);
            expect(params.distance_threshold).toBe(0.4);
        });

        it('honours datatype option', () => {
            const q = new VectorRangeQuery({
                vector: vec,
                vectorField: 'embedding',
                datatype: VectorDataType.FLOAT64,
            });
            const buffer = q.buildParams().vector as Buffer;
            // FLOAT64 -> 8 bytes per element, 3 elements.
            expect(buffer.byteLength).toBe(24);
        });

        it('omits hybrid params when not supplied', () => {
            const q = new VectorRangeQuery({ vector: vec, vectorField: 'embedding' });
            const params = q.buildParams();
            expect(params).not.toHaveProperty('batch_size');
        });
    });
});
