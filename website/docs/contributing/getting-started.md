---
sidebar_position: 1
slug: /contributing
---

# Getting Started

Thanks for your interest in contributing. This guide focuses on the development workflow - getting set up, running tests, and inspecting test state.

## Prerequisites

- **[Node.js](https://nodejs.org/)** `>= 22.0.0` and **npm** (bundled with Node). We recommend using [NVM](https://www.nvmnode.com/) to manage versions.
- **[Docker](https://www.docker.com/products/docker-desktop)** - required for integration tests only. Unit tests run without Docker.

## Setup

```bash
git clone https://github.com/redis-developer/redis-vl-typescript.git
cd redis-vl-typescript
npm install
```

## Local Redis for ad-hoc development

If you need a Redis instance for ad-hoc work — running example scripts, recipe smoke tests, or exploring with `redis-cli` — use the bundled Compose stack. This is **not** used by `npm test` (the test suite spawns its own Testcontainers-managed Redis); it is purely a developer convenience.

### Lifecycle

```bash
docker compose up -d              # start (port 6379)
docker compose ps                  # confirm Up (healthy)
docker compose logs -f redis       # tail logs
docker compose down                # stop and remove
```

The stack is ephemeral — every `docker compose up` starts with an empty Redis.

### Connection

Host-side code (Node scripts, recipes, an installed `redis-cli`) connects with:

```text
redis://localhost:6379
```

Inside-container access uses `docker compose exec redis redis-cli ...` (used in the verification commands below).

### Verifying search is loaded

```bash
docker compose exec redis redis-cli PING                # PONG
docker compose exec redis redis-cli MODULE LIST         # entry with name "search"
docker compose exec redis redis-cli FT._LIST            # (empty array)
```

### End-to-end search smoke

```bash
docker compose exec redis redis-cli FT.CREATE idx:smoke ON HASH PREFIX 1 doc: SCHEMA title TEXT
docker compose exec redis redis-cli HSET doc:1 title "hello world"
docker compose exec redis redis-cli FT.SEARCH idx:smoke "hello"
```

### Port conflict

If port `6379` is already in use, change the host-side port in `compose.yml` (e.g. `"16379:6379"`) and connect to the new host port.

### Coexistence with `npm test`

The Testcontainers test container gets a dynamic host port and a different label (`com.redis.redisvl.test=true` vs `com.redis.redisvl.dev=true`), so this stack can run simultaneously with `npm test` without interference.

## Development

This project follows a **test-driven development (TDD)** workflow. Tests come first; implementation follows.

1. Pull latest changes from `main`, and create a new branch following [this convention](./git-workflow.md#branch-naming)
2. **Establish a test baseline:**
     - If the feature already exists in `redis-vl-python` or `redis-vl-java`: port their unit and integration tests as the baseline.
     - If the feature is totally new (no RedisVL Python/Java equivalent): define the public API surface first - signatures, return types, error semantics  and write the unit + integration tests against
   that contract before any implementation.
3. **Write or flip the failing test first.** Add or update tests that describe the behaviour you want. Run them and confirm they fail for the right reason
4. **Behavior changes need both unit AND integration tests.** Some bugs only surface against a real Redis instance. Changes that touch the wire format must include both layers.
5. **Implement to make the tests pass.** Don't create new test files unless necessary - update existing ones if possible, under the right section.
