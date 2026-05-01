---
sidebar_position: 1
---

# Introduction

**RedisVL** is your TypeScript toolkit for AI on Redis. **High-performance vector search engineered for scale.**

**Use RedisVL for:**

- **Schema-driven index management** - Define your data model once, use it everywhere
- **Vector search abstractions** - Simplified APIs for similarity search and hybrid queries
- **Advanced tuning** (coming soon) - Algorithm-specific parameters, distance normalization, hybrid policies
- **AI-native utilities** (coming soon) - Semantic caching, LLM memory, vectorizer integrations
- **Type safety** (coming soon) - Full TypeScript support with auto-complete and type checking
- **Production features** (coming soon)- Batch operations, validation, error handling, TTL management

---

## Installation

:::warning Not yet released
`redisvl` has not been published to npm yet. To try it out, clone the repo and link it locally:

```bash
git clone https://github.com/redis-developer/redis-vl-typescript.git
cd redis-vl-typescript
npm install
npm run build
npm link
# then in your project:
npm link redisvl
npm install redis
```

A published release will follow once the API stabilizes.
:::

## Prerequisites

You need **Redis Stack** (includes RediSearch and RedisJSON modules):

```bash
docker run -d -p 6379:6379 redis/redis-stack:latest
```

Or use [Redis Cloud](https://redis.com/try-free/) for a managed solution.

---

## Quick Start

```typescript
import { SearchIndex, IndexSchema } from 'redisvl';
import { createClient } from 'redis';

const client = createClient();
await client.connect();

// Define schema with vector field
const schema = IndexSchema.fromObject({
    index: { name: 'products', prefix: 'product:', storage_type: 'hash' },
    fields: [
        { name: 'title', type: 'text' },
        { name: 'category', type: 'tag' },
        { name: 'price', type: 'numeric' },
        {
            name: 'embedding',
            type: 'vector',
            attrs: {
                dims: 384,
                algorithm: 'hnsw',
                distanceMetric: 'cosine'
            }
        },
    ],
});

const index = new SearchIndex(schema, client);
await index.create();

// Load data with embeddings
await index.load([
    { title: 'Laptop', category: 'electronics', price: 999, embedding: [...] },
    { title: 'Phone', category: 'electronics', price: 599, embedding: [...] },
]);

// Vector search with filters
import { VectorQuery } from 'redisvl';

const query = new VectorQuery({
    vector: queryEmbedding,
    vectorField: 'embedding',
    filter: '@category:{electronics} @price:[0 1000]',
    numResults: 10,
});

const results = await index.search(query);
console.log(`Found ${results.total} products`);
```

---

## Core Capabilities

### 🎯 Index Management

- Schema design with YAML or TypeScript objects
- Automatic index creation and updates
- CRUD operations with validation
- Batch loading with configurable pipeline sizes

### 🔍 Vector Search

- Similarity search with metadata filters

**Coming soon**:

- Hybrid queries (vector + text + numeric)
- Multiple distance metrics (cosine, L2, IP)
- Distance normalization for user-friendly 0-1 similarity scores
- Algorithm-specific tuning (HNSW, FLAT, SVS-VAMANA)


### 🤖 AI Extensions (Coming soon)

- **Semantic Caching** - Cache LLM responses by semantic similarity
- **LLM Memory** - Manage conversation history for AI agents
- **Vectorizers** - HuggingFace, OpenAI, Cohere integrations
- **Semantic Routing** - Intent-based query classification

---

## Next Steps

### Learn the Basics

- **[Schema](./user-guide/schema)** - Define your data structure with fields and storage types
- **[Search Index](./user-guide/search-index)** - Create indexes, load data, and perform CRUD operations
- **[Vectorizers](./user-guide/vectorizers)** - Generate embeddings for semantic search

### Reference

- **[API Reference](./api/)** - Complete API documentation (auto-generated from code)
- **[GitHub Repository](https://github.com/redis-developer/redis-vl-typescript)** - Source code and issues
