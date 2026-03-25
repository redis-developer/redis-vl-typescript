# Interface: VectorFieldAttrs

Defined in: [schema/fields.ts:244](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L244)

Base vector field attributes

## Extends

- [`BaseFieldAttrs`](BaseFieldAttrs.md)

## Extended by

- [`FlatVectorFieldAttrs`](FlatVectorFieldAttrs.md)
- [`HNSWVectorFieldAttrs`](HNSWVectorFieldAttrs.md)

## Properties

### algorithm

> **algorithm**: `string`

Defined in: [schema/fields.ts:245](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L245)

---

### datatype?

> `optional` **datatype?**: [`VectorDataType`](../enumerations/VectorDataType.md)

Defined in: [schema/fields.ts:248](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L248)

---

### dims

> **dims**: `number`

Defined in: [schema/fields.ts:246](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L246)

---

### distanceMetric?

> `optional` **distanceMetric?**: [`VectorDistanceMetric`](../enumerations/VectorDistanceMetric.md)

Defined in: [schema/fields.ts:247](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L247)

---

### indexEmpty?

> `optional` **indexEmpty?**: `boolean`

Defined in: [schema/fields.ts:22](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L22)

#### Inherited from

[`BaseFieldAttrs`](BaseFieldAttrs.md).[`indexEmpty`](BaseFieldAttrs.md#indexempty)

---

### indexMissing?

> `optional` **indexMissing?**: `boolean`

Defined in: [schema/fields.ts:21](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L21)

#### Inherited from

[`BaseFieldAttrs`](BaseFieldAttrs.md).[`indexMissing`](BaseFieldAttrs.md#indexmissing)

---

### sortable?

> `optional` **sortable?**: `boolean`

Defined in: [schema/fields.ts:20](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L20)

#### Inherited from

[`BaseFieldAttrs`](BaseFieldAttrs.md).[`sortable`](BaseFieldAttrs.md#sortable)
