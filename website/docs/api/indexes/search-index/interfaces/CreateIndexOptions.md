# Interface: CreateIndexOptions

Defined in: [indexes/search-index.ts:16](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/indexes/search-index.ts#L16)

Options for creating an index.

## Properties

### drop?

> `optional` **drop?**: `boolean`

Defined in: [indexes/search-index.ts:28](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/indexes/search-index.ts#L28)

Whether to drop all keys associated with the index when overwriting.
Only applies when overwrite is true.

#### Default

```ts
false;
```

---

### overwrite?

> `optional` **overwrite?**: `boolean`

Defined in: [indexes/search-index.ts:21](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/indexes/search-index.ts#L21)

Whether to overwrite the index if it already exists.

#### Default

```ts
false;
```
