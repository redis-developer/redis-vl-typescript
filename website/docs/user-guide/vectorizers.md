---
sidebar_position: 4
---

# Vectorizers

Vectorizers convert text into numerical embeddings (vectors) for semantic similarity search. RedisVL provides built-in integrations with popular embedding models.

## HuggingFace Vectorizer

Generate embeddings locally using HuggingFace Transformers.js (no API key required):

```typescript
import { HuggingFaceVectorizer } from 'redisvl';

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

## Batch Embedding

Generate embeddings for multiple documents efficiently:

```typescript
const vectorizer = new HuggingFaceVectorizer({
    model: 'Xenova/all-MiniLM-L6-v2',
});

const documents = [
    'Redis is an in-memory database',
    'Vector search enables semantic similarity',
    'Machine learning models generate embeddings',
];

// Generate all embeddings at once
const embeddings = await vectorizer.embedMany(documents);
console.log(embeddings.length); // 3
console.log(embeddings[0].length); // 384
```

## Normalization

Enable normalization for cosine similarity:

```typescript
const vectorizer = new HuggingFaceVectorizer({
    model: 'Xenova/all-MiniLM-L6-v2',
    normalize: true, // Normalizes vectors to unit length
});

const embedding = await vectorizer.embed('Hello world');
// Vector is normalized: √(Σxᵢ²) = 1.0
```

**When to normalize:**
- ✅ Using COSINE distance metric (recommended)
- ✅ Comparing vectors from different sources
- ❌ Using L2 distance (normalization changes distances)
- ❌ Using Inner Product with specific requirements

## Error Handling

Handle vectorizer errors when generating embeddings:

```typescript
import { VectorizerError } from 'redisvl';

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

- [Schema](./schema) - Define vector fields and choose algorithms
- [Search Index](./search-index) - Perform vector search with your embeddings
- [Advanced Vector Search](./advanced-vector-search) - Tune search performance
- [API Reference](../api/) - Complete API documentation
