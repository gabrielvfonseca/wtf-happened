import { clusterIntents } from "./classify/intent.js";
import type { ChangeKind, CommitInfo, FileDiff, Summary } from "./types.js";

const WIP_PATTERN = /^(wip:|wip$|fixup!|squash!|tmp|temp|stuff|updates?|misc)/i;

export interface SummarizeInput {
  mode: Summary["mode"];
  range: string;
  commits: CommitInfo[];
  files: FileDiff[];
  baseRef?: string;
  headRef?: string;
}

function dateRange(commits: CommitInfo[]): Summary["dateRange"] {
  const dates = commits
    .map((c) => Date.parse(c.date))
    .filter((t) => !Number.isNaN(t));
  if (dates.length === 0) return undefined;
  const from = new Date(Math.min(...dates)).toISOString();
  const to = new Date(Math.max(...dates)).toISOString();
  return { from, to };
}

function collectWarnings(commits: CommitInfo[], files: FileDiff[]): string[] {
  const warnings: string[] = [];

  const vague = commits.filter((c) => WIP_PATTERN.test(c.subject));
  if (vague.length > 0) {
    warnings.push(
      `${vague.length} commit${vague.length === 1 ? "" : "s"} use${vague.length === 1 ? "s" : ""} vague messages (wip/tmp/…)`,
    );
  }

  const testTouched = files.some(
    (f) =>
      f.path.includes("test") ||
      f.path.includes("spec") ||
      /\.(test|spec)\.[jt]sx?$/.test(f.path),
  );
  const codeFiles = files.filter(
    (f) =>
      !(
        f.path.includes("test") ||
        f.path.includes("spec") ||
        /\.(test|spec)\.[jt]sx?$/.test(f.path) ||
        /\.(md|mdx|rst)$/.test(f.path) ||
        /lock|package\.json|Cargo\.toml|go\.mod/i.test(f.path)
      ),
  );
  if (!testTouched && codeFiles.length >= 5) {
    warnings.push(
      `${codeFiles.length} code files changed with no test updates`,
    );
  }

  const large = files.filter((f) => f.additions + f.deletions > 500);
  if (large.length > 0) {
    const names = large.slice(0, 2).map((f) => f.path);
    const more = large.length > 2 ? ` +${large.length - 2} more` : "";
    warnings.push(
      `very large change${large.length === 1 ? "" : "s"}: ${names.join(", ")}${more}`,
    );
  }

  const authors = new Set(commits.map((c) => c.author));
  if (authors.size >= 3) {
    warnings.push(`${authors.size} authors — possible merge or shared branch`);
  }

  return warnings;
}

export function summarize(input: SummarizeInput): Summary {
  const { commits, files } = input;
  const clusters = clusterIntents({ commits, files });

  const commitCountByChange: Partial<Record<ChangeKind, number>> = {};
  for (const cluster of clusters) {
    if (cluster.commits.length > 0) {
      commitCountByChange[cluster.change] =
        (commitCountByChange[cluster.change] ?? 0) + cluster.commits.length;
    }
  }

  const summary: Summary = {
    mode: input.mode,
    range: input.range,
    commitCount: commits.length,
    authorCount: new Set(commits.map((c) => c.author)).size,
    authors: [...new Set(commits.map((c) => c.author))],
    totalAdditions: files.reduce((s, f) => s + f.additions, 0),
    totalDeletions: files.reduce((s, f) => s + f.deletions, 0),
    clusters,
    warnings: collectWarnings(commits, files),
    commitCountByChange,
  };

  const range = dateRange(commits);
  if (range) summary.dateRange = range;
  if (input.baseRef) summary.baseRef = input.baseRef;
  if (input.headRef) summary.headRef = input.headRef;

  return summary;
}
