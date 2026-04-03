# Abstract Class: BaseVectorizer

Defined in: [vectorizers/base-vectorizer.ts:30](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/vectorizers/base-vectorizer.ts#L30)

Base abstract class for all vectorizers.

Vectorizers are responsible for converting text into numerical embeddings (vectors)
that can be stored in Redis and used for semantic search.

This class defines the interface that all concrete vectorizer implementations must follow.

## Example

```typescript
class MyVectorizer extends BaseVectorizer {
    async embed(text: string): Promise<number[]> {
        // Implementation
    }

    async embedMany(texts: string[], batchSize?: number): Promise<number[][]> {
        // Implementation
    }

    get dims(): number {
        return 384; // Embedding dimensions
    }

    get model(): string {
        return 'my-model-name';
    }
}
```

## Extended by

- [`HuggingFaceVectorizer`](HuggingFaceVectorizer.md)

## Accessors

### dims

#### Get Signature

> **get** `abstract` **dims**(): `number`

Defined in: [vectorizers/base-vectorizer.ts:77](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/vectorizers/base-vectorizer.ts#L77)

Get the dimensionality of the embeddings produced by this vectorizer.

This should match the length of the arrays returned by embed() and embedMany().

##### Example

```typescript
console.log(vectorizer.dims); // 384
const embedding = await vectorizer.embed('test');
console.log(embedding.length === vectorizer.dims); // true
```

##### Returns

`number`

The number of dimensions in the embedding vectors

---

### model

#### Get Signature

> **get** `abstract` **model**(): `string`

Defined in: [vectorizers/base-vectorizer.ts:89](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/vectorizers/base-vectorizer.ts#L89)

Get the name/identifier of the model used by this vectorizer.

##### Example

```typescript
console.log(vectorizer.model); // "sentence-transformers/all-MiniLM-L6-v2"
```

##### Returns

`string`

The model name or identifier

## Constructors

### Constructor

> **new BaseVectorizer**(): `BaseVectorizer`

#### Returns

`BaseVectorizer`

## Methods

### embed()

> `abstract` **embed**(`text`): `Promise`\<`number`[]\>

Defined in: [vectorizers/base-vectorizer.ts:43](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/vectorizers/base-vectorizer.ts#L43)

Generate an embedding for a single text.

#### Parameters

##### text

`string`

The text to embed

#### Returns

`Promise`\<`number`[]\>

A promise that resolves to the embedding vector

#### Example

```typescript
const embedding = await vectorizer.embed('Hello world');
console.log(embedding); // [0.1, 0.2, 0.3, ...]
```

---

### embedMany()

> `abstract` **embedMany**(`texts`, `batchSize?`): `Promise`\<`number`[][]\>

Defined in: [vectorizers/base-vectorizer.ts:61](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/vectorizers/base-vectorizer.ts#L61)

Generate embeddings for multiple texts.

This method should be more efficient than calling embed() multiple times
by batching requests to the underlying model.

#### Parameters

##### texts

`string`[]

Array of texts to embed

##### batchSize?

`number`

Optional batch size for processing (default: 32)

#### Returns

`Promise`\<`number`[][]\>

A promise that resolves to an array of embedding vectors

#### Example

```typescript
const embeddings = await vectorizer.embedMany(['Hello', 'World']);
console.log(embeddings); // [[0.1, 0.2, ...], [0.3, 0.4, ...]]
```
