---
sidebar_position: 3
---

# Search Index

The `SearchIndex` class is the main interface for managing Redis search indexes. It handles index creation, data loading, CRUD operations, and search queries.

## Creating an Index

```typescript
import { SearchIndex, IndexSchema } from 'redisvl';
import { createClient } from 'redis';

const client = createClient();
await client.connect();

const schema = IndexSchema.fromObject({
    index: {
        name: 'products',
        prefix: 'product:',
        storage_type: 'hash',
    },
    fields: [
        { name: 'title', type: 'text' },
        { name: 'category', type: 'tag' },
        { name: 'price', type: 'numeric' },
    ],
});

const index = new SearchIndex(schema, client);
await index.create();
```

## Loading an Existing Index

If an index already exists in Redis (for example, it was created by another
service or via `FT.CREATE`), you can load it into RedisVL using
`SearchIndex.fromExisting()`.

RedisVL reconstructs the schema using `FT.INFO` so you can use RedisVL APIs like
`fetch()`, `load()`, and `delete()`.

```typescript
import { SearchIndex } from 'redisvl';
import { createClient } from 'redis';

const client = createClient();
await client.connect();

// Load an existing index by name
const index = await SearchIndex.fromExisting('products', client);

// Optional sanity check
console.log('Index exists:', await index.exists());

// Fetch documents by ID (RedisVL builds the full Redis key using the index prefix)
const docs = await index.fetchMany(['prod-1', 'prod-2']);
console.log(docs);
```

## Loading Data

### With Explicit IDs

Use an existing field as the document ID:

```typescript
const products = [
    { id: 'prod-1', title: 'Laptop', category: 'electronics', price: 999 },
    { id: 'prod-2', title: 'Phone', category: 'electronics', price: 599 },
];

const keys = await index.load(products, { idField: 'id' });
// Keys: ['product:prod-1', 'product:prod-2']
```

### With Auto-Generated Keys

Let RedisVL generate unique IDs (ULID):

```typescript
const products = [
    { title: 'Laptop', category: 'electronics', price: 999 },
    { title: 'Phone', category: 'electronics', price: 599 },
];

const keys = await index.load(products);
// Keys: ['product:01HQZX...', 'product:01HQZY...']
```

### With Custom Keys

Provide your own key list:

```typescript
const keys = await index.load(products, {
    keys: ['product:custom-1', 'product:custom-2'],
});
```

### With Validation

Enable schema validation during load:

```typescript
const keys = await index.load(products, {
    validateOnLoad: true, // Throws error if data doesn't match schema
});
```

### With TTL

Set expiration time for documents:

```typescript
const keys = await index.load(products, {
    ttl: 3600, // Expire after 1 hour
});
```

### With Preprocessing

Transform data before storage:

```typescript
const keys = await index.load(products, {
    preprocess: (doc) => ({
        ...doc,
        title: doc.title.toUpperCase(),
        timestamp: Date.now(),
    }),
});
```

## CRUD Operations

### Fetch Documents

Retrieve single or multiple documents:

```typescript
// Fetch single document
const product = await index.fetch('prod-1');

// Fetch multiple documents
const products = await index.fetchMany(['prod-1', 'prod-2']);
```

### Update Documents

Re-load with the same key to update:

```typescript
await index.load([{ id: 'prod-1', title: 'Updated Laptop', category: 'electronics', price: 899 }], {
    idField: 'id',
});
```

### Delete Documents

Remove specific documents:

```typescript
await index.delete({ ids: ['prod-1', 'prod-2'] });
```

### Drop Index

Delete the entire index and all documents:

```typescript
await index.delete({ drop: true });
```

## Batch Operations

RedisVL automatically batches operations for performance:

```typescript
// Load 1000 documents in batches of 100
const keys = await index.load(largeDataset, {
    batchSize: 100, // Default: 100
});
```

## Vector Search

Perform semantic similarity search using vector embeddings.

### Basic Vector Search

```typescript
import { VectorQuery, HuggingFaceVectorizer } from 'redisvl';

// Create vectorizer
const vectorizer = new HuggingFaceVectorizer({
    model: 'Xenova/all-MiniLM-L6-v2',
});

// Generate query embedding
const queryEmbedding = await vectorizer.embed('laptop computer');

// Create vector query
const query = new VectorQuery({
    vector: queryEmbedding,
    vectorField: 'embedding',
    numResults: 10,
});

// Execute search
const results = await index.search(query);

// Process results
console.log(`Found ${results.total} results`);
results.documents.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.value.title} (score: ${doc.score})`);
});
```

### Vector Search with Filtering

Combine vector similarity with metadata filters:

```typescript
const query = new VectorQuery({
    vector: queryEmbedding,
    vectorField: 'embedding',
    filter: '@category:{electronics} @price:[0 1000]',
    numResults: 5,
    returnFields: ['title', 'price', 'category'],
});

