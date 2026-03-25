# Abstract Class: BaseField

Defined in: [schema/fields.ts:28](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L28)

Base class for all field types

## Extended by

- [`TextField`](TextField.md)
- [`TagField`](TagField.md)
- [`NumericField`](NumericField.md)
- [`GeoField`](GeoField.md)
- [`FlatVectorField`](FlatVectorField.md)
- [`HNSWVectorField`](HNSWVectorField.md)

## Constructors

### Constructor

> **new BaseField**(`name`, `type`, `attrs?`): `BaseField`

Defined in: [schema/fields.ts:34](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L34)

#### Parameters

##### name

`string`

##### type

`string`

##### attrs?

[`BaseFieldAttrs`](../interfaces/BaseFieldAttrs.md) = `{}`

#### Returns

`BaseField`

## Methods

### toRedisField()

> `abstract` **toRedisField**(`isJson`): `RedisSchemaFieldType`

Defined in: [schema/fields.ts:46](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L46)

Convert this field to Redis schema field format.
Each subclass must implement this method to return the appropriate Redis field type.

#### Parameters

##### isJson

`boolean`

Whether the index uses JSON storage (affects field naming with $.prefix)

#### Returns

`RedisSchemaFieldType`

## Properties

### attrs

> `readonly` **attrs**: [`BaseFieldAttrs`](../interfaces/BaseFieldAttrs.md)

Defined in: [schema/fields.ts:31](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L31)

---

### name

> `readonly` **name**: `string`

Defined in: [schema/fields.ts:29](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L29)

---

### path?

> `optional` **path?**: `string` \| `null`

Defined in: [schema/fields.ts:32](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L32)

---

### type

> `readonly` **type**: `string`

Defined in: [schema/fields.ts:30](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L30)
