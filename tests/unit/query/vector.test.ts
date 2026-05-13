import { describe, it, expect, vi } from 'vitest';
import { VectorQuery } from '../../../src/query/vector.js';
import { QueryValidationError } from '../../../src/errors.js';
import { VectorDataType, VectorDistanceMetric } from '../../../src/schema/types.js';

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

        it('should throw QueryValidationError if datatype is invalid', () => {
            expect(() => {
                new VectorQuery({
                    vector: [0.1, 0.2, 0.3],
                    vectorField: 'embedding',
                    datatype: 'float25',
                });
            }).toThrow(QueryValidationError);
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

        it('should create buffer from configured datatype', () => {
            const query = new VectorQuery({
                vector: [0.1, 0.2, 0.3],
                vectorField: 'embedding',
                datatype: VectorDataType.FLOAT64,
            });

            const params = query.buildParams();
            const buffer = params.vector as Buffer;

            expect(buffer.byteLength).toBe(24);
            expect(buffer.readDoubleLE(0)).toBeCloseTo(0.1, 12);
            expect(buffer.readDoubleLE(8)).toBeCloseTo(0.2, 12);
            expect(buffer.readDoubleLE(16)).toBeCloseTo(0.3, 12);
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

    describe('Distance Normalization', () => {
        describe('normalizeDistance parameter', () => {
            it('should default normalizeDistance to false', () => {
                const query = new VectorQuery({
                    vector: [0.1, 0.2, 0.3],
                    vectorField: 'embedding',
                });

                expect(query.normalizeDistance).toBe(false);
            });

            it('should accept normalizeDistance as true', () => {
                const query = new VectorQuery({
                    vector: [0.1, 0.2, 0.3],
                    vectorField: 'embedding',
                    normalizeDistance: true,
                });

                expect(query.normalizeDistance).toBe(true);
            });

            it('should accept normalizeDistance as false explicitly', () => {
                const query = new VectorQuery({
                    vector: [0.1, 0.2, 0.3],
                    vectorField: 'embedding',
                    normalizeDistance: false,
                });

                expect(query.normalizeDistance).toBe(false);
            });

            it('should warn when normalizeDistance is true with IP metric', () => {
                const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

                new VectorQuery({
                    vector: [0.1, 0.2, 0.3],
                    vectorField: 'embedding',
                    distanceMetric: VectorDistanceMetric.IP,
                    normalizeDistance: true,
                });

                expect(warnSpy).toHaveBeenCalledWith(
                    expect.stringContaining('Attempting to normalize inner product')
                );

                warnSpy.mockRestore();
            });

            it('should not warn when normalizeDistance is true with COSINE metric', () => {
                const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

                new VectorQuery({
                    vector: [0.1, 0.2, 0.3],
                    vectorField: 'embedding',
                    distanceMetric: VectorDistanceMetric.COSINE,
                    normalizeDistance: true,
                });

                expect(warnSpy).not.toHaveBeenCalled();

                warnSpy.mockRestore();
            });

            it('should not warn when normalizeDistance is true with L2 metric', () => {
                const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

                new VectorQuery({
                    vector: [0.1, 0.2, 0.3],
                    vectorField: 'embedding',
                    distanceMetric: VectorDistanceMetric.L2,
                    normalizeDistance: true,
                });

                expect(warnSpy).not.toHaveBeenCalled();

                warnSpy.mockRestore();
            });

            it('should not affect query string (distance normalization happens on results)', () => {
                const queryWithNorm = new VectorQuery({
                    vector: [0.1, 0.2, 0.3],
                    vectorField: 'embedding',
                    normalizeDistance: true,
                });

                const queryWithoutNorm = new VectorQuery({
                    vector: [0.1, 0.2, 0.3],
                    vectorField: 'embedding',
                    normalizeDistance: false,
                });

                // Query strings should be identical (normalization happens on results, not query)
                expect(queryWithNorm.buildQuery()).toBe(queryWithoutNorm.buildQuery());
            });
        });
    });

    describe('Algorithm-Specific Tuning Parameters', () => {
        const mockVector = [0.1, 0.2, 0.3];

        describe('HNSW Parameters', () => {
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
        });

        describe('Hybrid Policy Parameters', () => {
            describe('hybridPolicy parameter', () => {
                it('should include HYBRID_POLICY in query when hybridPolicy is provided', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        hybridPolicy: 'BATCHES',
                    });

                    const queryString = query.buildQuery();
                    expect(queryString).toContain('HYBRID_POLICY BATCHES');
                });

                it('should not include HYBRID_POLICY when hybridPolicy is not provided', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                    });

                    const queryString = query.buildQuery();
                    expect(queryString).not.toContain('HYBRID_POLICY');
                });

                it('should accept BATCHES policy', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        hybridPolicy: 'BATCHES',
                    });

                    const queryString = query.buildQuery();
                    expect(queryString).toContain('HYBRID_POLICY BATCHES');
                });

                it('should accept ADHOC_BF policy', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        hybridPolicy: 'ADHOC_BF',
                    });

                    const queryString = query.buildQuery();
                    expect(queryString).toContain('HYBRID_POLICY ADHOC_BF');
                });

                it('should throw error for invalid hybridPolicy', () => {
                    expect(() => {
                        new VectorQuery({
                            vector: mockVector,
                            vectorField: 'embedding',
                            hybridPolicy: 'INVALID' as any,
                        });
                    }).toThrow('hybridPolicy must be either BATCHES or ADHOC_BF');
                });
            });

            describe('batchSize parameter', () => {
                it('should include BATCH_SIZE when batchSize is provided with BATCHES policy', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        hybridPolicy: 'BATCHES',
                        batchSize: 100,
                    });

                    const queryString = query.buildQuery();
                    expect(queryString).toContain('BATCH_SIZE 100');
                });

                it('should not include BATCH_SIZE when batchSize is not provided', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        hybridPolicy: 'BATCHES',
                    });

                    const queryString = query.buildQuery();
                    expect(queryString).not.toContain('BATCH_SIZE');
                });

                it('should not include BATCH_SIZE when hybridPolicy is ADHOC_BF', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        hybridPolicy: 'ADHOC_BF',
                        batchSize: 100,
                    });

                    const queryString = query.buildQuery();
                    expect(queryString).not.toContain('BATCH_SIZE');
                });

                it('should throw error if batchSize is provided without hybridPolicy', () => {
                    expect(() => {
                        new VectorQuery({
                            vector: mockVector,
                            vectorField: 'embedding',
                            batchSize: 100,
                        });
                    }).toThrow('batchSize can only be used with hybridPolicy');
                });

                it('should throw error if batchSize is not positive', () => {
                    expect(() => {
                        new VectorQuery({
                            vector: mockVector,
                            vectorField: 'embedding',
                            hybridPolicy: 'BATCHES',
                            batchSize: 0,
                        });
                    }).toThrow('batchSize must be positive');

                    expect(() => {
                        new VectorQuery({
                            vector: mockVector,
                            vectorField: 'embedding',
                            hybridPolicy: 'BATCHES',
                            batchSize: -10,
                        });
                    }).toThrow('batchSize must be positive');
                });

                it('should accept different batchSize values', () => {
                    const query1 = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        hybridPolicy: 'BATCHES',
                        batchSize: 50,
                    });

                    const query2 = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        hybridPolicy: 'BATCHES',
                        batchSize: 500,
                    });

                    expect(query1.buildQuery()).toContain('BATCH_SIZE 50');
                    expect(query2.buildQuery()).toContain('BATCH_SIZE 500');
                });
            });

            describe('combined hybrid policy parameters', () => {
                it('should support both hybridPolicy and batchSize together', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        hybridPolicy: 'BATCHES',
                        batchSize: 200,
                    });

                    const queryString = query.buildQuery();
                    expect(queryString).toContain('HYBRID_POLICY BATCHES');
                    expect(queryString).toContain('BATCH_SIZE 200');
                });
            });
        });

        describe('SVS-VAMANA Parameters', () => {
            describe('searchWindowSize parameter', () => {
                it('should accept searchWindowSize parameter', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        searchWindowSize: 100,
                    });

                    expect(query.buildParams().search_window_size).toBe(100);
                });

                it('should include SEARCH_WINDOW_SIZE in query string', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        searchWindowSize: 100,
                    });

                    const queryString = query.buildQuery();
                    expect(queryString).toContain('SEARCH_WINDOW_SIZE');
                });

                it('should include searchWindowSize in params', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        searchWindowSize: 150,
                    });

                    const params = query.buildParams();
                    expect(params.search_window_size).toBe(150);
                });

                it('should throw error for non-positive searchWindowSize', () => {
                    expect(() => {
                        new VectorQuery({
                            vector: mockVector,
                            vectorField: 'embedding',
                            searchWindowSize: 0,
                        });
                    }).toThrow('searchWindowSize must be positive');

                    expect(() => {
                        new VectorQuery({
                            vector: mockVector,
                            vectorField: 'embedding',
                            searchWindowSize: -10,
                        });
                    }).toThrow('searchWindowSize must be positive');
                });

                it('should not include SEARCH_WINDOW_SIZE when undefined', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                    });

                    const queryString = query.buildQuery();
                    expect(queryString).not.toContain('SEARCH_WINDOW_SIZE');
                });
            });

            describe('useSearchHistory parameter', () => {
                it('should accept useSearchHistory as OFF', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        useSearchHistory: 'OFF',
                    });

                    expect(query.buildQuery()).toContain('USE_SEARCH_HISTORY OFF');
                });

                it('should accept useSearchHistory as ON', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        useSearchHistory: 'ON',
                    });

                    expect(query.buildQuery()).toContain('USE_SEARCH_HISTORY ON');
                });

                it('should accept useSearchHistory as AUTO', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        useSearchHistory: 'AUTO',
                    });

                    expect(query.buildQuery()).toContain('USE_SEARCH_HISTORY AUTO');
                });

                it('should include USE_SEARCH_HISTORY in query string', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        useSearchHistory: 'ON',
                    });

                    const queryString = query.buildQuery();
                    expect(queryString).toContain('USE_SEARCH_HISTORY');
                });

                it('should throw error for invalid useSearchHistory value', () => {
                    expect(() => {
                        new VectorQuery({
                            vector: mockVector,
                            vectorField: 'embedding',
                            useSearchHistory: 'INVALID' as any,
                        });
                    }).toThrow('useSearchHistory must be one of: OFF, ON, AUTO');
                });

                it('should not include USE_SEARCH_HISTORY when undefined', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                    });

                    const queryString = query.buildQuery();
                    expect(queryString).not.toContain('USE_SEARCH_HISTORY');
                });
            });

            describe('searchBufferCapacity parameter', () => {
                it('should accept searchBufferCapacity parameter', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        searchBufferCapacity: 1000,
                    });

                    expect(query.buildParams().search_buffer_capacity).toBe(1000);
                });

                it('should include SEARCH_BUFFER_CAPACITY in query string', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        searchBufferCapacity: 1000,
                    });

                    const queryString = query.buildQuery();
                    expect(queryString).toContain('SEARCH_BUFFER_CAPACITY');
                });

                it('should include searchBufferCapacity in params', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        searchBufferCapacity: 2000,
                    });

                    const params = query.buildParams();
                    expect(params.search_buffer_capacity).toBe(2000);
                });

                it('should throw error for non-positive searchBufferCapacity', () => {
                    expect(() => {
                        new VectorQuery({
                            vector: mockVector,
                            vectorField: 'embedding',
                            searchBufferCapacity: 0,
                        });
                    }).toThrow('searchBufferCapacity must be positive');

                    expect(() => {
                        new VectorQuery({
                            vector: mockVector,
                            vectorField: 'embedding',
                            searchBufferCapacity: -100,
                        });
                    }).toThrow('searchBufferCapacity must be positive');
                });

                it('should not include SEARCH_BUFFER_CAPACITY when undefined', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                    });

                    const queryString = query.buildQuery();
                    expect(queryString).not.toContain('SEARCH_BUFFER_CAPACITY');
                });
            });

            describe('combined SVS-VAMANA parameters', () => {
                it('should handle all SVS-VAMANA parameters together', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        searchWindowSize: 100,
                        useSearchHistory: 'AUTO',
                        searchBufferCapacity: 1000,
                    });

                    const params = query.buildParams();
                    expect(params.search_window_size).toBe(100);
                    expect(params.search_buffer_capacity).toBe(1000);
                });

                it('should include all SVS-VAMANA parameters in query string', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        searchWindowSize: 100,
                        useSearchHistory: 'ON',
                        searchBufferCapacity: 1000,
                    });

                    const queryString = query.buildQuery();
                    expect(queryString).toContain('SEARCH_WINDOW_SIZE');
                    expect(queryString).toContain('USE_SEARCH_HISTORY ON');
                    expect(queryString).toContain('SEARCH_BUFFER_CAPACITY');
                });

                it('should include all SVS-VAMANA parameters in params', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        searchWindowSize: 150,
                        useSearchHistory: 'AUTO',
                        searchBufferCapacity: 2000,
                    });

                    const params = query.buildParams();
                    expect(params.search_window_size).toBe(150);
                    expect(params.search_buffer_capacity).toBe(2000);
                });

                it('should combine SVS-VAMANA with HNSW parameters', () => {
                    const query = new VectorQuery({
                        vector: mockVector,
                        vectorField: 'embedding',
                        efRuntime: 100,
                        searchWindowSize: 200,
                        useSearchHistory: 'ON',
                    });

                    const queryString = query.buildQuery();
                    const params = query.buildParams();

                    expect(queryString).toContain('EF_RUNTIME');
                    expect(queryString).toContain('SEARCH_WINDOW_SIZE');
                    expect(queryString).toContain('USE_SEARCH_HISTORY ON');
                    expect(params.ef_runtime).toBe(100);
                    expect(params.search_window_size).toBe(200);
                });
            });
        });
    });

    describe('buildQuery — exact clause ordering', () => {
        const mockVector = [0.1, 0.2, 0.3];

        it('places AS as the last clause when efRuntime is set', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                numResults: 5,
                efRuntime: 100,
            });

            expect(query.buildQuery()).toBe(
                '*=>[KNN 5 @embedding $vector EF_RUNTIME $ef_runtime AS vector_distance]'
            );
        });

        it('places AS as the last clause when hybridPolicy is set', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                numResults: 5,
                hybridPolicy: 'ADHOC_BF',
            });

            expect(query.buildQuery()).toBe(
                '*=>[KNN 5 @embedding $vector HYBRID_POLICY ADHOC_BF AS vector_distance]'
            );
        });

        it('places AS as the last clause when hybridPolicy + batchSize are set', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                numResults: 5,
                hybridPolicy: 'BATCHES',
                batchSize: 100,
            });

            expect(query.buildQuery()).toBe(
                '*=>[KNN 5 @embedding $vector HYBRID_POLICY BATCHES BATCH_SIZE 100 AS vector_distance]'
            );
        });

        it('places AS as the last clause when searchWindowSize is set', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                numResults: 5,
                searchWindowSize: 100,
            });

            expect(query.buildQuery()).toBe(
                '*=>[KNN 5 @embedding $vector SEARCH_WINDOW_SIZE $search_window_size AS vector_distance]'
            );
        });

        it('places AS as the last clause when useSearchHistory is set', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                numResults: 5,
                useSearchHistory: 'ON',
            });

            expect(query.buildQuery()).toBe(
                '*=>[KNN 5 @embedding $vector USE_SEARCH_HISTORY ON AS vector_distance]'
            );
        });

        it('places AS as the last clause when searchBufferCapacity is set', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                numResults: 5,
                searchBufferCapacity: 1000,
            });

            expect(query.buildQuery()).toBe(
                '*=>[KNN 5 @embedding $vector SEARCH_BUFFER_CAPACITY $search_buffer_capacity AS vector_distance]'
            );
        });

        it('orders all attributes correctly when set together (HYBRID_POLICY, BATCH_SIZE, EF_RUNTIME, SVS-VAMANA, AS)', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                numResults: 5,
                hybridPolicy: 'BATCHES',
                batchSize: 100,
                efRuntime: 100,
                searchWindowSize: 200,
                useSearchHistory: 'ON',
                searchBufferCapacity: 1000,
            });

            expect(query.buildQuery()).toBe(
                '*=>[KNN 5 @embedding $vector HYBRID_POLICY BATCHES BATCH_SIZE 100 EF_RUNTIME $ef_runtime SEARCH_WINDOW_SIZE $search_window_size USE_SEARCH_HISTORY ON SEARCH_BUFFER_CAPACITY $search_buffer_capacity AS vector_distance]'
            );
        });

        it('preserves filter wrapping with attributes', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                numResults: 5,
                filter: '@category:{electronics}',
                efRuntime: 100,
            });

            expect(query.buildQuery()).toBe(
                '(@category:{electronics})=>[KNN 5 @embedding $vector EF_RUNTIME $ef_runtime AS vector_distance]'
            );
        });

        it('honours custom scoreAlias as the last token before ]', () => {
            const query = new VectorQuery({
                vector: mockVector,
                vectorField: 'embedding',
                numResults: 5,
                scoreAlias: 'similarity',
                efRuntime: 100,
            });

            expect(query.buildQuery()).toBe(
                '*=>[KNN 5 @embedding $vector EF_RUNTIME $ef_runtime AS similarity]'
            );
        });
    });
});
