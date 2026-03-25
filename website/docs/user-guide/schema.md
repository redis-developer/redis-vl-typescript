---
sidebar_position: 2
---

# Schema

Schema in RedisVL provides a structured format to define index settings and field configurations. A schema consists of three main components:

| Component   | Description                                                     |
| ----------- | --------------------------------------------------------------- |
| **index**   | Index-specific settings like name, key prefix, and storage type |
| **fields**  | Field definitions with types and attributes                     |
| **version** | Schema version (currently `0.1.0`)                              |

## Creating a Schema

### From Object

The most common way to create a schema is using `IndexSchema.fromObject()`:

```typescript
import { IndexSchema } from '@redis/redisvl';

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
```

### From YAML

For complex schemas, YAML files provide better readability:

```yaml
# schema.yaml
version: '0.1.0'

index:
  name: products
  prefix: product:
  storage_type: hash

fields:
  - name: title
    type: text
  - name: category
    type: tag
  - name: price
    type: numeric
```

```typescript
const schema = IndexSchema.fromYAML('schema.yaml');
```

### Programmatically

Build schemas dynamically by adding fields:

```typescript
const schema = new IndexSchema({
    name: 'products',
    prefix: 'product:',
    storageType: 'hash',
});

// Add single field
schema.addField({ name: 'title', type: 'text' });

// Add multiple fields
schema.addFields([
    { name: 'category', type: 'tag' },
    { name: 'price', type: 'numeric' },
    {
        name: 'embedding',
        type: 'vector',
        attrs: { dims: 768, algorithm: 'hnsw', distance_metric: 'cosine' },
    },
]);
```

## Field Types

RedisVL supports several field types for different data:

### Text Fields

Full-text search with stemming and phonetic matching:

```typescript
{
  name: 'description',
  type: 'text',
  attrs: {
    weight: 2.0,        // Boost importance in search
    no_stem: false,     // Enable stemming
  }
}
```

### Tag Fields

Exact-match filtering for categorical data:

```typescript
{
  name: 'category',
  type: 'tag',
  attrs: {
    separator: ',',      // Multi-value separator
    case_sensitive: false
  }
}
```

### Numeric Fields

Range queries and sorting:

```typescript
{
  name: 'price',
  type: 'numeric',
  attrs: {
    sortable: true
  }
}
```

### Geo Fields

Location-based search:

```typescript
{
  name: 'location',
  type: 'geo'
}
```

### Vector Fields

Semantic similarity search:

```typescript
{
  name: 'embedding',
  type: 'vector',
  attrs: {
    algorithm: 'hnsw',
    dims: 768,
    distance_metric: 'cosine',
    datatype: 'float32'
  }
}
```

## Storage Types

### HASH Storage

Best for simple, flat data structures:

```typescript
{
  index: {
    name: 'users',
    storage_type: 'hash'
  }
}
```

**Characteristics:**

- ✅ Fast and memory-efficient
- ✅ Good for simple key-value pairs
- ❌ Cannot store nested objects or arrays
- ❌ All values stored as strings

### JSON Storage

Best for complex, nested data:

```typescript
{
  index: {
    name: 'users',
    storage_type: 'json'
  },
  fields: [
    { name: 'name', type: 'text' },
    { name: 'address.city', type: 'text' },  // Nested field
    { name: 'tags', type: 'tag' }            // Array support
  ]
}
```

**Characteristics:**

- ✅ Supports nested objects and arrays
- ✅ Type preservation (numbers, booleans)
- ✅ JSONPath queries
- ❌ Slightly higher memory usage

## Error Handling

Schema validation errors are thrown when invalid field configurations are provided:

```typescript
import { SchemaValidationError } from '@redis/redisvl';

try {
    const schema = IndexSchema.fromObject({
        index: { name: 'test', prefix: 'doc:', storage_type: 'hash' },
        fields: [
            { name: 'embedding', type: 'vector', attrs: { dims: -1 } }, // Invalid dims
        ],
    });
} catch (error) {
    if (error instanceof SchemaValidationError) {
        console.error('Invalid schema:', error.message);
    }
}
```

## Next Steps

- [Search Index](./search-index) - Create and manage indexes
- [Vectorizers](./vectorizers) - Generate embeddings
- [API Reference](../api/) - Complete API documentation
