/**
 * Redis Search Schema Field Type Definitions
 *
 * These types are extracted from the RediSearchSchema interface exported by @redis/search.
 * While @redis/search doesn't export the individual field type interfaces (SchemaTextField, etc.),
 * we can extract them using TypeScript utility types from the RediSearchSchema union.
 *
 * Source: @redis/search/dist/lib/commands/CREATE.d.ts
 *
 * This approach is more maintainable than duplicating the type definitions because:
 * 1. Types automatically stay in sync with @redis/search updates
 * 2. No risk of type definition drift
 * 3. Leverages TypeScript's type system for extraction
 *
 * @see https://github.com/redis/node-redis/tree/master/packages/search
 */

import type { RediSearchSchema } from '@redis/search';

/**
 * Extract the union of all schema field types from RediSearchSchema
 */
type ExtractSchemaTypes = RediSearchSchema[string];

/**
 * Text field schema - extracted from RediSearchSchema
 */
export type SchemaTextField = Extract<ExtractSchemaTypes, { type: 'TEXT' }>;

/**
 * Extract the PHONETIC type from SchemaTextField
 */
export type SchemaTextFieldPhonetic = NonNullable<SchemaTextField['PHONETIC']>;

/**
 * Numeric field schema - extracted from RediSearchSchema
 */
export type SchemaNumericField = Extract<ExtractSchemaTypes, { type: 'NUMERIC' }>;

/**
 * Geo field schema - extracted from RediSearchSchema
 */
export type SchemaGeoField = Extract<ExtractSchemaTypes, { type: 'GEO' }>;

/**
 * Tag field schema - extracted from RediSearchSchema
 */
export type SchemaTagField = Extract<ExtractSchemaTypes, { type: 'TAG' }>;

/**
 * Vector field schema (base) - extracted from RediSearchSchema
 */
type SchemaVectorField = Extract<ExtractSchemaTypes, { type: 'VECTOR' }>;

/**
 * FLAT vector field schema - extracted from RediSearchSchema
 */
export type SchemaFlatVectorField = Extract<SchemaVectorField, { ALGORITHM: 'FLAT' }>;

/**
 * HNSW vector field schema - extracted from RediSearchSchema
 */
export type SchemaHNSWVectorField = Extract<SchemaVectorField, { ALGORITHM: 'HNSW' }>;

/**
 * Extract the TYPE union from SchemaVectorField
 */
export type SchemaVectorFieldType = SchemaVectorField['TYPE'];

/**
 * Extract the DISTANCE_METRIC union from SchemaVectorField
 */
export type SchemaVectorFieldDistanceMetric = SchemaVectorField['DISTANCE_METRIC'];

/**
 * Union type of all Redis schema field types we support
 */
export type RedisSchemaFieldType =
    | SchemaTextField
    | SchemaNumericField
    | SchemaGeoField
    | SchemaTagField
    | SchemaFlatVectorField
    | SchemaHNSWVectorField;
