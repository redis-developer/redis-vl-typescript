---
sidebar_position: 6
---

# Aggregation

`AggregationQuery` builds [`FT.AGGREGATE`](https://redis.io/docs/latest/commands/ft.aggregate/) pipelines for analytics-style work over an index: group-by counts, sums, averages, top-N per group, faceted summaries, percentile queries, and so on. It complements the `FT.SEARCH`-based query types (`VectorQuery`, `FilterQuery`, `TextQuery`, etc.) by operating on aggregated results rather than individual documents.

## Quick Start

```typescript
import {
    SearchIndex,
    IndexSchema,
    AggregationQuery,
    Count,
    Sum,
    Avg,
    Tag,
} from 'redisvl';
import { createClient } from 'redis';

const client = createClient();
await client.connect();

const schema = IndexSchema.fromObject({
    index: { name: 'products', prefix: 'product:', storage_type: 'hash' },
    fields: [
        { name: 'brand', type: 'tag' },
        { name: 'category', type: 'tag' },
        { name: 'price', type: 'numeric', attrs: { sortable: true } },
        { name: 'rating', type: 'numeric', attrs: { sortable: true } },
    ],
});
const index = new SearchIndex(schema, client);

const q = new AggregationQuery({
    filter: Tag('category').eq('electronics'),
    groupBy: {
        fields: ['brand'],
        reducers: [
            Count().as('total'),
            Sum('price').as('revenue'),
            Avg('rating').as('avg_rating'),
        ],
    },
    sortBy: [{ field: 'revenue', direction: 'DESC' }],
    limit: 10,
});

const { total, rows } = await index.aggregate(q);
console.log(`${total} matched docs, ${rows.length} groups`);
for (const row of rows) {
    console.log(row.brand, row.total, row.revenue, row.avg_rating);
}
```

## Reducer Builders

Each REDUCE function in FT.AGGREGATE is exposed as a small factory. They all return a builder with an `.as(alias)` method for naming the output column.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="count" label="Counts" default>

```typescript
Count().as('total'); // COUNT — number of records in the group
CountDistinct('brand').as('brands'); // COUNT_DISTINCT — distinct values
```

</TabItem>
<TabItem value="numeric" label="Numeric">

```typescript
Sum('price').as('revenue');
Avg('rating').as('avg_rating');
Min('price').as('cheapest');
Max('price').as('priciest');
Stddev('rating').as('rating_stddev');
Quantile('price', 0.95).as('p95_price'); // 95th-percentile price
```

</TabItem>
<TabItem value="list" label="Collection">

```typescript
ToList('brand').as('brands'); // distinct list of brand values

// FIRST_VALUE — the first value of `title`, optionally sorted by another field
FirstValue('title').as('any_title');
FirstValue('title', { field: 'price', direction: 'DESC' }).as('most_expensive_title');
```

</TabItem>
</Tabs>

Bare property names (`'price'`) are auto-prefixed with `@`. Pass `'@field'` or `'$.json.path'` if you need an explicit reference.

## Pipeline Steps

`AggregationQuery` emits FT.AGGREGATE steps in this canonical order:

1. **`filter`** — pre-aggregation FT.SEARCH-style filter. Accepts a `FilterExpression` or a raw filter string. Defaults to `*`.
2. **`load`** — fields to hydrate from documents into the pipeline.
3. **`groupBy`** — `GROUPBY` clause with one or more reducer outputs.
4. **`apply`** — `APPLY` steps, in input order, after GROUPBY. Each computes a new column.
5. **`sortBy`** — `SORTBY` over the post-aggregation rows.
6. **`offset`** / **`limit`** — pagination over the sorted rows.
7. **`postFilter`** — final `FILTER` step using the FT.AGGREGATE expression dialect.

```typescript
new AggregationQuery({
    filter: Tag('category').eq('electronics'),
    load: ['title', 'price'],
    groupBy: {
        fields: ['brand'],
        reducers: [Count().as('total'), Sum('price').as('revenue')],
    },
    apply: [{ expression: '@revenue / @total', as: 'avg_price' }],
    sortBy: [{ field: 'revenue', direction: 'DESC' }],
    limit: 25,
    offset: 0,
    postFilter: '@total >= 3',
});
```

:::caution Two filter dialects
The pre-aggregation `filter` uses the FT.SEARCH filter dialect (`@brand:{nike}`), and the `FilterExpression` DSL renders to it. The post-aggregation `postFilter` uses the FT.AGGREGATE *expression* dialect (`@total > 10`, `@revenue / @total > 100`) — pass it as a raw string. The two are not interchangeable.
:::

:::note Pre-GROUPBY APPLY
v1 emits all `apply` steps **after** `groupBy`. Pipelines that need an APPLY before GROUPBY (e.g. computing a derived bucketing field) aren't yet exposed through this API — drop down to `client.ft.aggregate()` directly for those.
:::

## Cursored Streaming for Large Result Sets

For aggregations that produce many rows (e.g. unbounded GROUPBY over high-cardinality fields), set `cursor` and use `index.aggregateStream()` instead of `aggregate()`. The stream pulls additional batches via `FT.CURSOR READ` until the server signals exhaustion (`cursorId === 0`), and releases the cursor via `FT.CURSOR DEL` if you break out early.

```typescript
const q = new AggregationQuery({
    filter: '*',
    groupBy: { fields: ['brand'], reducers: [Count().as('total')] },
    cursor: { count: 1000, maxIdle: 60_000 },
});

for await (const batch of index.aggregateStream(q)) {
    for (const row of batch.rows) {
        process(row);
    }
    if (someEarlyExitCondition) break; // cursor is cleaned up automatically
}
```

| Option | Notes |
| ------ | ----- |
| `count` | Rows per batch. The server may return fewer in the final batch. |
| `maxIdle` | Milliseconds the cursor may sit idle before the server reaps it. |

Calling `index.aggregate()` on a cursor-configured query throws; calling `index.aggregateStream()` on a non-cursor query also throws. The split is intentional to keep the two return shapes (`AggregationResult` vs `AsyncIterableIterator<AggregationBatch>`) distinct.

## Result Shape

```typescript
interface AggregationResult<T> {
    total: number;       // pre-aggregation match count
    rows: T[];           // post-aggregation rows
}

interface AggregationBatch<T> {
    rows: T[];
    cursorId: number;    // 0 ⇒ stream is exhausted
}
```

Each row is a plain object whose keys come from either the group-by fields, the reducer aliases, or APPLY aliases. Numeric reducer outputs come back as strings — wrap with `Number(row.revenue)` if you need to do math on them.

## Next Steps

- [Filters and Queries](./filters-and-queries) — the filter DSL used by `AggregationQuery.filter`
- [Search Index](./search-index) — basic CRUD and vector search
- [Advanced Vector Search](./advanced-vector-search) — algorithm tuning
