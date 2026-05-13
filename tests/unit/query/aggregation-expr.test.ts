import { describe, it, expect } from 'vitest';
import { Expr, renderAggregationExpr } from '../../../src/query/aggregation-expr.js';

describe('Expr — comparison operators', () => {
    it('renders eq with a numeric literal', () => {
        expect(Expr('total').eq(10).toString()).toBe('@total == 10');
    });

    it('renders eq with a string literal (auto-quoted)', () => {
        expect(Expr('brand').eq('nike').toString()).toBe('@brand == "nike"');
    });

    it('renders ne / lt / le / gt / ge', () => {
        expect(Expr('total').ne(0).toString()).toBe('@total != 0');
        expect(Expr('price').lt(200).toString()).toBe('@price < 200');
        expect(Expr('price').le(200).toString()).toBe('@price <= 200');
        expect(Expr('price').gt(0).toString()).toBe('@price > 0');
        expect(Expr('rating').ge(4.5).toString()).toBe('@rating >= 4.5');
    });

    it('renders field-to-field comparisons', () => {
        expect(Expr('revenue').gt(Expr('cost')).toString()).toBe('@revenue > @cost');
    });

    it('auto-prefixes bare field names with @', () => {
        expect(Expr('foo').lt(5).toString()).toBe('@foo < 5');
    });

    it('preserves explicit @ and $ prefixes', () => {
        expect(Expr('@already').lt(5).toString()).toBe('@already < 5');
        expect(Expr('$.json.path').lt(5).toString()).toBe('$.json.path < 5');
    });

    it('escapes embedded double-quotes in string literals', () => {
        expect(Expr('title').eq('say "hi"').toString()).toBe('@title == "say \\"hi\\""');
    });

    it('escapes embedded backslashes in string literals', () => {
        expect(Expr('path').eq('a\\b').toString()).toBe('@path == "a\\\\b"');
    });
});

describe('AggregationExpr — logical composition', () => {
    it('renders and()', () => {
        const expr = Expr('total').gt(10).and(Expr('price').lt(200));
        expect(expr.toString()).toBe('(@total > 10 && @price < 200)');
    });

    it('renders or()', () => {
        const expr = Expr('total').gt(10).or(Expr('priority').eq('high'));
        expect(expr.toString()).toBe('(@total > 10 || @priority == "high")');
    });

    it('renders not()', () => {
        expect(Expr('total').gt(10).not().toString()).toBe('!(@total > 10)');
    });

    it('chains and/or with parenthesisation', () => {
        const expr = Expr('a').gt(1).and(Expr('b').lt(2)).or(Expr('c').eq(3));
        expect(expr.toString()).toBe('((@a > 1 && @b < 2) || @c == 3)');
    });

    it('nests not() inside and()/or()', () => {
        const expr = Expr('total').gt(10).and(Expr('hidden').eq(1).not());
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
        const expr = Expr('price').lt(200);
        expect(renderAggregationExpr(expr)).toBe('@price < 200');
    });

    it('treats an empty string as undefined (no FILTER step emitted)', () => {
        expect(renderAggregationExpr('')).toBeUndefined();
    });
});
