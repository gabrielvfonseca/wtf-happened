export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  added: string[];
  removed: string[];
}

export interface FileDiff {
  path: string;
  oldPath?: string;
  status: "added" | "modified" | "deleted" | "renamed" | "copied";
  binary: boolean;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface CommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  date: string;
  subject: string;
  body: string;
  additions: number;
  deletions: number;
  files: string[];
}

export type ChangeKind =
  | "feature"
  | "fix"
  | "refactor"
  | "remove"
  | "rename"
  | "deps"
  | "config"
  | "docs"
  | "tests"
  | "style"
  | "perf"
  | "ci"
  | "chore"
  | "unknown";

export type Area =
  | "api"
  | "ui"
  | "auth"
  | "db"
  | "tests"
  | "ci"
  | "docs"
  | "deps"
  | "config"
  | "styles"
  | "core"
  | "scripts"
  | "other";

export interface ClassifiedFile {
  file: FileDiff;
  area: Area;
  change: ChangeKind;
}

export interface IntentCluster {
  id: string;
  change: ChangeKind;
  area: Area | "mixed";
  title: string;
  files: ClassifiedFile[];
  commits: CommitInfo[];
  additions: number;
  deletions: number;
  signals: string[];
}

export interface Summary {
  mode: "pr" | "since" | "log" | "commit";
  range: string;
  baseRef?: string;
  headRef?: string;
  commitCount: number;
  authorCount: number;
  dateRange?: { from: string; to: string };
  authors: string[];
  totalAdditions: number;
  totalDeletions: number;
  clusters: IntentCluster[];
  warnings: string[];
  commitCountByChange: Partial<Record<ChangeKind, number>>;
}
