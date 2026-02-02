/**
 * Augment Zod's GlobalMeta interface to add custom metadata fields.
 * This allows us to add examples and other metadata to our schemas.
 *
 * @see https://zod.dev/metadata#zglobalregistry
 */
declare module 'zod' {
    interface GlobalMeta {
        /**
         * Examples of valid values for this schema.
         * Used for documentation generation and testing.
         */
        examples?: unknown[];
    }
}

// Forces TypeScript to consider this file a module
export {};
