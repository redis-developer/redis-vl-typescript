# Class: FlatVectorField

Defined in: [schema/fields.ts:263](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L263)

FlatVectorField for FLAT algorithm

## Extends

- [`BaseField`](BaseField.md)

## Constructors

### Constructor

> **new FlatVectorField**(`name`, `attrs`): `FlatVectorField`

Defined in: [schema/fields.ts:264](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L264)

#### Parameters

##### name

`string`

##### attrs

[`FlatVectorFieldAttrs`](../interfaces/FlatVectorFieldAttrs.md)

#### Returns

`FlatVectorField`

#### Overrides

[`BaseField`](BaseField.md).[`constructor`](BaseField.md#constructor)

## Methods

### toRedisField()

> **toRedisField**(`isJson`): `SchemaFlatVectorField`

Defined in: [schema/fields.ts:271](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L271)

Convert this field to Redis schema field format.
Each subclass must implement this method to return the appropriate Redis field type.

#### Parameters

##### isJson

`boolean`

Whether the index uses JSON storage (affects field naming with $.prefix)

#### Returns

`SchemaFlatVectorField`

#### Overrides

[`BaseField`](BaseField.md).[`toRedisField`](BaseField.md#toredisfield)

## Properties

### attrs

> `readonly` **attrs**: [`FlatVectorFieldAttrs`](../interfaces/FlatVectorFieldAttrs.md)

Defined in: [schema/fields.ts:266](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L266)

#### Inherited from

[`BaseField`](BaseField.md).[`attrs`](BaseField.md#attrs)

---

### name

> `readonly` **name**: `string`

Defined in: [schema/fields.ts:29](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L29)

#### Inherited from

[`BaseField`](BaseField.md).[`name`](BaseField.md#name)

---

### path?

> `optional` **path?**: `string` \| `null`

Defined in: [schema/fields.ts:32](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L32)

#### Inherited from

[`BaseField`](BaseField.md).[`path`](BaseField.md#path)

---

### type

> `readonly` **type**: `string`

Defined in: [schema/fields.ts:30](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L30)

#### Inherited from

[`BaseField`](BaseField.md).[`type`](BaseField.md#type)
