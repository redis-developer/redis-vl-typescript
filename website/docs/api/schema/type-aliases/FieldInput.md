# Type Alias: FieldInput

> **FieldInput** = \{ `attrs?`: [`TextFieldAttrs`](../interfaces/TextFieldAttrs.md); `name`: `string`; `path?`: `string`; `type`: `"text"`; \} \| \{ `attrs?`: [`TagFieldAttrs`](../interfaces/TagFieldAttrs.md); `name`: `string`; `path?`: `string`; `type`: `"tag"`; \} \| \{ `attrs?`: [`NumericFieldAttrs`](../interfaces/NumericFieldAttrs.md); `name`: `string`; `path?`: `string`; `type`: `"numeric"`; \} \| \{ `attrs?`: [`GeoFieldAttrs`](../interfaces/GeoFieldAttrs.md); `name`: `string`; `path?`: `string`; `type`: `"geo"`; \} \| \{ `attrs?`: [`VectorFieldAttrs`](../interfaces/VectorFieldAttrs.md); `name`: `string`; `path?`: `string`; `type`: `"vector"`; \} \| \{ `attrs?`: `Record`\<`string`, `unknown`\>; `name`: `string`; `path?`: `string`; `type`: `string`; \}

Defined in: [schema/schema.ts:133](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/schema/schema.ts#L133)

Field input type for addField and addFields methods.

The attrs property is type-safe based on the field type:

- text: TextFieldAttrs
- tag: TagFieldAttrs
- numeric: NumericFieldAttrs
- geo: GeoFieldAttrs
- vector: VectorFieldAttrs (FLAT or HNSW)
