---
sidebar_position: 4
---

# Advanced Vector Search

This guide covers advanced vector search features for production deployments, including distance normalization, performance tuning, and algorithm-specific parameters.

## Distance Normalization

Different distance metrics return different ranges making scores hard to interpret:
- **COSINE**: 0 to 2 (0 = identical, 2 = opposite)
- **L2**: 0 to ∞ (0 = identical, larger = more different)
- **IP** (Inner Product): -∞ to ∞ (larger = more similar)

The `normalizeDistance` parameter converts all scores to a 0-1 similarity range where **1 = most similar** and **0 = least similar**.

### Basic Usage

```typescript
import { VectorQuery, VectorDistanceMetric } from 'redisvl';

const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding',
    distanceMetric: VectorDistanceMetric.COSINE,
    normalizeDistance: true, // Convert to 0-1 similarity scores
    numResults: 10,
});

const results = await index.search(query);
results.documents.forEach((doc) => {
    console.log(`Similarity: ${doc.score.toFixed(3)}`); // 0.0 to 1.0
});
```

### When to Use Distance Normalization

✅ **Use when:**
- Displaying similarity scores to users (e.g., "95% match" in search results)
- Comparing results across different distance metrics
- Need consistent 0-1 score ranges for thresholding or ranking
- Building recommendation systems where similarity percentage matters
- A/B testing or analytics where scores need to be interpretable

⚠️ **Consider not using when:**
- Using Inner Product (IP) with non-normalized vectors (results may be unreliable)
- Need raw distances for debugging or mathematical analysis
- Performance is critical (adds minimal overhead but still post-processing)
- Working with algorithms that expect raw distance values

### Distance Metric Normalization

**COSINE Distance:**
```
similarity = 1 - (distance / 2)
```

**L2 Distance:**
```
similarity = 1 / (1 + distance)
```

**Inner Product (IP):**
```
// Only works reliably with normalized vectors
similarity = (distance + 1) / 2
```

### Example with Different Metrics

<Tabs>
<TabItem value="cosine" label="COSINE (Recommended)" default>

**Best for:** Most semantic search use cases, text embeddings

```typescript
import { VectorQuery, VectorDistanceMetric } from 'redisvl';

const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding',
    distanceMetric: VectorDistanceMetric.COSINE,
    normalizeDistance: true,
    numResults: 5,
});

const results = await index.search(query);
// Scores in [0, 1] range where 1 = most similar
```

**Why use COSINE:**
- Works well with embeddings from language models
- Handles different vector magnitudes
- Most common choice for semantic search

</TabItem>

<TabItem value="l2" label="L2 (Euclidean)">

**Best for:** Clustering, exact matching, image embeddings

```typescript
import { VectorQuery, VectorDistanceMetric } from 'redisvl';

const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding',
    distanceMetric: VectorDistanceMetric.L2,
    normalizeDistance: true,
    numResults: 5,
});

const results = await index.search(query);
// Scores in [0, 1] range where 1 = most similar
```

**Why use L2:**
- Actual geometric distance between vectors
- Good for computer vision tasks
- Sensitive to vector magnitude

</TabItem>

<TabItem value="ip" label="IP (Inner Product)">

**Best for:** Pre-normalized vectors, maximum inner product search (MIPS)

```typescript
import { VectorQuery, VectorDistanceMetric } from 'redisvl';

const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding',
    distanceMetric: VectorDistanceMetric.IP,
    normalizeDistance: true, // ⚠️ Only reliable with normalized vectors
    numResults: 5,
});

const results = await index.search(query);
// Scores in [0, 1] range where 1 = most similar
```

**Why use IP:**
- Faster than COSINE for normalized vectors
- Use when all vectors are unit length
- ⚠️ Warning: Normalization with IP requires vectors to be normalized

</TabItem>
</Tabs>

## HNSW Algorithm Tuning

HNSW (Hierarchical Navigable Small World) is the most popular vector index algorithm. These parameters control the accuracy vs speed tradeoff during search.

### efRuntime Parameter

Controls the size of the dynamic candidate list during search. **Higher values = better recall but slower queries.**

```typescript
const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding',
    efRuntime: 200, // Default varies by index size
    numResults: 10,
});
```

**Guidelines:**
- Small indexes (under 10,000 vectors): `efRuntime = 100-200`
- Medium indexes (10,000 to 1M vectors): `efRuntime = 200-500`
- Large indexes (over 1M vectors): `efRuntime = 500-1000`
- Rule of thumb: Start with 2-5x your `numResults`

### epsilon Parameter

Enables approximate range search with a tolerance factor.

```typescript
const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding',
    epsilon: 0.01, // 1% tolerance
    numResults: 10,
});
```

**Use cases:**
- Range-based queries where exact ranking isn't critical
- Trading precision for speed
- Large-scale approximate nearest neighbor search

### Combined HNSW Tuning

```typescript
const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding',
    efRuntime: 300,
    epsilon: 0.01,
    numResults: 10,
});
```

## Hybrid Search Policy

When combining vector search with metadata filters, the query execution policy significantly impacts performance.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### hybridPolicy Parameter

<Tabs>
<TabItem value="batches" label="BATCHES Policy" default>

**Best for:** Selective filters (filter keeps FEW documents)

Iteratively searches vector index in batches, filtering results until K matches found.

```typescript
import { VectorQuery } from 'redisvl';

const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding',
    filter: '@category:{electronics}', // Keeps only 10% of data
    hybridPolicy: 'BATCHES',
    numResults: 10,
});
```

**When to use (selective filters):**
- Filter keeps minority of documents
- Example: `@category:{niche_category}` keeps 5% of docs
- Example: `@isPremium:{true}` when only 10% are premium
- Result: Small candidate set (e.g., 10,000 out of 100,000 docs)

