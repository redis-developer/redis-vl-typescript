/**
 * Field types supported by RedisVL
 */
export enum FieldType {
    TAG = 'tag',
    TEXT = 'text',
    NUMERIC = 'numeric',
    GEO = 'geo',
    VECTOR = 'vector',
}

/**
 * Storage types for documents in Redis
 */
export enum StorageType {
    HASH = 'hash',
    JSON = 'json',
}

/**
 * Vector distance metrics
 */
export enum VectorDistanceMetric {
    COSINE = 'COSINE',
    L2 = 'L2',
    IP = 'IP',
}

/**
 * Vector data types
 */
export enum VectorDataType {
    BFLOAT16 = 'BFLOAT16',
    FLOAT16 = 'FLOAT16',
    FLOAT32 = 'FLOAT32',
    FLOAT64 = 'FLOAT64',
    INT8 = 'INT8',
    UINT8 = 'UINT8',
}

/**
 * Vector index algorithms
 */
export enum VectorIndexAlgorithm {
    FLAT = 'FLAT',
    HNSW = 'HNSW',
    SVS_VAMANA = 'SVS-VAMANA',
}

/**
 * Vector compression types for SVS-VAMANA algorithm
 */
export enum CompressionType {
    LVQ4 = 'LVQ4',
    LVQ4x4 = 'LVQ4x4',
    LVQ4x8 = 'LVQ4x8',
    LVQ8 = 'LVQ8',
    LeanVec4x8 = 'LeanVec4x8',
    LeanVec8x8 = 'LeanVec8x8',
}
