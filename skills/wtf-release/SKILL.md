---
name: wtf-release
description: Releasing wtf-happened via changesets. Use when asked to release, publish, version, or bump the package, create a changeset, or set up release automation.
---

# WTF Release

The wtf-happened project uses changesets for versioning and releases.

## Release Process

1. Create a changeset file in `.changeset/` describing the change
2. Run `npm run release` or push to `main` (GitHub Actions handles it)
3. Changesets creates a version PR, then publishes to npm on merge

## Changeset Config

Config file: `.changeset/config.json`

```json
{
  "changelog": ["@changesets/changelog-github", { "repo": "gabrielfonseca/wtf-happened" }],
  "access": "public",
  "baseBranch": "main"
}
```

## Creating a Changeset

```bash
# Create a changeset file manually
cat > .changeset/my-change.md << 'EOF'
---
"wtf-happened": minor
---

Description of the change
EOF

# Or use the changeset CLI
npx changeset
```

## Release Commands

```bash
# Full release pipeline
npm run release

# Steps:
# 1. changeset version — bumps version and updates CHANGELOG
# 2. npm install — updates package-lock
# 3. npm run build — builds dist/cli.js
# 4. npm test — runs vitest
# 5. git add -A && git commit -m "chore: release"
# 6. changeset publish — publishes to npm
```

## GitHub Actions

Release workflow: `.github/workflows/release.yml`

- On push to `main`: runs `changeset version` + `changeset publish`
- On pull_request: creates a version PR
- Requires `NPM_TOKEN` secret for publishing

## Pre-commit Hook

`.husky/pre-commit` runs `npx lint-staged` which formats `*.{js,ts,tsx,jsx,mjs,cjs,json,md}` with `biome check --write`.

## Package Info

- Package: `wtf-happened`
- Binaries: `wtf` (primary), `wtf-happened` (alias)
- Registry: https://registry.npmjs.org/
- License: MIT

## Versioning

Current version: 0.2.0

Use semver bumps:
- `patch` — bug fixes
- `minor` — new features (non-breaking)
- `major` — breaking changes