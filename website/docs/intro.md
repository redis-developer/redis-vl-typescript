---
sidebar_position: 1
---

# Introduction

**RedisVL** is the production-ready TypeScript client for AI applications built on Redis. **Lightning-fast vector search meets enterprise-grade reliability.**

## What is RedisVL?

RedisVL is **not** a replacement for the Redis client. It's a **higher-level library** that sits on top of the native Redis client, providing:

- **Schema-driven index management** - Define your data model once, use it everywhere
- **Vector search abstractions** - Simplified APIs for similarity search and hybrid queries
- **AI-native utilities** - Semantic caching, LLM memory, vectorizer integrations
- **Type safety** - Full TypeScript support with auto-complete and type checking
- **Production features** - Batch operations, validation, error handling, TTL management

---

## Installation

```bash
npm install @redis/redisvl redis
```

## Prerequisites

You need **Redis Stack** (includes RediSearch and RedisJSON modules):

```bash
docker run -d -p 6379:6379 redis/redis-stack:latest
```

Or use [Redis Cloud](https://redis.com/try-free/) for a managed solution.

---

## Quick Start

```typescript
import { SearchIndex, IndexSchema } from '@redis/redisvl';
import { createClient } from 'redis';

const client = createClient();
await client.connect();

// Define schema once
const schema = IndexSchema.fromObject({
    index: { name: 'products', prefix: 'product:', storage_type: 'hash' },
    fields: [
        { name: 'title', type: 'text' },
        { name: 'category', type: 'tag' },
        { name: 'price', type: 'numeric' },
    ],
});

const index = new SearchIndex(schema, client);
await index.create();

// Load data with validation and batching
await index.load([
    { title: 'Laptop', category: 'electronics', price: 999 },
    { title: 'Phone', category: 'electronics', price: 599 },
]);

// Search with type-safe API
const results = await client.ft.search('products', '@category:{electronics}');
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
- Hybrid queries (vector + text + numeric)
- Multiple distance metrics (cosine, L2, IP)
- Range queries and filtering

### 🤖 AI Extensions

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
