# Interface: FlatVectorFieldAttrs

Defined in: [schema/fields.ts:254](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L254)

FlatVectorField attributes

## Extends

- [`VectorFieldAttrs`](VectorFieldAttrs.md)

## Properties

### algorithm

> **algorithm**: `"flat"`

Defined in: [schema/fields.ts:255](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L255)

#### Overrides

[`VectorFieldAttrs`](VectorFieldAttrs.md).[`algorithm`](VectorFieldAttrs.md#algorithm)

---

### blockSize?

> `optional` **blockSize?**: `number`

Defined in: [schema/fields.ts:256](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L256)

---

### datatype?

> `optional` **datatype?**: [`VectorDataType`](../enumerations/VectorDataType.md)

Defined in: [schema/fields.ts:248](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L248)

#### Inherited from

[`VectorFieldAttrs`](VectorFieldAttrs.md).[`datatype`](VectorFieldAttrs.md#datatype)

---

### dims

> **dims**: `number`

Defined in: [schema/fields.ts:246](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L246)

#### Inherited from

[`VectorFieldAttrs`](VectorFieldAttrs.md).[`dims`](VectorFieldAttrs.md#dims)

---

### distanceMetric?

> `optional` **distanceMetric?**: [`VectorDistanceMetric`](../enumerations/VectorDistanceMetric.md)

Defined in: [schema/fields.ts:247](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L247)

#### Inherited from

[`VectorFieldAttrs`](VectorFieldAttrs.md).[`distanceMetric`](VectorFieldAttrs.md#distancemetric)

---

### indexEmpty?

> `optional` **indexEmpty?**: `boolean`

Defined in: [schema/fields.ts:22](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L22)

#### Inherited from

[`VectorFieldAttrs`](VectorFieldAttrs.md).[`indexEmpty`](VectorFieldAttrs.md#indexempty)

---

### indexMissing?

> `optional` **indexMissing?**: `boolean`

Defined in: [schema/fields.ts:21](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L21)

#### Inherited from

[`VectorFieldAttrs`](VectorFieldAttrs.md).[`indexMissing`](VectorFieldAttrs.md#indexmissing)

---

### initialCap?

> `optional` **initialCap?**: `number`

Defined in: [schema/fields.ts:257](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L257)

---

### sortable?

> `optional` **sortable?**: `boolean`

Defined in: [schema/fields.ts:20](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/fields.ts#L20)

#### Inherited from

[`VectorFieldAttrs`](VectorFieldAttrs.md).[`sortable`](VectorFieldAttrs.md#sortable)
