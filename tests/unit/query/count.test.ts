import { describe, it, expect } from 'vitest';
import { BaseQuery } from '../../../src/query/base.js';
import { CountQuery } from '../../../src/query/count.js';
import { Tag } from '../../../src/query/filter.js';

describe('CountQuery', () => {
    it('renders a wildcard query when no filter is supplied', () => {
        const q = new CountQuery();
        expect(q).toBeInstanceOf(BaseQuery);
        expect(q.buildQuery()).toBe('*');
    });

    it('accepts a string filter', () => {
        const q = new CountQuery({ filter: '@brand:{nike}' });
        expect(q.buildQuery()).toBe('@brand:{nike}');
    });

    it('accepts a FilterExpression', () => {
        const q = new CountQuery({ filter: Tag('brand').eq('nike') });
        expect(q.buildQuery()).toBe('@brand:{nike}');
    });

    it('always paginates to a zero-row window so only the count is returned', () => {
        // CountQuery is meant to be paired with FT.SEARCH ... LIMIT 0 0;
        // expose that via offset/limit so SearchIndex.search() configures the
        // request correctly.
        const q = new CountQuery({ filter: Tag('brand').eq('nike') });
        expect(q.offset).toBe(0);
        expect(q.limit).toBe(0);
    });

    it('exposes a noContent flag so callers can wire up FT.SEARCH NOCONTENT', () => {
        const q = new CountQuery();
        expect(q.noContent).toBe(true);
    });

    it('returns empty params object', () => {
        const q = new CountQuery({ filter: Tag('brand').eq('nike') });
        expect(q.buildParams()).toEqual({});
    });
});
