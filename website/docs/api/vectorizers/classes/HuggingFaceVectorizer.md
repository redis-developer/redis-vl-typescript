# Class: HuggingFaceVectorizer

Defined in: [vectorizers/huggingface-vectorizer.ts:83](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/vectorizers/huggingface-vectorizer.ts#L83)

HuggingFace vectorizer using Transformers.js for local inference.

This vectorizer uses the @huggingface/transformers library to generate
embeddings locally without requiring API keys or external services.

Models are automatically downloaded and cached on first use.

## Examples

```typescript
import { HuggingFaceVectorizer } from '@booleanhunter/redisvl';

const vectorizer = new HuggingFaceVectorizer({
    model: 'Xenova/all-MiniLM-L6-v2',
});

// Generate single embedding
const embedding = await vectorizer.embed('Hello world');
console.log(embedding.length); // 384

// Generate multiple embeddings
const embeddings = await vectorizer.embedMany(['Hello', 'World']);
console.log(embeddings.length); // 2
```

```typescript
// Use with preprocessing
await index.load(documents, {
    preprocess: async (doc) => ({
        ...doc,
        embedding: await vectorizer.embed(doc.text),
    }),
});
```

## Extends

- [`BaseVectorizer`](BaseVectorizer.md)

## Accessors

### dims

#### Get Signature

> **get** **dims**(): `number`

Defined in: [vectorizers/huggingface-vectorizer.ts:201](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/vectorizers/huggingface-vectorizer.ts#L201)

Get the dimensionality of the embeddings.

##### Returns

`number`

#### Overrides

[`BaseVectorizer`](BaseVectorizer.md).[`dims`](BaseVectorizer.md#dims)

---

### model

#### Get Signature

> **get** **model**(): `string`

Defined in: [vectorizers/huggingface-vectorizer.ts:214](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/vectorizers/huggingface-vectorizer.ts#L214)

Get the model name.

##### Returns

`string`

#### Overrides

[`BaseVectorizer`](BaseVectorizer.md).[`model`](BaseVectorizer.md#model)

## Constructors

### Constructor

> **new HuggingFaceVectorizer**(`config`): `HuggingFaceVectorizer`

Defined in: [vectorizers/huggingface-vectorizer.ts:88](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/vectorizers/huggingface-vectorizer.ts#L88)

#### Parameters

##### config

[`HuggingFaceConfig`](../interfaces/HuggingFaceConfig.md)

#### Returns

`HuggingFaceVectorizer`

#### Overrides

[`BaseVectorizer`](BaseVectorizer.md).[`constructor`](BaseVectorizer.md#constructor)

## Methods

### embed()

> **embed**(`text`): `Promise`\<`number`[]\>

Defined in: [vectorizers/huggingface-vectorizer.ts:138](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/vectorizers/huggingface-vectorizer.ts#L138)

Generate an embedding for a single text.

#### Parameters

##### text

`string`

#### Returns

`Promise`\<`number`[]\>

#### Overrides

[`BaseVectorizer`](BaseVectorizer.md).[`embed`](BaseVectorizer.md#embed)

---

### embedMany()

> **embedMany**(`texts`, `batchSize?`): `Promise`\<`number`[][]\>

Defined in: [vectorizers/huggingface-vectorizer.ts:160](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/vectorizers/huggingface-vectorizer.ts#L160)

Generate embeddings for multiple texts.

#### Parameters

##### texts

`string`[]

##### batchSize?

`number` = `32`

#### Returns

`Promise`\<`number`[][]\>

#### Overrides

[`BaseVectorizer`](BaseVectorizer.md).[`embedMany`](BaseVectorizer.md#embedmany)