**How it works:** Vector search in batches → filter each batch → stop when K results found

**Performance:** Fast when filter is selective (keeps few docs)

</TabItem>

<TabItem value="adhoc" label="ADHOC_BF Policy">

**Best for:** Non-selective filters (filter keeps MOST documents)

Computes vector scores for all documents passing the filter (brute force on filtered set).

```typescript
import { VectorQuery } from 'redisvl';

const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding',
    filter: '@price:[0 1000000]', // Keeps 95% of data
    hybridPolicy: 'ADHOC_BF',
    numResults: 10,
});
```

**When to use (non-selective filters):**
- Filter keeps majority of documents
- Example: `@price:[0 1000000]` when most items are under $1M (keeps 95%)
- Example: `@inStock:{true}` when 90% of items are in stock
- Result: Large candidate set (e.g., 90,000 out of 100,000 docs)

**How it works:** Filter first → compute vector scores for all filtered docs → return top K

**Performance:** Fast when filter is non-selective (keeps most docs)

</TabItem>
</Tabs>

**Impact:** Choosing the wrong policy can result in 5-10x slower queries!

**Rule of Thumb:**
- **Selective filter** (keeps FEW docs) → Use **BATCHES**
- **Non-selective filter** (keeps MOST docs) → Use **ADHOC_BF**

### batchSize Parameter

When using `BATCHES` policy, control the batch processing size:

```typescript
const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding',
    filter: '@category:{electronics}',
    hybridPolicy: 'BATCHES',
    batchSize: 100, // Process 100 documents per batch
    numResults: 10,
});
```

**Guidelines:**
- Default: Redis determines automatically
- Small batches (50-100): Better memory usage
- Large batches (500-1000): Better throughput
- **Note:** Only works with `BATCHES` policy

## SVS-VAMANA Algorithm Tuning

SVS-VAMANA is Redis's newest algorithm optimized for billion-scale vector search. These parameters are only relevant if your index uses VAMANA.

### searchWindowSize Parameter

Controls the search window size for KNN queries.

```typescript
const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding',
    searchWindowSize: 100,
    numResults: 10,
});
```

**Guidelines:**
- Larger values improve recall but increase latency
- Start with 2-5x your `numResults`
- Tune based on your recall requirements

### useSearchHistory Parameter

Controls whether to use search history for improved performance.

```typescript
const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding',
    useSearchHistory: 'AUTO', // 'OFF', 'ON', or 'AUTO'
    numResults: 10,
});
```

**Options:**
- `OFF`: Disable search history
- `ON`: Always use search history
- `AUTO`: Let Redis decide based on query patterns (recommended)

### searchBufferCapacity Parameter

Tunes the internal buffer for compressed vectors.

```typescript
const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding',
    searchBufferCapacity: 1000,
    numResults: 10,
});
```

**Guidelines:**
- Higher values: Better performance with memory overhead
- Lower values: Lower memory with potential performance cost
- Typically: 100-2000 depending on your workload

### Combined VAMANA Tuning

```typescript
const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding',
    searchWindowSize: 200,
    useSearchHistory: 'AUTO',
    searchBufferCapacity: 1000,
    numResults: 10,
});
```

## Complete Production Example

Here's a production-ready query combining multiple advanced features:

```typescript
import { VectorQuery, VectorDistanceMetric, HuggingFaceVectorizer } from 'redisvl';

// Generate embedding
const vectorizer = new HuggingFaceVectorizer({
    model: 'Xenova/all-MiniLM-L6-v2',
});
const queryEmbedding = await vectorizer.embed('laptop computer');

// Create optimized query
const query = new VectorQuery({
    // Basic parameters
    vector: queryEmbedding,
    vectorField: 'embedding',
    numResults: 20,
    returnFields: ['title', 'price', 'category'],

    // Distance normalization for user-friendly scores
    distanceMetric: VectorDistanceMetric.COSINE,
    normalizeDistance: true,

    // HNSW tuning for better recall
    efRuntime: 300,

    // Hybrid search with high-selectivity filter
    filter: '@category:{electronics} @price:[0 1000]',
    hybridPolicy: 'BATCHES',
    batchSize: 100,
});

// Execute search
const results = await index.search(query);

// Process results with normalized scores
results.documents.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.value.title}`);
    console.log(`   Similarity: ${(doc.score * 100).toFixed(1)}%`);
    console.log(`   Price: $${doc.value.price}`);
});
```

## Performance Tuning Checklist

### Before Production

- [ ] Test different `efRuntime` values to find accuracy/speed balance
- [ ] Choose correct `hybridPolicy` based on filter selectivity
- [ ] Enable `normalizeDistance` if you need interpretable 0-1 similarity scores
- [ ] Set appropriate `batchSize` for your workload
- [ ] Monitor query latency and adjust parameters

### Monitoring

Track these metrics:
- Query latency (p50, p95, p99)
- Recall rate (if you have ground truth)
- Filter selectivity (% of data matching filter)
- Memory usage with different buffer sizes

### Common Issues

**Slow queries with filters:**
- Try switching `hybridPolicy` (BATCHES ↔ ADHOC_BF)
- Increase `batchSize` if using BATCHES
- Check filter selectivity

**Low recall:**
- Increase `efRuntime` (HNSW)
- Increase `searchWindowSize` (VAMANA)
- Verify distance metric matches index

**High memory usage:**
- Decrease `searchBufferCapacity` (VAMANA)
- Decrease `batchSize`
- Use smaller `efRuntime`

## Next Steps

- [Search Index](./search-index) - Basic vector search
- [Schema](./schema) - Define vector fields
- [Vectorizers](./vectorizers) - Generate embeddings
- [API Reference](../api/) - Complete API documentation

