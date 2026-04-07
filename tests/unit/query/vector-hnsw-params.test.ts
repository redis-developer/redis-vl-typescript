import { describe, it, expect } from 'vitest';
import { VectorQuery } from '../../../src/query/vector.js';

describe('VectorQuery - HNSW Parameters', () => {
    const mockVector = [0.1, 0.2, 0.3];

    describe('efRuntime parameter', () => {
        it('should include EF_RUNTIME in query when efRuntime is provided', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                efRuntime: 100,
            });

            const queryString = query.buildQuery();
            expect(queryString).toContain('EF_RUNTIME');
        });

        it('should not include EF_RUNTIME when efRuntime is not provided', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
            });

            const queryString = query.buildQuery();
            expect(queryString).not.toContain('EF_RUNTIME');
        });

        it('should include efRuntime value in params', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                efRuntime: 150,
            });

            const params = query.buildParams();
            expect(params).toHaveProperty('ef_runtime', 150);
        });

        it('should accept different efRuntime values', () => {
            const query1 = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                efRuntime: 50,
            });

            const query2 = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                efRuntime: 500,
            });

            expect(query1.buildParams().ef_runtime).toBe(50);
            expect(query2.buildParams().ef_runtime).toBe(500);
        });

        it('should throw error if efRuntime is not positive', () => {
            expect(() => {
                new VectorQuery({
                    vector: mockVector,
                    vectorField: 'embedding',
                    efRuntime: 0,
                });
            }).toThrow('efRuntime must be positive');

            expect(() => {
                new VectorQuery({
                    vector: mockVector,
                    vectorField: 'embedding',
                    efRuntime: -10,
                });
            }).toThrow('efRuntime must be positive');
        });
    });

    describe('epsilon parameter', () => {
        it('should include EPSILON in query when epsilon is provided', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                epsilon: 0.01,
            });

            const queryString = query.buildQuery();
            expect(queryString).toContain('EPSILON');
        });

        it('should not include EPSILON when epsilon is not provided', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
            });

            const queryString = query.buildQuery();
            expect(queryString).not.toContain('EPSILON');
        });

        it('should include epsilon value in params', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                epsilon: 0.05,
            });

            const params = query.buildParams();
            expect(params).toHaveProperty('epsilon', 0.05);
        });

        it('should accept different epsilon values', () => {
            const query1 = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                epsilon: 0.001,
            });

            const query2 = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                epsilon: 0.1,
            });

            expect(query1.buildParams().epsilon).toBe(0.001);
            expect(query2.buildParams().epsilon).toBe(0.1);
        });

        it('should throw error if epsilon is negative', () => {
            expect(() => {
                new VectorQuery({
                    vector: mockVector,
                    vectorField: 'embedding',
                    epsilon: -0.01,
                });
            }).toThrow('epsilon must be non-negative');
        });

        it('should allow epsilon to be zero', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                epsilon: 0,
            });

            expect(query.buildParams().epsilon).toBe(0);
        });
    });

    describe('combined HNSW parameters', () => {
        it('should support both efRuntime and epsilon together', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                efRuntime: 100,
                epsilon: 0.01,
            });

            const queryString = query.buildQuery();
            const params = query.buildParams();

            expect(queryString).toContain('EF_RUNTIME');
            expect(queryString).toContain('EPSILON');
            expect(params.ef_runtime).toBe(100);
            expect(params.epsilon).toBe(0.01);
        });
    });
});
