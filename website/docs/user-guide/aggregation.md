---
sidebar_position: 6
---

# Aggregation queries

`AggregationQuery` builds an [`FT.AGGREGATE`](https://redis.io/docs/latest/commands/ft.aggregate/) call against an index. Unlike `FT.SEARCH` (which retrieves documents), `FT.AGGREGATE` runs a pipeline — group rows, reduce them, derive new fields, sort, page — and returns computed rows rather than source documents.

If you've used Python `redisvl`, this mirrors `AggregationQuery` over `AggregateRequest`. Hybrid (text + vector) aggregation is out of scope for this class.

## When to use it

Reach for `AggregationQuery` when you want to answer questions _about_ groups of documents rather than fetch the documents themselves:

- "How many products per brand?"
- "Average price by category for items in stock?"
- "Top 10 brands by revenue this month?"
- "p95 latency per region?"

## The pipeline

A FT.AGGREGATE call is a chain of steps applied in order:

1. **Query string** — selects which documents enter the pipeline (FT.SEARCH filter dialect).
2. **GROUPBY + REDUCE** — collapses rows into groups, applying reducers like `COUNT`, `SUM`, `AVG`.
3. **APPLY** — derives new fields from existing ones (`@revenue / @orders AS avg`).
4. **FILTER** — drops rows that don't satisfy an expression (FT.AGGREGATE expression dialect — `@revenue > 1000`).
5. **SORTBY** — orders rows.
6. **LIMIT** — paginates.

`AggregationQuery` records the steps in the order you call the corresponding methods, so `.groupBy().apply()` is not the same as `.apply().groupBy()`.

## A first query

```typescript
import {
    SearchIndex,
    IndexSchema,
    AggregationQuery,
    Reducers,
} from 'redis-vl';
import { createClient } from 'redis';

const client = createClient();
await client.connect();

const schema = IndexSchema.fromObject({
    index: { name: 'orders', prefix: 'order', storageType: 'hash' },
    fields: [
        { name: 'brand', type: 'tag' },
        { name: 'category', type: 'tag' },
        { name: 'price', type: 'numeric' },
        { name: 'quantity', type: 'numeric' },
    ],
});
const index = new SearchIndex(schema, client);

const q = new AggregationQuery()
    .groupBy('brand', [
        Reducers.count('orders'),
        Reducers.sum('price', 'revenue'),
    ])
    .sortBy([{ field: 'revenue', direction: 'DESC' }])
    .limit(0, 5);

const { total, results } = await index.aggregate(q);
for (const row of results) {
    console.log(row.brand, row.orders, row.revenue);
}
```

Each row is a `Record<string, string | string[]>` keyed by the reducer/apply alias (or the GROUPBY field). Most reducers return strings — cast to numbers in user code (`Number(row.revenue)`) when you need numeric types. `Reducers.toList` is the exception: it returns `string[]` for that column.

## Filtering rows into the pipeline

The constructor takes the same `FilterInput` the rest of the query DSL uses — either a raw string or a `FilterExpression`:

```typescript
import { AggregationQuery, Reducers, Tag, Num } from 'redis-vl';

const q = new AggregationQuery(
    Tag('category').eq('electronics').and(Num('price').gt(0))
).groupBy('brand', Reducers.count('orders'));
```

This is the FT.SEARCH filter dialect. It's distinct from the post-aggregation `.filter()` step, which uses the FT.AGGREGATE expression dialect.

## Reducers

`Reducers` is a namespace of factory functions mirroring [redis-py's reducer module](https://redis.io/docs/latest/commands/ft.aggregate/#group-by-reducers). All accept an optional final `as` argument that aliases the reducer's output column.

| Factory                            | Renders to        | Notes                              |
| ---------------------------------- | ----------------- | ---------------------------------- |
| `Reducers.count(as?)`              | `COUNT`           | No property required.              |
| `Reducers.countDistinct(p, as?)`   | `COUNT_DISTINCT`  | Exact distinct count.              |
| `Reducers.countDistinctish(p, as?)`| `COUNT_DISTINCTISH` | HyperLogLog approximation.        |
| `Reducers.sum(p, as?)`             | `SUM`             |                                    |
| `Reducers.min(p, as?)`             | `MIN`             |                                    |
| `Reducers.max(p, as?)`             | `MAX`             |                                    |
| `Reducers.avg(p, as?)`             | `AVG`             |                                    |
| `Reducers.stddev(p, as?)`          | `STDDEV`          |                                    |
| `Reducers.quantile(p, q, as?)`     | `QUANTILE`        | `q` is a number in `[0, 1]`.       |
| `Reducers.toList(p, as?)`          | `TOLIST`          | All unique values in the group.    |
| `Reducers.firstValue(p, options?)` | `FIRST_VALUE`     | `options.by` orders ties; `options.as` aliases output. |
| `Reducers.randomSample(p, n, as?)` | `RANDOM_SAMPLE`   | `n` is a positive integer.         |

```typescript
import { Reducers } from 'redis-vl';

new AggregationQuery().groupBy('brand', [
    Reducers.count('orders'),
    Reducers.avg('price', 'avg_price'),
    Reducers.quantile('price', 0.95, 'p95_price'),
    Reducers.firstValue('name', {
        by: { property: 'price', direction: 'DESC' },
        as: 'top_product',
    }),
]);
```

## APPLY and FILTER

`APPLY` derives a new field that downstream steps can refer to. `FILTER` drops rows; it uses the FT.AGGREGATE expression dialect (`@field <op> <value>`, not the `{}`/`[]` syntax of FT.SEARCH):

```typescript
new AggregationQuery()
    .groupBy('brand', [
        Reducers.sum('price', 'revenue'),
        Reducers.sum('quantity', 'units'),
    ])
    .apply('@revenue / @units', 'avg_unit_price')
    .filter('@avg_unit_price > 50')
    .sortBy([{ field: 'avg_unit_price', direction: 'DESC' }])
    .limit(0, 10);
```

## Parameterized queries

Use `.params()` to bind values referenced as `$name` in the query string:

```typescript
const q = new AggregationQuery('@brand:{$brandName}')
    .params({ brandName: 'acme' })
    .dialect(2)
    .groupBy('brand', Reducers.count('orders'));
```

## Other knobs

- `.load([...])` — load specific source-document fields into the pipeline as `@field` (or `{identifier, as}` for aliasing).
- `.dialect(n)` — set DIALECT.
- `.timeout(ms)` — server-side query timeout.
- `.verbatim()` — disable stemming for the query string.
- `.addScores()` — include `@__score` in each row.

## Result shape

```typescript
const { total, results } = await index.aggregate(q);
// total:   number — the row count Redis reports after aggregation
// results: Array<Record<string, string | string[]>> — one entry per emitted row
```

Most reducer columns are strings. `Reducers.toList` (TOLIST) is the exception — it returns `string[]` for that column. If you need numeric types, cast at the call site (`Number(row.revenue)`). Aggregation reducers preserve numeric precision on the server side; the wire format simply hands them back as strings.

## See also

- [Filters and queries](./filters-and-queries.md) — building the filter passed to the constructor.
- [`FT.AGGREGATE` reference](https://redis.io/docs/latest/commands/ft.aggregate/) — full command syntax.
