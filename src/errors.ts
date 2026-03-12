/**
 * @module Errors
 * Custom exception classes for RedisVL error handling.
 */

/**
 * Base exception for all RedisVL errors.
 */
export class RedisVLError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'RedisVLError';
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * Error raised for Redis Search specific operations.
 */
export class RedisSearchError extends RedisVLError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'RedisSearchError';
    }
}

/**
 * Error when validating data against a schema.
 */
export class SchemaValidationError extends RedisVLError {
    public readonly index?: number;

    constructor(message: string, indexOrOptions?: number | ErrorOptions) {
        let index: number | undefined;
        let options: ErrorOptions | undefined;

        if (typeof indexOrOptions === 'number') {
            index = indexOrOptions;
        } else {
            options = indexOrOptions;
        }

        // Only add index prefix if the message doesn't already contain detailed validation info
        if (index !== undefined && !message.startsWith('Schema validation failed')) {
            message = `Validation failed for object at index ${index}: ${message}`;
        }

        super(message, options);
        this.name = 'SchemaValidationError';
        this.index = index;
    }
}

/**
 * Error when validating a query.
 */
export class QueryValidationError extends RedisVLError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'QueryValidationError';
    }
}

/**
 * Error when Redis or module versions are incompatible.
 */
export class RedisModuleVersionError extends RedisVLError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'RedisModuleVersionError';
    }

    /**
     * Create error for unsupported features requiring specific Redis versions.
     *
     * @param feature - Name of the feature requiring a specific version
     * @param minVersion - Minimum required Redis version
     * @param suggestion - Suggested action to resolve the issue
     */
    static forFeature(
        feature: string,
        minVersion: string,
        suggestion: string
    ): RedisModuleVersionError {
        return new RedisModuleVersionError(
            `${feature} requires Redis >= ${minVersion}. ${suggestion}`
        );
    }
}

/**
 * Error raised for vectorizer operations.
 */
export class VectorizerError extends RedisVLError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'VectorizerError';
    }
}
