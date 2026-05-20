# TextQuery Stopword Filtering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port Python redisvl's `TextQuery` stopword filtering to TypeScript redis-vl, achieving byte-identical English-language behavior between the two libraries.

**Architecture:** New `src/utils/stopwords/` module containing the embedded NLTK English list (BSD-3-Clause Snowball), a language registry, and a `resolveStopwords()` helper. `TextQuery` gains a `stopwords` constructor field that defaults to `'english'`. The token pipeline gains Python-equivalent normalization (lowercase, strip leading/trailing commas, strip typographic quotes) before escape and OR-join.

**Tech Stack:** TypeScript (ESM, Node ≥22), Vitest, the existing `TokenEscaper` and `QueryValidationError` classes.

**Source spec:** [/Users/yorbi.mendez/.claude/plans/jiggly-zooming-cupcake.md](/Users/yorbi.mendez/.claude/plans/jiggly-zooming-cupcake.md) (approved).

---

## Scope check

Single subsystem (`TextQuery` and a colocated stopwords data module). No decomposition needed.

## File structure

### New files

| Path                                         | Responsibility                                                                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/utils/stopwords/english.ts`             | The 198-word NLTK English stopword Set, pinned to NLTK commit `98e1426`, SHA-256 of raw bytes recorded in header.      |
| `src/utils/stopwords/registry.ts`            | Internal `LANGUAGE_REGISTRY` mapping `'english' → english`. Phase 2 extends this.                                      |
| `src/utils/stopwords/resolve.ts`             | `resolveStopwords()` — input validation + registry lookup + iterable element check. Mirrors Python's `_set_stopwords`. |
| `src/utils/stopwords/index.ts`               | Public barrel: named `english` + namespace `stopwords` + `resolveStopwords` (internal use).                            |
| `tests/unit/utils/stopwords/english.test.ts` | Sanity test on the data file.                                                                                          |
| `tests/unit/utils/stopwords/resolve.test.ts` | Unit tests for `resolveStopwords`.                                                                                     |
| `THIRD_PARTY_NOTICES.md`                     | BSD-3 attribution. Ships in the npm tarball.                                                                           |

### Modified files

| Path                                             | Change                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `src/query/text.ts`                              | Add `stopwords` field, normalize pipeline, lazy empty-after-filter error.                  |
| `src/index.ts`                                   | Re-export `stopwords` namespace.                                                           |
| `package.json`                                   | Add `./stopwords` subpath export + `THIRD_PARTY_NOTICES.md` to files.                      |
| `tests/unit/query/text.test.ts`                  | Update one existing test (`hello, world`); add 16-test `describe('stopwords', ...)` block. |
| `tests/integration/query-types.test.ts`          | One end-to-end test.                                                                       |
| `website/docs/user-guide/filters-and-queries.md` | Replace "minimal port" callout, add stopwords row + example.                               |

---

## Task 1: License notices file

**Files:**

- Create: `THIRD_PARTY_NOTICES.md`

- [ ] **Step 1: Create the notices file**

Write to `THIRD_PARTY_NOTICES.md`:

````markdown
# Third Party Notices

This package bundles third-party content under the licenses below. The
attribution requirements listed here are satisfied by including this file in
the npm tarball (`package.json#files`).

## NLTK English stopword list

