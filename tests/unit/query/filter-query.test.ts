import { describe, it, expect } from 'vitest';
import { BaseQuery } from '../../../src/query/base.js';
import { FilterQuery } from '../../../src/query/filter-query.js';
import { Tag, Num } from '../../../src/query/filter.js';

describe('FilterQuery', () => {
    it('renders a wildcard query when no filter is supplied', () => {
        const q = new FilterQuery();
        expect(q).toBeInstanceOf(BaseQuery);
        expect(q.buildQuery()).toBe('*');
    });

    it('accepts a string filter', () => {
        const q = new FilterQuery({ filter: '@brand:{nike}' });
        expect(q.buildQuery()).toBe('@brand:{nike}');
    });

    it('accepts a FilterExpression and renders it', () => {
        const q = new FilterQuery({
            filter: Tag('brand').eq('nike').and(Num('price').lt(100)),
        });
        expect(q.buildQuery()).toBe('(@brand:{nike} @price:[-inf (100])');
    });

    it('returns empty params object', () => {
        const q = new FilterQuery({ filter: Tag('brand').eq('nike') });
        expect(q.buildParams()).toEqual({});
    });

    it('supports returnFields', () => {
        const q = new FilterQuery({ returnFields: ['title', 'price'] });
        expect(q.returnFields).toEqual(['title', 'price']);
    });

    it('supports paging via offset/limit', () => {
        const q = new FilterQuery({ offset: 10, limit: 5 });
        expect(q.offset).toBe(10);
        expect(q.limit).toBe(5);
    });

    it('numResults defaults to 10', () => {
        const q = new FilterQuery();
        expect(q.numResults).toBe(10);
    });
});
