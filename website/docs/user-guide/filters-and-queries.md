---
sidebar_position: 4
---

# Filters and Query Types

RedisVL ships a small, composable **filter expression DSL** alongside four query types that consume it: `FilterQuery`, `CountQuery`, `VectorRangeQuery`, and `TextQuery`. The DSL also works as the `filter` argument on `VectorQuery`.

Together, they cover the cases where pure KNN vector search isn't what you want — filter-only search, counts, radius-based vector search, and full-text search with metadata filters.

## Filter Expression DSL

The DSL builds typed, escaped Redis Search filter expressions through method chaining. Every operator returns a `FilterExpression`, which can be passed directly to a query or composed further with `.and()` / `.or()`.

```typescript
import { Tag, Num, Text, Geo, GeoRadius, Timestamp } from 'redis-vl';

const filter = Tag('brand')
    .eq('nike')
    .and(Num('price').between(0, 200))
    .or(Tag('featured').eq('yes'));

// Rendered Redis filter:
// ((@brand:{nike} @price:[0 200]) | @featured:{yes})
```

### Field helpers

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="tag" label="Tag" default>

```typescript
Tag('brand').eq('nike'); // @brand:{nike}
Tag('brand').eq(['nike', 'adidas']); // @brand:{nike|adidas}
Tag('brand').ne('nike'); // (-@brand:{nike})
Tag('category').like('tech*'); // wildcard match (preserves * and ?)
Tag('brand').isMissing(); // ismissing(@brand)
```

Tag values are escaped automatically — embedded commas, spaces, or other special characters are safe.

</TabItem>
<TabItem value="num" label="Num">

```typescript
Num('price').eq(100); // @price:[100 100]
Num('price').ne(100); // (-@price:[100 100])
Num('price').gt(100); // @price:[(100 +inf]
Num('price').lt(100); // @price:[-inf (100]
Num('price').ge(100); // @price:[100 +inf]
Num('price').le(100); // @price:[-inf 100]
Num('price').between(0, 200); // @price:[0 200]
Num('price').between(0, 200, 'neither'); // exclude endpoints: @price:[(0 (200]
Num('price').isMissing();
```

`between()` accepts `'both'` (default), `'neither'`, `'left'`, or `'right'` to control endpoint inclusion.

</TabItem>
<TabItem value="text" label="Text">

```typescript
Text('description').eq('engineer'); // exact phrase: @description:("engineer")
Text('description').ne('engineer'); // (-@description:"engineer")
Text('description').like('engine*'); // wildcard / fuzzy / OR pattern
Text('description').isMissing();
```

