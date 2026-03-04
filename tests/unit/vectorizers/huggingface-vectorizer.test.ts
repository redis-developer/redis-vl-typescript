import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HuggingFaceVectorizer } from '../../../src/vectorizers/huggingface-vectorizer.js';

// Mock the @huggingface/transformers module at the top level
const mockPipeline = vi.fn();

vi.mock('@huggingface/transformers', () => ({
    pipeline: mockPipeline,
}));

/**
 * Tests for HuggingFaceVectorizer
 *
 * Note: These tests use mocks to avoid downloading actual models during testing.
 * Integration tests with real models should be in a separate file.
 */
describe('HuggingFaceVectorizer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Constructor', () => {
        it('should create instance with valid model name', () => {
            const vectorizer = new HuggingFaceVectorizer({
                model: 'sentence-transformers/all-MiniLM-L6-v2',
            });

            expect(vectorizer).toBeDefined();
            expect(vectorizer.model).toBe('sentence-transformers/all-MiniLM-L6-v2');
        });

        it('should accept optional device parameter', () => {
            const vectorizer = new HuggingFaceVectorizer({
                model: 'sentence-transformers/all-MiniLM-L6-v2',
                device: 'cpu',
            });

            expect(vectorizer).toBeDefined();
        });

        it('should accept optional dtype parameter', () => {
            const vectorizer = new HuggingFaceVectorizer({
                model: 'sentence-transformers/all-MiniLM-L6-v2',
                dtype: 'fp32',
            });

            expect(vectorizer).toBeDefined();
        });

        it('should throw error for empty model name', () => {
            expect(() => {
                new HuggingFaceVectorizer({ model: '' });
            }).toThrow('Model name cannot be empty');
        });

        it('should throw error for whitespace-only model name', () => {
            expect(() => {
                new HuggingFaceVectorizer({ model: '   ' });
            }).toThrow('Model name cannot be empty');
        });
    });

    describe('embed()', () => {
        it('should generate embedding for single text', async () => {
            // Create mock embedding (384 dimensions for all-MiniLM-L6-v2)
            const mockEmbedding = new Float32Array(384).fill(0.1);

            const mockPipelineInstance = vi.fn().mockResolvedValue({
                data: mockEmbedding,
            });

            mockPipeline.mockResolvedValue(mockPipelineInstance);

            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
            });

            const embedding = await vectorizer.embed('Hello world');

            expect(embedding).toBeDefined();
            expect(Array.isArray(embedding)).toBe(true);
            expect(embedding.length).toBe(384);
            expect(typeof embedding[0]).toBe('number');
            expect(mockPipelineInstance).toHaveBeenCalledWith('Hello world', {
                pooling: 'mean',
                normalize: true,
            });
        });

        it('should handle empty string', async () => {
            const mockEmbedding = new Float32Array(384).fill(0.1);

            const mockPipelineInstance = vi.fn().mockResolvedValue({
                data: mockEmbedding,
            });

            mockPipeline.mockResolvedValue(mockPipelineInstance);

            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
            });

            const embedding = await vectorizer.embed('');

            expect(embedding).toBeDefined();
            expect(Array.isArray(embedding)).toBe(true);
            expect(embedding.length).toBe(384);
        });

        it('should handle long text', async () => {
            const mockEmbedding = new Float32Array(384).fill(0.1);

            const mockPipelineInstance = vi.fn().mockResolvedValue({
                data: mockEmbedding,
            });

            mockPipeline.mockResolvedValue(mockPipelineInstance);

            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
            });

            const longText = 'Lorem ipsum '.repeat(100);
            const embedding = await vectorizer.embed(longText);

            expect(embedding).toBeDefined();
            expect(Array.isArray(embedding)).toBe(true);
            expect(embedding.length).toBe(384);
        });

        it('should cache model dimensions after first call', async () => {
            const mockEmbedding = new Float32Array(384).fill(0.1);

            const mockPipelineInstance = vi.fn().mockResolvedValue({
                data: mockEmbedding,
            });

            mockPipeline.mockResolvedValue(mockPipelineInstance);

            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
            });

            await vectorizer.embed('test');

            // dims should be available after first embed
            expect(vectorizer.dims).toBe(384);
        });
    });

    describe('embedMany()', () => {
        it('should generate embeddings for multiple texts', async () => {
            const mockEmbedding = new Float32Array(384).fill(0.1);

            const mockPipelineInstance = vi.fn().mockResolvedValue({
                data: mockEmbedding,
            });

            mockPipeline.mockResolvedValue(mockPipelineInstance);

            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
            });

            const texts = ['Hello world', 'Goodbye world', 'Test text'];
            const embeddings = await vectorizer.embedMany(texts);

            expect(embeddings).toHaveLength(3);
            expect(Array.isArray(embeddings[0])).toBe(true);
            expect(embeddings[0].length).toBe(384);
            expect(mockPipelineInstance).toHaveBeenCalledTimes(3);
        });

        it('should handle empty array', async () => {
            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
            });

            const embeddings = await vectorizer.embedMany([]);

            expect(embeddings).toEqual([]);
        });

        it('should use custom batch size', async () => {
            const mockEmbedding = new Float32Array(384).fill(0.1);

            const mockPipelineInstance = vi.fn().mockResolvedValue({
                data: mockEmbedding,
            });

            mockPipeline.mockResolvedValue(mockPipelineInstance);

            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
            });

            const texts = Array.from({ length: 100 }, (_, i) => `Text ${i}`);
            const embeddings = await vectorizer.embedMany(texts, 10);

            expect(embeddings).toHaveLength(100);
            // Should process in batches of 10
            expect(mockPipelineInstance).toHaveBeenCalledTimes(100);
        });

        it('should return embeddings in same order as input', async () => {
            const mockEmbedding1 = new Float32Array(384).fill(0.1);
            const mockEmbedding2 = new Float32Array(384).fill(0.2);
            const mockEmbedding3 = new Float32Array(384).fill(0.3);

            const mockPipelineInstance = vi
                .fn()
                .mockResolvedValueOnce({ data: mockEmbedding1 })
                .mockResolvedValueOnce({ data: mockEmbedding2 })
                .mockResolvedValueOnce({ data: mockEmbedding3 });

            mockPipeline.mockResolvedValue(mockPipelineInstance);

            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
            });

            const texts = ['First', 'Second', 'Third'];
            const embeddings = await vectorizer.embedMany(texts);

            // Verify order is preserved (use toBeCloseTo for floating point comparison)
            expect(embeddings[0][0]).toBeCloseTo(0.1, 5);
            expect(embeddings[1][0]).toBeCloseTo(0.2, 5);
            expect(embeddings[2][0]).toBeCloseTo(0.3, 5);
        });
    });

    describe('Properties', () => {
        it('should return correct model name', () => {
            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
            });

            expect(vectorizer.model).toBe('Xenova/all-MiniLM-L6-v2');
        });

        it('should throw error when accessing dims before initialization', () => {
            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
            });

            expect(() => vectorizer.dims).toThrow('Embedding dimensions not yet determined');
        });

        it('should return correct embedding dimensions after initialization', async () => {
            const mockEmbedding = new Float32Array(384).fill(0.1);

            const mockPipelineInstance = vi.fn().mockResolvedValue({
                data: mockEmbedding,
            });

            mockPipeline.mockResolvedValue(mockPipelineInstance);

            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
            });

            await vectorizer.embed('test');

            expect(vectorizer.dims).toBe(384);
        });

        it('should have dims property match actual embedding length', async () => {
            const mockEmbedding = new Float32Array(384).fill(0.1);

            const mockPipelineInstance = vi.fn().mockResolvedValue({
                data: mockEmbedding,
            });

            mockPipeline.mockResolvedValue(mockPipelineInstance);

            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
            });

            const embedding = await vectorizer.embed('test');
            expect(embedding.length).toBe(vectorizer.dims);
        });
    });

    describe('Normalization', () => {
        it('should pass normalize option to pipeline when true', async () => {
            const mockEmbedding = new Float32Array(384).fill(0.1);

            const mockPipelineInstance = vi.fn().mockResolvedValue({
                data: mockEmbedding,
            });

            mockPipeline.mockResolvedValue(mockPipelineInstance);

            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
                normalize: true,
            });

            await vectorizer.embed('test');

            expect(mockPipelineInstance).toHaveBeenCalledWith('test', {
                pooling: 'mean',
                normalize: true,
            });
        });

        it('should pass normalize option to pipeline when false', async () => {
            const mockEmbedding = new Float32Array(384).fill(0.1);

            const mockPipelineInstance = vi.fn().mockResolvedValue({
                data: mockEmbedding,
            });

            mockPipeline.mockResolvedValue(mockPipelineInstance);

            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
                normalize: false,
            });

            await vectorizer.embed('test');

            expect(mockPipelineInstance).toHaveBeenCalledWith('test', {
                pooling: 'mean',
                normalize: false,
            });
        });
    });

    describe('Pooling', () => {
        it('should support mean pooling strategy', async () => {
            const mockEmbedding = new Float32Array(384).fill(0.1);

            const mockPipelineInstance = vi.fn().mockResolvedValue({
                data: mockEmbedding,
            });

            mockPipeline.mockResolvedValue(mockPipelineInstance);

            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
                pooling: 'mean',
            });

            await vectorizer.embed('test');

            expect(mockPipelineInstance).toHaveBeenCalledWith('test', {
                pooling: 'mean',
                normalize: true,
            });
        });

        it('should support cls pooling strategy', async () => {
            const mockEmbedding = new Float32Array(384).fill(0.1);

            const mockPipelineInstance = vi.fn().mockResolvedValue({
                data: mockEmbedding,
            });

            mockPipeline.mockResolvedValue(mockPipelineInstance);

            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
                pooling: 'cls',
            });

            await vectorizer.embed('test');

            expect(mockPipelineInstance).toHaveBeenCalledWith('test', {
                pooling: 'cls',
                normalize: true,
            });
        });
    });

    describe('Error Handling', () => {
        it('should throw helpful error when @huggingface/transformers not installed', async () => {
            // Mock import failure
            mockPipeline.mockRejectedValue(
                new Error("Cannot find module '@huggingface/transformers'")
            );

            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
            });

            await expect(vectorizer.embed('test')).rejects.toThrow(
                'HuggingFaceVectorizer requires @huggingface/transformers'
            );
        });

        it('should propagate other errors', async () => {
            mockPipeline.mockRejectedValue(new Error('Network error'));

            const vectorizer = new HuggingFaceVectorizer({
                model: 'Xenova/all-MiniLM-L6-v2',
            });

            await expect(vectorizer.embed('test')).rejects.toThrow('Network error');
        });
    });
});
