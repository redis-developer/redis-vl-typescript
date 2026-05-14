---
sidebar_position: 2
---

# Code Standards

## File Organization

```
src/
├── schema/           # Field types and schema classes
│   ├── fields.ts     # BaseField, TextField, TagField, NumericField, GeoField, VectorField, etc
│   └── index.ts      # IndexSchema, IndexInfo
├── redis/            # Bridge between domain types and Redis client (type extracts, response parsers, vector codecs)
├── indexes/          # SearchIndex implementation
│   └── search-index.ts
├── query/
└── index.ts          # Public API exports
```

## Refrain from using `as any` unless absolutely necessary

**ALWAYS extract proper types instead.**

❌ **Bad:**

```typescript
field.PHONETIC = this.attrs.phonetic as any;
```

When initializing objects/arguments to be passed to the Node Redis client, don't use `any` and don't create your own type definitions or interfaces. Instead, import types from the [native redis client library](https://github.com/redis/node-redis), or extract types using TypeScript utility types.

✅ **Good:**

```typescript
import type { RediSearchSchema } from '@redis/search';

type ExtractSchemaTypes = RediSearchSchema[string];
export type SchemaTextField = Extract<ExtractSchemaTypes, { type: 'TEXT' }>;
export type SchemaVectorField = Extract<ExtractSchemaTypes, { type: 'VECTOR' }>;
export type SchemaFlatVectorField = Extract<SchemaVectorField, { ALGORITHM: 'FLAT' }>;
```

**Why:** Types automatically stay in sync with `@redis/search` updates. No duplication, no drift.

## Dependency Inversion

Depend on abstractions, not concrete implementations. Example:

| Abstraction                                                       | Concrete implementations                                                                | Consumer                                                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `BaseVectorizer` (`src/vectorizers/base-vectorizer.ts`)           | `HuggingFaceVectorizer`, plus any user subclass                                         | Public extension point - users `extends BaseVectorizer` to plug in any embedding provider |
| `RediSearchSchema` field types (`src/redis/schema-types.ts`)      | Extracted via `Extract<>` from `@redis/search` rather than duplicated locally           | All field `toRedisField()` implementations                                              |

Follow this pattern when adding new pluggable layers - for example, a new vectorizer should extend `BaseVectorizer` rather than introduce a parallel concrete type.

## Naming Conventions

**Use camelCase for all public APIs:**

- Properties: `storageType`, `keySeparator`, `distanceMetric`
- Methods: `addField()`, `toObject()`, `fromObject()`
- Class names: `SearchIndex`, `TextField`, `VectorField`

### Cross-Language Compatibility

For artifacts shared cross-language (YAML/JSON files), use the same conventions as Python and Java:

**Use snake_case in YAML/JSON:**

- Properties: `storage_type`, `key_separator`, `distance_metric`

**Why:** Python and Java implementations use snake_case in YAML/JSON files for cross-language consistency.

## Return Native Redis Client Types (For Wrapper Methods Only)

:::info
Applies ONLY to methods that directly wrap Redis client calls.
:::

For wrapper methods that call the Redis client at the end, **NEVER hide return types with `Promise<void>`.** Let TypeScript infer the actual return type from Redis client methods.

❌ **Bad:**

```typescript
async create(): Promise<void> {
    await this.client.ft.create(...);  // Wrapper around Redis client
}
```

✅ **Good:**

```typescript
async create() {
    return this.client.ft.create(...);  // Returns Promise<"OK" | undefined>
}
```

**Why:** Library users get better type safety and can see actual Redis responses.

**Note:** This does NOT apply to:

- Business logic methods that don't call Redis client
- Helper methods that process data
- Methods that return custom types or transformed data

## Use Package Managers for Dependencies

**NEVER manually edit `package.json`, lock files, or any dependency files.**

✅ **Use package managers:**

```bash
npm install <package>
npm uninstall <package>
npm version patch
```

**Why:** Package managers handle version resolution, lock files, and transitive dependencies correctly.



## Cross-Language API Parity

TypeScript APIs should match Python and Java behavior. When in doubt, the Python implementation is the source of truth.

- **Code APIs**: language-native casing (`snake_case` Python, `camelCase` TypeScript, `camelCase` Java)
- **Cross-language artifacts** (YAML, JSON, schema files): `snake_case` across all three
