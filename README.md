# wtf-happened

Plain-English "what changed and why" for any git range — grouped by **intent**, not file. Offline, no API keys, no network, your code never leaves your machine.

```
$ npx wtf-happened
What happened — 14 commits · Oct 6–8 · 2 authors → main

  Auth & sessions         3 commits  +412 −95
    ✓ Added "Sign in with Google" (OAuth callback + session cookie)
    ✓ Fixed sessions expiring on refresh

  Billing                 2 commits  +88 −12
    ✓ New /api/billing/portal endpoint + Stripe webhook handler

  Dependencies            5 commits  chore
    react 18 → 19 · typescript 5.5 → 5.6

  ⚠ 12 code files changed with no test updates
  ⚠ 2 commits use vague messages (wip/tmp/…)
```

## Why

Every git-diff summarizer we found (git-ai-summarize, sumgit, pr-agent, lumen, whatthediff.ai, gitsummarizer, ai-diff-summary) requires an LLM API key and sends your diff to a third party. `wtf-happened` is fully **offline**: it clusters files and commits by intent using path patterns, conventional-commit parsing, and diff signals — zero config, zero keys, instant output.

## Install

```bash
npm i -g wtf-happened   # or: npx wtf-happened
```

Binaries: `wtf-happened` and `wtf`.

## Usage

```bash
wtf-happened                 Smart summary: PR mode if on a branch ahead of its base, else recent log
wtf-happened pr [base]       Summarize current branch vs base (default: origin/main)
wtf-happened since <when>    Everything since "2w", "yesterday", or "2026-10-01"
wtf-happened log [n]         Last n commits (default 10)
wtf-happened commit     Summarize a single commit

Flags:
  --md, --markdown   Markdown output (paste into a PR body)
  --json             JSON output
  --verbose, -v      Show every commit and file
  --limit <n>        Max commits (default 100)
  --no-color         Disable colors (also honors NO_COLOR)
```

Examples:
```bash
wtf-happened
wtf-happened pr origin/main --md > pr-body.md
wtf-happened since "2 weeks ago"
wtf-happened log 20 --json
wtf-happened commit HEAD~3
```

## How it works (offline)

1. `git log --numstat` + `git diff` gather commits and file changes for the range.
2. A unified-diff parser splits the diff into per-file hunks (+/− lines).
3. Each file is classified by **area** (auth, api, db, ui, tests, ci, deps, docs, config, styles, scripts, core) via path patterns.
4. Each commit/file is classified by **change kind** (feature, fix, refactor, remove, rename, deps, perf, docs, tests, ci, config, style, chore) via conventional-commit parsing + keyword lexicon + diff signals (lockfiles, test files, deletions, fix/perf patterns).
5. Commits and files are clustered into intent groups (change kind × area), ranked by impact, and rendered as plain-English sentences.

Where commit messages are vague (`wip`, `tmp`, `…`), the tool describes *what* changed and flags it — it never hallucinates a "why."

## Output formats

- Terminal (default, colored, honors `NO_COLOR`)
- `--md` — Markdown, ready to paste into a PR/MR description
- `--json` — machine-readable

## Development

```bash
npm install
npm run build      # tsup → dist/cli.js
npm test           # vitest
npm run typecheck  # tsc --noEmit
npm run lint       # biome
```

## License

MIT
