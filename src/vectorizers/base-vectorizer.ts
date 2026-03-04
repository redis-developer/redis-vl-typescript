/**
 * Base abstract class for all vectorizers.
 *
 * Vectorizers are responsible for converting text into numerical embeddings (vectors)
 * that can be stored in Redis and used for semantic search.
 *
 * This class defines the interface that all concrete vectorizer implementations must follow,
 * matching the pattern from Python and Java RedisVL implementations.
 *
 * @example
 * ```typescript
 * class MyVectorizer extends BaseVectorizer {
 *   async embed(text: string): Promise<number[]> {
 *     // Implementation
 *   }
 *
 *   async embedMany(texts: string[], batchSize?: number): Promise<number[][]> {
 *     // Implementation
 *   }
 *
 *   get dims(): number {
 *     return 384; // Embedding dimensions
 *   }
 *
 *   get model(): string {
 *     return 'my-model-name';
 *   }
 * }
 * ```
 */
export abstract class BaseVectorizer {
    /**
     * Generate an embedding for a single text.
     *
     * @param text - The text to embed
     * @returns A promise that resolves to the embedding vector
     *
     * @example
     * ```typescript
     * const embedding = await vectorizer.embed('Hello world');
     * console.log(embedding); // [0.1, 0.2, 0.3, ...]
     * ```
     */
    abstract embed(text: string): Promise<number[]>;

    /**
     * Generate embeddings for multiple texts.
     *
     * This method should be more efficient than calling embed() multiple times
     * by batching requests to the underlying model.
     *
     * @param texts - Array of texts to embed
     * @param batchSize - Optional batch size for processing (default: 32)
     * @returns A promise that resolves to an array of embedding vectors
     *
     * @example
     * ```typescript
     * const embeddings = await vectorizer.embedMany(['Hello', 'World']);
     * console.log(embeddings); // [[0.1, 0.2, ...], [0.3, 0.4, ...]]
     * ```
     */
    abstract embedMany(texts: string[], batchSize?: number): Promise<number[][]>;

    /**
     * Get the dimensionality of the embeddings produced by this vectorizer.
     *
     * This should match the length of the arrays returned by embed() and embedMany().
     *
     * @returns The number of dimensions in the embedding vectors
     *
     * @example
     * ```typescript
     * console.log(vectorizer.dims); // 384
     * const embedding = await vectorizer.embed('test');
     * console.log(embedding.length === vectorizer.dims); // true
     * ```
     */
    abstract get dims(): number;

    /**
     * Get the name/identifier of the model used by this vectorizer.
     *
     * @returns The model name or identifier
     *
     * @example
     * ```typescript
     * console.log(vectorizer.model); // "sentence-transformers/all-MiniLM-L6-v2"
     * ```
     */
    abstract get model(): string;
}
