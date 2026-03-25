# Class: TagField

Defined in: [schema/fields.ts:120](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L120)

TagField for exact matching

## Extends

- [`BaseField`](BaseField.md)

## Constructors

### Constructor

> **new TagField**(`name`, `attrs?`): `TagField`

Defined in: [schema/fields.ts:121](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L121)

#### Parameters

##### name

`string`

##### attrs?

[`TagFieldAttrs`](../interfaces/TagFieldAttrs.md) = `{}`

#### Returns

`TagField`

#### Overrides

[`BaseField`](BaseField.md).[`constructor`](BaseField.md#constructor)

## Methods

### toRedisField()

> **toRedisField**(`isJson`): `SchemaTagField`

Defined in: [schema/fields.ts:132](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L132)

Convert this field to Redis schema field format.
Each subclass must implement this method to return the appropriate Redis field type.

#### Parameters

##### isJson

`boolean`

Whether the index uses JSON storage (affects field naming with $.prefix)

#### Returns

`SchemaTagField`

#### Overrides

[`BaseField`](BaseField.md).[`toRedisField`](BaseField.md#toredisfield)

## Properties

### attrs

> `readonly` **attrs**: [`TagFieldAttrs`](../interfaces/TagFieldAttrs.md) = `{}`

Defined in: [schema/fields.ts:123](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L123)

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
