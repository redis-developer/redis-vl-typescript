import { describe, it, expect } from 'vitest';
import { AField, renderAggregationExpr } from '../../../src/query/aggregation-expr.js';

describe('AField — comparison operators', () => {
    it('renders eq with a numeric literal', () => {
        expect(AField('total').eq(10).toString()).toBe('@total == 10');
    });

    it('renders eq with a string literal (auto-quoted)', () => {
        expect(AField('brand').eq('nike').toString()).toBe('@brand == "nike"');
    });

    it('renders ne / lt / le / gt / ge', () => {
        expect(AField('total').ne(0).toString()).toBe('@total != 0');
        expect(AField('price').lt(200).toString()).toBe('@price < 200');
        expect(AField('price').le(200).toString()).toBe('@price <= 200');
        expect(AField('price').gt(0).toString()).toBe('@price > 0');
        expect(AField('rating').ge(4.5).toString()).toBe('@rating >= 4.5');
    });

    it('renders field-to-field comparisons', () => {
        expect(AField('revenue').gt(AField('cost')).toString()).toBe('@revenue > @cost');
    });

    it('auto-prefixes bare field names with @', () => {
        expect(AField('foo').lt(5).toString()).toBe('@foo < 5');
    });

    it('preserves explicit @ and $ prefixes', () => {
        expect(AField('@already').lt(5).toString()).toBe('@already < 5');
        expect(AField('$.json.path').lt(5).toString()).toBe('$.json.path < 5');
    });

    it('escapes embedded double-quotes in string literals', () => {
        expect(AField('title').eq('say "hi"').toString()).toBe('@title == "say \\"hi\\""');
    });

    it('escapes embedded backslashes in string literals', () => {
        expect(AField('path').eq('a\\b').toString()).toBe('@path == "a\\\\b"');
    });
});

describe('AggregationExpr — logical composition', () => {
    it('renders and()', () => {
        const expr = AField('total').gt(10).and(AField('price').lt(200));
        expect(expr.toString()).toBe('(@total > 10 && @price < 200)');
    });

    it('renders or()', () => {
        const expr = AField('total').gt(10).or(AField('priority').eq('high'));
        expect(expr.toString()).toBe('(@total > 10 || @priority == "high")');
    });

    it('renders not()', () => {
        expect(AField('total').gt(10).not().toString()).toBe('!(@total > 10)');
    });

    it('chains and/or with parenthesisation', () => {
        const expr = AField('a').gt(1).and(AField('b').lt(2)).or(AField('c').eq(3));
        expect(expr.toString()).toBe('((@a > 1 && @b < 2) || @c == 3)');
    });

    it('nests not() inside and()/or()', () => {
        const expr = AField('total').gt(10).and(AField('hidden').eq(1).not());
        expect(expr.toString()).toBe('(@total > 10 && !(@hidden == 1))');
    });
});

describe('renderAggregationExpr()', () => {
    it('returns undefined for undefined', () => {
        expect(renderAggregationExpr(undefined)).toBeUndefined();
    });

    it('passes through a raw string', () => {
        expect(renderAggregationExpr('@price < 200')).toBe('@price < 200');
    });

    it('renders an AggregationExpr via toString()', () => {
        const expr = AField('price').lt(200);
        expect(renderAggregationExpr(expr)).toBe('@price < 200');
    });

    it('treats an empty string as undefined (no FILTER step emitted)', () => {
        expect(renderAggregationExpr('')).toBeUndefined();
    });
});
