import { describe, it, expect } from 'vitest';
import { english } from '../../../../src/utils/stopwords/english.js';

describe('english stopwords', () => {
    it('exports a Set with 198 entries', () => {
        expect(english).toBeInstanceOf(Set);
        expect(english.size).toBe(198);
    });

    it('contains common stopwords', () => {
        expect(english.has('the')).toBe(true);
        expect(english.has('and')).toBe(true);
        expect(english.has('is')).toBe(true);
    });

    it('contains contractions from NLTK', () => {
        expect(english.has("don't")).toBe(true);
        expect(english.has("you've")).toBe(true);
        expect(english.has("shouldn't")).toBe(true);
    });

    it('does not contain content words (sanity check vs `stopword` npm)', () => {
        // These are in `stopword` npm's `eng` but not in NLTK's english.
        expect(english.has('come')).toBe(false);
        expect(english.has('make')).toBe(false);
        expect(english.has('way')).toBe(false);
    });
});
