---
sidebar_position: 4
---

# Vectorizers

Vectorizers convert text into numerical embeddings (vectors) for semantic similarity search. RedisVL provides built-in integrations with popular embedding models.

## HuggingFace Vectorizer

Generate embeddings locally using HuggingFace Transformers.js (no API key required):

```typescript
import { HuggingFaceVectorizer } from '@redis/redisvl';

const vectorizer = new HuggingFaceVectorizer({
    model: 'Xenova/all-MiniLM-L6-v2', // 384 dimensions
    normalize: true, // Normalize for cosine similarity
});

// Generate single embedding
const embedding = await vectorizer.embed('Hello world');
console.log(embedding.length); // 384

// Generate multiple embeddings
const embeddings = await vectorizer.embedMany([
    'First document',
    'Second document',
    'Third document',
]);
```

### Available Models

| Model                                          | Dimensions | Use Case               |
| ---------------------------------------------- | ---------- | ---------------------- |
| `Xenova/all-MiniLM-L6-v2`                      | 384        | General purpose, fast  |
| `Xenova/all-mpnet-base-v2`                     | 768        | Higher quality, slower |
| `Xenova/paraphrase-multilingual-MiniLM-L12-v2` | 384        | Multilingual support   |

:::note
First run downloads the model (~50MB). Subsequent runs use the cached model.
:::

## Using with Search Index

### Define Vector Field

Add a vector field to your schema:

```typescript
const schema = IndexSchema.fromObject({
    index: {
        name: 'documents',
        prefix: 'doc:',
        storage_type: 'hash',
    },
    fields: [
        { name: 'title', type: 'text' },
        { name: 'content', type: 'text' },
        {
            name: 'embedding',
            type: 'vector',
            attrs: {
                algorithm: 'hnsw',
                dims: 384, // Match vectorizer dimensions
                distance_metric: 'cosine',
                datatype: 'float32',
            },
        },
    ],
});
```

### Load Data with Embeddings

Use preprocessing to generate embeddings during load:

```typescript
const vectorizer = new HuggingFaceVectorizer({
    model: 'Xenova/all-MiniLM-L6-v2',
    normalize: true,
});

const documents = [
    { id: '1', title: 'Redis Guide', content: 'Redis is an in-memory database...' },
    { id: '2', title: 'Vector Search', content: 'Vector search enables semantic...' },
];

const keys = await index.load(documents, {
    idField: 'id',
    preprocess: async (doc) => ({
        ...doc,
        embedding: await vectorizer.embed(doc.content),
    }),
});
```

## Vector Search Algorithms

### FLAT Algorithm

Brute-force search, best for small datasets:

```typescript
{
  name: 'embedding',
  type: 'vector',
  attrs: {
    algorithm: 'flat',
    dims: 384,
    distance_metric: 'cosine',
    datatype: 'float32',
  }
}
```

**Characteristics:**

- ✅ 100% recall (finds exact nearest neighbors)
- ✅ Simple and reliable
- ❌ Slower for large datasets (>10K vectors)

### HNSW Algorithm

Approximate nearest neighbor search, best for large datasets:

```typescript
{
  name: 'embedding',
  type: 'vector',
  attrs: {
    algorithm: 'hnsw',
    dims: 384,
    distance_metric: 'cosine',
    datatype: 'float32',
    m: 16,              // Number of connections per layer
    ef_construction: 200, // Build-time accuracy
    ef_runtime: 10,      // Query-time accuracy
  }
}
```

**Characteristics:**

- ✅ Fast for large datasets (millions of vectors)
- ✅ Configurable accuracy/speed tradeoff
- ❌ Approximate results (may miss some neighbors)

## Distance Metrics

Choose based on your embedding model:

| Metric     | Formula              | Use Case                            |
| ---------- | -------------------- | ----------------------------------- |
| **COSINE** | `1 - (A·B)/(‖A‖‖B‖)` | Normalized embeddings (most common) |
| **L2**     | `√Σ(Aᵢ-Bᵢ)²`         | Euclidean distance                  |
| **IP**     | `-A·B`               | Inner product (for specific models) |

```typescript
{
  name: 'embedding',
  type: 'vector',
  attrs: {
    distance_metric: 'cosine'  // or 'l2' or 'ip'
  }
}
```

## Vector Search

:::info Coming Soon
Vector similarity search with KNN queries and hybrid search combining vectors with filters.
:::

## Error Handling

Handle vectorizer errors when generating embeddings:

```typescript
import { VectorizerError } from '@redis/redisvl';

try {
    const vectorizer = new HuggingFaceVectorizer({
        model: 'invalid-model-name',
    });
    const embedding = await vectorizer.embed('test');
} catch (error) {
    if (error instanceof VectorizerError) {
        console.error('Vectorizer error:', error.message);
    }
}
```

## Next Steps

- [Schema](./schema) - Define vector fields
- [Search Index](./search-index) - Load and search data
- [API Reference](../api/) - Complete API documentation
