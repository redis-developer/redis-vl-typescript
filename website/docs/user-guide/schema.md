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
import { IndexSchema } from 'redisvl';

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

Semantic similarity search using vector embeddings. RedisVL provides **three approaches** to define vector fields.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="object" label="Object-Based" default>

**Best for:** Prototypes, config files, quick development

Simple and concise for basic vector fields:

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

**Pros:**
- ✅ Simple and readable
- ✅ Works with `IndexSchema.fromObject()`
- ✅ Good for configuration files (YAML/JSON)

**Cons:**
- ❌ No type checking on attributes
- ❌ Easy to make mistakes with attribute names

</TabItem>

<TabItem value="class" label="Algorithm-Specific Classes">

**Best for:** Production code, maximum type safety

Use `HNSWVectorField` or `FlatVectorField` for full type safety:

```typescript
import { HNSWVectorField, FlatVectorField } from 'redisvl';

// HNSW index (most common)
const hnswField = new HNSWVectorField({
    name: 'embedding',
    dims: 768,
    distanceMetric: 'COSINE',
    // HNSW-specific parameters
    m: 16, // Number of bi-directional links (default: 16)
    efConstruction: 200, // Build-time accuracy (default: 200)
});

// Flat (brute-force) index
const flatField = new FlatVectorField({
    name: 'embedding',
    dims: 384,
    distanceMetric: 'L2',
});

// Use in schema
schema.addFields([hnswField]);
```

**Pros:**
- ✅ Full TypeScript type safety
- ✅ Auto-completion for algorithm-specific parameters
- ✅ Compile-time validation

</TabItem>

<TabItem value="generic" label="Generic VectorField">

**Best for:** Configurable systems, reusable components

Use the generic `VectorField` class when you want flexibility:

```typescript
import { VectorField } from 'redisvl';

// Works with both HNSW and FLAT algorithms
const field = new VectorField({
    name: 'embedding',
    dims: 768,
    distanceMetric: 'COSINE',
    algorithm: 'HNSW', // or 'FLAT'
    // Optional: algorithm-specific parameters
    m: 16,
    efConstruction: 200,
});

schema.addFields([field]);
```

**Pros:**
- ✅ Algorithm-agnostic API
- ✅ Easy to switch between HNSW and FLAT
- ✅ Still type-safe

**Use when:**
- Algorithm choice is configurable
- Building reusable components
- Need flexibility without sacrificing type safety

</TabItem>
</Tabs>

#### Vector Field Parameters

**Common Parameters (all approaches):**
- `name`: Field name in Redis
- `dims`: Vector dimensions (must match embedding model)
- `distanceMetric`: `COSINE`, `L2`, or `IP`
- `datatype`: `float32` (default) or `float64`

**HNSW-Specific Parameters:**
- `m`: Number of bi-directional links per node (default: 16)
  - Higher = better recall, more memory
  - Typical range: 8-64
- `efConstruction`: Build-time accuracy parameter (default: 200)
  - Higher = better index quality, slower build
  - Typical range: 100-500

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
    name: 'products',
    storage_type: 'json'
  },
  fields: [
    // JSONPath syntax for nested fields
    { name: '$.title', type: 'text', attrs: { as: 'title' } },
    { name: '$.category', type: 'tag', attrs: { as: 'category' } },
    { name: '$.metadata.rating', type: 'numeric', attrs: { as: 'rating' } },
    { name: '$.embedding', type: 'vector', attrs: {
        as: 'embedding',
        dims: 384,
        algorithm: 'hnsw',
        distanceMetric: 'cosine'
    }},
  ]
}
```

**JSON Path Syntax:**

- Use `$.fieldName` for top-level fields
- Use `$.parent.child` for nested fields
- Use `attrs.as` to define the field alias for queries
- The `as` attribute is the name you'll use in search queries

**Example Document:**

```json
{
  "title": "Laptop",
  "category": "electronics",
  "metadata": {
    "rating": 4.5,
    "reviews": 120
  },
  "embedding": [0.1, 0.2, ...]
}
```

**Querying:**

```typescript
// Use the alias, not the JSON path
const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding', // ← Uses alias from attrs.as
    filter: '@category:{electronics} @rating:[4.0 5.0]',
    numResults: 10,
});
```

**Characteristics:**

- ✅ Supports nested objects and arrays
- ✅ Type preservation (numbers, booleans, arrays)
- ✅ JSONPath queries with full path support
- ✅ Field aliases for cleaner query syntax
- ❌ Slightly higher memory usage than HASH

## Error Handling

Schema validation errors are thrown when invalid field configurations are provided:

```typescript
import { SchemaValidationError } from 'redisvl';

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
