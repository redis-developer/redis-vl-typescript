# Contributing to RedisVL TypeScript

Thanks for your interest in contributing. This guide focuses on the development workflow - getting set up, running tests, and inspecting test state.

## Prerequisites

- **[Node.js](https://nodejs.org/)** `>= 24.0.0` and **npm** (bundled with Node). We recommend using [NVM](https://www.nvmnode.com/) to manage versions.
- **[Docker](https://www.docker.com/products/docker-desktop)** - required for integration tests only. Unit tests run without Docker.

## Setup

```bash
git clone https://github.com/redis-developer/redis-vl-typescript.git
cd redis-vl-typescript
npm install
```

## Development

This project follows a **test-driven development (TDD)** workflow. Tests come first; implementation follows.

1. Fork the repo and create a branch off `main`.
2. **Write failing tests first.** Add or update tests that describe the behaviour you want. Run them and confirm they fail for the right reason
3. **Implement the change** to make those tests pass, following the existing code style.
4. Run `npm test` locally and confirm everything is green.
5. Run `npm run lint` and `npm run format:check`.
6. Open a pull request with a clear description of the change and the motivation.

Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages (e.g. `feat(schema): ...`, `fix(indexes): ...`, `docs(readme): ...`).

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

## Other Useful Commands

```bash
npm run type-check          # Type-check the library source
npm run type-check:tests    # Type-check the tests
npm run lint                # ESLint
npm run lint:fix            # ESLint with --fix
npm run format              # Prettier --write
npm run format:check        # Prettier --check
npm run build               # Compile to dist/
```

## Continuous Integration

`.github/workflows/test.yml` runs the full suite on every push and pull request.
