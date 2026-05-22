---
sidebar_position: 4
---

# Git Workflow

## Branch Naming

Use a conventional-commit prefix matching the change type:

- `fix/<short-description>`
- `feat/<short-description>`
- `docs/<short-description>`
- `chore/<short-description>`
- `refactor/<short-description>`

## Commit Format

1. **Use conventional commits**: `feat(scope):`, `fix(scope):`, `fix(scope)!:`, `docs(scope):`, `refactor(scope):`, `chore(scope):`
2. **Short title**: One-line description of what changed
3. **Prefer body with bullets**: Maximum 10 bullet points
4. **Focus on what and why**, not how
5. **No emojis**: Keep messages professional and clean
6. **No references to RedisVL Python/Java**: Prefer mentioning any such references when raising the PR on Github. **Exception**: when un-doing a change or applying a fix for a change that was introduced in an earlier commit as a result of using them as reference.
7. **No test counts**: Say "Add unit tests for..." not "Add 25 unit tests". Mentioning counts of tests is redundant
8. **Complete working state**: Each commit represents a complete, working feature
9. **All tests must pass**: Before any commit
10. **Breaking changes**: Use `!` after the scope and include a `BREAKING CHANGE:` footer

### Example

```
feat(schema): Add field-level conversion pattern

- Implement toRedisField() method on all field classes
- Extract types from @redis/search to avoid duplication
- Remove all 'as any' type assertions
- Return native Redis client types from wrapper methods
- Add unit tests

Improves type safety and keeps types in sync with upstream Redis client.
```


## Amending vs adding a new commit

Prefer **amending the existing commit** when both are true:

- You're on your own feature branch (not `main`)
- The PR has not been opened, or has been opened but not yet reviewed by a teammate

Prefer **a new commit** when either is true:

- A teammate has already reviewed the branch - separate commits keep the re-review diff focused on what actually changed since their last pass
- The follow-up shifts the intent of the original commit beyond a small fix

Within either mode, only fold in changes that are within scope of the original commit.

