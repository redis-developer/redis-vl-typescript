# Abstract Class: BaseField

Defined in: [schema/fields.ts:29](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L29)

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

Defined in: [schema/fields.ts:35](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L35)

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

Defined in: [schema/fields.ts:47](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L47)

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

Defined in: [schema/fields.ts:32](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L32)

---

### name

> `readonly` **name**: `string`

Defined in: [schema/fields.ts:30](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L30)

---

### path?

> `optional` **path?**: `string` \| `null`

Defined in: [schema/fields.ts:33](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L33)

---

### type

> `readonly` **type**: `string`

Defined in: [schema/fields.ts:31](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L31)
