---
name: wtf-classifier
description: Working with the wtf-happened classifier — area classification, change kind classification, and intent clustering. Use when asked to modify, extend, or debug the classification logic in `src/classify/`, `src/summarize.ts`, or the diff parser in `src/parse/diff.ts`.
---

# WTF Classifier

The classifier turns git diffs and commit messages into intent-grouped summaries. It is fully offline — no API keys, no network.

## Architecture

1. **Diff parsing** (`src/parse/diff.ts`): Unified diff → per-file hunks with added/removed lines
2. **Area classification** (`src/classify/area.ts`): Path → area (auth, api, db, ui, tests, ci, deps, docs, config, styles, scripts, core, other)
3. **Change kind classification** (`src/classify/change.ts`): Diff/message → change kind (feature, fix, refactor, remove, rename, deps, perf, docs, tests, ci, config, style, chore, unknown)
4. **Intent clustering** (`src/classify/intent.ts`): Change kind × area → intent clusters
5. **Summarization** (`src/summarize.ts`): Clusters + warnings → Summary

## Area Classification

Each file path is classified into one area using ordered path patterns. The first matching rule wins.

| Area | Pattern Examples |
|------|------------------|
| TESTS | `__tests__/`, `tests/`, `specs/`, `.test.ts`, `.spec.ts`, `cypress/` |
| CI | `.github/workflows/`, `Dockerfile`, `Makefile`, `Jenkinsfile` |
| DEPS | `package-lock.json`, `package.json`, `go.mod`, `pyproject.toml`, `Cargo.lock` |
| DOCS | `.md`, `.mdx`, `docs/`, `README.md`, `CHANGELOG.md` |
| STYLES | `.css`, `.scss`, `styles/`, `tailwind.config.` |
| SCRIPTS | `scripts/`, `bin/`, `.sh`, `.bash` |
| CONFIG | `.env`, `.yml`, `.toml`, `tsconfig.json`, `.eslintrc.js` |
| AUTH | `auth/`, `oauth/`, `session/`, `login/`, `jwt/`, `withAuth/` |
| API | `api/`, `routes/`, `controllers/`, `handlers/`, `graphql/`, `.service.ts` |
| UI | `components/`, `pages/`, `.tsx`, `.jsx`, `hooks/`, `app/page.tsx` |
| DB | `migrations/`, `schema.prisma`, `models/`, `repositories/`, `.sql` |
| CORE | `utils/`, `lib/` (unknown area fallback) |
| OTHER | Any path not matching above |

## Change Kind Classification

Each commit or file is classified into one change kind.

| Change Kind | Detection Signal |
|-------------|------------------|
| FIX | Conventional `fix:` or keywords: fix, bug, patch, resolve, hotfix |
| FEATURE | Conventional `feat:` or keywords: add, introduce, implement, support, enable |
| REMOVE | Keywords: remove, delete, drop, deprecate, retire; file deleted |
| RENAME | Keywords: rename, move, reorganize; file renamed |
| DEPS | Keywords: bump, upgrade, dependencies; lockfile changed |
| PERF | Keywords: perf, optimize, faster, latency, cache; perf signals in diff |
| REFACTOR | Keywords: refactor, rework, cleanup, simplify; large removal small addition |
| DOCS | Keywords: docs, readme, typo; markdown file |
| TESTS | Keywords: tests, specs, coverage; test file path |
| CI | Keywords: ci, cd, pipeline, workflow, deploy; ci file path |
| CONFIG | Keywords: config, settings, env, flags; config file path |
| STYLE | Keywords: style, css, theme, colors; style file path |
| CHORE | Fallback for build, revert, unclassified |
| UNKNOWN | No signal matched |

## Intent Clustering

Commits and files are grouped into intent clusters by the combination of change kind and area (e.g. `fix:auth`, `feature:api`). Clusters are ranked by impact (additions + deletions + commit_weight).

## Warn Signals

- Vague commit messages: commits with wip/tmp/stuff subjects are flagged
- No test updates: 5+ code files changed without test file updates are flagged
- Large changes: files with 500+ lines changed are flagged
- Multiple authors: 3+ authors in a range flag a possible merge or shared branch

## Code Conventions

- No `continue`/`break` statements — use functional programming patterns
- Type-safe: no `any`, proper null checks
- Double quotes, semicolons, 2-space indentation (biome)
- Path aliases `@/*` for all source imports

## Testing

Tests for the classifier are in `tests/`:
- `tests/area.test.ts` — area classification
- `tests/change.test.ts` — change kind classification
- `tests/intent.test.ts` — intent clustering
- `tests/diff.test.ts` — diff parsing
- `tests/summarize.test.ts` — summary assembly