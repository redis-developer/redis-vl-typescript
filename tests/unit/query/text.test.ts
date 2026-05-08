import { describe, it, expect } from 'vitest';
import { TextQuery } from '../../../src/query/text.js';
import { Tag } from '../../../src/query/filter.js';
import { QueryValidationError } from '../../../src/errors.js';

describe('TextQuery', () => {
    describe('constructor', () => {
        it('throws if text is empty', () => {
            expect(() => new TextQuery({ text: '', textFieldName: 'description' })).toThrow(
                QueryValidationError
            );
        });

        it('throws if textFieldName is missing', () => {
            expect(() => new TextQuery({ text: 'hello' } as any)).toThrow(QueryValidationError);
        });

        it('defaults numResults to 10', () => {
            const q = new TextQuery({ text: 'hello', textFieldName: 'description' });
            expect(q.numResults).toBe(10);
        });

        it('defaults textScorer to BM25STD', () => {
            const q = new TextQuery({ text: 'hello', textFieldName: 'description' });
            expect(q.textScorer).toBe('BM25STD');
        });
    });

    describe('buildQuery', () => {
        it('tokenises text on whitespace and OR-joins terms in the field', () => {
            const q = new TextQuery({
                text: 'quick brown fox',
                textFieldName: 'description',
            });
            expect(q.buildQuery()).toBe('@description:(quick | brown | fox)');
        });

        it('escapes special characters in tokens but allows readable wildcards', () => {
            // Comma and parens get escaped; spaces become token separators.
            const q = new TextQuery({
                text: 'hello, world',
                textFieldName: 'description',
            });
            expect(q.buildQuery()).toBe('@description:(hello\\, | world)');
        });

        it('combines a string filter with the text clause via AND', () => {
            const q = new TextQuery({
                text: 'engineer',
                textFieldName: 'job',
                filter: '@active:{true}',
            });
            expect(q.buildQuery()).toBe('(@active:{true} @job:(engineer))');
        });

        it('combines a FilterExpression with the text clause via AND', () => {
            const q = new TextQuery({
                text: 'engineer',
                textFieldName: 'job',
                filter: Tag('active').eq('true'),
            });
            expect(q.buildQuery()).toBe('(@active:{true} @job:(engineer))');
        });

        it('skips empty tokens caused by extra whitespace', () => {
            const q = new TextQuery({
                text: '  quick   fox ',
                textFieldName: 'description',
            });
            expect(q.buildQuery()).toBe('@description:(quick | fox)');
        });
    });

    describe('buildParams', () => {
        it('returns an empty params object', () => {
            const q = new TextQuery({ text: 'hello', textFieldName: 'description' });
            expect(q.buildParams()).toEqual({});
        });
    });
});
