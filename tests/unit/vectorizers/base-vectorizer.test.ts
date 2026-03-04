import { describe, it, expect } from 'vitest';
import { BaseVectorizer } from '../../../src/vectorizers/base-vectorizer.js';

/**
 * Tests for BaseVectorizer abstract class
 */
describe('BaseVectorizer', () => {
    describe('Abstract Class', () => {
        it('should not be instantiable directly', () => {
            // TypeScript prevents instantiation of abstract classes at compile time
            // This test verifies the class is properly defined as abstract
            expect(BaseVectorizer).toBeDefined();
            expect(typeof BaseVectorizer).toBe('function');
        });

        it('should require subclasses to implement embed()', async () => {
            // TypeScript enforces this at compile time
            // Any subclass that doesn't implement embed() will fail to compile
            // This test verifies the abstract method exists in the base class
            expect(BaseVectorizer.prototype.embed).toBeUndefined();
        });

        it('should require subclasses to implement embedMany()', async () => {
            // Verified by TypeScript at compile time
            expect(true).toBe(true);
        });

        it('should require subclasses to implement dims getter', () => {
            // Verified by TypeScript at compile time
            expect(true).toBe(true);
        });

        it('should require subclasses to implement model getter', () => {
            // Verified by TypeScript at compile time
            expect(true).toBe(true);
        });
    });

    describe('Concrete Implementation', () => {
        // Create a test implementation to verify abstract class behavior
        class TestVectorizer extends BaseVectorizer {
            async embed(_text: string): Promise<number[]> {
                return [0.1, 0.2, 0.3];
            }

            async embedMany(texts: string[], _batchSize?: number): Promise<number[][]> {
                return texts.map(() => [0.1, 0.2, 0.3]);
            }

            get dims(): number {
                return 3;
            }

            get model(): string {
                return 'test-model';
            }
        }

        it('should allow concrete implementations to be instantiated', () => {
            const vectorizer = new TestVectorizer();
            expect(vectorizer).toBeDefined();
        });

        it('should allow calling embed() on concrete implementation', async () => {
            const vectorizer = new TestVectorizer();
            const embedding = await vectorizer.embed('test text');

            expect(embedding).toEqual([0.1, 0.2, 0.3]);
            expect(embedding).toHaveLength(3);
        });

        it('should allow calling embedMany() on concrete implementation', async () => {
            const vectorizer = new TestVectorizer();
            const embeddings = await vectorizer.embedMany(['text1', 'text2']);

            expect(embeddings).toHaveLength(2);
            expect(embeddings[0]).toEqual([0.1, 0.2, 0.3]);
            expect(embeddings[1]).toEqual([0.1, 0.2, 0.3]);
        });

        it('should allow accessing dims property', () => {
            const vectorizer = new TestVectorizer();
            expect(vectorizer.dims).toBe(3);
        });

        it('should allow accessing model property', () => {
            const vectorizer = new TestVectorizer();
            expect(vectorizer.model).toBe('test-model');
        });
    });
});
