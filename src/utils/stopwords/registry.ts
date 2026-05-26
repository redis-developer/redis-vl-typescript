import { english } from './english.js';

/**
 * Internal registry of language-identifier → stopword set. `resolveStopwords`
 * uses this for the string-input branch. Not re-exported publicly; consumers
 * pass `'english'` or their own list/Set instead.
 */
export const LANGUAGE_REGISTRY: Readonly<Record<string, ReadonlySet<string>>> = {
    english,
};
