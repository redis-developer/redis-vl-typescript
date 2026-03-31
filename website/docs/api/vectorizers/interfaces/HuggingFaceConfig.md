# Interface: HuggingFaceConfig

Defined in: [vectorizers/huggingface-vectorizer.ts:7](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/vectorizers/huggingface-vectorizer.ts#L7)

Configuration options for HuggingFaceVectorizer

## Properties

### device?

> `optional` **device?**: `"cpu"` \| `"webgpu"`

Defined in: [vectorizers/huggingface-vectorizer.ts:23](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/vectorizers/huggingface-vectorizer.ts#L23)

Device to run inference on.

- 'cpu': Run on CPU (default)
- 'webgpu': Run on GPU (if available)

---

### dtype?

> `optional` **dtype?**: `"fp32"` \| `"fp16"` \| `"q8"`

Defined in: [vectorizers/huggingface-vectorizer.ts:31](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/vectorizers/huggingface-vectorizer.ts#L31)

Data type for model weights.

- 'fp32': 32-bit floating point (default, best quality)
- 'fp16': 16-bit floating point (faster, less memory)
- 'q8': 8-bit quantized (fastest, smallest)

---

### model

> **model**: `string`

Defined in: [vectorizers/huggingface-vectorizer.ts:16](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/vectorizers/huggingface-vectorizer.ts#L16)

The Hugging Face model to use for embeddings.

Examples:

- 'Xenova/all-MiniLM-L6-v2' (384 dimensions, fast)
- 'Xenova/all-mpnet-base-v2' (768 dimensions, better quality)
- 'sentence-transformers/all-MiniLM-L6-v2'

---

### normalize?

> `optional` **normalize?**: `boolean`

Defined in: [vectorizers/huggingface-vectorizer.ts:44](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/vectorizers/huggingface-vectorizer.ts#L44)

Whether to normalize embeddings to unit length (L2 norm = 1).
Default: true

---

### pooling?

> `optional` **pooling?**: `"mean"` \| `"cls"`

Defined in: [vectorizers/huggingface-vectorizer.ts:38](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/vectorizers/huggingface-vectorizer.ts#L38)

Pooling strategy for combining token embeddings.

- 'mean': Average all token embeddings (default)
- 'cls': Use [CLS] token embedding
