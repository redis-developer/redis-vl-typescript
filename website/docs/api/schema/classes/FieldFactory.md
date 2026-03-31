# Class: FieldFactory

Defined in: [schema/fields.ts:361](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/schema/fields.ts#L361)

Factory for creating field instances

## Constructors

### Constructor

> **new FieldFactory**(): `FieldFactory`

#### Returns

`FieldFactory`

## Methods

### createField()

> `static` **createField**(`fieldType`, `name`, `attrs?`): [`BaseField`](BaseField.md)

Defined in: [schema/fields.ts:362](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/schema/fields.ts#L362)

#### Parameters

##### fieldType

`string`

##### name

`string`

##### attrs?

[`BaseFieldAttrs`](../interfaces/BaseFieldAttrs.md) \| [`VectorFieldAttrs`](../interfaces/VectorFieldAttrs.md)

#### Returns

[`BaseField`](BaseField.md)