const results = await index.search(query);
// Returns only electronics under $1000, ranked by similarity
```

### Pagination

Handle large result sets with pagination:

```typescript
const query = new VectorQuery({
    vector: queryEmbedding,
    vectorField: 'embedding',
    numResults: 100,
    offset: 20, // Skip first 20
    limit: 10, // Return next 10
});

const results = await index.search(query);
```

### Selecting Return Fields

Optimize performance by returning only needed fields:

```typescript
const query = new VectorQuery({
    vector: queryEmbedding,
    vectorField: 'embedding',
    returnFields: ['title', 'price'], // Only return these fields
    numResults: 10,
});

const results = await index.search(query);
// Each document only contains 'title' and 'price'
```

## Vector Search Algorithms

Redis supports two vector indexing algorithms. Choose based on your dataset size and accuracy requirements.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="hnsw" label="HNSW (Recommended)" default>

**Best for:** Large datasets (10,000+ vectors), production use

HNSW (Hierarchical Navigable Small World) provides fast approximate nearest neighbor search.

```typescript
import { HNSWVectorField } from 'redisvl';

const schema = new IndexSchema('products');
schema.addFields([
    new HNSWVectorField({
        name: 'embedding',
        dims: 384,
        distanceMetric: 'COSINE',
        m: 16,              // Connections per layer (default: 16)
        efConstruction: 200, // Build accuracy (default: 200)
    }),
]);
```

**Characteristics:**
- ✅ Fast queries on millions of vectors
- ✅ Configurable accuracy/speed tradeoff
- ✅ Supports tuning with `efRuntime` and `epsilon` parameters
- ⚠️ Approximate results (>95% recall typically)
- ⚠️ Higher memory usage

**When to use:**
- Dataset: 10,000+ vectors
- Speed matters more than perfect accuracy
- Production applications

</TabItem>

<TabItem value="flat" label="FLAT (Exact Search)">

**Best for:** Small datasets (under 10,000 vectors), 100% accuracy required

FLAT performs brute-force search computing distance to every vector.

```typescript
import { FlatVectorField } from 'redisvl';

const schema = new IndexSchema('products');
schema.addFields([
    new FlatVectorField({
        name: 'embedding',
        dims: 384,
        distanceMetric: 'COSINE',
        // No algorithm-specific parameters
    }),
]);
```

**Characteristics:**
- ✅ 100% recall (exact nearest neighbors)
- ✅ Simple and reliable
- ✅ Lower memory usage
- ❌ Slower for large datasets
- ❌ No performance tuning options

**When to use:**
- Dataset: Under 10,000 vectors
- Need exact results (no approximation)
- Development and testing

</TabItem>
</Tabs>

**Note:** The algorithm is defined in your schema during index creation. You cannot change it later without recreating the index. See [Schema Documentation](./schema#vector-fields) for more details.

### Distance Metrics

Specify the distance metric (must match schema):

```typescript
import { VectorDistanceMetric } from 'redisvl';

const query = new VectorQuery({
    vector: queryEmbedding,
    vectorField: 'embedding',
    distanceMetric: VectorDistanceMetric.COSINE, // COSINE, L2, or IP
    numResults: 10,
});
```

### Distance Normalization

Convert distance scores to user-friendly 0-1 similarity scores:

```typescript
const query = new VectorQuery({
    vector: queryEmbedding,
    vectorField: 'embedding',
    distanceMetric: VectorDistanceMetric.COSINE,
    normalizeDistance: true, // Convert to 0-1 range
    numResults: 10,
});

const results = await index.search(query);
results.documents.forEach((doc) => {
    // Score is now between 0 and 1 (1 = most similar)
    console.log(`Similarity: ${(doc.score * 100).toFixed(1)}%`);
});
```

**Why use normalization?**
- Different metrics return different ranges (COSINE: 0-2, L2: 0-∞, IP: -∞-∞)
- Normalized scores are easier to interpret in user-facing applications
- Enables consistent scoring across different metrics

**Note:** Works with all distance metrics (COSINE, L2, IP)

For more details on distance normalization and advanced parameters, see [Advanced Vector Search](./advanced-vector-search).

### Custom Score Alias

Customize the name of the distance score field:

```typescript
const query = new VectorQuery({
    vector: queryEmbedding,
    vectorField: 'embedding',
    scoreAlias: 'similarity', // Default is 'vector_distance'
    numResults: 10,
});

const results = await index.search(query);
results.documents.forEach((doc) => {
    console.log(`Score: ${doc.similarity}`); // ← Custom field name
});
```

## Error Handling

```typescript
import { RedisSearchError, SchemaValidationError } from 'redisvl';

try {
    await index.create();
} catch (error) {
    if (error instanceof RedisSearchError) {
        console.error('Index already exists or Redis error:', error.message);
    }
}

try {
    await index.load(invalidData, { validateOnLoad: true });
} catch (error) {
    if (error instanceof SchemaValidationError) {
        console.error('Data validation failed:', error.message);
    }
}
```

## Next Steps

- [Schema](./schema) - Define your data structure
- [Vectorizers](./vectorizers) - Generate embeddings
- [API Reference](../api/) - Complete API documentation
