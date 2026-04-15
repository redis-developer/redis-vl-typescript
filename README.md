<div align="center">
    <img width="300" src="https://redis.io/wp-content/uploads/2024/04/Logotype.svg" alt="Redis">
    <h1>Redis Vector Library</h1>
    <p><strong>The AI-native Redis TypeScript/Node.js client</strong></p>
</div>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Language](https://img.shields.io/badge/language-TypeScript-blue)
![Node Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)
![Status](https://img.shields.io/badge/status-beta-orange)

**[Browse Recipes](https://github.com/redis-developer/redis-ai-resources)**

</div>

---

> **⚠️** RedisVL TypeScript is in active development. APIs may change before v1.0 release.

---

## Introduction

Redis Vector Library (RedisVL) is the TypeScript/Node.js client for building AI applications on Redis.

<div align="center">

|                                 **Core Capabilities**                                 |                                  **AI Extensions**                                  |                            **Dev Utilities**                             |
| :-----------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------: | :----------------------------------------------------------------------: |
| **[Index Management](#index-management)**<br/>_Schema design, data loading, CRUD ops_ | **[Semantic Caching](#semantic-caching)**<br/>_Reduce LLM costs & boost throughput_ | **[Vectorizers](#vectorizers)**<br/>_8+ embedding provider integrations_ |
|     **[Vector Search](#retrieval)**<br/>_Similarity search with metadata filters_     |          **[LLM Memory](#llm-memory)**<br/>_Agentic AI context management_          |    **[Rerankers](#rerankers)**<br/>_Improve search result relevancy_     |
|       **[Hybrid Queries](#retrieval)**<br/>_Vector + text + metadata combined_        |  **[Semantic Routing](#semantic-routing)**<br/>_Intelligent query classification_   |                                                                          |
|    **[Multi-Query Types](#retrieval)**<br/>_Vector, Range, Filter, Count queries_     |  **[Embedding Caching](#embedding-caching)**<br/>_Cache embeddings for efficiency_  |                                                                          |

</div>

### Built for Modern AI Workloads

RedisVL helps you build production-ready AI applications:

- **RAG Pipelines** - Combine vector similarity search with metadata filtering to retrieve the most relevant context for your LLMs
- **Semantic Caching** - Cache LLM responses based on semantic similarity to improve response times and reduce costs
- **AI Agents** - Give your agents memory that persists across conversations and sessions, with semantic routing for quick intelligent decision-making
- **Recommendation Systems** - Find similar items quickly and rerank results based on user preferences or business logic

## Getting Started

Install `redisvl` into your Node.js (>=22.0.0) environment using `npm`:

```bash
npm install redisvl
```

Or using `yarn`:

```bash
yarn add redisvl
```

Or using `pnpm`:

```bash
pnpm add redisvl
```

### Redis

Choose from multiple Redis deployment options:

1. [Redis Cloud](https://redis.io/try-free): Managed cloud database (free tier available)
2. [Redis Stack](https://redis.io/docs/getting-started/install-stack/docker/): Docker image for development

    ```bash
    docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest
    ```

3. [Redis Enterprise](https://redis.io/enterprise/): Commercial, self-hosted database
4. [Redis Sentinel](https://redis.io/docs/management/sentinel/): High availability with automatic failover

    ```typescript
    // Connect via Sentinel
    const redisUrl = 'redis+sentinel://sentinel1:26379,sentinel2:26379/mymaster';
    ```

5. [Azure Managed Redis](https://azure.microsoft.com/en-us/products/managed-redis): Fully managed Redis Enterprise on Azure

> Enhance your experience and observability with the free [Redis Insight GUI](https://redis.io/insight/).

## Overview

RedisVL is a TypeScript client for building AI applications on Redis. It sits on top of [node-redis](https://github.com/redis/node-redis) and handles the common patterns you need: managing indexes, loading data, generating embeddings, vector search, and techniques like semantic caching and LLM memory to improve the performance of your AI applications at scale.

**What it does:**

- **Schema Management** - Define indexes with YAML or objects
- **Vector Search** - Semantic similarity search with metadata filtering
- **Data Operations** - Batch loading with validation, TTL, and preprocessing
- **Embeddings** - Generate vectors with HuggingFace (local, no API key)
- **Type Safety** - Full TypeScript support

📚 **[Read the full documentation →](https://redis-developer.github.io/docs/redis-vl-typescript/)**

## Features

### Schema Definition

Define your data structure with fields for text, tags, numbers, geo locations, and vectors:

```typescript
import { IndexSchema } from 'redisvl';

const schema = IndexSchema.fromObject({
    index: { name: 'products', prefix: 'product:', storage_type: 'json' },
    fields: [
        { name: 'title', type: 'text' },
        { name: 'category', type: 'tag' },
        { name: 'price', type: 'numeric' },
        {
            name: 'embedding',
            type: 'vector',
            attrs: { algorithm: 'hnsw', dims: 768, distance_metric: 'cosine' },
        },
    ],
});
```

**[Learn more about schemas →](https://redis-developer.github.io/docs/redis-vl-typescript/docs/user-guide/schema)**

### Index Operations

Create and manage search indexes:

```typescript
import { createClient } from 'redis';
import { SearchIndex } from 'redisvl';

const client = createClient();
await client.connect();

const index = new SearchIndex(schema, client);
await index.create();
```

**[Learn more about indexes →](https://redis-developer.github.io/docs/redis-vl-typescript/docs/user-guide/search-index)**

### Data Loading & Retrieval

Load documents and retrieve them by key:

```typescript
const documents = [
    { id: '1', title: 'Product A', price: 99 },
    { id: '2', title: 'Product B', price: 149 },
];

// Load with explicit IDs
await index.load(documents, { idField: 'id' });

// Fetch documents
const doc = await index.fetch('1');
const docs = await index.fetchMany(['1', '2']);
```

**[Learn more about CRUD operations →](https://redis-developer.github.io/docs/redis-vl-typescript/docs/user-guide/search-index#crud-operations)**

### Vector Search

Perform semantic similarity search:

```typescript
import { VectorQuery } from 'redisvl';

// Create query
const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding',
    filter: '@category:{electronics}',
    numResults: 10,
});

// Execute search
const results = await index.search(query);
results.documents.forEach((doc) => {
    console.log(`${doc.value.title} (score: ${doc.score})`);
});
```

**[Learn more about vector search →](https://redis-developer.github.io/docs/redis-vl-typescript/docs/user-guide/search-index#vector-search)**

### Vectorizers

Generate embeddings for semantic search:

```typescript
import { HuggingFaceVectorizer } from 'redisvl';

const vectorizer = new HuggingFaceVectorizer({
    model: 'Xenova/all-MiniLM-L6-v2',
});

const embedding = await vectorizer.embed('Hello world');

// Use with data loading
await index.load(documents, {
    preprocess: async (doc) => ({
        ...doc,
        embedding: await vectorizer.embed(doc.content),
    }),
});
```

**[Learn more about vectorizers →](https://redis-developer.github.io/docs/redis-vl-typescript/docs/user-guide/vectorizers)**

## Coming Soon

- **Hybrid Search** - Combine vector, text, and numeric filters
- **Range Queries** - Vector search within distance range
- **Semantic Caching** - Cache LLM responses by similarity
- **LLM Memory** - Context management for AI agents
- **Semantic Routing** - Intent-based query classification
- **More Vectorizers** - OpenAI, Cohere, Azure, VertexAI
- **Rerankers** - Improve search result relevancy

## Helpful Links

For additional help, check out the following resources:

- [Redis AI Recipes](https://github.com/redis-developer/redis-ai-resources)
