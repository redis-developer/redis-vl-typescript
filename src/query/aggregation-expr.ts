/**
 * Typed expression DSL for FT.AGGREGATE's expression dialect — the one used
 * by FT.AGGREGATE's `FILTER` step and (in part) by `APPLY`. This dialect is
 * **distinct** from the FT.SEARCH filter dialect that {@link FilterExpression}
 * renders to. Keep the two straight:
 *
 * - FT.SEARCH filter: `@price:[-inf (200]`, `@brand:{nike}`. Composes via the
 *   `Tag` / `Num` / `Text` / `Geo` / `Timestamp` builders in `./filter.ts`.
 * - FT.AGGREGATE expression: `@price < 200`, `@brand == "nike"`. Composes via
 *   the `AField(...)` builder in this file.
 *
 * v1 covers comparison (`<`, `<=`, `>`, `>=`, `==`, `!=`) and logical (`&&`,
 * `||`, `!`) operators — enough for typical `postFilter` use. Arithmetic
 * (`+`, `-`, `*`, `/`) and function calls (`startswith`, `contains`, math
 * functions) are deferred to a follow-up.
 *
 * @see https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/aggregations/
 */

/**
 * A composable FT.AGGREGATE expression. Returned by every comparison built
 * via {@link AField}, and further composable via `.and()`, `.or()`, `.not()`.
 * `.toString()` renders the expression string the server expects.
 */
export class AggregationExpr {
    constructor(private readonly source: string) {}

    /** Combine with another expression via `&&` (logical AND). */
    and(other: AggregationExpr): AggregationExpr {
        return new AggregationExpr(`(${this.source} && ${other.source})`);
    }

    /** Combine with another expression via `||` (logical OR). */
    or(other: AggregationExpr): AggregationExpr {
        return new AggregationExpr(`(${this.source} || ${other.source})`);
    }

    /** Negate the expression — emits `!(expr)`. */
    not(): AggregationExpr {
        return new AggregationExpr(`!(${this.source})`);
    }

    toString(): string {
        return this.source;
    }
}

/**
 * Input accepted anywhere an FT.AGGREGATE expression is expected — either a
 * pre-built {@link AggregationExpr} or a raw expression string. Used by
 * `AggregationQuery.postFilter` and `AggregationQuery.apply[].expression`.
 */
export type AggregationExprInput = string | AggregationExpr;

/**
 * Render an {@link AggregationExprInput} to its raw expression string.
 *
 * Returns `undefined` when the input is `undefined` or an empty string, so
 * callers can use the result to decide whether to emit the underlying step
 * at all (an empty `FILTER` clause would error server-side).
 */
export function renderAggregationExpr(input: AggregationExprInput | undefined): string | undefined {
    if (input === undefined) return undefined;
    const rendered = typeof input === 'string' ? input : input.toString();
    return rendered === '' ? undefined : rendered;
}

// ---------- AField -----------------------------------------------------------

type Operand = number | string | AFieldRef;

function prefixFieldRef(name: string): string {
    return name.startsWith('@') || name.startsWith('$') ? name : `@${name}`;
}

function formatOperand(value: Operand): string {
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') {
        // FT.AGGREGATE string literals are double-quoted; escape backslashes
        // and inner double-quotes so user-supplied content can't break the
        // surrounding quotes or smuggle additional expression tokens.
        const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return `"${escaped}"`;
    }
    if (value instanceof AFieldRef) return value.ref;
    throw new TypeError(
        `Unsupported AField operand: ${typeof value}. Expected number, string, or AField.`
    );
}

/**
 * Field reference for an FT.AGGREGATE expression. Construct via the
 * {@link AField} factory function — `AField('price')` parallels the filter
 * DSL's `Tag('brand')` / `Num('age')` ergonomics. The class itself is
 * deliberately unexported; the factory return value is the public surface.
 */
class AFieldRef {
    /** The `@`-prefixed reference emitted into the expression. */
    public readonly ref: string;

    constructor(field: string) {
        this.ref = prefixFieldRef(field);
    }

    /** `==` — equality. Strings are auto-quoted; numbers pass through. */
    eq(value: Operand): AggregationExpr {
        return new AggregationExpr(`${this.ref} == ${formatOperand(value)}`);
    }

    /** `!=` — inequality. */
    ne(value: Operand): AggregationExpr {
        return new AggregationExpr(`${this.ref} != ${formatOperand(value)}`);
    }

    /** `<` — strictly less than. */
    lt(value: Operand): AggregationExpr {
        return new AggregationExpr(`${this.ref} < ${formatOperand(value)}`);
    }

    /** `<=` — less than or equal. */
    le(value: Operand): AggregationExpr {
        return new AggregationExpr(`${this.ref} <= ${formatOperand(value)}`);
    }

    /** `>` — strictly greater than. */
    gt(value: Operand): AggregationExpr {
        return new AggregationExpr(`${this.ref} > ${formatOperand(value)}`);
    }

    /** `>=` — greater than or equal. */
    ge(value: Operand): AggregationExpr {
        return new AggregationExpr(`${this.ref} >= ${formatOperand(value)}`);
    }
}

/** Public type alias for the {@link AField} factory's return. */
export type AField = AFieldRef;

/**
 * Build a field reference for the FT.AGGREGATE expression DSL.
 *
 * @example
 * ```typescript
 * import { AField } from 'redisvl';
 *
 * AField('price').lt(200);                              // @price < 200
 * AField('brand').eq('nike');                           // @brand == "nike"
 * AField('total').gt(10).and(AField('rating').ge(4));   // (@total > 10 && @rating >= 4)
 * ```
 */
// eslint-disable-next-line no-redeclare -- intentional TS declaration merging: `AField` is both a type alias and a factory function.
export function AField(field: string): AField {
    return new AFieldRef(field);
}
