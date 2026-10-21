# AGENTS.md

This file provides instructions for AI agents (kilo, Claude Code, etc.) working on the wtf-happened project.

## PROJECT OVERVIEW

wtf-happened is a CLI tool that turns git log/diff into a plain-English summary grouped by intent, not file. It is fully offline — no API keys, no network, your code never leaves your machine.

Package: `wtf-happened`
Primary binary: `wtf` (alias: `wtf-happened`)
Version: 0.2.0

## TECH STACK

- Language: TypeScript (strict, ES2022 target)
- Runtime: Node.js >=18
- Build: tsup (ESM, node18 target)
- Test: vitest
- Lint/format: biome
- Git hooks: husky + lint-staged
- Releases: changesets + GitHub Actions
- Package manager: npm

## PATH ALIASES

All source imports use the `@/*` alias → `src/*`. Configured in:
- `tsconfig.json` (`baseUrl` + `paths`)
- `tsup.config.ts` (`alias`)
- `vitest.config.ts` (`resolve.alias`)

Never use relative `./` or `../` imports for source files — always use `@/`.

## COMMAND REFERENCE

| Command | Description |
|---------|-------------|
| `npm run build` | Build CLI with tsup → `dist/cli.js` |
| `npm test` | Run vitest test suite |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run lint` | Run `biome check .` |
| `npm run lint:fix` | Auto-fix biome issues |
| `npm run release` | Changeset version + publish |
| `npm run dev` | tsup watch mode |

## CLI COMMANDS

| Command | Description |
|---------|-------------|
| `wtf` | Smart summary (PR if on branch, else recent log) |
| `wtf pr [base]` | Summarize branch vs base (default origin/main) |
| `wtf since <when>` | Everything since "2w", "yesterday", date |
| `wtf log [n]` | Last n commits (default 10) |
| `wtf commit ` | Summarize a single commit |

Flags: `--md`, `--json`, `--verbose/-v`, `--limit <n>`, `--no-color`, `--help/-h`, `--version`

## FILE LAYOUT

```
src/
  cli.ts              # Argument parsing + command dispatch
  git.ts              # Git data collection (log, diff, merge-base, branch)
  parse/diff.ts       # Unified diff parser
  classify/area.ts    # Path -> area classification
  classify/change.ts  # Diff/message -> change kind classification
  classify/intent.ts  # Intent clustering (change kind x area)
  summarize.ts        # Summary assembly + warning detection
  render/terminal.ts  # Terminal output (colored, grouped)
  render/markdown.ts  # Markdown output for PR bodies
  render/json.ts      # JSON output
  render/ansi.ts      # ANSI escape helpers + text utilities
  types.ts            # Shared type definitions

tests/                # Vitest test files (74 tests)
docs/                 # Documentation (ARCHITECTURE, CLASSIFIER_RULES, API_REFERENCE)
.github/              # CI, issue templates, PR template, CODE_OF_CONDUCT, CONTRIBUTING, SECURITY
.claude/              # Kilo agent settings and hooks
.husky/               # Git hooks (pre-commit runs lint-staged)
.changeset/           # Changeset config + pending changesets
```

## CODE CONVENTIONS

- TypeScript strict mode with `noUncheckedIndexedAccess`
- No `continue`/`break` statements — use functional programming patterns (filter, map, reduce)
- Type-safe: no `any`, proper null checks with `??` and type guards
- Double quotes, semicolons, 2-space indentation (biome)
- Import sorting enforced by biome `organizeImports`
- Path aliases `@/*` for all source imports

## TESTING

- 74 tests across 5 test files
- Tests use vitest with `@/` path aliases
- Test files in `tests/` directory
- Fixture data inline in tests

## RELEASE PROCESS

1. Create a changeset file in `.changeset/` describing the change
2. Run `npm run release` or push to `main` (GitHub Actions handles it)
3. Changesets creates a version PR, then publishes to npm on merge

## KILO-SPECIFIC

- This project is managed by kilo. Configuration at `/Users/gabrielfonseca/.config/kilo/kilo.jsonc`
- Permissions: bash ssh, bazel build, grep, head are allowed
- Always run `npm run lint`, `npm run typecheck`, and `npm test` before completing tasks
- Never commit secrets or API keys
- The tool is offline-first — never add network/LLM dependencies
