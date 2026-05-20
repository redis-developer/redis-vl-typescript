import { describe, it, expect } from 'vitest';
import { resolveStopwords } from '../../../../src/utils/stopwords/resolve.js';
import { english } from '../../../../src/utils/stopwords/english.js';
import { QueryValidationError } from '../../../../src/errors.js';

describe('resolveStopwords', () => {
    it('returns the english set when input is undefined', () => {
        expect(resolveStopwords(undefined)).toBe(english);
    });

    it('returns null when input is null', () => {
        expect(resolveStopwords(null)).toBeNull();
    });

    it('returns the english set when input is "english"', () => {
        expect(resolveStopwords('english')).toBe(english);
    });

    it('throws on unknown language identifier', () => {
        expect(() => resolveStopwords('spanish')).toThrow(QueryValidationError);
        expect(() => resolveStopwords('spanish')).toThrow(/unknown stopwords language/);
    });

    it('throws on non-lowercase language identifier (Python parity)', () => {
        expect(() => resolveStopwords('English')).toThrow(QueryValidationError);
    });

    it('converts arrays to a Set verbatim (no case fold)', () => {
        const set = resolveStopwords(['Foo', 'bar']) as ReadonlySet<string>;
        expect(set).toBeInstanceOf(Set);
        expect(set.has('Foo')).toBe(true);
        expect(set.has('foo')).toBe(false);
        expect(set.has('bar')).toBe(true);
    });

    it('copies Sets verbatim (no case fold)', () => {
        const input = new Set(['Quick']);
        const set = resolveStopwords(input) as ReadonlySet<string>;
        expect(set).not.toBe(input);
        expect(set.has('Quick')).toBe(true);
        expect(set.has('quick')).toBe(false);
    });

    it('throws when an iterable contains a non-string member', () => {
        expect(() => resolveStopwords(['ok', 42 as unknown as string])).toThrow(
            QueryValidationError
        );
        expect(() => resolveStopwords(['ok', 42 as unknown as string])).toThrow(
            /must contain only strings/
        );
    });

    it('returns an empty Set for an empty array (no-op, not an error)', () => {
        const set = resolveStopwords([]) as ReadonlySet<string>;
        expect(set).toBeInstanceOf(Set);
        expect(set.size).toBe(0);
    });

    it('returns an empty Set for an empty Set', () => {
        const set = resolveStopwords(new Set()) as ReadonlySet<string>;
        expect(set).toBeInstanceOf(Set);
        expect(set.size).toBe(0);
    });
});
