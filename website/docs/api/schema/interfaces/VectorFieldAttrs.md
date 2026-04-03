# Interface: VectorFieldAttrs

Defined in: [schema/fields.ts:245](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L245)

Base vector field attributes

## Extends

- [`BaseFieldAttrs`](BaseFieldAttrs.md)

## Extended by

- [`FlatVectorFieldAttrs`](FlatVectorFieldAttrs.md)
- [`HNSWVectorFieldAttrs`](HNSWVectorFieldAttrs.md)

## Properties

### algorithm

> **algorithm**: `string`

Defined in: [schema/fields.ts:246](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L246)

---

### as?

> `optional` **as?**: `string`

Defined in: [schema/fields.ts:20](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L20)

#### Inherited from

[`BaseFieldAttrs`](BaseFieldAttrs.md).[`as`](BaseFieldAttrs.md#as)

---

### datatype?

> `optional` **datatype?**: [`VectorDataType`](../enumerations/VectorDataType.md)

Defined in: [schema/fields.ts:249](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L249)

---

### dims

> **dims**: `number`

Defined in: [schema/fields.ts:247](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L247)

---

### distanceMetric?

> `optional` **distanceMetric?**: [`VectorDistanceMetric`](../enumerations/VectorDistanceMetric.md)

Defined in: [schema/fields.ts:248](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L248)

---

### indexEmpty?

> `optional` **indexEmpty?**: `boolean`

Defined in: [schema/fields.ts:23](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L23)

#### Inherited from

[`BaseFieldAttrs`](BaseFieldAttrs.md).[`indexEmpty`](BaseFieldAttrs.md#indexempty)

---

### indexMissing?

> `optional` **indexMissing?**: `boolean`

Defined in: [schema/fields.ts:22](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L22)

#### Inherited from

[`BaseFieldAttrs`](BaseFieldAttrs.md).[`indexMissing`](BaseFieldAttrs.md#indexmissing)

---

### sortable?

> `optional` **sortable?**: `boolean`

Defined in: [schema/fields.ts:21](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L21)

#### Inherited from

[`BaseFieldAttrs`](BaseFieldAttrs.md).[`sortable`](BaseFieldAttrs.md#sortable)