- **File:** `src/utils/stopwords/english.ts`
- **Source:** NLTK `stopwords/english` from commit
  [`98e14261eaec2244af1db4ec5b282112444495aa`](https://github.com/nltk/nltk_data/tree/98e14261eaec2244af1db4ec5b282112444495aa)
  (2026-01-09).
- **Raw-bytes SHA-256:**
  `f6d005956f407dbc6ea32e5ff0c7e8e6f71488d3239b9023efdc7fc139d6375b`
- **Original list author:** Snowball project (Martin Porter and contributors).
  See https://snowballstem.org/license.html.
- **License:** BSD-3-Clause (the Snowball list redistributed inside the NLTK
  Apache-2.0 corpus archive).

### Snowball BSD-3-Clause license text

```
Copyright (c) 2001, Dr Martin Porter
Copyright (c) 2002, Richard Boulton
Copyright (c) 2004, 2005, Richard Boulton
Copyright (c) 2013, Yoshiki Shibukawa
Copyright (c) 2006-2025, Olly Betts
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    1. Redistributions of source code must retain the above copyright notice,
       this list of conditions and the following disclaimer.

    2. Redistributions in binary form must reproduce the above copyright
       notice, this list of conditions and the following disclaimer in the
       documentation and/or other materials provided with the distribution.

    3. Neither the name of the Snowball project nor the names of its
       contributors may be used to endorse or promote products derived from
       this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
```

### NLTK Apache-2.0 packaging notice

NLTK is licensed under Apache-2.0 (https://www.apache.org/licenses/LICENSE-2.0).
The `stopwords` corpus is redistributed unmodified inside the NLTK data
package.
````

- [ ] **Step 2: Commit**

```bash
git add THIRD_PARTY_NOTICES.md
git commit -m "docs: add THIRD_PARTY_NOTICES.md for BSD-3 Snowball stopword list"
```

---

## Task 2: English stopword data file

**Files:**

- Create: `src/utils/stopwords/english.ts`
- Test: `tests/unit/utils/stopwords/english.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/utils/stopwords/english.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { english } from '../../../../src/utils/stopwords/english.js';

describe('english stopwords', () => {
    it('exports a Set with 198 entries', () => {
        expect(english).toBeInstanceOf(Set);
        expect(english.size).toBe(198);
    });

    it('contains common stopwords', () => {
        expect(english.has('the')).toBe(true);
        expect(english.has('and')).toBe(true);
        expect(english.has('is')).toBe(true);
    });

    it('contains contractions from NLTK', () => {
        expect(english.has("don't")).toBe(true);
        expect(english.has("you've")).toBe(true);
        expect(english.has("shouldn't")).toBe(true);
    });

    it('does not contain content words (sanity check vs `stopword` npm)', () => {
        // These are in `stopword` npm's `eng` but not in NLTK's english.
        expect(english.has('come')).toBe(false);
        expect(english.has('make')).toBe(false);
        expect(english.has('way')).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test:unit -- tests/unit/utils/stopwords/english.test.ts
```

Expected: FAIL with "Cannot find module '.../english.js'".

- [ ] **Step 3: Create the data file**

Write `src/utils/stopwords/english.ts`:

```typescript
/**
 * NLTK English stopword list (198 words).
 *
 * Sourced from NLTK `stopwords/english` at commit
 * 98e14261eaec2244af1db4ec5b282112444495aa (2026-01-09).
 * Raw-bytes SHA-256:
 *   f6d005956f407dbc6ea32e5ff0c7e8e6f71488d3239b9023efdc7fc139d6375b
 *
 * The list is authored by the Snowball project (BSD-3-Clause); NLTK
 * redistributes it unmodified inside its Apache-2.0 corpus archive.
 * Full attribution and license text live in THIRD_PARTY_NOTICES.md at the
 * repository root.
 *
 * DO NOT EDIT BY HAND. To refresh, re-download the pinned zip, verify the
 * SHA-256, and regenerate this file.
 */
export const english: ReadonlySet<string> = new Set([
    'a',
    'about',
    'above',
    'after',
    'again',
    'against',
    'ain',
    'all',
    'am',
    'an',
    'and',
    'any',
    'are',
    'aren',
    "aren't",
    'as',
    'at',
    'be',
    'because',
    'been',
    'before',
    'being',
    'below',
    'between',
    'both',
    'but',
    'by',
    'can',
    'couldn',
    "couldn't",
    'd',
    'did',
    'didn',
    "didn't",
    'do',
    'does',
    'doesn',
    "doesn't",
    'doing',
    'don',
    "don't",
    'down',
    'during',
    'each',
    'few',
    'for',
    'from',
    'further',
    'had',
    'hadn',
    "hadn't",
    'has',
    'hasn',
    "hasn't",
    'have',
    'haven',
    "haven't",
    'having',
    'he',
    "he'd",
    "he'll",
    "he's",
    'her',
    'here',
    'hers',
    'herself',
    'him',
    'himself',
    'his',
    'how',
    'i',
    "i'd",
    "i'll",
    "i'm",
    "i've",
    'if',
    'in',
    'into',
    'is',
    'isn',
    "isn't",
    'it',
    "it'd",
    "it'll",
    "it's",
    'its',
    'itself',
    'just',
    'll',
    'm',
    'ma',
    'me',
    'mightn',
    "mightn't",
    'more',
    'most',
    'mustn',
    "mustn't",
    'my',
    'myself',
    'needn',
    "needn't",
    'no',
    'nor',
    'not',
    'now',
    'o',
    'of',
    'off',
    'on',
    'once',
    'only',
    'or',
    'other',
    'our',
    'ours',
    'ourselves',
    'out',
    'over',
    'own',
    're',
    's',
    'same',
    'shan',
    "shan't",
    'she',
    "she'd",
    "she'll",
    "she's",
    'should',
    "should've",
    'shouldn',
    "shouldn't",
    'so',
    'some',
    'such',
    't',
    'than',
    'that',
    "that'll",
    'the',
    'their',
    'theirs',
    'them',
    'themselves',
    'then',
    'there',
    'these',
    'they',
    "they'd",
    "they'll",
    "they're",
    "they've",
    'this',
    'those',
    'through',
    'to',
    'too',
    'under',
    'until',
    'up',
    've',
    'very',
    'was',
    'wasn',
    "wasn't",
    'we',
    "we'd",
    "we'll",
    "we're",
    "we've",
    'were',
    'weren',
    "weren't",
    'what',
    'when',
    'where',
    'which',
    'while',
    'who',
    'whom',
    'why',
    'will',
    'with',
    'won',
    "won't",
    'wouldn',
    "wouldn't",
    'y',
    'you',
    "you'd",
    "you'll",
    "you're",
    "you've",
    'your',
    'yours',
    'yourself',
    'yourselves',
]);
```

> **Refresh procedure** (for future contributors, not part of this task): run
>
> ```bash
> curl -fsSL "https://github.com/nltk/nltk_data/raw/<commit-sha>/packages/corpora/stopwords.zip" -o /tmp/nltk.zip
> unzip -p /tmp/nltk.zip stopwords/english | shasum -a 256
> ```
>
> then update the SHA in the header and re-sort the list.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:unit -- tests/unit/utils/stopwords/english.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/stopwords/english.ts tests/unit/utils/stopwords/english.test.ts
git commit -m "feat(stopwords): embed NLTK English list (BSD-3 Snowball, pinned 98e1426)"
```

---

## Task 3: Registry and resolve helper

**Files:**

- Create: `src/utils/stopwords/registry.ts`
- Create: `src/utils/stopwords/resolve.ts`
- Test: `tests/unit/utils/stopwords/resolve.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/utils/stopwords/resolve.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { resolveStopwords } from '../../../../src/utils/stopwords/resolve.js';
import { english } from '../../../../src/utils/stopwords/english.js';
import { QueryValidationError } from '../../../../src/errors.js';

describe('resolveStopwords', () => {
    it('returns the english set when input is undefined', () => {
        expect(resolveStopwords(undefined)).toBe(english);
    });

    it('returns null when input is null', () => {
        expect(resolveStopwords(null)).toBeNull();
    });

    it('returns the english set when input is "english"', () => {
        expect(resolveStopwords('english')).toBe(english);
    });

    it('throws on unknown language identifier', () => {
        expect(() => resolveStopwords('spanish')).toThrow(QueryValidationError);
        expect(() => resolveStopwords('spanish')).toThrow(/unknown stopwords language/);
    });

    it('throws on non-lowercase language identifier (Python parity)', () => {
        expect(() => resolveStopwords('English')).toThrow(QueryValidationError);
    });

    it('converts arrays to a Set verbatim (no case fold)', () => {
        const set = resolveStopwords(['Foo', 'bar']) as ReadonlySet<string>;
        expect(set).toBeInstanceOf(Set);
        expect(set.has('Foo')).toBe(true);
        expect(set.has('foo')).toBe(false);
        expect(set.has('bar')).toBe(true);
    });

    it('copies Sets verbatim (no case fold)', () => {
        const input = new Set(['Quick']);
        const set = resolveStopwords(input) as ReadonlySet<string>;
        expect(set).not.toBe(input);
        expect(set.has('Quick')).toBe(true);
        expect(set.has('quick')).toBe(false);
    });

    it('throws when an iterable contains a non-string member', () => {
        expect(() => resolveStopwords(['ok', 42 as unknown as string])).toThrow(
            QueryValidationError
        );
        expect(() => resolveStopwords(['ok', 42 as unknown as string])).toThrow(
            /must contain only strings/
        );
    });

    it('returns an empty Set for an empty array (no-op, not an error)', () => {
        const set = resolveStopwords([]) as ReadonlySet<string>;
        expect(set).toBeInstanceOf(Set);
        expect(set.size).toBe(0);
    });

    it('returns an empty Set for an empty Set', () => {
        const set = resolveStopwords(new Set()) as ReadonlySet<string>;
        expect(set).toBeInstanceOf(Set);
        expect(set.size).toBe(0);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- tests/unit/utils/stopwords/resolve.test.ts
```

Expected: FAIL — `Cannot find module '.../resolve.js'`.

- [ ] **Step 3: Create the registry**

Write `src/utils/stopwords/registry.ts`:

```typescript
import { english } from './english.js';

/**
 * Internal registry of language-identifier → stopword set. `resolveStopwords`
 * uses this for the string-input branch. Not re-exported publicly; consumers
 * pass `'english'` or their own list/Set instead.
 */
export const LANGUAGE_REGISTRY: Readonly<Record<string, ReadonlySet<string>>> = {
    english,
};
```

- [ ] **Step 4: Create the resolve helper**

Write `src/utils/stopwords/resolve.ts`:

```typescript
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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:unit -- tests/unit/utils/stopwords/resolve.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add src/utils/stopwords/registry.ts src/utils/stopwords/resolve.ts tests/unit/utils/stopwords/resolve.test.ts
git commit -m "feat(stopwords): add registry and resolveStopwords helper"
```

---

## Task 4: Barrel + public namespace

**Files:**

- Create: `src/utils/stopwords/index.ts`

- [ ] **Step 1: Create the barrel**

Write `src/utils/stopwords/index.ts`:

```typescript
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
```

- [ ] **Step 2: Type-check the new module**

```bash
npm run type-check
```

Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/utils/stopwords/index.ts
git commit -m "feat(stopwords): add barrel with stopwords namespace + english named export"
```

---

## Task 5: Wire stopwords into TextQuery

This is the largest task. We write all 16 new tests (plus update one existing test), watch them fail, then make them pass by rewriting `text.ts`.

**Files:**

- Modify: `src/query/text.ts`
- Modify: `tests/unit/query/text.test.ts`

- [ ] **Step 1: Update the existing failing-expectation test and add the new `describe('stopwords', ...)` block**

Open `tests/unit/query/text.test.ts`. Replace the existing test:

```typescript
it('escapes special characters in tokens but allows readable wildcards', () => {
    // Comma and parens get escaped; spaces become token separators.
    const q = new TextQuery({
        text: 'hello, world',
        textFieldName: 'description',
    });
    expect(q.buildQuery()).toBe('@description:(hello\\, | world)');
});
```

with:

```typescript
it('strips leading/trailing commas during normalization (Python parity)', () => {
    // The comma is stripped from the token before escape, so no escaped comma
    // appears in the rendered query. Mirrors Python's
    // _tokenize_and_escape_query (query.py:1445).
    const q = new TextQuery({
        text: 'hello, world',
        textFieldName: 'description',
        stopwords: null,
    });
    expect(q.buildQuery()).toBe('@description:(hello | world)');
});
```

Then add a new top-level `describe` block at the end of the file (just before the final closing `});` of the outer `describe('TextQuery', () => {`):

```typescript
describe('stopwords', () => {
    it('default "english" drops common stopwords', () => {
        const q = new TextQuery({ text: 'the quick brown fox', textFieldName: 'description' });
        expect(q.buildQuery()).toBe('@description:(quick | brown | fox)');
    });

    it('default drops contractions like "don\'t"', () => {
        const q = new TextQuery({ text: "don't run", textFieldName: 'description' });
        // "don't" is in the NLTK list; only "run" survives.
        expect(q.buildQuery()).toBe('@description:(run)');
    });

    it('lowercases tokens before comparison', () => {
        const q = new TextQuery({ text: 'The Quick', textFieldName: 'description' });
        // "The" → "the" → dropped; "Quick" → "quick" → kept.
        expect(q.buildQuery()).toBe('@description:(quick)');
    });

    it('strips typographic quotes (U+201C / U+201D)', () => {
        const q = new TextQuery({
            text: '“smart” quotes',
            textFieldName: 'description',
            stopwords: null,
        });
        expect(q.buildQuery()).toBe('@description:(smart | quotes)');
    });

    it('skips filtering entirely when stopwords is null', () => {
        const q = new TextQuery({
            text: 'the quick',
            textFieldName: 'description',
            stopwords: null,
        });
        expect(q.buildQuery()).toBe('@description:(the | quick)');
    });

    it('explicit array overrides (does NOT extend) the default', () => {
        const q = new TextQuery({
            text: 'the quick fox',
            textFieldName: 'description',
            stopwords: ['quick'],
        });
        // 'the' is kept because the explicit list is ['quick'] only.
        expect(q.buildQuery()).toBe('@description:(the | fox)');
    });

    it('matches lowercase entries against normalized tokens', () => {
        const q = new TextQuery({
            text: 'Quick fox',
            textFieldName: 'description',
            stopwords: new Set(['quick']),
        });
        // "Quick" normalizes to "quick", which is in the set.
        expect(q.buildQuery()).toBe('@description:(fox)');
    });

    it('Python-parity foot-gun: uppercase entries do NOT match lowercased tokens', () => {
        const q = new TextQuery({
            text: 'quick fox',
            textFieldName: 'description',
            stopwords: new Set(['Quick']),
        });
        // Set holds "Quick"; token is "quick". No match — mirrors query.py:1426/:1450.
        expect(q.buildQuery()).toBe('@description:(quick | fox)');
    });

    it('"english" explicit matches default behavior', () => {
        const a = new TextQuery({ text: 'the quick fox', textFieldName: 'd' });
        const b = new TextQuery({
            text: 'the quick fox',
            textFieldName: 'd',
            stopwords: 'english',
        });
        expect(a.buildQuery()).toBe(b.buildQuery());
    });

    it('rejects non-lowercase language identifier at construction', () => {
        expect(
            () => new TextQuery({ text: 'x', textFieldName: 'd', stopwords: 'English' })
        ).toThrow(QueryValidationError);
    });

    it('rejects unknown language at construction', () => {
        expect(
            () => new TextQuery({ text: 'x', textFieldName: 'd', stopwords: 'spanish' })
        ).toThrow(QueryValidationError);
    });

    it('rejects non-string iterable members at construction', () => {
        expect(
            () =>
                new TextQuery({
                    text: 'x',
                    textFieldName: 'd',
                    stopwords: ['ok', 42 as unknown as string],
                })
        ).toThrow(QueryValidationError);
    });

    it('empty array is a no-op (not an error)', () => {
        const q = new TextQuery({
            text: 'the quick',
            textFieldName: 'description',
            stopwords: [],
        });
        expect(q.buildQuery()).toBe('@description:(the | quick)');
    });

    it('throws at buildQuery() (not constructor) when all tokens are filtered', () => {
        const q = new TextQuery({ text: 'the and is', textFieldName: 'd' });
        expect(() => q.buildQuery()).toThrow(QueryValidationError);
        expect(() => q.buildQuery()).toThrow(/text yielded no tokens after stopword removal/);
    });

    it('filter clause still composes correctly when stopwords drop tokens', () => {
        const q = new TextQuery({
            text: 'the engineer',
            textFieldName: 'description',
            filter: Tag('active').eq('true'),
        });
        expect(q.buildQuery()).toBe('(@active:{true} @description:(engineer))');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- tests/unit/query/text.test.ts
```

Expected: many failures — most new tests fail because `stopwords` is not yet recognized; updated `hello, world` test fails because the comma is still being escaped.

- [ ] **Step 3: Rewrite `src/query/text.ts`**

Replace the entire contents of `src/query/text.ts` with:

````typescript
import { renderFilter, type BaseQuery, type FilterInput } from './base.js';
import { TokenEscaper } from '../utils/token-escaper.js';
import { QueryValidationError } from '../errors.js';
import { resolveStopwords, type StopwordsInput } from '../utils/stopwords/resolve.js';

const escaper = new TokenEscaper();

const STRIP_LEADING_TRAILING_COMMAS = /^,+|,+$/g;
const TYPOGRAPHIC_QUOTES = /[“”]/g;

function normalizeToken(token: string): string {
    return token
        .trim()
        .replace(STRIP_LEADING_TRAILING_COMMAS, '')
        .replace(TYPOGRAPHIC_QUOTES, '')
        .toLowerCase();
}

/**
 * A Redis Search built-in text scorer.
 * @see https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/scoring/
 */
export type TextScorer = 'BM25' | 'BM25STD' | 'TFIDF' | 'TFIDF.DOCNORM' | 'DISMAX' | 'DOCSCORE';

/**
 * Configuration for {@link TextQuery}.
 */
export interface TextQueryConfig {
    /** Free-text query. Tokenised on whitespace, normalized (lowercase, comma + curly-quote strip), stopword-filtered, then OR-joined. */
    text: string;

    /** Indexed text field to search against. */
    textFieldName: string;

    /**
     * Scorer to apply when ranking results. Defaults to `BM25STD`.
     * Has no effect unless the index field is configured as TEXT.
     */
    textScorer?: TextScorer;

    /** Optional filter expression combined with the text clause via AND. */
    filter?: FilterInput;

    /** Fields to include in each result document. */
    returnFields?: string[];

    /** Number of results to return. Defaults to 10. */
    numResults?: number;

    /** Pagination offset. */
    offset?: number;

    /** Pagination limit. Defaults to numResults. */
    limit?: number;

    /**
     * Stopwords to drop before OR-joining tokens.
     *
     * - `'english'` (default): use the embedded NLTK English list (198 words, BSD-3-Clause Snowball).
     * - `readonly string[]` or `ReadonlySet<string>`: explicit list. Stored as-is — pass lowercase
     *   entries because tokens are lowercased before lookup. `['The']` will NOT filter `'the'`.
     * - `null`: skip filtering entirely.
     *
     * The language identifier is matched strictly (lowercase, exact). `'English'` throws.
     * Non-string members of iterables throw at construction.
     */
    stopwords?: StopwordsInput;
}

/**
 * Full-text search query with optional filter.
 *
 * Tokenises the input on whitespace, normalizes each token (trim, strip
 * leading/trailing commas, strip typographic quotes, lowercase), drops
 * stopwords, escapes Redis Search special characters, and OR-joins the
 * survivors inside the target field. Use `filter` to scope the search to
 * a subset of documents (e.g. by tag or numeric range).
 *
 * **Note:** per-field and per-token weights from Python's
 * `redisvl.query.TextQuery` are not yet ported.
 *
 * @example
 * ```typescript
 * import { TextQuery, Tag } from 'redisvl';
 *
 * const q = new TextQuery({
 *   text: 'machine learning',
 *   textFieldName: 'description',
 *   filter: Tag('category').eq('tech'),
 * });
 * const results = await index.search(q);
 * ```
 */
export class TextQuery implements BaseQuery {
    public readonly text: string;
    public readonly textFieldName: string;
    public readonly textScorer: TextScorer;
    public readonly filter?: FilterInput;
    public readonly returnFields?: string[];
    public readonly numResults: number;
    public readonly offset?: number;
    public readonly limit?: number;
    public readonly stopwords: ReadonlySet<string> | null;

    constructor(config: TextQueryConfig) {
        if (!config.text || config.text.trim() === '') {
            throw new QueryValidationError('text cannot be empty');
        }

        if (!config.textFieldName) {
            throw new QueryValidationError('textFieldName is required');
        }

        this.text = config.text;
        this.textFieldName = config.textFieldName;
        this.textScorer = config.textScorer ?? 'BM25STD';
        this.filter = config.filter;
        this.returnFields = config.returnFields;
        this.numResults = config.numResults ?? 10;
        this.offset = config.offset;
        this.limit = config.limit ?? this.numResults;
        this.stopwords = resolveStopwords(config.stopwords);
    }

    buildQuery(): string {
        const stopwordSet = this.stopwords;
        const tokens: string[] = [];
        for (const raw of this.text.split(/\s+/)) {
            const norm = normalizeToken(raw);
            if (norm.length === 0) continue;
            if (stopwordSet && stopwordSet.has(norm)) continue;
            tokens.push(escaper.escape(norm));
        }

        if (tokens.length === 0) {
            throw new QueryValidationError('text yielded no tokens after stopword removal');
        }

        const textClause = `@${this.textFieldName}:(${tokens.join(' | ')})`;
        const filterStr = renderFilter(this.filter);
        if (filterStr === '*') {
            return textClause;
        }
        return `(${filterStr} ${textClause})`;
    }

    buildParams(): Record<string, unknown> {
        return {};
    }
}
````

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- tests/unit/query/text.test.ts
```

Expected: PASS, all tests in the file (the existing constructor/buildQuery/buildParams tests + the new 15-test stopwords block + the updated comma test).

- [ ] **Step 5: Commit**

```bash
git add src/query/text.ts tests/unit/query/text.test.ts
git commit -m "feat(query/text): port Python stopword filtering + token normalization

Tokens are now normalized (trim, strip leading/trailing commas, strip
typographic quotes, lowercase) before stopword filtering and escaping,
matching Python redisvl's _tokenize_and_escape_query (query.py:1445).

Default 'stopwords' is 'english' (the embedded NLTK list); pass null to
disable, or a string[]/Set<string> to override. Custom lists are stored
as-is (Python parity at query.py:1426) — callers must lowercase entries.

Closes #16 (Phase 1 — English only)."
```

---

## Task 6: Re-export stopwords namespace from the public entry

**Files:**

- Modify: `src/index.ts`
- Modify: `tests/unit/query/text.test.ts`

- [ ] **Step 1: Add the failing namespace-import test**

Inside `tests/unit/query/text.test.ts`, in the `describe('stopwords', ...)` block, add as the last test:

```typescript
it('exposes the english set via the public stopwords namespace', async () => {
    const { stopwords } = await import('../../../src/index.js');
    expect(stopwords.english).toBeInstanceOf(Set);
    expect(stopwords.english.size).toBe(198);
    expect(stopwords.english.has('the')).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:unit -- tests/unit/query/text.test.ts -t "stopwords namespace"
```

Expected: FAIL — `stopwords` is undefined on the main module.

- [ ] **Step 3: Add the re-export**

Open `src/index.ts`. Locate the `// Utility exports` block near the bottom. Add immediately after it:

```typescript
// Stopwords exports (also available as the `redis-vl/stopwords` subpath)
export { stopwords } from './utils/stopwords/index.js';
export type { StopwordsInput } from './utils/stopwords/index.js';
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm run test:unit -- tests/unit/query/text.test.ts -t "stopwords namespace"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts tests/unit/query/text.test.ts
git commit -m "feat(stopwords): re-export stopwords namespace from main entry"
```

---

## Task 7: Subpath export and tarball inclusion

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Add THIRD_PARTY_NOTICES.md to the published tarball**

In `package.json`, locate the `"files"` array and add `"THIRD_PARTY_NOTICES.md"`. The block should become:

```json
    "files": [
        "dist",
        "README.md",
        "LICENSE",
        "THIRD_PARTY_NOTICES.md"
    ],
```

- [ ] **Step 2: Add the `./stopwords` subpath export**

In `package.json`, locate the `"exports"` object. Replace it with:

```json
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js"
        },
        "./stopwords": {
            "types": "./dist/utils/stopwords/index.d.ts",
            "import": "./dist/utils/stopwords/index.js"
        }
    },
```

- [ ] **Step 3: Verify the build produces the expected dist paths**

```bash
npm run build
ls dist/utils/stopwords/
```

Expected: `english.d.ts  english.js  index.d.ts  index.js  registry.d.ts  registry.js  resolve.d.ts  resolve.js`.

- [ ] **Step 4: Smoke-test the subpath import via Node**

```bash
node -e "import('./dist/utils/stopwords/index.js').then(m => { console.log('english.size=' + m.english.size); console.log('stopwords.english.size=' + m.stopwords.english.size); })"
```

Expected output:

```
english.size=198
stopwords.english.size=198
```

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "feat(stopwords): add redis-vl/stopwords subpath export + ship notices"
```

---

## Task 8: Integration test

**Files:**

- Modify: `tests/integration/query-types.test.ts`

- [ ] **Step 1: Find the existing TextQuery integration tests for placement**

```bash
grep -n "TextQuery" tests/integration/query-types.test.ts | head
```

Identify a `describe('TextQuery', () => { ... })` block (or the nearest grouping for TextQuery cases) to nest the new test in. If there is no such block, add the new test at the file's top-level after the imports.

- [ ] **Step 2: Add the integration test**

Inside the most appropriate TextQuery `describe` block (or at the top level if there isn't one), add:

```typescript
it('default stopwords let stopword-bearing queries still match documents', async () => {
    const docs = [
        { id: '1', description: 'the quick brown fox' },
        { id: '2', description: 'lazy dog naps quietly' },
    ];
    for (const doc of docs) {
        await client.hSet(`${schema.index.prefix}${doc.id}`, doc);
    }

    // 'the' should be stripped by the default English stopwords; the
    // query becomes @description:(fox), which still matches doc 1.
    const q = new TextQuery({
        text: 'the fox',
        textFieldName: 'description',
        returnFields: ['description'],
    });
    const result = await index.search(q);
    expect(result.documents.map((d) => d.value.description)).toContain('the quick brown fox');
});
```

> **Note:** the variable names `client`, `schema`, `index` should match whatever the surrounding test file already wires up in `beforeEach`/`beforeAll`. If the file uses different names (e.g. `redis`, `searchIndex`), adapt accordingly — do not change the surrounding fixtures.

- [ ] **Step 3: Run the integration test**

```bash
npm test -- tests/integration/query-types.test.ts -t "stopwords let"
```

Expected: PASS (requires Docker + testcontainers; if Docker is not available locally, note the failure and rely on CI to verify).

- [ ] **Step 4: Commit**

```bash
git add tests/integration/query-types.test.ts
git commit -m "test(integration): verify stopword-bearing queries still match docs"
```

---

## Task 9: Update user-guide docs

**Files:**

- Modify: `website/docs/user-guide/filters-and-queries.md`

- [ ] **Step 1: Replace the "minimal port" callout**

In `website/docs/user-guide/filters-and-queries.md`, locate this block (immediately after the `Tokens are split on whitespace...` paragraph in the `### TextQuery` section):

```markdown
:::note Minimal port
This is a deliberately minimal first cut. Stopword filtering and per-token/per-field weights from Python redisvl's `TextQuery` are not yet implemented. Tokens are passed through verbatim after escaping.
:::
```

Replace it with:

```markdown
:::note Parity gap
Per-token and per-field weights from Python redisvl's `TextQuery` are not yet implemented. Stopword filtering matches Python (English by default).
:::
```

- [ ] **Step 2: Update the surrounding tokenization sentence**

Replace:

```markdown
Tokens are split on whitespace, escaped, and OR-joined inside the field — so `'machine learning'` becomes `@description:(machine | learning)`. The optional `filter` is combined with the text clause via AND.
```

with:

```markdown
Tokens are split on whitespace, normalized (lowercased, with leading/trailing commas and typographic quotes stripped), filtered against an English stopword list by default, escaped, and OR-joined — so `'The quick fox'` becomes `@description:(quick | fox)`. The optional `filter` is combined with the text clause via AND.
```

- [ ] **Step 3: Add the `stopwords` row to the options table**

Find the TextQuery options table:

```markdown
| Option                                          | Notes                                                                                           |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `text`, `textFieldName`                         | Required.                                                                                       |
| `textScorer`                                    | One of `'BM25'`, `'BM25STD'` (default), `'TFIDF'`, `'TFIDF.DOCNORM'`, `'DISMAX'`, `'DOCSCORE'`. |
| `filter`                                        | Combined with the text clause via AND.                                                          |
| `returnFields`, `numResults`, `offset`, `limit` | Standard.                                                                                       |
```

Insert a `stopwords` row just before the `returnFields` row:

```markdown
| Option                                          | Notes                                                                                                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`, `textFieldName`                         | Required.                                                                                                                                                                               |
| `textScorer`                                    | One of `'BM25'`, `'BM25STD'` (default), `'TFIDF'`, `'TFIDF.DOCNORM'`, `'DISMAX'`, `'DOCSCORE'`.                                                                                         |
| `filter`                                        | Combined with the text clause via AND.                                                                                                                                                  |
| `stopwords`                                     | `'english'` (default), a custom `string[]` / `Set<string>`, or `null` to disable. Custom entries are stored as-is — pass lowercase to match the (already lowercased) normalized tokens. |
| `returnFields`, `numResults`, `offset`, `limit` | Standard.                                                                                                                                                                               |
```

- [ ] **Step 4: Add a stopwords example after the existing `query` block**

Locate the existing `### TextQuery` example block (the one with `text: 'machine learning tutorial'`). Immediately after the `const results = await index.search(query);` line and its closing code-fence, add:

````markdown
#### Stopword filtering

```typescript
import { TextQuery, stopwords } from 'redisvl';

// Default: the embedded NLTK English list (198 words) strips common stopwords.
new TextQuery({ text: 'the quick brown fox', textFieldName: 'description' }).buildQuery();
// → '@description:(quick | brown | fox)'

// Opt out:
new TextQuery({
    text: 'the quick',
    textFieldName: 'description',
    stopwords: null,
}).buildQuery();
// → '@description:(the | quick)'

// Extend the default list:
new TextQuery({
    text: 'foo bar quick',
    textFieldName: 'description',
    stopwords: new Set([...stopwords.english, 'foo']),
}).buildQuery();
// → '@description:(bar | quick)'
```

The `stopwords` namespace is also available via the subpath import:

```typescript
import { english } from 'redisvl/stopwords';
```
````

- [ ] **Step 5: Build the docs site to verify no broken markdown**

```bash
cd website && npm run build && cd ..
```

Expected: PASS (no compilation errors).

- [ ] **Step 6: Commit**

```bash
git add website/docs/user-guide/filters-and-queries.md
git commit -m "docs: document TextQuery stopword filtering"
```

---

## Task 10: Final verification

Run the full validation pipeline. No code changes here — just confirm everything is green.

- [ ] **Step 1: Lint**

```bash
npm run lint
```

Expected: PASS, zero warnings.

- [ ] **Step 2: Type-check src + tests**

```bash
npm run type-check && npm run type-check:tests
```

Expected: PASS for both.

- [ ] **Step 3: Unit tests**

```bash
npm run test:unit
```

Expected: PASS, all suites. Note the test counts in `tests/unit/utils/stopwords/` (sanity + resolve) and `tests/unit/query/text.test.ts` (existing + 16 new stopwords tests).

- [ ] **Step 4: Full test suite (requires Docker)**

```bash
npm run test
```

Expected: PASS, including the new integration test.

> If Docker is not available locally, document this in the PR description and rely on CI.

- [ ] **Step 5: Docs site build**

```bash
cd website && npm run build && cd ..
```

Expected: PASS.

- [ ] **Step 6: Final manual smoke (optional, requires `npm run build`)**

```bash
npm run build && node -e "
import('./dist/index.js').then(m => {
  const q1 = new m.TextQuery({ text: 'the quick brown fox', textFieldName: 'd' });
  console.log('default:', q1.buildQuery());

  const q2 = new m.TextQuery({ text: 'the quick', textFieldName: 'd', stopwords: null });
  console.log('disabled:', q2.buildQuery());

  const q3 = new m.TextQuery({
    text: 'foo bar quick',
    textFieldName: 'd',
    stopwords: new Set([...m.stopwords.english, 'foo']),
  });
  console.log('extended:', q3.buildQuery());
});
"
```

Expected output:

```
default: @d:(quick | brown | fox)
disabled: @d:(the | quick)
extended: @d:(bar | quick)
```

---

## Spec coverage self-review

| Spec section / requirement                                                    | Implementing task                                                       |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| §0 BSD-3 compliance + THIRD_PARTY_NOTICES.md + pinned SHA + raw-bytes SHA-256 | Task 1, Task 2 (file header), Task 7 (ships in tarball)                 |
| §1 NLTK bytes embedded, not `stopword` npm                                    | Task 2                                                                  |
| §2 decision #1 (embed)                                                        | Task 2                                                                  |
| §2 decision #2 (default `'english'`)                                          | Task 3 (resolveStopwords default branch), Task 5 (constructor wires it) |
| §2 decision #3 (immutable types)                                              | Task 3 (`StopwordsInput`), Task 5 (`stopwords: StopwordsInput`)         |
| §2 decision #4 (strict language id)                                           | Task 3 (registry lookup throws on `'English'`)                          |
| §2 decision #5 (full Python normalization)                                    | Task 5 (`normalizeToken`)                                               |
| §2 decision #6 (custom-list stored as-is)                                     | Task 3 (`new Set(items)` no `.lower()`)                                 |
| §2 decision #7 (empty iterable no-op)                                         | Task 3 (empty Set returned, not thrown)                                 |
| §2 decision #8 (empty-after-filter at buildQuery)                             | Task 5 (throw in `buildQuery`, not constructor)                         |
| §2 decision #9 (Phase 1 English only)                                         | Whole plan                                                              |
| §2 decision #10 (public `stopwords` namespace + subpath)                      | Task 4, Task 6, Task 7                                                  |
| §3 API shape on `TextQueryConfig`                                             | Task 5                                                                  |
| §3 resolution rules table                                                     | Task 3                                                                  |
| §4 pipeline                                                                   | Task 5 (`buildQuery`)                                                   |
| §5 new files: `english.ts`                                                    | Task 2                                                                  |
| §5 new files: `registry.ts`                                                   | Task 3                                                                  |
| §5 new files: `resolve.ts`                                                    | Task 3                                                                  |
| §5 new files: `index.ts` (barrel)                                             | Task 4                                                                  |
| §5 new files: `THIRD_PARTY_NOTICES.md`                                        | Task 1                                                                  |
| §5 modify `src/query/text.ts`                                                 | Task 5                                                                  |
| §5 modify `src/index.ts`                                                      | Task 6                                                                  |
| §5 modify `package.json`                                                      | Task 7                                                                  |
| §5 modify `tests/unit/query/text.test.ts` (existing test + new block)         | Task 5 (block), Task 6 (namespace test)                                 |
| §5 modify `tests/integration/query-types.test.ts`                             | Task 8                                                                  |
| §5 modify `website/docs/user-guide/filters-and-queries.md`                    | Task 9                                                                  |
| §6 tests #1–#16 (TextQuery behavior)                                          | Task 5                                                                  |
| §6 test #17 (namespace import)                                                | Task 6                                                                  |
| §6 integration test                                                           | Task 8                                                                  |
| §8 verification pipeline                                                      | Task 10                                                                 |

No gaps. Type names checked: `StopwordsInput` defined in resolve.ts (Task 3) and used in text.ts and src/index.ts (Tasks 5, 6). `LANGUAGE_REGISTRY` is internal to the stopwords module. `english` is exported from `english.ts` (Task 2) and re-exported from the barrel (Task 4). `normalizeToken` is module-private to text.ts.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-20-textquery-stopwords.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
