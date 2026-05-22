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
