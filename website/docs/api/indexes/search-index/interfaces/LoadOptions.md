# Interface: LoadOptions

Defined in: [indexes/search-index.ts:45](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/indexes/search-index.ts#L45)

Options for loading data into an index.

## Properties

### batchSize?

> `optional` **batchSize?**: `number`

Defined in: [indexes/search-index.ts:69](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/indexes/search-index.ts#L69)

Number of objects to write in a single Redis pipeline execution.

#### Default

```ts
200;
```

---

### idField?

> `optional` **idField?**: `string`

Defined in: [indexes/search-index.ts:51](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/indexes/search-index.ts#L51)

Field name to use as the document ID.
If provided, the value of this field will be used as the key.
If not provided, keys will be auto-generated.

---

### keys?

> `optional` **keys?**: `string`[]

Defined in: [indexes/search-index.ts:57](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/indexes/search-index.ts#L57)

Explicit keys to use for the documents.
Must match the length of the data array.

---

### preprocess?

> `optional` **preprocess?**: (`doc`) => `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [indexes/search-index.ts:91](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/indexes/search-index.ts#L91)

Preprocessing function to transform documents before loading.
The function receives a document and returns a Promise of the transformed document.

#### Parameters

##### doc

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

#### Example

```typescript
// Simple transformation
await index.load(data, {
    preprocess: async (doc) => ({ ...doc, timestamp: Date.now() }),
});

// generating embeddings
await index.load(data, {
    preprocess: async (doc) => ({
        ...doc,
        embedding: await vectorizer.embed(doc.text),
    }),
});
```

---

### ttl?

> `optional` **ttl?**: `number`

Defined in: [indexes/search-index.ts:63](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/indexes/search-index.ts#L63)

Time-to-live in seconds for the documents.
If provided, documents will expire after this duration.

---

### validateOnLoad?

> `optional` **validateOnLoad?**: `boolean`

Defined in: [indexes/search-index.ts:97](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/indexes/search-index.ts#L97)

Whether to validate documents against schema before loading.

#### Default

```ts
false;
```
