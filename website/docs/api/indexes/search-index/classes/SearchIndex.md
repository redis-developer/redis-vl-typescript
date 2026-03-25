# Class: SearchIndex

Defined in: [indexes/search-index.ts:122](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/indexes/search-index.ts#L122)

SearchIndex class for managing Redis vector search indices.

This class provides methods to create, manage, and query Redis search indices.
Users create their own Redis client and pass it to the constructor.

## Example

```typescript
import { createClient } from 'redis';
import { SearchIndex, IndexSchema, StorageType } from 'redis-vl';

const client = createClient();
await client.connect();

const schema = new IndexSchema({
    index: { name: 'my-index', prefix: 'doc', storageType: StorageType.HASH },
});
schema.addField({ name: 'title', type: 'text' });

const searchIndex = new SearchIndex(schema, client);
await searchIndex.create();
```

## Accessors

### name

#### Get Signature

> **get** **name**(): `string`

Defined in: [indexes/search-index.ts:178](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/indexes/search-index.ts#L178)

Get the index name from the schema.

##### Returns

`string`

## Constructors

### Constructor

> **new SearchIndex**(`schema`, `client`, `validateOnLoad?`): `SearchIndex`

Defined in: [indexes/search-index.ts:153](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/indexes/search-index.ts#L153)

Create a new SearchIndex instance.

#### Parameters

##### schema

[`IndexSchema`](../../../schema/classes/IndexSchema.md)

The index schema

##### client

`RedisClientType` \| `RedisClusterType`

Redis client instance (created by user)

##### validateOnLoad?

`boolean` = `false`

Whether to validate documents on load (default: false)

#### Returns

`SearchIndex`

#### Throws

If schema is not a valid IndexSchema instance

#### Throws

If client is not provided

## Methods

### create()

> **create**(`options?`): `Promise`\<`"OK"` \| `undefined`\>

Defined in: [indexes/search-index.ts:210](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/indexes/search-index.ts#L210)

Create the index in Redis.

#### Parameters

##### options?

[`CreateIndexOptions`](../interfaces/CreateIndexOptions.md) = `{}`

Creation options

#### Returns

`Promise`\<`"OK"` \| `undefined`\>

The result from Redis FT.CREATE command

#### Throws

If no fields are defined for the index

---

### delete()

> **delete**(`options?`): `Promise`\<`"OK"`\>

Defined in: [indexes/search-index.ts:260](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/indexes/search-index.ts#L260)

Delete the index from Redis.

#### Parameters

##### options?

[`DeleteIndexOptions`](../interfaces/DeleteIndexOptions.md) = `{}`

Deletion options

#### Returns

`Promise`\<`"OK"`\>

The result from Redis FT.DROPINDEX command

---

### exists()

> **exists**(): `Promise`\<`boolean`\>

Defined in: [indexes/search-index.ts:243](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/indexes/search-index.ts#L243)

Check if the index exists in Redis.

#### Returns

`Promise`\<`boolean`\>

True if the index exists, false otherwise

---

### fetch()

> **fetch**(`key`): `Promise`\<`Record`\<`string`, `unknown`\> \| `null`\>

Defined in: [indexes/search-index.ts:363](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/indexes/search-index.ts#L363)

Fetch a single document by key.

#### Parameters

##### key

`string`

The document key (without prefix)

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\> \| `null`\>

The document or null if not found

#### Example

````typescript
const doc = await index.fetch('123');

***

### fetchMany()

> **fetchMany**(`keys`, `batchSize?`): `Promise`\<(`Record`\<`string`, `unknown`\> \| `null`)[]\>

Defined in: [indexes/search-index.ts:398](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/indexes/search-index.ts#L398)

Fetch multiple documents by keys.
Uses pipelining for efficient batch retrieval.

#### Parameters

##### keys

`string`[]

Array of document keys (without prefix)

##### batchSize?

`number` = `200`

Number of commands per pipeline batch (default: 200)

#### Returns

`Promise`\<(`Record`\<`string`, `unknown`\> \| `null`)[]\>

Array of documents (null for missing keys)

#### Example

```typescript
const docs = await index.fetchMany(['123', '456', '789']);

***

### info()

> **info**(): `Promise`\<\{ \}\>

Defined in: [indexes/search-index.ts:277](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/indexes/search-index.ts#L277)

Get information about the index.

#### Returns

`Promise`\<\{ \}\>

Index information from Redis

***

### load()

> **load**(`data`, `options?`): `Promise`\<`string`[]\>

Defined in: [indexes/search-index.ts:334](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/indexes/search-index.ts#L334)

Load documents into the index.

This method handles:
- Auto-generating keys using ULID if no idField or keys provided
- Extracting IDs from documents using idField
- Using explicit keys if provided
- Preprocessing documents before storage
- Setting TTL on documents
- Supporting both HASH and JSON storage types
- Batching operations using Redis pipelining for performance
- Optional schema validation

#### Parameters

##### data

`Record`\<`string`, `unknown`\>[]

Array of documents to load

##### options?

[`LoadOptions`](../interfaces/LoadOptions.md) = `{}`

Load options

#### Returns

`Promise`\<`string`[]\>

Array of keys that were loaded

#### Throws

If keys length doesn't match data length

#### Throws

If idField is not found in a document

#### Throws

If validation fails when validateOnLoad is enabled

#### Throws

If there's an error loading data to Redis

#### Example

```typescript
// Auto-generate keys
const keys = await index.load([
  { title: 'Doc 1', score: 100 },
  { title: 'Doc 2', score: 200 }
]);

// Use idField
const keys = await index.load(
  [{ id: 'user1', name: 'John' }],
  { idField: 'id' }
);

// Use explicit keys
const keys = await index.load(
  [{ name: 'John' }],
  { keys: ['user:1'] }
);

// With preprocessing, TTL, and validation
const keys = await index.load(
  [{ name: 'John' }],
  {
    ttl: 3600,
    batchSize: 100,
    validateOnLoad: true,
    preprocess: (doc) => ({ ...doc, timestamp: Date.now() })
  }
);
````

## Properties

### schema

> `readonly` **schema**: [`IndexSchema`](../../../schema/classes/IndexSchema.md)

Defined in: [indexes/search-index.ts:126](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/indexes/search-index.ts#L126)

The index schema defining the structure and fields.
