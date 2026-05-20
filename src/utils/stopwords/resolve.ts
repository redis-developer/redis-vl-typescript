import { QueryValidationError } from '../../errors.js';
import { LANGUAGE_REGISTRY } from './registry.js';

/**
 * Accepted shapes for the `stopwords` config field on `TextQuery`.
 *
 * - `string`: language identifier (currently only `'english'`).
 * - `ReadonlySet<string>` / `readonly string[]`: explicit list (stored verbatim;
 *   caller must lowercase entries — Python parity).
 * - `null`: skip filtering.
 * - `undefined` (omitted): defaults to `'english'`.
 */
export type StopwordsInput = string | ReadonlySet<string> | readonly string[] | null | undefined;

/**
 * Resolve a `StopwordsInput` to a concrete set (or null for "no filtering").
 *
 * Mirrors Python's `_set_stopwords` in `redisvl/query/query.py`:
 * - String → registry lookup; throws on unknown.
 * - Iterable → verbatim copy (no `.lower()`).
 * - `null` → null (skip).
 * - `undefined` → default English set.
 *
 * @throws QueryValidationError on unknown language, non-string iterable members,
 * or any other unsupported type.
 */
export function resolveStopwords(input: StopwordsInput): ReadonlySet<string> | null {
    if (input === undefined) {
        return LANGUAGE_REGISTRY.english;
    }
    if (input === null) {
        return null;
    }
    if (typeof input === 'string') {
        const set = LANGUAGE_REGISTRY[input];
        if (!set) {
            throw new QueryValidationError(`unknown stopwords language: ${input}`);
        }
        return set;
    }
    if (input instanceof Set || Array.isArray(input)) {
        const result = new Set<string>();
        for (const item of input) {
            if (typeof item !== 'string') {
                throw new QueryValidationError(
                    `stopwords must contain only strings; got ${typeof item}`
                );
            }
            result.add(item);
        }
        return result;
    }
    throw new QueryValidationError(
        `stopwords must be a string, Set, array, or null; got ${typeof input}`
    );
}
