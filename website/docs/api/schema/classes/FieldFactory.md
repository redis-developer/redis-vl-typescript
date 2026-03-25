# Class: FieldFactory

Defined in: [schema/fields.ts:360](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L360)

Factory for creating field instances

## Constructors

### Constructor

> **new FieldFactory**(): `FieldFactory`

#### Returns

`FieldFactory`

## Methods

### createField()

> `static` **createField**(`fieldType`, `name`, `attrs?`): [`BaseField`](BaseField.md)

Defined in: [schema/fields.ts:361](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L361)

#### Parameters

##### fieldType

`string`

##### name

`string`

##### attrs?

[`BaseFieldAttrs`](../interfaces/BaseFieldAttrs.md) \| [`VectorFieldAttrs`](../interfaces/VectorFieldAttrs.md)

#### Returns

[`BaseField`](BaseField.md)
