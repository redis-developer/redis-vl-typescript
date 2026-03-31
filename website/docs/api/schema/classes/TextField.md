# Class: TextField

Defined in: [schema/fields.ts:63](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/schema/fields.ts#L63)

TextField for full-text search

## Extends

- [`BaseField`](BaseField.md)

## Constructors

### Constructor

> **new TextField**(`name`, `attrs?`): `TextField`

Defined in: [schema/fields.ts:64](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/schema/fields.ts#L64)

#### Parameters

##### name

`string`

##### attrs?

[`TextFieldAttrs`](../interfaces/TextFieldAttrs.md) = `{}`

#### Returns

`TextField`

#### Overrides

[`BaseField`](BaseField.md).[`constructor`](BaseField.md#constructor)

## Methods

### toRedisField()

> **toRedisField**(`isJson`): `SchemaTextField`

Defined in: [schema/fields.ts:71](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/schema/fields.ts#L71)

Convert this field to Redis schema field format.
Each subclass must implement this method to return the appropriate Redis field type.

#### Parameters

##### isJson

`boolean`

Whether the index uses JSON storage (affects field naming with $.prefix)

#### Returns

`SchemaTextField`

#### Overrides

[`BaseField`](BaseField.md).[`toRedisField`](BaseField.md#toredisfield)

## Properties

### attrs

> `readonly` **attrs**: [`TextFieldAttrs`](../interfaces/TextFieldAttrs.md) = `{}`

Defined in: [schema/fields.ts:66](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/schema/fields.ts#L66)

#### Inherited from

[`BaseField`](BaseField.md).[`attrs`](BaseField.md#attrs)

---

### name

> `readonly` **name**: `string`

Defined in: [schema/fields.ts:30](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/schema/fields.ts#L30)

#### Inherited from

[`BaseField`](BaseField.md).[`name`](BaseField.md#name)

---

### path?

> `optional` **path?**: `string` \| `null`

Defined in: [schema/fields.ts:33](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/schema/fields.ts#L33)

#### Inherited from

[`BaseField`](BaseField.md).[`path`](BaseField.md#path)

---

### type

> `readonly` **type**: `string`

Defined in: [schema/fields.ts:31](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/schema/fields.ts#L31)

#### Inherited from

[`BaseField`](BaseField.md).[`type`](BaseField.md#type)
