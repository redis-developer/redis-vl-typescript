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

// Error exports
export { RedisVLError, RedisSearchError, SchemaValidationError } from './errors.js';
