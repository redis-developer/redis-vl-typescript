# Class: IndexInfo

Defined in: [schema/schema.ts:74](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L74)

IndexInfo includes the essential details regarding index settings,
such as its name, prefix, key separator, storage type, and stopwords in Redis.

## Constructors

### Constructor

> **new IndexInfo**(`options`): `IndexInfo`

Defined in: [schema/schema.ts:86](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L86)

#### Parameters

##### options

###### keySeparator?

`string` = `...`

###### name

`string` = `...`

###### prefix?

`string` \| `string`[] = `...`

###### stopwords?

`string`[] = `...`

###### storageType?

[`HASH`](../enumerations/StorageType.md#hash) \| [`JSON`](../enumerations/StorageType.md#json) = `...`

#### Returns

`IndexInfo`

## Properties

### keySeparator

> `readonly` **keySeparator**: `string`

Defined in: [schema/schema.ts:80](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L80)

The separator character used in designing Redis keys

---

### name

> `readonly` **name**: `string`

Defined in: [schema/schema.ts:76](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L76)

The unique name of the index

---

### prefix

> `readonly` **prefix**: `string` \| `string`[]

Defined in: [schema/schema.ts:78](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L78)

The prefix(es) used for Redis keys associated with this index

---

### stopwords?

> `readonly` `optional` **stopwords?**: `string`[]

Defined in: [schema/schema.ts:84](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L84)

Index-level stopwords configuration

---

### storageType

> `readonly` **storageType**: [`StorageType`](../enumerations/StorageType.md)

Defined in: [schema/schema.ts:82](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L82)

The storage type used in Redis (e.g., StorageType.HASH or StorageType.JSON)
