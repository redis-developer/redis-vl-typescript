# Class: NumericField

Defined in: [schema/fields.ts:174](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/schema/fields.ts#L174)

NumericField for range queries

## Extends

- [`BaseField`](BaseField.md)

## Constructors

### Constructor

> **new NumericField**(`name`, `attrs?`): `NumericField`

Defined in: [schema/fields.ts:175](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/schema/fields.ts#L175)

#### Parameters

##### name

`string`

##### attrs?

[`NumericFieldAttrs`](../interfaces/NumericFieldAttrs.md) = `{}`

#### Returns

`NumericField`

#### Overrides

[`BaseField`](BaseField.md).[`constructor`](BaseField.md#constructor)

## Methods

### toRedisField()

> **toRedisField**(`isJson`): `SchemaNumericField`

Defined in: [schema/fields.ts:182](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/schema/fields.ts#L182)

Convert this field to Redis schema field format.
Each subclass must implement this method to return the appropriate Redis field type.

#### Parameters

##### isJson

`boolean`

Whether the index uses JSON storage (affects field naming with $.prefix)

#### Returns

`SchemaNumericField`

#### Overrides

[`BaseField`](BaseField.md).[`toRedisField`](BaseField.md#toredisfield)

## Properties

### attrs

> `readonly` **attrs**: [`NumericFieldAttrs`](../interfaces/NumericFieldAttrs.md) = `{}`

Defined in: [schema/fields.ts:177](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/schema/fields.ts#L177)

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
