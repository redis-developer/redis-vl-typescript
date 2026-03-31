# Variable: IndexInfoSchema

> `const` **IndexInfoSchema**: `ZodObject`\<\{ `keySeparator`: `ZodDefault`\<`ZodString`\>; `name`: `ZodString`; `prefix`: `ZodDefault`\<`ZodUnion`\<readonly \[`ZodString`, `ZodArray`\<`ZodString`\>\]\>\>; `stopwords`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `storageType`: `ZodDefault`\<`ZodEnum`\<_typeof_ [`StorageType`](../enumerations/StorageType.md)\>\>; \}, `$strip`\>

Defined in: [schema/schema.ts:21](https://github.com/redis-developer/redis-vl-typescript/blob/c0e6233fa7b13f75c93d9ce1efddeca30f27f660/src/schema/schema.ts#L21)

Zod schema for IndexInfo validation.
Validates index configuration including name, prefix, key separator, storage type, and stopwords.
