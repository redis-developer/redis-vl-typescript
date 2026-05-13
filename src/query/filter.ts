/**
 * Filter expression DSL for Redis Search queries.
 *
 * Mirrors `redisvl.query.filter` from the Python library, adapted to TypeScript
 * idioms: composition is via `.and()`, `.or()`, and `.not()` methods rather
 * than operator overloading.
 *
 * Each FilterField subclass produces a {@link FilterExpression} when an
 * operator method (`.eq()`, `.gt()`, `.between()`, ...) is called. Those
 * expressions can then be composed with one another to build up the filter
 * portion of a Redis query.
 */

import { TokenEscaper } from '../utils/token-escaper.js';
import { QueryValidationError } from '../errors.js';

const escaper = new TokenEscaper();

/**
 * Inclusive options for range-style filters.
 *
 * - `both`: both endpoints inclusive (default)
 * - `neither`: both endpoints exclusive
 * - `left`: lower bound inclusive, upper bound exclusive
 * - `right`: lower bound exclusive, upper bound inclusive
 */
export type Inclusive = 'both' | 'neither' | 'left' | 'right';

const VALID_INCLUSIVE: ReadonlySet<Inclusive> = new Set<Inclusive>([
    'both',
    'neither',
    'left',
    'right',
]);

/**
 * Renders a FilterExpression along with its left/right children using the
 * same wildcard-collapsing rules as the Python library:
 *  - `*` AND/OR `*` -> `*`
 *  - `*` AND/OR x   -> x
 *  - x AND/OR `*`   -> x
 */
function combine(left: FilterExpression, right: FilterExpression, separator: string): string {
    const l = left.toString();
    const r = right.toString();
    if (l === '*' && r === '*') return '*';
    if (l === '*') return r;
    if (r === '*') return l;
    return `(${l}${separator}${r})`;
}

/**
 * A composable filter expression. Returned by every operator on a FilterField,
 * and also produced by composing other expressions via {@link FilterExpression.and}
 * and {@link FilterExpression.or}.
 */
export class FilterExpression {
    private readonly _filter: string | undefined;
    private readonly _left?: FilterExpression;
    private readonly _right?: FilterExpression;
    private readonly _operator?: 'AND' | 'OR';

    constructor(
        filter?: string,
        operator?: 'AND' | 'OR',
        left?: FilterExpression,
        right?: FilterExpression
    ) {
        this._filter = filter;
        this._operator = operator;
        this._left = left;
        this._right = right;
    }

    /** Combine with another expression via AND. */
    and(other: FilterExpression): FilterExpression {
        return new FilterExpression(undefined, 'AND', this, other);
    }

    /** Combine with another expression via OR. */
    or(other: FilterExpression): FilterExpression {
        return new FilterExpression(undefined, 'OR', this, other);
    }

    toString(): string {
        if (this._operator) {
            if (!this._left || !this._right) {
                throw new QueryValidationError(
                    'FilterExpression with operator must have both left and right children'
                );
            }
            const sep = this._operator === 'OR' ? ' | ' : ' ';
            return combine(this._left, this._right, sep);
        }
        return this._filter ?? '*';
    }
}

/** Common base class for the field-keyed filter builders. */
abstract class FilterField {
    constructor(protected readonly field: string) {}

    /** Match documents where the indexed field is missing. Requires INDEXMISSING. */
    isMissing(): FilterExpression {
        return new FilterExpression(`ismissing(@${this.field})`);
    }
}

// ============================================================================
// Tag
// ============================================================================

class TagFilter extends FilterField {
    /** Equals one of the supplied tag values (joined with `|` for OR-of-tags). */
    eq(value: string | string[]): FilterExpression {
        return this.render('EQ', value);
    }

    /** Not equal to the supplied tag value(s). */
    ne(value: string | string[]): FilterExpression {
        return this.render('NE', value);
    }

    /**
     * Wildcard match against the supplied pattern(s). `*` and `?` are
     * preserved unescaped so they retain their Redis Search meaning.
     */
    like(value: string | string[]): FilterExpression {
        return this.render('LIKE', value);
    }

    private render(op: 'EQ' | 'NE' | 'LIKE', value: string | string[]): FilterExpression {
        const values = Array.isArray(value) ? value : [value];
        if (values.length === 0) {
            // Match the Python library: empty value list collapses to "*".
            return new FilterExpression('*');
        }
        const preserveWildcards = op === 'LIKE';
        const escaped = values.map((v) => escaper.escape(v, preserveWildcards)).join('|');
        const inner = `@${this.field}:{${escaped}}`;
        return new FilterExpression(op === 'NE' ? `(-${inner})` : inner);
    }
}

export function Tag(field: string): TagFilter {
    return new TagFilter(field);
}

// ============================================================================
// Num
// ============================================================================

class NumFilter extends FilterField {
    eq(value: number): FilterExpression {
        return new FilterExpression(`@${this.field}:[${value} ${value}]`);
    }

    ne(value: number): FilterExpression {
        return new FilterExpression(`(-@${this.field}:[${value} ${value}])`);
    }

    gt(value: number): FilterExpression {
        return new FilterExpression(`@${this.field}:[(${value} +inf]`);
    }

    lt(value: number): FilterExpression {
        return new FilterExpression(`@${this.field}:[-inf (${value}]`);
    }

    ge(value: number): FilterExpression {
        return new FilterExpression(`@${this.field}:[${value} +inf]`);
    }

    le(value: number): FilterExpression {
        return new FilterExpression(`@${this.field}:[-inf ${value}]`);
    }

