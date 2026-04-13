import { describe, it, expect } from 'vitest';
import {
    normalizeCosineDistance,
    denormalizeCosineDistance,
    normalizeL2Distance,
    DISTANCE_NORMALIZERS,
} from '../../../src/utils/distance.js';

describe('Distance Normalization Utilities', () => {
    describe('normalizeCosineDistance', () => {
        it('should normalize COSINE distance 0 to similarity 1.0 (identical vectors)', () => {
            expect(normalizeCosineDistance(0)).toBe(1.0);
        });

        it('should normalize COSINE distance 1 to similarity 0.5 (orthogonal vectors)', () => {
            expect(normalizeCosineDistance(1)).toBe(0.5);
        });

        it('should normalize COSINE distance 2 to similarity 0.0 (opposite vectors)', () => {
            expect(normalizeCosineDistance(2)).toBe(0.0);
        });

        it('should normalize intermediate COSINE distances correctly', () => {
            expect(normalizeCosineDistance(0.5)).toBe(0.75);
            expect(normalizeCosineDistance(1.5)).toBe(0.25);
        });

        it('should handle edge case of negative distance (return 0)', () => {
            expect(normalizeCosineDistance(-1)).toBeGreaterThanOrEqual(0);
        });

        it('should return values between 0 and 1', () => {
            const testValues = [0, 0.5, 1, 1.5, 2];
            testValues.forEach((distance) => {
                const normalized = normalizeCosineDistance(distance);
                expect(normalized).toBeGreaterThanOrEqual(0);
                expect(normalized).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('denormalizeCosineDistance', () => {
        it('should denormalize similarity 1.0 to COSINE distance 0', () => {
            expect(denormalizeCosineDistance(1.0)).toBe(0);
        });

        it('should denormalize similarity 0.5 to COSINE distance 1', () => {
            expect(denormalizeCosineDistance(0.5)).toBe(1);
        });

        it('should denormalize similarity 0.0 to COSINE distance 2', () => {
            expect(denormalizeCosineDistance(0.0)).toBe(2);
        });

        it('should denormalize intermediate similarities correctly', () => {
            expect(denormalizeCosineDistance(0.75)).toBe(0.5);
            expect(denormalizeCosineDistance(0.25)).toBe(1.5);
        });

        it('should be the inverse of normalizeCosineDistance', () => {
            const testDistances = [0, 0.5, 1, 1.5, 2];
            testDistances.forEach((distance) => {
                const normalized = normalizeCosineDistance(distance);
                const denormalized = denormalizeCosineDistance(normalized);
                expect(denormalized).toBeCloseTo(distance, 10);
            });
        });
    });

    describe('normalizeL2Distance', () => {
        it('should normalize L2 distance 0 to similarity 1.0 (identical vectors)', () => {
            expect(normalizeL2Distance(0)).toBe(1.0);
        });

        it('should normalize L2 distance 1 to similarity 0.5', () => {
            expect(normalizeL2Distance(1)).toBe(0.5);
        });

        it('should normalize L2 distance 9 to similarity 0.1', () => {
            expect(normalizeL2Distance(9)).toBe(0.1);
        });

        it('should normalize L2 distance 99 to similarity 0.01', () => {
            expect(normalizeL2Distance(99)).toBe(0.01);
        });

        it('should handle large L2 distances (approaching 0 similarity)', () => {
            expect(normalizeL2Distance(999)).toBeCloseTo(0.001, 3);
            expect(normalizeL2Distance(9999)).toBeCloseTo(0.0001, 4);
        });

        it('should return values between 0 and 1', () => {
            const testValues = [0, 1, 10, 100, 1000];
            testValues.forEach((distance) => {
                const normalized = normalizeL2Distance(distance);
                expect(normalized).toBeGreaterThanOrEqual(0);
                expect(normalized).toBeLessThanOrEqual(1);
            });
        });

        it('should handle fractional L2 distances', () => {
            expect(normalizeL2Distance(0.5)).toBeCloseTo(0.6667, 4);
            expect(normalizeL2Distance(0.25)).toBe(0.8);
        });
    });

    describe('DISTANCE_NORMALIZERS', () => {
        it('should have normalization function for COSINE metric', () => {
            expect(DISTANCE_NORMALIZERS.COSINE).toBe(normalizeCosineDistance);
        });

        it('should have normalization function for L2 metric', () => {
            expect(DISTANCE_NORMALIZERS.L2).toBe(normalizeL2Distance);
        });

        it('should have null for IP metric (not normalized)', () => {
            expect(DISTANCE_NORMALIZERS.IP).toBeNull();
        });

        it('should correctly normalize using the map', () => {
            const cosineNormalizer = DISTANCE_NORMALIZERS.COSINE;
            expect(cosineNormalizer).not.toBeNull();
            if (cosineNormalizer) {
                expect(cosineNormalizer(1)).toBe(0.5);
            }

            const l2Normalizer = DISTANCE_NORMALIZERS.L2;
            expect(l2Normalizer).not.toBeNull();
            if (l2Normalizer) {
                expect(l2Normalizer(1)).toBe(0.5);
            }
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero distance for all metrics', () => {
            expect(normalizeCosineDistance(0)).toBe(1.0);
            expect(normalizeL2Distance(0)).toBe(1.0);
        });

        it('should handle very small distances', () => {
            expect(normalizeCosineDistance(0.0001)).toBeCloseTo(0.99995, 5);
            expect(normalizeL2Distance(0.0001)).toBeCloseTo(0.9999, 4);
        });

        it('should handle very large L2 distances gracefully', () => {
            expect(normalizeL2Distance(Number.MAX_SAFE_INTEGER)).toBeGreaterThan(0);
            expect(normalizeL2Distance(Number.MAX_SAFE_INTEGER)).toBeLessThan(1);
        });
    });
});
