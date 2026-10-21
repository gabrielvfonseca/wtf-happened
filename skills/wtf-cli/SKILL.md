---
name: wtf-cli
description: Working with the wtf-happened CLI — running, testing, building, and extending the command-line interface. Use when asked to run, test, build, or modify the `wtf` CLI, its commands (pr, since, log, commit), argument parsing, or output rendering.
---

# WTF CLI

The `wtf` CLI is a plain-English git diff summarizer. It is fully offline — no API keys, no network, your code never leaves your machine.

## Commands

| Command | Description |
|---------|-------------|
| `wtf` | Smart summary (PR if on branch, else recent log) |
| `wtf pr [base]` | Summarize branch vs base (default origin/main) |
| `wtf since <when>` | Everything since "2w", "yesterday", date |
| `wtf log [n]` | Last n commits (default 10) |
| `wtf commit ` | Summarize a single commit |

Flags: `--md`, `--json`, `--verbose/-v`, `--limit <n>`, `--no-color`, `--help/-h`, `--version`

## File Layout

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
```

## Development Commands

```bash
npm run build      # tsup -> dist/cli.js
npm test           # vitest
npm run typecheck  # tsc --noEmit
npm run lint       # biome
npm run dev        # tsup watch mode
```

## Path Aliases

All source imports use `@/*` → `src/*`. Never use relative `./` or `../` for source files.

## Code Conventions

- TypeScript strict mode with `noUncheckedIndexedAccess`
- No `continue`/`break` statements — use functional programming patterns
- Type-safe: no `any`, proper null checks with `??` and type guards
- Double quotes, semicolons, 2-space indentation (biome)
- Import sorting enforced by biome `organizeImports`

## Testing

- 74 tests across 5 test files in `tests/`
- Tests use vitest with `@/` path aliases
- Fixture data inline in tests

## Running the CLI

```bash
# From a git repo
cd /path/to/repo && node /path/to/wtf-happened/dist/cli.js

# Or via npx
npx wtf-happened
```

## Building

```bash
npm run build
# Output: dist/cli.js (with shebang)
```