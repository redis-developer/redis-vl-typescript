/**
 * RedisVL Exception Classes
 *
 * This module defines all custom exceptions used throughout the RedisVL library.
 */

/**
 * Base exception for all RedisVL errors.
 */
export class RedisVLError extends Error {
    constructor(message: string) {
        super(message);
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
    constructor(message: string) {
        super(message);
        this.name = 'RedisSearchError';
    }
}

/**
 * Error when validating data against a schema.
 */
export class SchemaValidationError extends RedisVLError {
    public readonly index?: number;

    constructor(message: string, index?: number) {
        // Only add index prefix if the message doesn't already contain detailed validation info
        if (index !== undefined && !message.startsWith('Schema validation failed')) {
            message = `Validation failed for object at index ${index}: ${message}`;
        }
        super(message);
        this.name = 'SchemaValidationError';
        this.index = index;
    }
}
