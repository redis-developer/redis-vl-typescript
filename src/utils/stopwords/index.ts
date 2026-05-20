import { english } from './english.js';

export { english };
export { resolveStopwords, type StopwordsInput } from './resolve.js';

/**
 * Namespace object grouping every shipped stopword list. Consumers can
 * import this from the main package entry (`import { stopwords } from 'redis-vl'`)
 * or the subpath (`import { stopwords } from 'redis-vl/stopwords'`).
 *
 * Phase 1 ships English only. Phase 2 will add the remaining NLTK languages.
 */
export const stopwords = {
    english,
} as const;