    between(start: number, end: number, inclusive: Inclusive = 'both'): FilterExpression {
        return new FilterExpression(this.formatBetween(start, end, inclusive));
    }

    protected formatBetween(start: number, end: number, inclusive: Inclusive): string {
        if (!VALID_INCLUSIVE.has(inclusive)) {
            throw new QueryValidationError(
                `inclusive must be one of: both, neither, left, right (got '${inclusive}')`
            );
        }
        const lo = inclusive === 'both' || inclusive === 'left' ? `${start}` : `(${start}`;
        const hi = inclusive === 'both' || inclusive === 'right' ? `${end}` : `(${end}`;
        return `@${this.field}:[${lo} ${hi}]`;
    }
}

export function Num(field: string): NumFilter {
    return new NumFilter(field);
}

// ============================================================================
// Text
// ============================================================================

class TextFilter extends FilterField {
    eq(value: string): FilterExpression {
        return new FilterExpression(`@${this.field}:("${value}")`);
    }

    ne(value: string): FilterExpression {
        return new FilterExpression(`(-@${this.field}:"${value}")`);
    }

    /**
     * Wildcard / fuzzy / OR pattern. The supplied value is passed through
     * verbatim, so the caller can use Redis Search syntax like `engine*`,
     * `engin%`, or `apple|orange`.
     */
    like(value: string): FilterExpression {
        return new FilterExpression(`@${this.field}:(${value})`);
    }
}

export function Text(field: string): TextFilter {
    return new TextFilter(field);
}

// ============================================================================
// Geo
// ============================================================================

const GEO_UNITS = new Set(['m', 'km', 'mi', 'ft']);

export type GeoUnit = 'm' | 'km' | 'mi' | 'ft';

export class GeoRadius {
    constructor(
        public readonly longitude: number,
        public readonly latitude: number,
        public readonly radius: number = 1,
        public readonly unit: GeoUnit = 'km'
    ) {
        const u = (unit ?? '').toLowerCase();
        if (!GEO_UNITS.has(u)) {
            throw new QueryValidationError(
                `Invalid geo unit '${unit}'. Must be one of: m, km, mi, ft`
            );
        }
    }
}

class GeoFilter extends FilterField {
    eq(other: GeoRadius): FilterExpression {
        return new FilterExpression(this.format(other));
    }

    ne(other: GeoRadius): FilterExpression {
        return new FilterExpression(`(-${this.format(other)})`);
    }

    private format(r: GeoRadius): string {
        return `@${this.field}:[${r.longitude} ${r.latitude} ${r.radius} ${r.unit}]`;
    }
}

export function Geo(field: string): GeoFilter {
    return new GeoFilter(field);
}

// ============================================================================
// Timestamp
// ============================================================================

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

type TimestampInput = Date | string | number;

class TimestampFilter extends NumFilter {
    eq(other: TimestampInput): FilterExpression {
        if (this.isDateOnly(other)) {
            const [start, end] = this.fullDayRange(other);
            return this.between(start, end);
        }
        return super.eq(this.toUnix(other));
    }

    ne(other: TimestampInput): FilterExpression {
        if (this.isDateOnly(other)) {
            const [start, end] = this.fullDayRange(other);
            // Negate the full-day range.
            return new FilterExpression(`(-@${this.field}:[${start} ${end}])`);
        }
        return super.ne(this.toUnix(other));
    }

    gt(other: TimestampInput): FilterExpression {
        return super.gt(this.toUnix(other));
    }

    lt(other: TimestampInput): FilterExpression {
        return super.lt(this.toUnix(other));
    }

    ge(other: TimestampInput): FilterExpression {
        return super.ge(this.toUnix(other));
    }

    le(other: TimestampInput): FilterExpression {
        return super.le(this.toUnix(other));
    }

    between(
        start: TimestampInput,
        end: TimestampInput,
        inclusive: Inclusive = 'both'
    ): FilterExpression {
        const lo = this.toUnix(start);
        const hi = this.toUnix(end, true);
        return new FilterExpression(this.formatBetween(lo, hi, inclusive));
    }

    private isDateOnly(value: TimestampInput): value is string {
        return typeof value === 'string' && ISO_DATE_ONLY.test(value);
    }

    /**
     * Convert any accepted timestamp input to a Unix timestamp (seconds).
     *
     * `endOfDay` is honoured only for ISO date-only strings: it produces the
     * end-of-day UTC moment so a between(date, date) covers the full day.
     */
    private toUnix(value: TimestampInput, endOfDay = false): number {
        if (typeof value === 'number') {
            return value;
        }
        if (value instanceof Date) {
            return Math.floor(value.getTime() / 1000);
        }
        if (typeof value === 'string') {
            if (ISO_DATE_ONLY.test(value)) {
                const [start, end] = this.fullDayRange(value);
                return endOfDay ? end : start;
            }
            const ts = Date.parse(value);
            if (Number.isNaN(ts)) {
                throw new QueryValidationError(`Could not parse timestamp string: ${value}`);
            }
            return Math.floor(ts / 1000);
        }
        throw new QueryValidationError(
            `Timestamp value must be Date, ISO string, or Unix number; got ${typeof value}`
        );
    }

    private fullDayRange(date: string): [number, number] {
        const [y, m, d] = date.split('-').map(Number);
        const start = Math.floor(Date.UTC(y, m - 1, d, 0, 0, 0) / 1000);
        const end = Math.floor(Date.UTC(y, m - 1, d, 23, 59, 59, 999) / 1000);
        return [start, end];
    }
}

export function Timestamp(field: string): TimestampFilter {
    return new TimestampFilter(field);
}
