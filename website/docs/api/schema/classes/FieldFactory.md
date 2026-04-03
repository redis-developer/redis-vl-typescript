# Class: FieldFactory

Defined in: [schema/fields.ts:361](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L361)

Factory for creating field instances

## Constructors

### Constructor

> **new FieldFactory**(): `FieldFactory`

#### Returns

`FieldFactory`

## Methods

### createField()

> `static` **createField**(`fieldType`, `name`, `attrs?`): [`BaseField`](BaseField.md)

Defined in: [schema/fields.ts:362](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L362)

#### Parameters

##### fieldType

`string`

##### name

`string`

##### attrs?

[`BaseFieldAttrs`](../interfaces/BaseFieldAttrs.md) \| [`VectorFieldAttrs`](../interfaces/VectorFieldAttrs.md)

#### Returns

[`BaseField`](BaseField.md)
