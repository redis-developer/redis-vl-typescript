# Variable: IndexSchemaOptionsSchema

> `const` **IndexSchemaOptionsSchema**: `ZodObject`\<\{ `fields`: `ZodOptional`\<`ZodRecord`\<`ZodString`, `ZodCustom`\<[`BaseField`](../classes/BaseField.md), [`BaseField`](../classes/BaseField.md)\>\>\>; `index`: `ZodCustom`\<[`IndexInfo`](../classes/IndexInfo.md), [`IndexInfo`](../classes/IndexInfo.md)\>; `version`: `ZodOptional`\<`ZodLiteral`\<`"0.1.0"`\>\>; \}, `$strip`\>

Defined in: [schema/schema.ts:109](https://github.com/redis-developer/redis-vl-typescript/blob/e377bfbeaf3496b97d8b5dae468fdc62742428d8/src/schema/schema.ts#L109)

Zod schema for IndexSchema validation.
