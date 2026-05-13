/**
 * Escapes special characters in Redis Search query tokens so that user-supplied
 * values can be safely substituted into a query string.
 *
 * Mirrors the `redisvl.utils.token_escaper.TokenEscaper` class from the Python
 * library. The escape character set matches the Redis Stack documented list.
 */

const ESCAPED_CHARS = /[,.<>{}[\]\\"':;!@#$%^&*()\-+=~/ ?]/g;
const ESCAPED_CHARS_NO_WILDCARD = /[,.<>{}[\]\\"':;!@#$%^&()\-+=~/ ]/g;

export class TokenEscaper {
    /**
     * Escape Redis Search special characters in `value`.
     *
     * @param value - The input string to escape.
     * @param preserveWildcards - When true, leave `*` and `?` unescaped so they
     *   continue to function as Redis Search wildcards. Used by the Tag and
     *   Text filter LIKE operators.
     * @returns The escaped string, ready to be embedded in a query expression.
     */
    escape(value: string, preserveWildcards = false): string {
        if (typeof value !== 'string') {
            throw new TypeError(
                `Value must be a string for token escaping, got type ${typeof value}`
            );
        }

        const pattern = preserveWildcards ? ESCAPED_CHARS_NO_WILDCARD : ESCAPED_CHARS;
        return value.replace(pattern, (match) => `\\${match}`);
    }
}
