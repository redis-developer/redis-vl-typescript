/**
 * Utility functions for normalizing vector distance metrics.
 *
 * Redis supports three distance metrics:
 * - COSINE: Returns values between 0 and 2
 * - L2 (Euclidean): Returns unbounded values (0 to infinity)
 * - IP (Inner Product): Returns values determined by vector magnitude
 *
 * These functions normalize distances to similarity scores between 0 and 1:
 * - 1.0 = perfect match (most similar)
 * - 0.0 = completely different (least similar)
 */

/**
 * Normalize a COSINE distance to a similarity score between 0 and 1.
 *
 * COSINE distance in Redis ranges from 0 (identical vectors) to 2 (opposite vectors).
 * This function converts it to a similarity score where:
 * - distance 0 → similarity 1.0 (identical)
 * - distance 1 → similarity 0.5 (orthogonal)
 * - distance 2 → similarity 0.0 (opposite)
 *
 * Formula: similarity = (2 - distance) / 2
 *
 * @param distance - COSINE distance value from Redis (0 to 2)
 * @returns Normalized similarity score (0 to 1)
 *
 * @example
 * ```typescript
 * normalizeCosineDistance(0)   // 1.0 (identical)
 * normalizeCosineDistance(1)   // 0.5 (orthogonal)
 * normalizeCosineDistance(2)   // 0.0 (opposite)
 * ```
 */
export function normalizeCosineDistance(distance: number): number {
    return Math.max((2 - distance) / 2, 0);
}

/**
 * Denormalize a similarity score to a COSINE distance.
 *
 * This is the inverse of normalizeCosineDistance.
 * Converts a similarity score (0 to 1) back to COSINE distance (0 to 2).
 *
 * Formula: distance = 2 - 2 * similarity
 *
 * @param similarity - Normalized similarity score (0 to 1)
 * @returns COSINE distance value (0 to 2)
 *
 * @example
 * ```typescript
 * denormalizeCosineDistance(1.0)  // 0 (identical)
 * denormalizeCosineDistance(0.5)  // 1 (orthogonal)
 * denormalizeCosineDistance(0.0)  // 2 (opposite)
 * ```
 */
export function denormalizeCosineDistance(similarity: number): number {
    return Math.max(2 - 2 * similarity, 0);
}

/**
 * Normalize an L2 (Euclidean) distance to a similarity score between 0 and 1.
 *
 * L2 distance in Redis is unbounded (0 to infinity).
 * This function converts it to a similarity score using the formula:
 * similarity = 1 / (1 + distance)
 *
 * - distance 0 → similarity 1.0 (identical)
 * - distance 1 → similarity 0.5
 * - distance ∞ → similarity 0.0 (very different)
 *
 * @param distance - L2 distance value from Redis (0 to infinity)
 * @returns Normalized similarity score (0 to 1)
 *
 * @example
 * ```typescript
 * normalizeL2Distance(0)    // 1.0 (identical)
 * normalizeL2Distance(1)    // 0.5
 * normalizeL2Distance(9)    // 0.1
 * normalizeL2Distance(99)   // 0.01
 * ```
 */
export function normalizeL2Distance(distance: number): number {
    return 1 / (1 + distance);
}

/**
 * Type definition for distance normalization functions.
 */
export type DistanceNormalizer = (distance: number) => number;

/**
 * Map of distance metrics to their normalization functions.
 *
 * - COSINE: Normalizes from [0, 2] to [0, 1]
 * - L2: Normalizes from [0, ∞] to [0, 1]
 * - IP: null (Inner Product is not normalized; use COSINE instead)
 *
 * Note: COSINE is normalized Inner Product by definition, so IP
 * should not be normalized separately.
 */
export const DISTANCE_NORMALIZERS: Record<string, DistanceNormalizer | null> = {
    COSINE: normalizeCosineDistance,
    L2: normalizeL2Distance,
    IP: null, // Normalized inner product is COSINE by definition
};
