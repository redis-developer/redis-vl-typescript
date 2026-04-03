# Class: HNSWVectorField

Defined in: [schema/fields.ts:314](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L314)

HNSWVectorField for HNSW algorithm

## Extends

- [`BaseField`](BaseField.md)

## Constructors

### Constructor

> **new HNSWVectorField**(`name`, `attrs`): `HNSWVectorField`

Defined in: [schema/fields.ts:315](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L315)

#### Parameters

##### name

`string`

##### attrs

[`HNSWVectorFieldAttrs`](../interfaces/HNSWVectorFieldAttrs.md)

#### Returns

`HNSWVectorField`

#### Overrides

[`BaseField`](BaseField.md).[`constructor`](BaseField.md#constructor)

## Methods

### toRedisField()

> **toRedisField**(`isJson`): `SchemaHNSWVectorField`

Defined in: [schema/fields.ts:327](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L327)

Convert this field to Redis schema field format.
Each subclass must implement this method to return the appropriate Redis field type.

#### Parameters

##### isJson

`boolean`

Whether the index uses JSON storage (affects field naming with $.prefix)

#### Returns

`SchemaHNSWVectorField`

#### Overrides

[`BaseField`](BaseField.md).[`toRedisField`](BaseField.md#toredisfield)

## Properties

### attrs

> `readonly` **attrs**: [`HNSWVectorFieldAttrs`](../interfaces/HNSWVectorFieldAttrs.md)

Defined in: [schema/fields.ts:317](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L317)

#### Inherited from

[`BaseField`](BaseField.md).[`attrs`](BaseField.md#attrs)

---

### name

> `readonly` **name**: `string`

Defined in: [schema/fields.ts:30](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L30)

#### Inherited from

[`BaseField`](BaseField.md).[`name`](BaseField.md#name)

---

### path?

> `optional` **path?**: `string` \| `null`

Defined in: [schema/fields.ts:33](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L33)

#### Inherited from

[`BaseField`](BaseField.md).[`path`](BaseField.md#path)

---

### type

> `readonly` **type**: `string`

Defined in: [schema/fields.ts:31](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L31)

#### Inherited from

[`BaseField`](BaseField.md).[`type`](BaseField.md#type)
