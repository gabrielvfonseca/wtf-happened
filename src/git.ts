import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CommitInfo } from "./types.js";

const execFileAsync = promisify(execFile);

export class GitError extends Error {
  constructor(
    public readonly stderr: string,
    public readonly command: string,
  ) {
    super(`git command failed: ${command}\n${stderr}`);
    this.name = "GitError";
  }
}

export interface GitOptions {
  cwd: string;
}

async function git(
  args: string[],
  { cwd }: GitOptions,
): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd,
      maxBuffer: 64 * 1024 * 1024,
      encoding: "utf8",
    });
    return { stdout, stderr };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    throw new GitError(e.stderr ?? e.message, `git ${args.join(" ")}`);
  }
}

export async function isGitRepo(opts: GitOptions): Promise<boolean> {
  try {
    const { stdout } = await git(["rev-parse", "--is-inside-work-tree"], opts);
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

export async function resolveRef(
  ref: string,
  opts: GitOptions,
): Promise<string | null> {
  try {
    const { stdout } = await git(
      ["rev-parse", "--verify", `${ref}^{commit}`],
      opts,
    );
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function defaultBranch(opts: GitOptions): Promise<string | null> {
  const candidates = [
    "refs/remotes/origin/main",
    "refs/remotes/origin/master",
    "main",
    "master",
  ];
  for (const c of candidates) {
    if (await resolveRef(c, opts)) return c;
  }
  const { stdout } = await git(
    ["symbolic-ref", "refs/remotes/origin/HEAD", "--short"],
    opts,
  ).catch(() => ({ stdout: "" }));
  const ref = stdout.trim();
  return ref || null;
}

export async function currentBranch(opts: GitOptions): Promise<string | null> {
  const { stdout } = await git(
    ["symbolic-ref", "--short", "-q", "HEAD"],
    opts,
  ).catch(() => ({ stdout: "" }));
  return stdout.trim() || null;
}

export async function mergeBase(
  a: string,
  b: string,
  opts: GitOptions,
): Promise<string | null> {
  try {
    const { stdout } = await git(["merge-base", a, b], opts);
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function getDiff(
  range: string,
  opts: GitOptions,
): Promise<string> {
  const { stdout } = await git(
    ["diff", "--no-color", "--find-renames", range],
    opts,
  );
  return stdout;
}

export async function getDiffStats(
  range: string,
  opts: GitOptions,
): Promise<Array<{ path: string; additions: number; deletions: number }>> {
  const { stdout } = await git(
    ["diff", "--numstat", "--find-renames", range],
    opts,
  );
  return stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [add, del, ...rest] = line.split("\t");
      return {
        path: rest[rest.length - 1] ?? "",
        additions: add === "-" ? 0 : Number(add),
        deletions: del === "-" ? 0 : Number(del),
      };
    });
}

const LOG_SEPARATOR = "\x1f";
const LOG_RECORD = "\x1e";

const LOG_FORMAT = ["%H", "%h", "%an", "%ae", "%aI", "%s", "%b"].join(
  LOG_SEPARATOR,
);

export async function getCommits(
  range: string,
  opts: GitOptions,
): Promise<CommitInfo[]> {
  const { stdout } = await git(
    [
      "log",
      "--no-color",
      "--find-renames",
      `--format=${LOG_RECORD}${LOG_FORMAT}`,
      "--numstat",
      range,
    ],
    opts,
  );
  return parseLogOutput(stdout);
}

const NUMSTAT_LINE = /^(\d+|-)\t(\d+|-)\t(.+)$/;

interface NumstatEntry {
  additions: number;
  deletions: number;
  path: string;
}

function parseNumstatLine(line: string): NumstatEntry | null {
  const m = NUMSTAT_LINE.exec(line);
  if (!m || !m[3]) return null;
  return {
    additions: m[1] === "-" ? 0 : Number(m[1]),
    deletions: m[2] === "-" ? 0 : Number(m[2]),
    path: m[3],
  };
}

function parseCommitRecord(record: string): CommitInfo | null {
  const lines = record.split("\n");
  const headerLine = lines.find((l) => l.includes(LOG_SEPARATOR));
  if (!headerLine) return null;

  const parts = headerLine.split(LOG_SEPARATOR);
  const [hash, shortHash, author, email, date, subject] = parts;
  if (!hash) return null;
  const body = parts.slice(6).join("\n").trim();

  const stats = lines
    .filter((line) => !line.includes(LOG_SEPARATOR))
    .map(parseNumstatLine)
    .filter((s): s is NumstatEntry => s !== null);

  return {
    hash,
    shortHash: shortHash ?? "",
    author: author ?? "",
    email: email ?? "",
    date: date ?? "",
    subject: subject ?? "",
    body,
    additions: stats.reduce((sum, s) => sum + s.additions, 0),
    deletions: stats.reduce((sum, s) => sum + s.deletions, 0),
    files: stats.map((s) => s.path),
  };
}

function parseLogOutput(stdout: string): CommitInfo[] {
  return stdout
    .split(LOG_RECORD)
    .filter((r) => r.trim() !== "")
    .map(parseCommitRecord)
    .filter((c): c is CommitInfo => c !== null);
}

export async function hasPrBody(opts: GitOptions): Promise<string | null> {
  const { stdout } = await git(
    ["config", "--get", "remote.origin.url"],
    opts,
  ).catch(() => ({ stdout: "" }));
  return stdout.trim() || null;
}

export function normalizeSince(input: string): string {
  const trimmed = input.trim();
  const rel = trimmed.match(
    /^(\d+)\s*(m|min|minutes?|h|hours?|d|days?|w|weeks?|mo|months?)$/i,
  );
  if (rel) {
    const n = rel[1];
    const unit = rel[2]?.toLowerCase() ?? "";
    const gitUnit =
      unit.startsWith("m") && !unit.startsWith("mo") && unit !== "m"
        ? "minutes"
        : unit.startsWith("mo")
          ? "months"
          : unit.startsWith("w")
            ? "weeks"
            : unit.startsWith("h")
              ? "hours"
              : "days";
    return `${n} ${gitUnit} ago`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const lower = trimmed.toLowerCase();
  if (lower === "today" || lower === "yesterday") return lower;
  return trimmed;
}
