# Variable: IndexSchemaOptionsSchema

> `const` **IndexSchemaOptionsSchema**: `ZodObject`\<\{ `fields`: `ZodOptional`\<`ZodRecord`\<`ZodString`, `ZodCustom`\<[`BaseField`](../classes/BaseField.md), [`BaseField`](../classes/BaseField.md)\>\>\>; `index`: `ZodCustom`\<[`IndexInfo`](../classes/IndexInfo.md), [`IndexInfo`](../classes/IndexInfo.md)\>; `version`: `ZodOptional`\<`ZodLiteral`\<`"0.1.0"`\>\>; \}, `$strip`\>

Defined in: [schema/schema.ts:109](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/schema/schema.ts#L109)

Zod schema for IndexSchema validation.
