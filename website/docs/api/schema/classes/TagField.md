# Class: TagField

Defined in: [schema/fields.ts:121](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L121)

TagField for exact matching

## Extends

- [`BaseField`](BaseField.md)

## Constructors

### Constructor

> **new TagField**(`name`, `attrs?`): `TagField`

Defined in: [schema/fields.ts:122](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L122)

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

Defined in: [schema/fields.ts:133](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L133)

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

Defined in: [schema/fields.ts:124](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L124)

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
