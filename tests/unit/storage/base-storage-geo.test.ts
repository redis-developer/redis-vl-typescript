import { describe, it, expect } from 'vitest';
import { IndexSchema, IndexInfo } from '../../../src/schema/schema.js';
import { BaseStorage } from '../../../src/storage/base-storage.js';
import { SchemaValidationError } from '../../../src/errors.js';

// Test double — exposes protected validate() for unit testing
class TestStorage extends BaseStorage {
    public testValidate(doc: Record<string, unknown>) {
        return this.validate(doc);
    }
    async write() {
        return [];
    }
    async get() {
        return [];
    }
}

// Minimal schema with a geo field
function makeGeoSchema() {
    const index = new IndexInfo({ name: 'test-geo-index' });
    const schema = new IndexSchema({ index });
    schema.addField({ name: 'location', type: 'geo' });
    return schema;
}

describe('BaseStorage geo field validation', () => {
    describe('valid geo values', () => {
        it('should accept "0,0"', () => {
            const storage = new TestStorage(makeGeoSchema());
            expect(() => storage.testValidate({ location: '0,0' })).not.toThrow();
        });

        it('should accept boundary values "-180,-90"', () => {
            const storage = new TestStorage(makeGeoSchema());
            expect(() => storage.testValidate({ location: '-180,-90' })).not.toThrow();
        });

        it('should accept boundary values "180,90"', () => {
            const storage = new TestStorage(makeGeoSchema());
            expect(() => storage.testValidate({ location: '180,90' })).not.toThrow();
        });

        it('should accept realistic coordinates', () => {
            const storage = new TestStorage(makeGeoSchema());
            expect(() => storage.testValidate({ location: '40.7128,-74.0060' })).not.toThrow();
        });
    });

    describe('invalid geo values', () => {
        it('should reject a non-string value', () => {
            const storage = new TestStorage(makeGeoSchema());
            expect(() => storage.testValidate({ location: 12345 })).toThrow(SchemaValidationError);
        });

        it('should reject a value with no comma', () => {
            const storage = new TestStorage(makeGeoSchema());
            expect(() => storage.testValidate({ location: '12345' })).toThrow(
                SchemaValidationError
            );
        });

        it('should reject non-numeric parts', () => {
            const storage = new TestStorage(makeGeoSchema());
            expect(() => storage.testValidate({ location: 'abc,def' })).toThrow(
                SchemaValidationError
            );
        });

        it('should reject longitude out of range', () => {
            const storage = new TestStorage(makeGeoSchema());
            expect(() => storage.testValidate({ location: '181,0' })).toThrow(
                SchemaValidationError
            );
        });

        it('should reject latitude out of range', () => {
            const storage = new TestStorage(makeGeoSchema());
            expect(() => storage.testValidate({ location: '0,91' })).toThrow(SchemaValidationError);
        });
    });
});
