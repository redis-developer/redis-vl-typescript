---
sidebar_position: 5
---

# Hybrid Search

`HybridQuery` runs a combined text + vector search in a **single Redis call** via the [`FT.HYBRID`](https://redis.io/docs/latest/commands/ft.hybrid/) command. Score fusion happens server-side using either Reciprocal Rank Fusion (RRF) or a linear combination of normalised text and vector scores.

:::info Requires Redis 8.4+
`FT.HYBRID` was added in Redis Open Source 8.4. If your Redis is older, use `VectorQuery` with a filter expression instead.
:::

:::caution Experimental
The underlying `client.ft.hybrid()` is flagged experimental by `@redis/search`; its argument shape and reply format may shift across minor releases. Pin `@redis/search` if stability matters.
:::

## When to Use Hybrid Search

Hybrid search shines when **neither pure vector similarity nor pure full-text search is enough on its own**:

- Vector search captures semantic similarity but can return irrelevant matches when the literal words matter (product codes, names, exact phrases).
- Full-text search captures keyword presence but can't see semantic relationships.

Combining them, with the right fusion strategy, gives you results that are both topically relevant and keyword-relevant.

## Quick Start

```typescript
import { SearchIndex, IndexSchema, HybridQuery } from 'redisvl';
import { createClient } from 'redis';

const client = createClient();
await client.connect();

const schema = IndexSchema.fromObject({
    index: { name: 'products', prefix: 'product:', storage_type: 'hash' },
    fields: [
        { name: 'description', type: 'text' },
        { name: 'brand', type: 'tag' },
        { name: 'price', type: 'numeric' },
        {
            name: 'embedding',
            type: 'vector',
            attrs: { dims: 384, algorithm: 'hnsw', distanceMetric: 'cosine' },
        },
    ],
});
const index = new SearchIndex(schema, client);

const query = new HybridQuery({
    text: 'machine learning',
    textFieldName: 'description',
    vector: embedding, // produced by your vectorizer
    vectorField: 'embedding',
    combine: { type: 'RRF' },
    returnFields: ['description', 'brand', 'price'],
});

const results = await index.hybridSearch(query);
results.documents.forEach((doc) => {
    console.log(`${doc.value.brand}: ${doc.value.description} (score=${doc.score})`);
});
console.log(`Server time: ${results.executionTime}ms`);
```

`index.hybridSearch()` returns a `HybridSearchResult<T>` — the same shape as `SearchResult` (`total`, `documents`), plus `executionTime` and `warnings` reported by the server.

## Text Body — Tokenised vs Verbatim

The behaviour of the `text` field depends on whether you also supply `textFieldName`.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="tokenized" label="With textFieldName (recommended)" default>

The text is split on whitespace, escaped, and OR-joined inside the named field:

```typescript
new HybridQuery({
    text: 'machine learning',
    textFieldName: 'description',
    // ... rest of query
});
// Sent to Redis as: @description:(machine | learning)
```

Use this for typical search-box-style input. Special characters get escaped automatically so user-supplied strings are safe to embed.

</TabItem>
<TabItem value="verbatim" label="Without textFieldName (power users)">

The text body is passed through to Redis unchanged, so you can use the full [Redis Search query syntax](https://redis.io/docs/latest/develop/interact/search-and-query/query/):

```typescript
new HybridQuery({
    text: '@brand:{omega} programming',
    // textFieldName omitted
    // ... rest of query
});
// Sent to Redis exactly as: @brand:{omega} programming
```

Use this when you need to compose tag filters, fielded search, or operators directly in the text body.

</TabItem>
</Tabs>

## Vector Method — KNN or RANGE

The vector side runs either **KNN** (top-K) or **RANGE** (within a radius). The two are mutually exclusive — pick the discriminator on `vectorMethod.type`:

```typescript
// Top-K nearest neighbours (default — k defaults to 10)
new HybridQuery({
    // ...
    vectorMethod: { type: 'KNN', k: 20, efRuntime: 200 },
});

// Every neighbour within a fixed distance
new HybridQuery({
    // ...
    vectorMethod: { type: 'RANGE', radius: 0.3, epsilon: 0.05 },
});
```

| Option | Method | Notes |
| ------ | ------ | ----- |
| `k` | KNN | Number of nearest neighbours to consider. Default `10`. |
| `efRuntime` | KNN | HNSW search-window size. Higher = better recall, slower. |
| `radius` | RANGE | Max distance (in the field's metric). Required. |
| `epsilon` | RANGE | Tolerance for approximate range search. |

When `vectorMethod` is omitted, `HybridQuery` defaults to `{ type: 'KNN', k: 10 }`.

## Score Fusion — RRF or LINEAR

Set `combine` to choose how the text and vector scores are merged into a single ranking. When omitted, Redis uses its default RRF behaviour.

<Tabs>
<TabItem value="rrf" label="RRF (default)" default>

Reciprocal Rank Fusion. Robust default — works without per-corpus tuning because it fuses by **rank** rather than raw score:

```typescript
new HybridQuery({
    // ...
    combine: { type: 'RRF', constant: 60, window: 20 },
});
```

| Option | Notes |
| ------ | ----- |
| `constant` | RRF dampening constant. Default `60`. Higher = ranks contribute less aggressively. |
| `window` | Top-N from each ranker used in fusion. Default `20`. |

</TabItem>
<TabItem value="linear" label="LINEAR">

Weighted sum of the normalised text and vector scores. Useful when you've tuned the relative importance of each side:

```typescript
new HybridQuery({
    // ...
    combine: { type: 'LINEAR', alpha: 0.7, beta: 0.3, window: 50 },
});
```

| Option | Notes |
| ------ | ----- |
| `alpha` | Weight for the text score. Must be in `[0, 1]`. |
| `beta` | Weight for the vector score. Must be in `[0, 1]`. |
| `window` | Top-N from each ranker used in fusion. |

</TabItem>
</Tabs>

## Filters — Two Different Dialects

`HybridQuery` exposes **two filter slots**, and they use **different filter syntaxes**:

| Field | Applies to | Syntax |
| ----- | ---------- | ------ |
| `vsimFilter` | Vector candidates only (pre-fusion) | Redis Search filter dialect (e.g. `'@brand:{nike}'`) |
| `postFilter` | Every result after fusion | Redis aggregation expression dialect (e.g. `'@price < 200'`) |

```typescript
new HybridQuery({
    text: 'ergonomic',
    textFieldName: 'description',
    vector: embedding,
    vectorField: 'embedding',
    vsimFilter: '@category:{furniture}', // narrows the vector candidate set
    postFilter: '@price < 1000', // applied after RRF/LINEAR fusion
    combine: { type: 'RRF' },
});
```

:::warning Union semantics
`FT.HYBRID` returns the **union** of the SEARCH-side candidates and the VSIM-side candidates. `vsimFilter` only narrows the vector side — text-only matches can still appear in the result. To filter the entire result set, use `postFilter` (or put the filter in the `text` body so it restricts SEARCH too).
:::

## Score Aliases

Each ranker (text, vector, fused) can emit its score under a named alias so you can sort or post-process on it. The fused score is exposed as `doc.score` regardless — these aliases are only useful if you also want the individual contributions to come back in the result row.

```typescript
new HybridQuery({
    // ...
    textScoreAlias: 'text_score',
    vectorScoreAlias: 'vector_score',
    combinedScoreAlias: 'hybrid_score', // defaults to 'hybrid_score'
});

const results = await index.hybridSearch(query);
results.documents.forEach((doc) => {
    console.log({
        combined: doc.score,
        text: doc.value.text_score,
        vector: doc.value.vector_score,
    });
});
```

## Output: returnFields, LIMIT, SORTBY

```typescript
new HybridQuery({
    // ...
    returnFields: ['title', 'price'], // FT.HYBRID LOAD
    numResults: 25, // FT.HYBRID LIMIT count
    offset: 0,
    sortBy: [{ field: 'price', direction: 'DESC' }],
    timeout: 500,
});
```

- `returnFields` populates the FT.HYBRID `LOAD` clause. The document key (`@__key`) is always loaded automatically so `doc.id` is populated regardless.
- Bare field names are auto-prefixed with `@`. Pass `'@field'` or `'$.json.path'` if you need an explicit reference.
- Score aliases declared via `YIELD_SCORE_AS` are **not** added to `LOAD` — Redis already injects them into each row.
- `sortBy` accepts an array; multiple entries become a multi-key sort.

## Choosing a Text Scorer

`textScorer` maps directly to FT.HYBRID's `SCORER` option on the SEARCH side. When omitted, the server picks its default (`BM25STD`).

```typescript
new HybridQuery({
    // ...
    textScorer: 'BM25STD', // or 'BM25', 'TFIDF', 'TFIDF.DOCNORM', 'DISMAX', 'DOCSCORE'
});
```

## Complete Example

```typescript
import { HybridQuery, HuggingFaceVectorizer } from 'redisvl';

const vectorizer = new HuggingFaceVectorizer({
    model: 'Xenova/all-MiniLM-L6-v2',
});
const embedding = await vectorizer.embed('comfortable office chair');

const query = new HybridQuery({
    text: 'comfortable chair',
    textFieldName: 'description',
    vector: embedding,
    vectorField: 'embedding',

    vectorMethod: { type: 'KNN', k: 50 },
    combine: { type: 'RRF', constant: 60 },

    vsimFilter: '@category:{furniture}',
    postFilter: '@price < 500',

    returnFields: ['title', 'brand', 'price'],
    numResults: 10,
    sortBy: [{ field: 'hybrid_score', direction: 'DESC' }],
});

const results = await index.hybridSearch(query);

console.log(`Found ${results.total} matches in ${results.executionTime}ms`);
if (results.warnings?.length) {
    console.warn('Server warnings:', results.warnings);
}

results.documents.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.value.title} — $${doc.value.price}`);
    console.log(`   Hybrid score: ${doc.score?.toFixed(4)}`);
});
```

## Next Steps

- [Search Index](./search-index) — basic CRUD and vector search
- [Advanced Vector Search](./advanced-vector-search) — distance normalisation and algorithm tuning
- [Vectorizers](./vectorizers) — generating embeddings
