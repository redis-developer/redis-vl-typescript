# Variable: IndexInfoSchema

> `const` **IndexInfoSchema**: `ZodObject`\<\{ `keySeparator`: `ZodDefault`\<`ZodString`\>; `name`: `ZodString`; `prefix`: `ZodDefault`\<`ZodUnion`\<readonly \[`ZodString`, `ZodArray`\<`ZodString`\>\]\>\>; `stopwords`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `storageType`: `ZodDefault`\<`ZodEnum`\<_typeof_ [`StorageType`](../enumerations/StorageType.md)\>\>; \}, `$strip`\>

Defined in: [schema/schema.ts:13](https://github.com/redis-developer/redis-vl-typescript/blob/380f36fe5c0d8aea148efe8e33cb42df20ac0740/src/schema/schema.ts#L13)

Zod schema for IndexInfo validation.
Validates index configuration including name, prefix, key separator, storage type, and stopwords.
