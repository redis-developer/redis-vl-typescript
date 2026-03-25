# Variable: IndexSchemaOptionsSchema

> `const` **IndexSchemaOptionsSchema**: `ZodObject`\<\{ `fields`: `ZodOptional`\<`ZodRecord`\<`ZodString`, `ZodCustom`\<[`BaseField`](../classes/BaseField.md), [`BaseField`](../classes/BaseField.md)\>\>\>; `index`: `ZodCustom`\<[`IndexInfo`](../classes/IndexInfo.md), [`IndexInfo`](../classes/IndexInfo.md)\>; `version`: `ZodOptional`\<`ZodLiteral`\<`"0.1.0"`\>\>; \}, `$strip`\>

Defined in: [schema/schema.ts:101](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L101)

Zod schema for IndexSchema validation.
