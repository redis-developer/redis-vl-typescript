import { describe, it, expect } from 'vitest';
import {
    Tag,
    Num,
    Text,
    Geo,
    GeoRadius,
    Timestamp,
    FilterExpression,
} from '../../../src/query/filter.js';
import { QueryValidationError } from '../../../src/errors.js';

describe('Filter DSL', () => {
    describe('Tag', () => {
        it('renders eq with a single value', () => {
            expect(Tag('brand').eq('nike').toString()).toBe('@brand:{nike}');
        });

        it('renders ne with a single value', () => {
            expect(Tag('brand').ne('nike').toString()).toBe('(-@brand:{nike})');
        });

        it('renders eq with multiple values joined by |', () => {
            expect(Tag('brand').eq(['nike', 'adidas']).toString()).toBe('@brand:{nike|adidas}');
        });

        it('escapes special characters in tag values', () => {
            expect(Tag('brand').eq('a b').toString()).toBe('@brand:{a\\ b}');
            expect(Tag('brand').eq('foo,bar').toString()).toBe('@brand:{foo\\,bar}');
        });

        it('preserves wildcards under the like operator', () => {
            expect(Tag('category').like('tech*').toString()).toBe('@category:{tech*}');
        });

        it('renders isMissing()', () => {
            expect(Tag('brand').isMissing().toString()).toBe('ismissing(@brand)');
        });

        it('renders eq with empty value list as wildcard', () => {
            expect(Tag('brand').eq([]).toString()).toBe('*');
        });
    });

    describe('Num', () => {
        it('renders eq', () => {
            expect(Num('age').eq(18).toString()).toBe('@age:[18 18]');
        });

        it('renders ne', () => {
            expect(Num('age').ne(18).toString()).toBe('(-@age:[18 18])');
        });

        it('renders gt', () => {
            expect(Num('age').gt(18).toString()).toBe('@age:[(18 +inf]');
        });

        it('renders lt', () => {
            expect(Num('age').lt(18).toString()).toBe('@age:[-inf (18]');
        });

        it('renders ge', () => {
            expect(Num('age').ge(18).toString()).toBe('@age:[18 +inf]');
        });

        it('renders le', () => {
            expect(Num('age').le(18).toString()).toBe('@age:[-inf 18]');
        });

        it('renders between (default both inclusive)', () => {
            expect(Num('age').between(18, 65).toString()).toBe('@age:[18 65]');
        });

        it('renders between with neither inclusive', () => {
            expect(Num('age').between(18, 65, 'neither').toString()).toBe('@age:[(18 (65]');
        });

        it('renders between with left inclusive only', () => {
            expect(Num('age').between(18, 65, 'left').toString()).toBe('@age:[18 (65]');
        });

        it('renders between with right inclusive only', () => {
            expect(Num('age').between(18, 65, 'right').toString()).toBe('@age:[(18 65]');
        });

        it('throws on invalid inclusive option', () => {
            // The inclusive parameter must be one of the four documented enum values.
            expect(() => Num('age').between(18, 65, 'invalid' as any)).toThrow(
                QueryValidationError
            );
        });

        it('renders isMissing()', () => {
            expect(Num('age').isMissing().toString()).toBe('ismissing(@age)');
        });
    });

    describe('Text', () => {
        it('renders eq with quoted exact match', () => {
            expect(Text('job').eq('engineer').toString()).toBe('@job:("engineer")');
        });

        it('renders ne', () => {
            expect(Text('job').ne('engineer').toString()).toBe('(-@job:"engineer")');
        });

        it('renders like (preserves wildcards)', () => {
            expect(Text('job').like('engine*').toString()).toBe('@job:(engine*)');
        });

        it('renders isMissing()', () => {
            expect(Text('description').isMissing().toString()).toBe('ismissing(@description)');
        });
    });

    describe('Geo + GeoRadius', () => {
        it('renders eq', () => {
            const radius = new GeoRadius(-122.4194, 37.7749, 1, 'km');
            expect(Geo('location').eq(radius).toString()).toBe(
                '@location:[-122.4194 37.7749 1 km]'
            );
        });

        it('renders ne', () => {
            const radius = new GeoRadius(-122.4194, 37.7749, 1, 'km');
            expect(Geo('location').ne(radius).toString()).toBe(
                '(-@location:[-122.4194 37.7749 1 km])'
            );
        });

        it('rejects invalid units', () => {
            expect(() => new GeoRadius(0, 0, 1, 'parsec' as any)).toThrow(QueryValidationError);
        });
    });

    describe('Timestamp', () => {
        it('accepts a Date and renders eq', () => {
            // 2024-01-01T00:00:00Z = 1704067200 (seconds since epoch)
            const d = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));
            expect(Timestamp('created_at').eq(d).toString()).toBe(
                '@created_at:[1704067200 1704067200]'
            );
        });

        it('accepts an ISO date-only string and treats it as a full-day between', () => {
            // 2024-01-01 -> [start_of_day_utc, end_of_day_utc]
            const start = Math.floor(Date.UTC(2024, 0, 1, 0, 0, 0) / 1000);
            const end = Math.floor(Date.UTC(2024, 0, 1, 23, 59, 59, 999) / 1000);
            expect(Timestamp('created_at').eq('2024-01-01').toString()).toBe(
                `@created_at:[${start} ${end}]`
            );
        });

        it('accepts a Unix timestamp number directly', () => {
            expect(Timestamp('created_at').gt(1234567890).toString()).toBe(
                '@created_at:[(1234567890 +inf]'
            );
        });

        it('renders between for two Dates', () => {
            const a = new Date(Date.UTC(2024, 0, 1));
            const b = new Date(Date.UTC(2024, 11, 31));
            expect(Timestamp('created_at').between(a, b).toString()).toBe(
                '@created_at:[1704067200 1735603200]'
            );
        });
    });

    describe('FilterExpression composition', () => {
        it('chains and()', () => {
            const expr = Tag('brand').eq('nike').and(Num('price').lt(100));
            expect(expr.toString()).toBe('(@brand:{nike} @price:[-inf (100])');
        });

        it('chains or()', () => {
            const expr = Tag('brand').eq('nike').or(Tag('brand').eq('adidas'));
            expect(expr.toString()).toBe('(@brand:{nike} | @brand:{adidas})');
        });

        it('mixes and()/or()', () => {
            const expr = Tag('brand')
                .eq('nike')
                .and(Num('price').between(0, 100))
                .or(Tag('featured').eq('yes'));
            expect(expr.toString()).toBe('((@brand:{nike} @price:[0 100]) | @featured:{yes})');
        });

        it("collapses wildcards: '*' AND x === x", () => {
            const expr = new FilterExpression('*').and(Tag('brand').eq('nike'));
            expect(expr.toString()).toBe('@brand:{nike}');
        });

        it("collapses wildcards: x AND '*' === x", () => {
            const expr = Tag('brand').eq('nike').and(new FilterExpression('*'));
            expect(expr.toString()).toBe('@brand:{nike}');
        });

        it("collapses wildcards: '*' AND '*' === '*'", () => {
            const expr = new FilterExpression('*').and(new FilterExpression('*'));
            expect(expr.toString()).toBe('*');
        });

        it('renders isMissing inside an AND', () => {
            const expr = Tag('brand').eq('nike').and(Num('price').isMissing());
            expect(expr.toString()).toBe('(@brand:{nike} ismissing(@price))');
        });
    });
});
