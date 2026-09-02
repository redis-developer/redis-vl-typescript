import { describe, expect, it } from 'vitest';
import {
    BaseQuery,
    BaseVectorQuery,
    renderFilter,
    type BaseQueryConfig,
    type BaseVectorQueryConfig,
} from '../../../src/query/base.js';
import { Tag } from '../../../src/query/filter.js';
import { QueryValidationError } from '../../../src/errors.js';
import { VectorDataType } from '../../../src/schema/types.js';

class TestQuery extends BaseQuery {
    constructor(config: BaseQueryConfig = {}) {
        super(config);
    }

    buildQuery(): string {
        return renderFilter(this.filter);
    }
}

class TestVectorQuery extends BaseVectorQuery {
    constructor(config: BaseVectorQueryConfig) {
        super(config);
    }

    buildQuery(): string {
        return `${renderFilter(this.filter)} @${this.vectorField}`;
    }
}

describe('BaseQuery', () => {
    it('should initialize with common query config', () => {
        const query = new TestQuery({
            filter: '@category:{books}',
            returnFields: ['title', 'price'],
            offset: 10,
            limit: 5,
        });

        expect(query.filter).toBe('@category:{books}');
        expect(query.returnFields).toEqual(['title', 'price']);
        expect(query.offset).toBe(10);
        expect(query.limit).toBe(5);
    });

    it('should default buildParams to an empty object', () => {
        expect(new TestQuery().buildParams()).toEqual({});
    });

    it('should set filters from strings and FilterExpression objects', () => {
        const query = new TestQuery().setFilter(Tag('brand').eq('redis'));

        expect(query.buildQuery()).toBe('@brand:{redis}');

        query.setFilter('@brand:{valkey}');
        expect(query.filter).toBe('@brand:{valkey}');

        query.setFilter(null);
        expect(query.filter).toBeUndefined();
    });

    it('should reject empty filter strings', () => {
        expect(() => new TestQuery({ filter: '' })).toThrow(QueryValidationError);
        expect(() => new TestQuery().setFilter('   ')).toThrow(QueryValidationError);
    });

    it('should set return fields', () => {
        const query = new TestQuery().setReturnFields(['title', 'embedding']);

        expect(query.returnFields).toEqual(['title', 'embedding']);

        query.setReturnFields(['title']);
        expect(query.returnFields).toEqual(['title']);
    });

    it('should defensively copy return fields', () => {
        const fields = ['title'];
        const query = new TestQuery().setReturnFields(fields);

        fields.push('price');

        expect(query.returnFields).toEqual(['title']);
    });

    it('should clear return fields', () => {
        const query = new TestQuery().setReturnFields(['title']).setReturnFields();

        expect(query.returnFields).toBeUndefined();
    });

    it('should trim return fields before storing them', () => {
        const query = new TestQuery().setReturnFields([' title ', ' $.path ']);

        expect(query.returnFields).toEqual(['title', '$.path']);
    });

    it('should reject invalid return fields', () => {
        expect(() => new TestQuery().setReturnFields(['title', ''])).toThrow(QueryValidationError);
    });

    it('should set paging values', () => {
        const query = new TestQuery().paging(20, 10);

        expect(query.offset).toBe(20);
        expect(query.limit).toBe(10);
    });

    it('should allow a zero limit for count-style queries', () => {
        const query = new TestQuery().paging(0, 0);

        expect(query.offset).toBe(0);
        expect(query.limit).toBe(0);
        expect(new TestQuery({ limit: 0 }).limit).toBe(0);
    });

    it('should reject invalid paging values', () => {
        expect(() => new TestQuery().paging(-1, 10)).toThrow(QueryValidationError);
        expect(() => new TestQuery().paging(0, -1)).toThrow(QueryValidationError);
        expect(() => new TestQuery({ offset: -1 })).toThrow(QueryValidationError);
        expect(() => new TestQuery({ limit: 1.5 })).toThrow(QueryValidationError);
    });

    it('should replace the sort field on subsequent sortBy calls', () => {
        const query = new TestQuery().sortBy('price').sortBy(' created_at ', {
            direction: 'DESC',
        });

        expect(query.sortFields).toEqual([{ field: 'created_at', direction: 'DESC' }]);
    });

    it('should clear the sort when sortBy is called with null', () => {
        const query = new TestQuery().sortBy('price').sortBy(null);

        expect(query.sortFields).toEqual([]);
    });

    it('should reject invalid sort fields', () => {
        expect(() => new TestQuery().sortBy('')).toThrow(QueryValidationError);
        expect(() => new TestQuery().sortBy('price', { direction: 'DOWN' as any })).toThrow(
            QueryValidationError
        );
    });
});

describe('BaseVectorQuery', () => {
    it('should initialize vector state and common query state', () => {
        const query = new TestVectorQuery({
            vector: [0.1, 0.2, 0.3],
            vectorField: ' embedding ',
            datatype: VectorDataType.FLOAT64,
            normalizeDistance: true,
            filter: '@category:{books}',
            returnFields: ['title'],
        });

        expect(query).toBeInstanceOf(BaseQuery);
        expect(query.vector).toEqual([0.1, 0.2, 0.3]);
        expect(query.vectorField).toBe('embedding');
        expect(query.datatype).toBe(VectorDataType.FLOAT64);
        expect(query.normalizeDistance).toBe(true);
        expect(query.filter).toBe('@category:{books}');
        expect(query.returnFields).toEqual(['title']);
    });

    it('should reject invalid vector state', () => {
        expect(() => new TestVectorQuery({ vector: [], vectorField: 'embedding' })).toThrow(
            QueryValidationError
        );
        expect(() => new TestVectorQuery({ vector: [0.1], vectorField: '' })).toThrow(
            QueryValidationError
        );
        expect(
            () =>
                new TestVectorQuery({
                    vector: [0.1],
                    vectorField: 'embedding',
                    datatype: 'float25',
                })
        ).toThrow(QueryValidationError);
    });
});
