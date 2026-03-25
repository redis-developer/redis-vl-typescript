# Class: IndexSchema

Defined in: [schema/schema.ts:129](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L129)

A schema definition for a search index in Redis, used in RedisVL for
configuring index settings and organizing vector and metadata fields.

## Accessors

### fieldNames

#### Get Signature

> **get** **fieldNames**(): `string`[]

Defined in: [schema/schema.ts:151](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L151)

A list of field names associated with the index schema.

##### Returns

`string`[]

A list of field names from the schema

## Constructors

### Constructor

> **new IndexSchema**(`options`): `IndexSchema`

Defined in: [schema/schema.ts:137](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L137)

#### Parameters

##### options

###### fields?

`Record`\<`string`, [`BaseField`](BaseField.md)\> = `...`

Fields associated with the search index and their properties

###### index

[`IndexInfo`](IndexInfo.md) = `...`

Details of the basic index configurations

###### version?

`"0.1.0"` = `...`

Version of the underlying index schema

#### Returns

`IndexSchema`

## Methods

### addField()

> **addField**(`fieldInputs`): `void`

Defined in: [schema/schema.ts:205](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L205)

Adds a single field to the index schema.

#### Parameters

##### fieldInputs

[`FieldInput`](../interfaces/FieldInput.md)

Field definition object with name, type, and optional attributes

#### Returns

`void`

#### Throws

If a field with the same name already exists

#### Example

```typescript
schema.addField({ name: 'title', type: 'text' });
schema.addField({
    name: 'embedding',
    type: 'vector',
    attrs: { dims: 1536, algorithm: 'hnsw' },
});
```

---

### addFields()

> **addFields**(`fields`): `void`

Defined in: [schema/schema.ts:235](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L235)

Adds multiple fields to the index schema.

#### Parameters

##### fields

[`FieldInput`](../interfaces/FieldInput.md)[]

Array of field definition objects

#### Returns

`void`

#### Throws

If any field has a duplicate name

#### Example

```typescript
schema.addFields([
    { name: 'title', type: 'text' },
    { name: 'category', type: 'tag' },
    { name: 'price', type: 'numeric' },
]);
```

---

### removeField()

> **removeField**(`fieldName`): `void`

Defined in: [schema/schema.ts:251](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L251)

Removes a field from the schema by name.

#### Parameters

##### fieldName

`string`

The name of the field to remove

#### Returns

`void`

#### Example

```typescript
schema.removeField('old_field');
```

---

### toObject()

> **toObject**(): `object`

Defined in: [schema/schema.ts:389](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L389)

Serialize the index schema to a plain object.
Converts camelCase properties to snake_case for YAML/JSON compatibility.

#### Returns

`object`

The index schema as a plain object with snake_case keys

##### fields

> **fields**: `object`[]

##### index

> **index**: `object`

###### index.key_separator

> **key_separator**: `string`

###### index.name

> **name**: `string`

###### index.prefix

> **prefix**: `string` \| `string`[]

###### index.stopwords?

> `optional` **stopwords?**: `string`[]

###### index.storage_type

> **storage_type**: `string`

##### version

> **version**: `"0.1.0"`

#### Example

```typescript
const schema = new IndexSchema({ index: indexInfo });
const obj = schema.toObject();
console.log(obj.index.name);
console.log(obj.index.storage_type);
```

---

### toYAML()

> **toYAML**(`filePath`, `overwrite?`): `Promise`\<`void`\>

Defined in: [schema/schema.ts:458](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L458)

Write the index schema to a YAML file.

#### Parameters

##### filePath

`string`

The path to the YAML file

##### overwrite?

`boolean` = `true`

Whether to overwrite the file if it already exists (default: true)

#### Returns

`Promise`\<`void`\>

#### Throws

Error if the file already exists and overwrite is false

#### Example

```typescript
const schema = new IndexSchema({ index: indexInfo });
await schema.toYAML('schema.yaml');
```

---

### fromObject()

> `static` **fromObject**(`data`): `IndexSchema`

Defined in: [schema/schema.ts:282](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L282)

Create an IndexSchema from a plain object.
Accepts both snake_case (from YAML/JSON files) and camelCase (from TypeScript) property names.

#### Parameters

##### data

The index schema data

###### fields?

[`FieldInput`](../interfaces/FieldInput.md)[] \| `Record`\<`string`, [`FieldInput`](../interfaces/FieldInput.md)\>

###### index

`Record`\<`string`, `unknown`\> \| [`IndexInfo`](IndexInfo.md) \| \{ `keySeparator?`: `string`; `name`: `string`; `prefix?`: `string` \| `string`[]; `stopwords?`: `string`[]; `storageType?`: [`HASH`](../enumerations/StorageType.md#hash) \| [`JSON`](../enumerations/StorageType.md#json); \}

###### version?

`"0.1.0"`

#### Returns

`IndexSchema`

A new IndexSchema instance

#### Example

```typescript
// From YAML/JSON (snake_case)
const schema = IndexSchema.fromObject({
    index: {
        name: 'docs-index',
        prefix: 'docs',
        storage_type: 'hash', // snake_case from YAML/JSON
    },
    fields: [
        { name: 'doc-id', type: 'tag' },
        { name: 'title', type: 'text' },
    ],
});
```

---

### fromYAML()

> `static` **fromYAML**(`filePath`): `Promise`\<`IndexSchema`\>

Defined in: [schema/schema.ts:353](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L353)

Create an IndexSchema from a YAML file.

#### Parameters

##### filePath

`string`

The path to the YAML file

#### Returns

`Promise`\<`IndexSchema`\>

A new IndexSchema instance

#### Throws

Error if the file path is invalid

#### Throws

Error if the file does not exist

#### Example

```typescript
const schema = await IndexSchema.fromYAML('schema.yaml');
console.log(schema.index.name);
```

## Properties

### fields

> **fields**: `Record`\<`string`, [`BaseField`](BaseField.md)\>

Defined in: [schema/schema.ts:133](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L133)

Fields associated with the search index and their properties

---

### index

> `readonly` **index**: [`IndexInfo`](IndexInfo.md)

Defined in: [schema/schema.ts:131](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L131)

Details of the basic index configurations

---

### version

> `readonly` **version**: `"0.1.0"`

Defined in: [schema/schema.ts:135](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L135)

Version of the underlying index schema
