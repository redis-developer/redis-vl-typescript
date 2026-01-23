<div align="center">
    <img width="300" src="https://raw.githubusercontent.com/redis/redis-vl-python/main/docs/_static/Redis_Logo_Red_RGB.svg" alt="Redis">
    <h1>Redis Vector Library</h1>
    <p><strong>The AI-native Redis TypeScript/Node.js client</strong></p>
</div>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Language](https://img.shields.io/badge/language-TypeScript-blue)
![Node Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)

**[Browse Recipes](https://github.com/redis-developer/redis-ai-resources)**

</div>

---

## Introduction

Redis Vector Library (RedisVL) is the production-ready TypeScript/Node.js client for AI applications built on Redis. **Lightning-fast vector search meets enterprise-grade reliability.**

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

Install `@redis/redisvl` into your Node.js (>=22.0.0) environment using `npm`:

```bash
npm install @redis/redisvl
```

Or using `yarn`:

```bash
yarn add @redis/redisvl
```

Or using `pnpm`:

```bash
pnpm add @redis/redisvl
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

### Index Management

#### Schema Definition

Design a schema for your use case that models your dataset with built-in Redis and indexable fields (_e.g. text, tags, numerics, geo, and vectors_).

**Load schema from a YAML file:**

```yaml
index:
    name: user-idx
    prefix: user
    storage_type: json

fields:
    - name: user
      type: tag
    - name: credit_score
      type: tag
    - name: job_title
      type: text
      attrs:
          sortable: true
    - name: embedding
      type: vector
      attrs:
          algorithm: flat
          dims: 4
          distance_metric: cosine
          datatype: float32
```

```typescript
import { IndexSchema } from '@redis/redisvl';

// Load from YAML file
const schema = await IndexSchema.fromYAML('schemas/schema.yaml');
```

**Or create from a plain object:**

```typescript
const schema = IndexSchema.fromObject({
    index: {
        name: 'user-idx',
        prefix: 'user',
        storage_type: 'json',
    },
    fields: [
        { name: 'user', type: 'tag' },
        { name: 'credit_score', type: 'tag' },
        {
            name: 'job_title',
            type: 'text',
            attrs: { sortable: true },
        },
        {
            name: 'embedding',
            type: 'vector',
            attrs: {
                algorithm: 'flat',
                datatype: 'float32',
                dims: 4,
                distance_metric: 'cosine',
            },
        },
    ],
});
```

#### Index Creation

Create a `SearchIndex` to manage your index in Redis:

```typescript
import { createClient } from 'redis';
import { SearchIndex } from '@redis/redisvl';

// Create and connect Redis client
const client = createClient({ url: 'redis://localhost:6379' });
await client.connect();

// Create SearchIndex with schema and client
const index = new SearchIndex(schema, client);

// Create the index in Redis
await index.create();

// Check if index exists
const exists = await index.exists(); // true

// Get index information
const info = await index.info();

// Delete index (keeps data)
await index.delete();

// Delete index and drop all associated data
await index.delete({ drop: true });
```

#### Data Loading & Retrieval

**Coming Soon**

Data loading and retrieval methods (`load()`, `fetch()`, etc.) are currently under development.

### Retrieval

**Coming Soon** - Query classes and search functionality are currently under development.

Define queries and perform advanced searches over your indices, including the combination of vectors, metadata filters, and more.

- **VectorQuery** - Flexible vector queries with customizable filters enabling semantic search (coming soon)
- **RangeQuery** - Vector search within a defined range paired with customizable filters (coming soon)
- **FilterQuery** - Standard search using filters and the full-text search (coming soon)
- **CountQuery** - Count the number of indexed records given attributes (coming soon)
- **TextQuery** - Full-text search with support for field weighting and BM25 scoring (coming soon)

### Dev Utilities

#### Vectorizers

**Coming Soon** - Vectorizer integrations are currently under development.

Integrate with popular embedding providers to greatly simplify the process of vectorizing unstructured data for your index and queries:

- AzureOpenAI (coming soon)
- Cohere (coming soon)
- Custom (coming soon)
- GCP VertexAI (coming soon)
- HuggingFace (coming soon)
- Mistral (coming soon)
- OpenAI (coming soon)
- VoyageAI (coming soon)

#### Rerankers

**Coming Soon** - Reranker integrations are currently under development.

Integrate with popular reranking providers to improve the relevancy of the initial search results from Redis.

### Extensions

**Coming Soon** - RedisVL Extensions are currently under development.

#### Semantic Caching

**Coming Soon**

Increase application throughput and reduce the cost of using LLM models in production by leveraging previously generated knowledge.

#### Semantic Routing

**Coming Soon**

Build fast decision models that run directly in Redis and route user queries to the nearest "route" or "topic".

#### Embedding Caching

**Coming Soon**

Reduce computational costs and improve performance by caching embedding vectors with their associated text and metadata.

#### LLM Memory

**Coming Soon**

Improve personalization and accuracy of LLM responses by providing user conversation context.

## Why RedisVL?

If you're building AI applications, you need a database that can keep up. Redis has been handling real-time workloads at scale for years, and now with vector search capabilities, it's a natural fit for AI use cases.

RedisVL makes it easy to work with Redis for AI applications. Instead of wrestling with low-level commands, you get a clean TypeScript API for the things you actually need: vector search, semantic caching, and conversation memory. It's built on top of the official [node-redis](https://github.com/redis/node-redis) client, so you get all the reliability and performance you'd expect, with an interface designed specifically for AI workloads.

## Helpful Links

For additional help, check out the following resources:

- [Redis AI Recipes](https://github.com/redis-developer/redis-ai-resources)

## Contributing

Please help us by contributing PRs, opening GitHub issues for bugs or new feature ideas, improving documentation, or increasing test coverage. Read more about how to contribute!