`Text` matches on indexed TEXT fields. For arbitrary token search, see [`TextQuery`](#textquery) below.

</TabItem>
<TabItem value="geo" label="Geo">

```typescript
import { Geo, GeoRadius } from 'redis-vl';

const sf = new GeoRadius(-122.4194, 37.7749, 5, 'km'); // lon, lat, radius, unit

Geo('location').eq(sf); // @location:[-122.4194 37.7749 5 km]
Geo('location').ne(sf); // (-@location:[...])
```

Units: `'m'`, `'km'`, `'mi'`, `'ft'`.

</TabItem>
<TabItem value="timestamp" label="Timestamp">

```typescript
import { Timestamp } from 'redis-vl';

// Accepts Date, ISO string, or Unix seconds (number)
Timestamp('created_at').eq(new Date('2024-01-15T12:00:00Z'));
Timestamp('created_at').gt(1704067200);

// An ISO date-only string is treated as the whole day in UTC:
Timestamp('created_at').eq('2024-01-15'); // @created_at:[<day-start> <day-end>]

// Range across two dates:
Timestamp('created_at').between(new Date('2024-01-01'), new Date('2024-12-31'));
```

`Timestamp` is a `Num` underneath — the same operators are available (`gt`, `lt`, `ge`, `le`, `between`, `eq`, `ne`, `isMissing`).

</TabItem>
</Tabs>

### Composition

Every operator returns a `FilterExpression`. Combine expressions with `.and()` and `.or()` — they're regular methods, evaluated in chain order:

```typescript
import { Tag, Num } from 'redis-vl';

Tag('brand')
    .eq('nike')
    .and(Num('price').lt(100));
// (@brand:{nike} @price:[-inf (100])

Tag('brand')
    .eq('nike')
    .or(Tag('brand').eq('adidas'));
// (@brand:{nike} | @brand:{adidas})

// Wildcards collapse: '*' AND x  →  x
new FilterExpression('*').and(Tag('brand').eq('nike'));
// @brand:{nike}
```

When you need a raw filter string instead (for example, when porting existing query code), every query accepts `string | FilterExpression` for its `filter` argument — pass either form interchangeably.

## Query Types

All four query types are passed to `index.search()` and return a `SearchResult<T>` (`total` + `documents`).

### FilterQuery

Returns documents matching a filter, with no vector or text scoring.

```typescript
import { FilterQuery, Tag, Num } from 'redis-vl';

const query = new FilterQuery({
    filter: Tag('brand').eq('nike').and(Num('price').lt(200)),
    returnFields: ['title', 'brand', 'price'],
    numResults: 25,
});

const results = await index.search(query);
results.documents.forEach((doc) => {
    console.log(doc.value.title);
});
```

Use for "give me every doc that matches X" — listings, faceted browsing, simple lookups.

| Option | Notes |
| ------ | ----- |
| `filter` | A `FilterExpression` or raw Redis filter string. Defaults to `'*'`. |
| `returnFields` | Fields to include on each document. |
| `numResults` | Default `10`. |
| `offset` / `limit` | Pagination. |

### CountQuery

Counts how many documents match a filter, without retrieving any of them. Internally sends `FT.SEARCH ... LIMIT 0 0 NOCONTENT`.

```typescript
import { CountQuery, Tag } from 'redis-vl';

const result = await index.search(
    new CountQuery({ filter: Tag('brand').eq('nike') })
);
console.log(`${result.total} matching docs`);
// result.documents is always empty for CountQuery.
```

Cheaper than `FilterQuery` when you only need the total.

### VectorRangeQuery

Vector similarity search by **distance threshold** rather than top-K. Returns every document whose vector is within `distanceThreshold` of the query vector.

```typescript
import { VectorRangeQuery, Tag } from 'redis-vl';

const query = new VectorRangeQuery({
    vector: embedding,
    vectorField: 'embedding',
    distanceThreshold: 0.3, // cosine distance, default 0.2
    filter: Tag('brand').eq('nike'), // optional pre-filter
    returnFields: ['title', 'brand'],
});

const results = await index.search(query);
results.documents.forEach((doc) => {
    console.log(`${doc.value.title} — distance ${doc.score}`);
});
```

Use when you care about **all docs above a similarity bar**, not the top-K — e.g. duplicate detection, deciding whether anything is "close enough", or paginating through every match above a quality floor.

| Option | Notes |
| ------ | ----- |
| `vector`, `vectorField` | Required. |
| `distanceThreshold` | Maximum allowed distance. Default `0.2`. |
| `filter` | Pre-filter on candidates, accepts `FilterExpression` or raw string. |
| `distanceMetric` | Defaults to `'COSINE'`. |
| `datatype` | Vector encoding. Defaults to `'FLOAT32'`. |
| `scoreAlias` | Score field name. Default `'vector_distance'`. |
| `hybridPolicy` / `batchSize` | See [Advanced Vector Search](./advanced-vector-search). |
| `normalizeDistance` | Convert distance to `[0, 1]` similarity. |

### TextQuery

Full-text search against a TEXT field, with an optional filter.

```typescript
import { TextQuery, Tag } from 'redis-vl';

const query = new TextQuery({
    text: 'machine learning tutorial',
    textFieldName: 'description',
    filter: Tag('category').eq('tutorial'),
    numResults: 20,
});

const results = await index.search(query);
```

Tokens are split on whitespace, normalized (lowercased, with leading/trailing commas and typographic quotes stripped), filtered against an English stopword list by default, escaped, and OR-joined — so `'The quick fox'` becomes `@description:(quick | fox)`. The optional `filter` is combined with the text clause via AND.

:::note Parity gap
Per-token and per-field weights from Python redisvl's `TextQuery` are not yet implemented. Stopword filtering matches Python (English by default).
:::

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

| Option | Notes |
| ------ | ----- |
| `text`, `textFieldName` | Required. |
| `textScorer` | One of `'BM25'`, `'BM25STD'` (default), `'TFIDF'`, `'TFIDF.DOCNORM'`, `'DISMAX'`, `'DOCSCORE'`. |
| `filter` | Combined with the text clause via AND. |
| `stopwords` | `'english'` (default), a custom `string[]` / `Set<string>`, or `null` to disable. Custom entries are stored as-is — pass lowercase to match the (already lowercased) normalized tokens. |
| `returnFields`, `numResults`, `offset`, `limit` | Standard. |

## Using Filters with VectorQuery

`VectorQuery` accepts the same `FilterExpression` (or raw string) on its `filter` field, so the DSL composes naturally with KNN vector search:

```typescript
import { VectorQuery, Tag, Num } from 'redis-vl';

const query = new VectorQuery({
    vector: embedding,
    vectorField: 'embedding',
    filter: Tag('category').eq('electronics').and(Num('price').lt(1000)),
    numResults: 10,
});
```

This was previously possible only with hand-crafted filter strings.

## Complete Example

```typescript
import { SearchIndex, IndexSchema, FilterQuery, Tag, Num, Timestamp } from 'redis-vl';
import { createClient } from 'redis';

const client = createClient();
await client.connect();

const schema = IndexSchema.fromObject({
    index: { name: 'products', prefix: 'product:', storage_type: 'hash' },
    fields: [
        { name: 'title', type: 'text' },
        { name: 'brand', type: 'tag' },
        { name: 'price', type: 'numeric' },
        { name: 'created_at', type: 'numeric' },
    ],
});
const index = new SearchIndex(schema, client);

// Find Nike products under $200 added in the last 30 days.
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const query = new FilterQuery({
    filter: Tag('brand')
        .eq('nike')
        .and(Num('price').lt(200))
        .and(Timestamp('created_at').gt(thirtyDaysAgo)),
    returnFields: ['title', 'price'],
    numResults: 50,
});

const results = await index.search(query);
console.log(`Found ${results.total} matching products`);
```

## Next Steps

- [Search Index](./search-index) — basic CRUD and vector search
- [Advanced Vector Search](./advanced-vector-search) — distance normalisation and algorithm tuning
- [Vectorizers](./vectorizers) — generating embeddings
