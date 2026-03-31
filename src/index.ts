/**
 * Redis Vector Library for TypeScript/Node.js
 *
 * The AI-native Redis client for vector operations
 */

// Version
export const version = '0.0.1';

// Schema exports
export { IndexSchema, IndexInfo } from './schema/schema.js';
export {
    BaseField,
    TextField,
    TagField,
    NumericField,
    GeoField,
    FlatVectorField,
    HNSWVectorField,
    FieldFactory,
} from './schema/fields.js';
export * from './schema/types.js';

// Index exports
export { SearchIndex } from './indexes/search-index.js';
export type { CreateIndexOptions, DeleteIndexOptions } from './indexes/search-index.js';

// Query exports
export { VectorQuery } from './query/vector.js';
export type { BaseQuery, SearchResult, SearchDocument, QueryOptions } from './query/base.js';

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
