import { describe, it, expect } from 'vitest';
import { TokenEscaper } from '../../../src/utils/token-escaper.js';

describe('TokenEscaper', () => {
    const escaper = new TokenEscaper();

    describe('escape', () => {
        it('returns the input unchanged when no special chars are present', () => {
            expect(escaper.escape('hello')).toBe('hello');
        });

        it('escapes spaces', () => {
            expect(escaper.escape('hello world')).toBe('hello\\ world');
        });

        it('escapes punctuation and structural chars', () => {
            // Each special char gets a single leading backslash.
            expect(escaper.escape('a,b.c')).toBe('a\\,b\\.c');
            expect(escaper.escape('a:b;c')).toBe('a\\:b\\;c');
            expect(escaper.escape('a(b)c')).toBe('a\\(b\\)c');
            expect(escaper.escape('a{b}c')).toBe('a\\{b\\}c');
            expect(escaper.escape('a[b]c')).toBe('a\\[b\\]c');
        });

        it('escapes wildcard chars by default', () => {
            expect(escaper.escape('a*b')).toBe('a\\*b');
            expect(escaper.escape('a?b')).toBe('a\\?b');
        });

        it('preserves wildcard chars when preserveWildcards is true', () => {
            expect(escaper.escape('a*b', true)).toBe('a*b');
            expect(escaper.escape('a?b', true)).toBe('a?b');
        });

        it('still escapes other special chars when preserveWildcards is true', () => {
            expect(escaper.escape('hello world*', true)).toBe('hello\\ world*');
            expect(escaper.escape('a,b*c', true)).toBe('a\\,b*c');
        });

        it('escapes backslash and quote chars', () => {
            expect(escaper.escape('a\\b')).toBe('a\\\\b');
            expect(escaper.escape("a'b")).toBe("a\\'b");
            expect(escaper.escape('a"b')).toBe('a\\"b');
        });

        it('handles empty string', () => {
            expect(escaper.escape('')).toBe('');
        });

        it('throws TypeError when value is not a string', () => {
            // Type-check escape hatch so the runtime guard is exercised.
            expect(() => escaper.escape(123 as unknown as string)).toThrow(TypeError);
            expect(() => escaper.escape(null as unknown as string)).toThrow(TypeError);
            expect(() => escaper.escape(undefined as unknown as string)).toThrow(TypeError);
        });
    });
});
