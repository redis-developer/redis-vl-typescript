# AGENTS.md - Agent Instructions for redis-vl-typescript

This file is for AI coding agents working on this repo. Project-wide conventions live in the Contributor Guide under [`website/docs/contributing/`](./website/docs/contributing/).

How to use this file:

- **Workflow** (steps 1–7) is sequential. Follow it in order for any non-trivial task.
- **Always-on behaviors** apply at every step.
- **Reference** sections are lookup-only; consult them on demand.

---

## Workflow during development

### 1. Set up reference repositories (only for the first time)

Until the TypeScript implementation reaches feature parity with Python and Java, those two repositories are the source of truth for API design, signatures, and error semantics.

Before consulting reference implementations:

1. Check that they're cloned as **siblings** of this repo (not inside it):

    ```bash
    ls ../redis-vl-python ../redis-vl-java
    ```

2. If any are missing, clone them as siblings using the canonical upstream URLs in the [Reference](#reference) section below.

| Repository | Sibling path         |
| ---------- | -------------------- |
| Python     | `../redis-vl-python` |
| Java       | `../redis-vl-java`   |

### 2. Gather information from reference repositories

1. **Pull the latest code** from the `main` branch for the `redis-vl-python` and `redis-vl-java` repositories.
2. **Cross-check reference repos.** Consult reference repositories to understand the established patterns and API design. Understand the _feature implementation, tests, signatures, return types, and error semantics_ thoroughly - not just "the feature exists".
3. **Confirm symbol signatures.** Confirm the existence and signatures of every class/function/property/type you'll touch in the repo.
4. **Audit inheritance and call sites.** If removing a method/property/parameter, grep for subclasses, overrides, callers, and sibling classes that share base classes. Don't ship a deletion until nothing downstream breaks silently.

### 3. Plan and present options

Based on your findings, before touching files:

1. Present a numbered plan.
2. When 2+ valid approaches exist, list them in a table (option, behavior, pros, cons), recommend one, and ask. Don't pick silently.
3. **Stop and wait for explicit confirmation** before making edits.

### 4. Implement following a strict test-driven-development approach

Once user confirms the proposed approach, follow the instructions on [contributor guide → Development](./website/docs/contributing/getting-started.md#development).

Adhere to the [coding standards](./website/docs/contributing/code-standards.md) when proposing and making changes

### 5. Validate and test

Run the full validation pipeline as described in [contributor guide → Validation Pipeline](./website/docs/contributing/testing.md#validation-pipeline). For individual test commands and how to inspect or reset the test container, see [contributor guide → Running Tests](./website/docs/contributing/testing.md#running-tests).

After the automated gates pass, run a [recipe smoke test](./website/docs/contributing/testing.md#recipe-smoke-test-manual) against the local build to validate the change as a downstream consumer would experience it.

**Distinguish pre-existing failures from your own.** Before claiming a test failure is from your change, check `main`. Failures present on `main` are out of scope for the current change set; surface them as follow-up issues.

### 6. Review the changes

Do a git diff and pretend you're a senior dev doing a code review and you HATE this implementation. What would you criticize? What edge cases am I missing? Be specific, structural, no hedging. Find:

- Edge cases
- Missed downstream changes
- Dead surface area
- Fragile assumptions
- Hidden coupling
- Any other tests that need to be added

#### Risk classification framework

When evaluating breaking changes, classify along three axes - not one:

1. **Failure timing**: construction-time vs runtime vs server-roundtrip vs silent corruption
2. **Failure population**: how many _currently-working_ callers does this break? (Often zero, in which case "breaking" is misleading.)
3. **Migration cost**: stack-frame-level fix vs architectural refactor

A "breaking change" that moves a _guaranteed runtime failure_ to a _guaranteed construction-time failure_ with a clearer error message is **strict improvement, low risk** - not "Medium Risk." Apply this framework consistently when assessing reviewer feedback.

Additionally, check if we are following best-practices by using these repositories as guidelines:

- https://github.com/goldbergyoni/nodebestpractices
- https://github.com/goldbergyoni/javascript-testing-best-practices
- https://github.com/goldbergyoni/nodejs-testing-best-practices

### 7. Hand off (only when asked)

When the implementation is done and validated:

1. Do a git diff.
2. Present the proposed commit message (see [contributor guide → Commit Format](./website/docs/contributing/git-workflow.md#commit-format)).
3. Create the message strictly from `git diff` and choose verbs that match what the diff actually does to the repo. Describe only what's actually about to land. If something was tried during the session and then reverted or replaced, it never happened as far as the commit message is concerned. Intra-session backtracking prior to making a commit is irrelevant to the commit message - only the net delta against HEAD matters.

Agents must **NEVER** run any of these commands:

- `git push`
- `gh pr create` (or any PR-creating command)
- `gh issue create` (without explicit approval)
- `git commit` (without explicit approval)

The user decides when to commit, push, or open a PR. As an Agent, you shall only propose.

**On revisions**, follow [contributor guide → Amending vs adding a new commit](./website/docs/contributing/git-workflow.md#amending-vs-adding-a-new-commit) to decide whether to amend or add a new commit.

## Files Never Committed

Personal development notes for planning or task-keeping must never be committed to the repository:

- `DEVELOPMENT.md`
- `PUBLISHING.md`
- `PLAN.md`, `NOTES.md`, `TODO.md`
- Any other ad-hoc markdown files during development

If creating these files for yourself, prefer either of these:

A: Keeping them outside the repo
B: If keeping in this repo, add a corresponding entry in `.gitignore`.

---

## Always-on behaviors

These apply at every step of the workflow.

### Communication

- **No flattery, no editorial fluff.** Don't open responses with "Great question," "Fascinating," "Let me pivot," "Lock in," or any positive adjective about the user's request. Direct, neutral, professional tone only.
- **Push back with evidence when correct.** If your analysis holds, structure the rebuttal with numbered evidence - don't capitulate to authority alone.
- **Use tables to compare options.** Minimum columns: option, behavior, pros, cons.
- **Match existing comment density.** Don't add comments that explain rationale. Rationale belongs in commit messages, not source code.

### Scope discipline

- **Create new files only when no existing file fits**, else update existing files.
- **Don't proactively update documentation.** When asked "do any docs need updating?", the correct answer is the audit result - not "let me also fix these other docs while I'm here".
- **Don't extend scope mid-task.** If something adjacent looks broken, surface it as a follow-up question or issue. Don't silently fix it inside the current task.
- **Dependencies require explicit approval.** Never add new external packages without explicit approval. Keep external dependencies to the bare minimum.
- **Keep change sets narrow.** When proposing a diff, surface adjacent improvements (stylistic cleanups, doc tightenings, refactors near the change) as follow-up suggestions - not as code in the same diff.

### Documentation

- **Only document implemented features.** If a method, class, or option doesn't exist in `src/`, it doesn't belong in any guide on the documentation site. If a recipe shows `client.ft.search()`, that's the **native Redis client** - don't write it up as a RedisVL feature unless RedisVL has a wrapper.
- **Update docs alongside the feature.** When adding or changing a public API, update the corresponding user-guide page in the same change set. Stale docs are worse than no docs.
- **Don't claim cross-language features.** Each repo's docs only describe what _that_ repo implements. TypeScript guides don't get to claim Python-only features (or vice versa).

### Breaking changes

See [contributor guide → Commit Format rule 10](./website/docs/contributing/git-workflow.md#commit-format). Additionally, call breaking changes out in the hand-off summary — don't bury them.

---

## Reference repositories

For API design and behavior, consult the Python and Java RedisVL implementations:

- **RedisVL Python**: https://github.com/redis-developer/redisvl
- **RedisVL Java**: https://github.com/redis-developer/redis-vl-java
