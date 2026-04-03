# Interface: HNSWVectorFieldAttrs

Defined in: [schema/fields.ts:303](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L303)

HNSWVectorField attributes

## Extends

- [`VectorFieldAttrs`](VectorFieldAttrs.md)

## Properties

### algorithm

> **algorithm**: `"hnsw"`

Defined in: [schema/fields.ts:304](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L304)

#### Overrides

[`VectorFieldAttrs`](VectorFieldAttrs.md).[`algorithm`](VectorFieldAttrs.md#algorithm)

---

### as?

> `optional` **as?**: `string`

Defined in: [schema/fields.ts:20](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L20)

#### Inherited from

[`VectorFieldAttrs`](VectorFieldAttrs.md).[`as`](VectorFieldAttrs.md#as)

---

### datatype?

> `optional` **datatype?**: [`VectorDataType`](../enumerations/VectorDataType.md)

Defined in: [schema/fields.ts:249](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L249)

#### Inherited from

[`VectorFieldAttrs`](VectorFieldAttrs.md).[`datatype`](VectorFieldAttrs.md#datatype)

---

### dims

> **dims**: `number`

Defined in: [schema/fields.ts:247](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L247)

#### Inherited from

[`VectorFieldAttrs`](VectorFieldAttrs.md).[`dims`](VectorFieldAttrs.md#dims)

---

### distanceMetric?

> `optional` **distanceMetric?**: [`VectorDistanceMetric`](../enumerations/VectorDistanceMetric.md)

Defined in: [schema/fields.ts:248](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L248)

#### Inherited from

[`VectorFieldAttrs`](VectorFieldAttrs.md).[`distanceMetric`](VectorFieldAttrs.md#distancemetric)

---

### efConstruction?

> `optional` **efConstruction?**: `number`

Defined in: [schema/fields.ts:306](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L306)

---

### efRuntime?

> `optional` **efRuntime?**: `number`

Defined in: [schema/fields.ts:307](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L307)

---

### epsilon?

> `optional` **epsilon?**: `number`

Defined in: [schema/fields.ts:308](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L308)

---

### indexEmpty?

> `optional` **indexEmpty?**: `boolean`

Defined in: [schema/fields.ts:23](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L23)

#### Inherited from

[`VectorFieldAttrs`](VectorFieldAttrs.md).[`indexEmpty`](VectorFieldAttrs.md#indexempty)

---

### indexMissing?

> `optional` **indexMissing?**: `boolean`

Defined in: [schema/fields.ts:22](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L22)

#### Inherited from

[`VectorFieldAttrs`](VectorFieldAttrs.md).[`indexMissing`](VectorFieldAttrs.md#indexmissing)

---

### m?

> `optional` **m?**: `number`

Defined in: [schema/fields.ts:305](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L305)

---

### sortable?

> `optional` **sortable?**: `boolean`

Defined in: [schema/fields.ts:21](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/fields.ts#L21)

#### Inherited from

[`VectorFieldAttrs`](VectorFieldAttrs.md).[`sortable`](VectorFieldAttrs.md#sortable)
