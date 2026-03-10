import { describe, it, expect } from 'vitest';
import {
    RedisVLError,
    RedisSearchError,
    SchemaValidationError,
    QueryValidationError,
    RedisModuleVersionError,
    VectorizerError,
} from '../../src/errors.js';

describe('Error Classes', () => {
    describe('RedisVLError', () => {
        it('should create error with message', () => {
            const error = new RedisVLError('Test error');
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(RedisVLError);
            expect(error.message).toBe('Test error');
            expect(error.name).toBe('RedisVLError');
        });

        it('should support error chaining with cause', () => {
            const originalError = new Error('Original error');
            const error = new RedisVLError('Wrapped error', { cause: originalError });
            expect(error.message).toBe('Wrapped error');
            expect(error.cause).toBe(originalError);
        });

        it('should have stack trace', () => {
            const error = new RedisVLError('Test error');
            expect(error.stack).toBeDefined();
            expect(error.stack).toContain('RedisVLError');
        });
    });

    describe('RedisSearchError', () => {
        it('should create error with message', () => {
            const error = new RedisSearchError('Search failed');
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(RedisVLError);
            expect(error).toBeInstanceOf(RedisSearchError);
            expect(error.message).toBe('Search failed');
            expect(error.name).toBe('RedisSearchError');
        });

        it('should support error chaining', () => {
            const originalError = new Error('Connection refused');
            const error = new RedisSearchError('Failed to create index', { cause: originalError });
            expect(error.message).toBe('Failed to create index');
            expect(error.cause).toBe(originalError);
        });
    });

    describe('SchemaValidationError', () => {
        it('should create error with message only', () => {
            const error = new SchemaValidationError('Invalid field');
            expect(error).toBeInstanceOf(RedisVLError);
            expect(error).toBeInstanceOf(SchemaValidationError);
            expect(error.message).toBe('Invalid field');
            expect(error.name).toBe('SchemaValidationError');
            expect(error.index).toBeUndefined();
        });

        it('should create error with index', () => {
            const error = new SchemaValidationError('Invalid field', 5);
            expect(error.message).toBe('Validation failed for object at index 5: Invalid field');
            expect(error.index).toBe(5);
        });

        it('should not add index prefix if message already starts with "Schema validation failed"', () => {
            const error = new SchemaValidationError('Schema validation failed: details', 5);
            expect(error.message).toBe('Schema validation failed: details');
            expect(error.index).toBe(5);
        });

        it('should support error chaining with ErrorOptions', () => {
            const originalError = new Error('Type mismatch');
            const error = new SchemaValidationError('Invalid field', { cause: originalError });
            expect(error.message).toBe('Invalid field');
            expect(error.cause).toBe(originalError);
            expect(error.index).toBeUndefined();
        });
    });

    describe('QueryValidationError', () => {
        it('should create error with message', () => {
            const error = new QueryValidationError('Invalid query parameter');
            expect(error).toBeInstanceOf(RedisVLError);
            expect(error).toBeInstanceOf(QueryValidationError);
            expect(error.message).toBe('Invalid query parameter');
            expect(error.name).toBe('QueryValidationError');
        });

        it('should support error chaining', () => {
            const originalError = new Error('Missing field');
            const error = new QueryValidationError('Query validation failed', {
                cause: originalError,
            });
            expect(error.cause).toBe(originalError);
        });
    });

    describe('RedisModuleVersionError', () => {
        it('should create error with message', () => {
            const error = new RedisModuleVersionError('Version mismatch');
            expect(error).toBeInstanceOf(RedisVLError);
            expect(error).toBeInstanceOf(RedisModuleVersionError);
            expect(error.message).toBe('Version mismatch');
            expect(error.name).toBe('RedisModuleVersionError');
        });

        it('should support error chaining', () => {
            const originalError = new Error('Module not found');
            const error = new RedisModuleVersionError('Incompatible version', {
                cause: originalError,
            });
            expect(error.cause).toBe(originalError);
        });

        it('should create error using forFeature factory method', () => {
            const error = RedisModuleVersionError.forFeature(
                'SVS-VAMANA',
                '7.2.0',
                'Upgrade Redis Stack or use algorithm="hnsw"'
            );
            expect(error).toBeInstanceOf(RedisModuleVersionError);
            expect(error.message).toBe(
                'SVS-VAMANA requires Redis >= 7.2.0. Upgrade Redis Stack or use algorithm="hnsw"'
            );
        });
    });

    describe('VectorizerError', () => {
        it('should create error with message', () => {
            const error = new VectorizerError('Vectorizer initialization failed');
            expect(error).toBeInstanceOf(RedisVLError);
            expect(error).toBeInstanceOf(VectorizerError);
            expect(error.message).toBe('Vectorizer initialization failed');
            expect(error.name).toBe('VectorizerError');
        });

        it('should support error chaining', () => {
            const originalError = new Error('Module not installed');
            const error = new VectorizerError('Failed to load vectorizer', {
                cause: originalError,
            });
            expect(error.cause).toBe(originalError);
        });
    });
});
