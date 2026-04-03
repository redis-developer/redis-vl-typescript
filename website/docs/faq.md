---
sidebar_position: 6
---

# FAQ

## General Questions

### Is RedisVL a replacement for the Redis client?

No - RedisVL enhances the Redis client library by specializing in AI workloads. RedisVL and the Redis client work at different abstraction levels.

The Redis client provides low-level access to all Redis commands, while RedisVL works with the redis client to provide high-level AI-focused features like vector search, schema management, and vectorizer integrations.

**RedisVL provides:**

- High-level abstractions for vector search and AI workloads
- Schema management and validation
- Vectorizer integrations (HuggingFace, OpenAI, etc.)
- Type-safe query builders

**The Redis client provides:**

- Low-level Redis commands
- Connection management
- Pub/Sub, transactions, Lua scripts
- Direct access to all Redis features

**You need both:**

```typescript
import { createClient } from 'redis';
import { SearchIndex, IndexSchema } from 'redisvl';

const client = await createClient().connect();
const index = new SearchIndex(schema, client); // RedisVL uses the client
```

---

### When should I use RedisVL vs the native Redis client?

**Use RedisVL when:**

- Building AI/ML applications with vector search
- Managing complex search schemas with multiple field types
- Generating embeddings with HuggingFace, OpenAI, etc.
- Need type-safe query builders for filters and vector search
- Want validation and preprocessing for document loading

**Use the native Redis client when:**

- You need direct access to Redis commands
- Working with basic key-value operations
- Using Redis features outside of search (pub/sub, streams, etc.)
- Need maximum performance with minimal overhead
- Building custom abstractions

**Best practice:** Use RedisVL for search/AI features, and the native client for everything else.

---

### Can I use RedisVL with my existing Redis instance?

Yes! RedisVL works with any Redis instance that has **RediSearch** and **RedisJSON** modules installed.

**Requirements:**

- Redis 7.2+ (or Redis Stack)
- RediSearch module
- RedisJSON module (for JSON storage type)

**Check if modules are installed:**

```bash
redis-cli MODULE LIST
```

You should see `search` and `ReJSON` in the output.

---

### What's the difference between RedisVL and RedisOM?

Both are higher-level libraries for Redis, but they serve different purposes:

| Feature           | RedisVL                        | RedisOM                       |
| ----------------- | ------------------------------ | ----------------------------- |
| **Focus**         | Vector search & AI workloads   | Object mapping (ORM-like)     |
| **Schema**        | YAML/JSON-based, flexible      | Class-based decorators        |
| **Vector Search** | Full support with KNN, filters | Basic support                 |
| **Vectorizers**   | Built-in (HuggingFace, OpenAI) | Not included                  |
| **Use Case**      | Semantic search, RAG, AI apps  | Traditional CRUD with objects |

**Choose RedisVL if:** You're building AI/ML applications with embeddings and semantic search.

**Choose RedisOM if:** You want an ORM-like experience for traditional data modeling.

---

## Vector Search

### What vector algorithms does RedisVL support?

RedisVL supports all vector index algorithms available in RediSearch:

1. **FLAT** - Brute-force exact search (100% recall, slower)
2. **HNSW** - Approximate nearest neighbor (fast, ~95-99% recall)

**HNSW is recommended** for most production use cases as it provides excellent recall with much better performance.

---

### How do I choose between HASH and JSON storage?

**Use HASH storage when:**

- You have simple, flat data structures
- Maximum performance is critical
- All fields are at the top level (no nesting)
- Working with simple key-value pairs

**Use JSON storage when:**

- You have nested or hierarchical data
- Need to query nested fields (e.g., `metadata.rating`)
- Want to preserve data types (arrays, booleans, numbers)
- Need flexibility for complex document structures

**Performance:** HASH is slightly faster, but JSON provides more flexibility. For most use cases, the difference is negligible.

---

### How many vectors can I store?

Redis can handle **millions to billions** of vectors, depending on:

- Available memory (vectors are stored in RAM)
- Vector dimensions (higher dimensions = more memory)
- Index algorithm (HNSW has additional memory overhead)

**Memory calculation:**

```
Memory per vector ≈ dimensions × 4 bytes (float32)
Example: 1M vectors × 384 dims × 4 bytes = ~1.5 GB
```

Plus index overhead (HNSW adds ~50-100% more memory).

---

## Performance

### How fast is vector search?

Performance depends on several factors:

**Query latency (typical):**

- 1-10ms for indices with &lt;100K vectors
- 10-50ms for indices with 100K-1M vectors
- 50-200ms for indices with &gt;1M vectors

**Factors affecting performance:**

- Number of vectors in the index
- Vector dimensions (higher = slower)
- `numResults` parameter (more results = slower)
- Filters (selective filters are faster)
- Algorithm (HNSW is much faster than FLAT)

**Tip:** Use the `efRuntime` parameter to tune HNSW recall vs speed tradeoff.

---

### How do I optimize search performance?

**For HNSW indices:**

1. Tune `efRuntime` - Lower = faster but lower recall
2. Adjust `m` and `efConstruction` during index creation
3. Use selective filters to reduce search space

**General tips:**

1. Only return fields you need (`returnFields` parameter)
2. Use pagination to limit results
3. Consider using smaller vector dimensions if possible
4. Ensure sufficient RAM (avoid swapping to disk)
