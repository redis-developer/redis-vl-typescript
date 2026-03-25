# Interface: CreateIndexOptions

Defined in: [indexes/search-index.ts:15](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/indexes/search-index.ts#L15)

Options for creating an index.

## Properties

### drop?

> `optional` **drop?**: `boolean`

Defined in: [indexes/search-index.ts:27](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/indexes/search-index.ts#L27)

Whether to drop all keys associated with the index when overwriting.
Only applies when overwrite is true.

#### Default

```ts
false;
```

---

### overwrite?

> `optional` **overwrite?**: `boolean`

Defined in: [indexes/search-index.ts:20](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/indexes/search-index.ts#L20)

Whether to overwrite the index if it already exists.

#### Default

```ts
false;
```
