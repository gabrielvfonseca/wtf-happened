import type { ChangeKind, CommitInfo, FileDiff } from "../types.js";

const CONVENTIONAL =
  /^(feat|fix|refactor|perf|revert|docs|style|test|tests|chore|build|ci|deps?|dependency|dependencies|remove|deletion|rename)(\(.+\))?!?:\s*/i;

const MESSAGE_KEYWORDS: Array<{ kind: ChangeKind; pattern: RegExp }> = [
  {
    kind: "fix",
    pattern:
      /\b(fix|fixed|fixes|bug|patch|resolve[sd]?|correct\w*|repair\w*|hotfix|regression)\b/i,
  },
  {
    kind: "remove",
    pattern:
      /\b(remove[ds]?|delet\w+|drop\w*|deprecat\w+|retir\w+|clean.?up)\b/i,
  },
  {
    kind: "rename",
    pattern: /\b(rename[ds]?|move[ds]?|reorganiz\w+|restructur\w+)\b/i,
  },
  {
    kind: "tests",
    pattern: /\b(tests?|specs?|coverage|mocks?|fixtures?|snapshot)\b/i,
  },
  {
    kind: "feature",
    pattern:
      /\b(add|added|adding|introduc\w+|implement\w+|support|enable|new)\b/i,
  },
  {
    kind: "deps",
    pattern:
      /\b(bump|upgrade|upgrad\w+|downgrade)\b.*\b(depend|version|v?\d)|\b(deps?|dependencies)\b/i,
  },
  {
    kind: "perf",
    pattern: /\b(perf|optimi[sz]\w+|speed|faster|latency|cache)\b/i,
  },
  {
    kind: "refactor",
    pattern:
      /\b(refactor\w*|rework|cleanup|simplif\w+|extract\w+|reorganiz\w+)\b/i,
  },
  {
    kind: "docs",
    pattern: /\b(docs?|readme|comment\w*|typo|javadoc|jsdoc)\b/i,
  },
  {
    kind: "config",
    pattern: /\b(config|settings?|env(ironment)?|flags?|feature.?flags?)\b/i,
  },
  {
    kind: "style",
    pattern: /\b(style|styles?|css|theme|colors?|spacing|typography)\b/i,
  },
  {
    kind: "ci",
    pattern: /\b(ci|cd|pipeline|workflow|build|deploy|release|actions?)\b/i,
  },
];

export function parseConventional(subject: string): {
  kind: ChangeKind;
  scope?: string;
  description: string;
} | null {
  const m = CONVENTIONAL.exec(subject);
  if (!m) return null;
  const raw = m[1]?.toLowerCase() ?? "";
  const scopeMatch = /\((.+)\)/.exec(m[2] ?? "");
  const description = subject.slice(m[0].length).trim();
  const map: Record<string, ChangeKind> = {
    feat: "feature",
    feature: "feature",
    fix: "fix",
    bugfix: "fix",
    refactor: "refactor",
    perf: "perf",
    revert: "chore",
    docs: "docs",
    doc: "docs",
    style: "style",
    test: "tests",
    tests: "tests",
    chore: "chore",
    build: "config",
    ci: "ci",
    dep: "deps",
    deps: "deps",
    dependency: "deps",
    dependencies: "deps",
    remove: "remove",
    deletion: "remove",
    rename: "rename",
  };
  return {
    kind: map[raw] ?? "chore",
    scope: scopeMatch?.[1],
    description,
  };
}

export function classifyFromMessage(subject: string): ChangeKind {
  const conv = parseConventional(subject);
  if (conv) return conv.kind;
  for (const { kind, pattern } of MESSAGE_KEYWORDS) {
    if (pattern.test(subject)) return kind;
  }
  return "unknown";
}

const FIX_SIGNALS = [
  /if\s*\(!/,
  /!==?\s*null/,
  /catch\s*\(/,
  /try\s*\{/,
  /finally\s*\{/,
  /\.trim\(\)/,
  /nullish|undefined/,
  /\?\?\s*/,
  /instanceof\s+Error/,
  /console\.(error|warn)/,
  /throw\s+new/,
  /isError|hasError|isError/,
  /NaN|isNaN/,
  /edge.?case/i,
  /guard/i,
];

const PERF_SIGNALS = [
  /memoi[sz]/,
  /useMemo|useCallback|React\.memo/,
  /\bdebounce|\bthrottle/,
  /index\(\)|CREATE INDEX/,
  /lazy\(|dynamic\(|Suspense/,
  /cache|Cache/,
];

const TEST_PATH = /(^|\/)(tests?|__tests__|specs?)\/|\.(test|spec)\.[jt]sx?$/i;
const CONFIG_PATH =
  /(package\.json|package-lock\.json|yarn\.lock|pnpm-lock|bun\.lock|Cargo\.(toml|lock)|go\.(mod|sum)|pyproject\.toml|tsconfig|\.github\/workflows|Dockerfile|docker-compose)/i;
const DOCS_PATH = /\.(md|mdx|rst|adoc)$/i;

export function classifyFromDiff(file: FileDiff): ChangeKind | null {
  if (TEST_PATH.test(file.path)) return "tests";
  if (DOCS_PATH.test(file.path) && file.hunks.length <= 2) return "docs";
  if (CONFIG_PATH.test(file.path)) return "deps";
  if (file.status === "added") return "feature";
  if (file.status === "deleted") return "remove";
  if (file.status === "renamed") return "rename";

  const addedText = file.hunks.flatMap((h) => h.added).join("\n");
  const removedText = file.hunks.flatMap((h) => h.removed).join("\n");

  const fixHits = FIX_SIGNALS.filter((r) => r.test(addedText)).length;
  const fixRemovalHits = FIX_SIGNALS.filter((r) => r.test(removedText)).length;
  if (fixHits >= 2 && fixHits > fixRemovalHits) return "fix";

  const perfHits = PERF_SIGNALS.filter((r) => r.test(addedText)).length;
  if (perfHits >= 2) return "perf";

  const removedLen = removedText.length;
  const addedLen = addedText.length;
  if (removedLen > 200 && addedLen > 0 && addedLen < removedLen * 0.3) {
    return "refactor";
  }

  return null;
}

export function classifyCommit(commit: CommitInfo): ChangeKind {
  return classifyFromMessage(commit.subject);
}

export function dominantKind(kinds: ChangeKind[]): ChangeKind {
  const counts = new Map<ChangeKind, number>();
  const priority: ChangeKind[] = [
    "feature",
    "fix",
    "remove",
    "perf",
    "rename",
    "refactor",
    "deps",
    "tests",
    "style",
    "docs",
    "ci",
    "config",
    "chore",
    "unknown",
  ];
  for (const k of kinds) counts.set(k, (counts.get(k) ?? 0) + 1);
  let best: ChangeKind = "unknown";
  let bestScore = -1;
  for (const k of priority) {
    const c = counts.get(k) ?? 0;
    const score = c * 100 - priority.indexOf(k);
    if (c > 0 && score > bestScore) {
      best = k;
      bestScore = score;
    }
  }
  return best;
}
