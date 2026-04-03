# Class: GeoField

Defined in: [schema/fields.ts:212](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L212)

GeoField for geographic queries

## Extends

- [`BaseField`](BaseField.md)

## Constructors

### Constructor

> **new GeoField**(`name`, `attrs?`): `GeoField`

Defined in: [schema/fields.ts:213](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L213)

#### Parameters

##### name

`string`

##### attrs?

[`GeoFieldAttrs`](../interfaces/GeoFieldAttrs.md) = `{}`

#### Returns

`GeoField`

#### Overrides

[`BaseField`](BaseField.md).[`constructor`](BaseField.md#constructor)

## Methods

### toRedisField()

> **toRedisField**(`isJson`): `SchemaGeoField`

Defined in: [schema/fields.ts:220](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L220)

Convert this field to Redis schema field format.
Each subclass must implement this method to return the appropriate Redis field type.

#### Parameters

##### isJson

`boolean`

Whether the index uses JSON storage (affects field naming with $.prefix)

#### Returns

`SchemaGeoField`

#### Overrides

[`BaseField`](BaseField.md).[`toRedisField`](BaseField.md#toredisfield)

## Properties

### attrs

> `readonly` **attrs**: [`GeoFieldAttrs`](../interfaces/GeoFieldAttrs.md) = `{}`

Defined in: [schema/fields.ts:215](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L215)

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
