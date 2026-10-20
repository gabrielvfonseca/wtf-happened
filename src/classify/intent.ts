import type {
  Area,
  ChangeKind,
  ClassifiedFile,
  CommitInfo,
  FileDiff,
  IntentCluster,
} from "../types.js";
import { AREA_LABELS, classifyArea } from "./area.js";
import { classifyFromMessage, parseConventional } from "./change.js";

const WIP_PATTERN = /^(wip:|wip$|fixup!|squash!|tmp|temp|stuff|updates?|misc)/i;

const VERBS: Record<ChangeKind, string> = {
  feature: "Added",
  fix: "Fixed",
  refactor: "Refactored",
  remove: "Removed",
  rename: "Renamed",
  deps: "Updated dependencies",
  config: "Changed config",
  docs: "Updated docs",
  tests: "Changed tests",
  style: "Updated styles",
  perf: "Improved performance",
  ci: "Changed CI",
  chore: "Maintenance",
  unknown: "Changed",
};

function mode<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  const counts = new Map<T, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  let best: T | null = null;
  let bestCount = 0;
  for (const [item, count] of counts) {
    if (count > bestCount) {
      best = item;
      bestCount = count;
    }
  }
  return best;
}

function clusterKey(change: ChangeKind, area: Area): string {
  return `${change}:${area}`;
}

function buildTitle(
  change: ChangeKind,
  area: Area,
  commits: CommitInfo[],
  files: ClassifiedFile[],
): string {
  const conventional = commits
    .map((c) => parseConventional(c.subject))
    .filter(
      (p): p is NonNullable<ReturnType<typeof parseConventional>> => p !== null,
    );

  const best = conventional[0];
  if (best?.description) {
    return best.scope
      ? `${best.description} (${best.scope})`
      : best.description;
  }

  if (commits.length === 1) {
    const subject = commits[0]?.subject.trim() ?? "";
    if (subject !== "" && !WIP_PATTERN.test(subject)) return subject;
  }

  const verb = VERBS[change];
  const scoped = area !== "core" && area !== "other";
  const scopeSuffix = scoped ? ` in ${AREA_LABELS[area]}` : "";

  const single = files[0];
  if (files.length === 1 && single) {
    return `${verb} ${single.file.path}${scopeSuffix}`;
  }
  if (files.length > 1) {
    return `${verb} ${files.length} files${scopeSuffix}`;
  }
  const subjects = commits
    .map((c) => c.subject)
    .filter((s) => !WIP_PATTERN.test(s));
  const representative = subjects[0] ?? `${commits.length} commits`;
  return `${verb}: ${representative}`;
}

function extractSignals(
  change: ChangeKind,
  commits: CommitInfo[],
  files: ClassifiedFile[],
): string[] {
  const authors = [...new Set(commits.map((c) => c.author))];
  const signals: string[] = [];

  if (authors.length === 1 && authors[0]) {
    signals.push(`author: ${authors[0]}`);
  } else if (authors.length > 1) {
    signals.push(`authors: ${authors.join(", ")}`);
  }

  const wipCount = commits.filter((c) => WIP_PATTERN.test(c.subject)).length;
  if (wipCount > 0) {
    signals.push(
      `${wipCount} vague commit message${wipCount === 1 ? "" : "s"}`,
    );
  }

  const hasLockfile = files.some((f) =>
    /lock|\.lock$|bun\.lockb?$/i.test(f.file.path),
  );
  if (hasLockfile && change === "deps") {
    signals.push("lockfile updated");
  }

  const hasTests = files.some((f) => f.area === "tests");
  const codeFiles = files.filter(
    (f) => f.area !== "tests" && f.area !== "docs" && f.area !== "deps",
  );
  if (codeFiles.length >= 3 && !hasTests && commits.length > 0) {
    signals.push("no test changes");
  }

  return signals;
}

function classifyFileChange(
  file: FileDiff,
  commitsTouching: CommitInfo[],
): ChangeKind {
  const kinds = commitsTouching.map((c) => classifyFromMessage(c.subject));
  return mode(kinds) ?? "unknown";
}

export function clusterIntents(input: {
  commits: CommitInfo[];
  files: FileDiff[];
}): IntentCluster[] {
  const { commits, files } = input;

  const commitsByFile = new Map<string, CommitInfo[]>();
  for (const commit of commits) {
    for (const path of commit.files) {
      const list = commitsByFile.get(path) ?? [];
      list.push(commit);
      commitsByFile.set(path, list);
    }
  }

  const classified: ClassifiedFile[] = files.map((file) => ({
    file,
    area: classifyArea(file.path),
    change: classifyFileChange(file, commitsByFile.get(file.path) ?? []),
  }));

  const fileGroups = new Map<string, ClassifiedFile[]>();
  for (const cf of classified) {
    const key = clusterKey(cf.change, cf.area);
    const list = fileGroups.get(key) ?? [];
    list.push(cf);
    fileGroups.set(key, list);
  }

  const commitGroups = new Map<string, CommitInfo[]>();
  for (const commit of commits) {
    const kind = classifyFromMessage(commit.subject);
    const areas = commit.files.map(classifyArea);
    const area = mode(areas) ?? "other";
    const key = clusterKey(kind, area);
    const list = commitGroups.get(key) ?? [];
    list.push(commit);
    commitGroups.set(key, list);
  }

  const keys = new Set([...fileGroups.keys(), ...commitGroups.keys()]);
  const clusters: IntentCluster[] = [...keys].map((key) => {
    const [rawChange, rawArea] = key.split(":");
    const change = (rawChange ?? "unknown") as ChangeKind;
    const area = (rawArea ?? "other") as Area;
    const clusterFiles = fileGroups.get(key) ?? [];
    const clusterCommits = commitGroups.get(key) ?? [];

    return {
      id: key,
      change,
      area,
      title: buildTitle(change, area, clusterCommits, clusterFiles),
      files: clusterFiles,
      commits: clusterCommits,
      additions: clusterFiles.reduce((s, f) => s + f.file.additions, 0),
      deletions: clusterFiles.reduce((s, f) => s + f.file.deletions, 0),
      signals: extractSignals(change, clusterCommits, clusterFiles),
    };
  });

  return clusters
    .filter((c) => c.files.length > 0 || c.commits.length > 0)
    .sort(
      (a, b) =>
        b.additions +
        b.deletions +
        b.commits.length * 10 -
        (a.additions + a.deletions + a.commits.length * 10),
    );
}
