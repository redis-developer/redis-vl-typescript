---
sidebar_position: 3
---

# Search Index

The `SearchIndex` class is the main interface for managing Redis search indexes. It handles index creation, data loading, CRUD operations, and search queries.

## Creating an Index

```typescript
import { SearchIndex, IndexSchema } from '@redis/redisvl';
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

## Searching

:::info Coming Soon
Search query API with filters, vector search, and hybrid queries.
:::

## Error Handling

```typescript
import { RedisSearchError, SchemaValidationError } from '@redis/redisvl';

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
