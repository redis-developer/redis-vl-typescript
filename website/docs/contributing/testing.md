---
sidebar_position: 3
---

# Testing & Validation

## Running Tests

| Command                 | What it runs                          | Needs Docker?         |
| ----------------------- | ------------------------------------- | --------------------- |
| `npm run test:unit`     | Unit tests only                       | No                    |
| `npm test`              | Type-check + unit + integration tests | Yes                   |
| `npm run test:watch`    | Vitest in watch mode                  | Yes (for integration) |
| `npm run test:coverage` | Full suite with coverage report       | Yes                   |

### Inspecting Test Data

```bash
npm run test:redis-url
```

Output:

```
Inspect test data at redis://default@127.0.0.1:55003 using redis-cli or Redis Insight
```

### Forcing a Fresh Container

If the reused container ends up in a bad state, force a clean recreation with the standard Testcontainers env var:

```bash
TESTCONTAINERS_REUSE_ENABLE=false npm test
```

This sweeps any container labelled `com.redis.redisvl.test=true` and starts a fresh one. The new container will get a new host port, so re-run `npm run test:redis-url` if you have an external client connected.

## Validation Pipeline

Run the following gates in order before opening a PR:

```bash
npm run type-check          # Type-check the library source
npm run type-check:tests    # Type-check the tests
npm run lint                # ESLint
npm run lint:fix            # ESLint with --fix
npm run format              # Prettier --write
npm run format:check        # Prettier --check
npm run build               # Compile to dist/
```

Don't claim a change is ready until every gate has run green.

### Recipe smoke test (manual)

Recipes should live outside this repo, in a sibling directory (eg: `redisvl-typescript-recipes`).

After the automated gates pass, create a new recipe or update an existing one, to validate a practical end-to-end usage flow for the current feature / fix:

- ✅ Use the RedisVL TypeScript API surface that exists today
- ✅ Mix RedisVL with the native Redis client where RedisVL doesn't yet provide a wrapper

#### Running the smoke test

```bash
# In redis-vl-typescript/
npm run build
npm pack
# produces redis-vl-X.Y.Z.tgz

# In redisvl-typescript-recipes/ 
npm install ../redis-vl-typescript/redis-vl-X.Y.Z.tgz
```

If a recipe surfaces a bug, capture it in the integration suite first, then fix it - recipes validate the consumer experience but the regression bar is the integration test.

## Continuous Integration

`.github/workflows/test.yml` runs the full suite on every push and pull request.
