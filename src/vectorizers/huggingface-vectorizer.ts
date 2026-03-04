import { BaseVectorizer } from './base-vectorizer.js';

/**
 * Configuration options for HuggingFaceVectorizer
 */
export interface HuggingFaceConfig {
    /**
     * The Hugging Face model to use for embeddings.
     *
     * Examples:
     * - 'Xenova/all-MiniLM-L6-v2' (384 dimensions, fast)
     * - 'Xenova/all-mpnet-base-v2' (768 dimensions, better quality)
     * - 'sentence-transformers/all-MiniLM-L6-v2'
     */
    model: string;

    /**
     * Device to run inference on.
     * - 'cpu': Run on CPU (default)
     * - 'webgpu': Run on GPU (if available)
     */
    device?: 'cpu' | 'webgpu';

    /**
     * Data type for model weights.
     * - 'fp32': 32-bit floating point (default, best quality)
     * - 'fp16': 16-bit floating point (faster, less memory)
     * - 'q8': 8-bit quantized (fastest, smallest)
     */
    dtype?: 'fp32' | 'fp16' | 'q8';

    /**
     * Pooling strategy for combining token embeddings.
     * - 'mean': Average all token embeddings (default)
     * - 'cls': Use [CLS] token embedding
     */
    pooling?: 'mean' | 'cls';

    /**
     * Whether to normalize embeddings to unit length (L2 norm = 1).
     * Default: true
     */
    normalize?: boolean;
}

/**
 * HuggingFace vectorizer using Transformers.js for local inference.
 *
 * This vectorizer uses the @huggingface/transformers library to generate
 * embeddings locally without requiring API keys or external services.
 *
 * Models are automatically downloaded and cached on first use.
 *
 * @example
 * ```typescript
 * import { HuggingFaceVectorizer } from '@booleanhunter/redisvl';
 *
 * const vectorizer = new HuggingFaceVectorizer({
 *   model: 'Xenova/all-MiniLM-L6-v2'
 * });
 *
 * // Generate single embedding
 * const embedding = await vectorizer.embed('Hello world');
 * console.log(embedding.length); // 384
 *
 * // Generate multiple embeddings
 * const embeddings = await vectorizer.embedMany(['Hello', 'World']);
 * console.log(embeddings.length); // 2
 * ```
 *
 * @example
 * ```typescript
 * // Use with preprocessing
 * await index.load(documents, {
 *   preprocess: async (doc) => ({
 *     ...doc,
 *     embedding: await vectorizer.embed(doc.text)
 *   })
 * });
 * ```
 */
export class HuggingFaceVectorizer extends BaseVectorizer {
    private readonly config: Required<HuggingFaceConfig>;
    private pipelineInstance: any = null;
    private modelDims: number | null = null;

    constructor(config: HuggingFaceConfig) {
        super();

        if (!config.model || config.model.trim() === '') {
            throw new Error('Model name cannot be empty');
        }

        // Set defaults
        this.config = {
            model: config.model,
            device: config.device ?? 'cpu',
            dtype: config.dtype ?? 'fp32',
            pooling: config.pooling ?? 'mean',
            normalize: config.normalize ?? true,
        };
    }

    /**
     * Lazy load the Transformers.js pipeline.
     * This ensures the library is only loaded when actually needed.
     */
    private async loadPipeline(): Promise<any> {
        if (this.pipelineInstance) {
            return this.pipelineInstance;
        }

        try {
            const { pipeline } = await import('@huggingface/transformers');

            this.pipelineInstance = await pipeline('feature-extraction', this.config.model, {
                device: this.config.device,
                dtype: this.config.dtype,
            });

            return this.pipelineInstance;
        } catch (error) {
            if (error instanceof Error && error.message.includes('Cannot find module')) {
                throw new Error(
                    'HuggingFaceVectorizer requires @huggingface/transformers. ' +
                        'Install it with: npm install @huggingface/transformers'
                );
            }
            throw error;
        }
    }

    /**
     * Generate an embedding for a single text.
     */
    async embed(text: string): Promise<number[]> {
        const pipeline = await this.loadPipeline();

        const output = await pipeline(text, {
            pooling: this.config.pooling,
            normalize: this.config.normalize,
        });

        // Extract the embedding from the output
        const embedding = Array.from(output.data) as number[];

        // Cache dimensions on first call
        if (this.modelDims === null) {
            this.modelDims = embedding.length;
        }

        return embedding;
    }

    /**
     * Generate embeddings for multiple texts.
     */
    async embedMany(texts: string[], batchSize: number = 32): Promise<number[][]> {
        if (texts.length === 0) {
            return [];
        }

        const pipeline = await this.loadPipeline();
        const results: number[][] = [];

        // Process in batches for memory efficiency
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);

            // Process batch
            const batchOutputs = await Promise.all(
                batch.map((text) =>
                    pipeline(text, {
                        pooling: this.config.pooling,
                        normalize: this.config.normalize,
                    })
                )
            );

            // Extract embeddings from outputs
            const batchEmbeddings = batchOutputs.map(
                (output) => Array.from(output.data) as number[]
            );

            results.push(...batchEmbeddings);
        }

        // Cache dimensions on first call
        if (this.modelDims === null && results.length > 0) {
            this.modelDims = results[0].length;
        }

        return results;
    }

    /**
     * Get the dimensionality of the embeddings.
     */
    get dims(): number {
        if (this.modelDims === null) {
            throw new Error(
                'Embedding dimensions not yet determined. ' +
                    'Call embed() or embedMany() first to initialize the model.'
            );
        }
        return this.modelDims;
    }

    /**
     * Get the model name.
     */
    get model(): string {
        return this.config.model;
    }
}
