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
    it('initializes common query state', () => {
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
        expect(query.buildParams()).toEqual({});
    });

    it('sets and clears filters from strings and FilterExpression objects', () => {
        const query = new TestQuery().setFilter(Tag('brand').eq('redis'));

        expect(query.buildQuery()).toBe('@brand:{redis}');

        query.setFilter('@brand:{valkey}');
        expect(query.buildQuery()).toBe('@brand:{valkey}');

        query.setFilter(null);
        expect(query.filter).toBeUndefined();
        expect(query.buildQuery()).toBe('*');
    });

    it('rejects empty filter strings', () => {
        expect(() => new TestQuery({ filter: '' })).toThrow(QueryValidationError);
        expect(() => new TestQuery().setFilter('   ')).toThrow(QueryValidationError);
    });

    it('sets return fields and skip-decode fields defensively', () => {
        const fields = ['title', 'embedding'];
        const skipDecode = ['embedding'];
        const query = new TestQuery().setReturnFields(fields, { skipDecode });

        fields.push('price');
        skipDecode.push('blob');

        expect(query.returnFields).toEqual(['title', 'embedding']);
        expect(query.skipDecodeFields).toEqual(['embedding']);

        query.setReturnFields(['title'], { skipDecode: 'raw' });
        expect(query.returnFields).toEqual(['title']);
        expect(query.skipDecodeFields).toEqual(['raw']);
    });

    it('clears return fields and skip-decode fields together', () => {
        const query = new TestQuery()
            .setReturnFields(['title'], { skipDecode: 'embedding' })
            .setReturnFields();

        expect(query.returnFields).toBeUndefined();
        expect(query.skipDecodeFields).toBeUndefined();
    });

    it('rejects invalid return and skip-decode fields', () => {
        expect(() => new TestQuery().setReturnFields(['title', ''])).toThrow(QueryValidationError);
        expect(() =>
            new TestQuery().setReturnFields(['title'], { skipDecode: ['embedding', ''] })
        ).toThrow(QueryValidationError);
    });

    it('sets paging values and validates them', () => {
        const query = new TestQuery().paging(20, 10);

        expect(query.offset).toBe(20);
        expect(query.limit).toBe(10);
        expect(() => new TestQuery().paging(-1, 10)).toThrow(QueryValidationError);
        expect(() => new TestQuery().paging(0, 0)).toThrow(QueryValidationError);
        expect(() => new TestQuery({ offset: -1 })).toThrow(QueryValidationError);
        expect(() => new TestQuery({ limit: 0 })).toThrow(QueryValidationError);
    });

    it('collects sort fields and validates sort input', () => {
        const query = new TestQuery().sortBy('price').sortBy('created_at', {
            direction: 'DESC',
        });

        expect(query.sortFields).toEqual([
            { field: 'price', direction: 'ASC' },
            { field: 'created_at', direction: 'DESC' },
        ]);
        expect(() => new TestQuery().sortBy('')).toThrow(QueryValidationError);
        expect(() => new TestQuery().sortBy('price', { direction: 'DOWN' as any })).toThrow(
            QueryValidationError
        );
    });
});

describe('BaseVectorQuery', () => {
    it('initializes vector state and common query state', () => {
        const query = new TestVectorQuery({
            vector: [0.1, 0.2, 0.3],
            vectorField: 'embedding',
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
        expect(query.buildQuery()).toBe('@category:{books} @embedding');
    });

    it('defensively copies vectors', () => {
        const vector = [0.1, 0.2, 0.3];
        const query = new TestVectorQuery({ vector, vectorField: 'embedding' });

        vector.push(0.4);
        query.vector.push(0.5);

        expect(query.vector).toEqual([0.1, 0.2, 0.3]);
    });

    it('rejects invalid vector state', () => {
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
