/**
 * Redis Vector Library for TypeScript/Node.js
 *
 * The AI-native Redis client for vector operations
 */

// Version
export const version = '0.1.0';

// Schema exports
export { IndexSchema, IndexInfo } from './schema/schema.js';
export {
    BaseField,
    TextField,
    TagField,
    NumericField,
    GeoField,
    VectorField, // Generic VectorField (supports FLAT and HNSW)
    FlatVectorField, // Algorithm-specific (FLAT only)
    HNSWVectorField, // Algorithm-specific (HNSW only)
    FieldFactory,
} from './schema/fields.js';
export * from './schema/types.js';

// Index exports
export { SearchIndex } from './indexes/search-index.js';
export type { CreateIndexOptions, DeleteIndexOptions } from './indexes/search-index.js';

// Query exports
export { VectorQuery } from './query/search/vector.js';
export type { VectorQueryConfig, HybridPolicy, UseSearchHistory } from './query/search/vector.js';
export { VectorRangeQuery } from './query/search/range.js';
export type { VectorRangeQueryConfig } from './query/search/range.js';
export { FilterQuery } from './query/search/filter-query.js';
export type { FilterQueryConfig } from './query/search/filter-query.js';
export { CountQuery } from './query/search/count.js';
export type { CountQueryConfig } from './query/search/count.js';
export { TextQuery } from './query/search/text.js';
export type { TextQueryConfig, TextScorer } from './query/search/text.js';
export { HybridQuery } from './query/hybrid.js';
export type {
    HybridQueryConfig,
    HybridVectorMethod,
    HybridCombine,
    HybridCommand,
} from './query/hybrid.js';
export { AggregationQuery, Reducers } from './query/aggregate/aggregation.js';
export type {
    AggregateCommand,
    SortSpec,
    LoadField,
    Reducer,
} from './query/aggregate/aggregation.js';
export { Tag, Num, Text, Geo, GeoRadius, Timestamp, FilterExpression } from './query/filter.js';
export type { Inclusive, GeoUnit } from './query/filter.js';
export { BaseQuery, BaseVectorQuery } from './query/search/base.js';
export type {
    BaseQueryConfig,
    BaseVectorQueryConfig,
    SearchResult,
    SearchDocument,
    QueryOptions,
    FilterInput,
    HybridSearchResult,
    SortByOptions,
    SortDirection,
    SortField,
} from './query/search/base.js';

// Error exports
export {
    RedisVLError,
    RedisSearchError,
    SchemaValidationError,
    QueryValidationError,
    RedisModuleVersionError,
    VectorizerError,
} from './errors.js';

// Vectorizer exports
export {
    BaseVectorizer,
    HuggingFaceVectorizer,
    type HuggingFaceConfig,
} from './vectorizers/index.js';

// Utility exports
export {
    normalizeCosineDistance,
    denormalizeCosineDistance,
    normalizeL2Distance,
    DISTANCE_NORMALIZERS,
    type DistanceNormalizer,
} from './utils/distance.js';

// Stopwords exports (also available as the `redis-vl/stopwords` subpath)
export { stopwords } from './utils/stopwords/index.js';
export type { StopwordsInput } from './utils/stopwords/index.js';
