import process from "node:process";
import pkg from "../package.json";
import {
  type GitOptions,
  currentBranch,
  defaultBranch,
  getCommits,
  getDiff,
  isGitRepo,
  mergeBase,
  normalizeSince,
  resolveRef,
} from "./git.js";
import { parseUnifiedDiff } from "./parse/diff.js";
import { renderJson } from "./render/json.js";
import { renderMarkdown } from "./render/markdown.js";
import { renderTerminal } from "./render/terminal.js";
import { summarize } from "./summarize.js";
import type { CommitInfo, Summary } from "./types.js";

const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

interface CliArgs {
  command: "default" | "pr" | "since" | "log" | "commit" | "help" | "version";
  positional: string[];
  markdown: boolean;
  json: boolean;
  verbose: boolean;
  limit: number;
  base?: string;
}

const USAGE = `wtf-happened — plain-English "what changed and why", offline.

Usage:
  wtf-happened                 Smart summary (PR if on a branch, else recent log)
  wtf-happened pr [base]       Summarize current branch vs base (default: origin/main)
  wtf-happened since <when>    Everything since e.g. "2w", "yesterday", "2026-10-01"
  wtf-happened log [n]         Last n commits (default 10)
  wtf-happened commit <ref>    Summarize a single commit

Flags:
  --md, --markdown    Output Markdown (paste into a PR body)
  --json              Output JSON
  --verbose, -v       Show every commit and file
  --limit <n>         Max commits to consider (default 100)
  --no-color          Disable colors (also honors NO_COLOR)
  --help, -h          Show this help
  --version           Show version

Examples:
  npx wtf-happened
  wtf-happened pr origin/main
  wtf-happened since 2w
  wtf-happened log 20 --md
  wtf-happened commit HEAD~3`;

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    command: "default",
    positional: [],
    markdown: false,
    json: false,
    verbose: false,
    limit: 100,
  };

  const tokens = [...argv];
  const takeFlag = (names: string[]): boolean => {
    const idx = tokens.findIndex((t) => names.includes(t));
    if (idx === -1) return false;
    tokens.splice(idx, 1);
    return true;
  };

  if (takeFlag(["--md", "--markdown"])) args.markdown = true;
  if (takeFlag(["--json"])) args.json = true;
  if (takeFlag(["--verbose", "-v"])) args.verbose = true;
  if (takeFlag(["--no-color"])) process.env.NO_COLOR = "1";

  const limitIdx = tokens.findIndex((t) => t === "--limit");
  if (limitIdx !== -1) {
    const value = Number(tokens[limitIdx + 1]);
    if (Number.isInteger(value) && value > 0) args.limit = value;
    tokens.splice(limitIdx, 2);
  }

  const rest = tokens.filter((t) => !t.startsWith("-"));
  const [first, ...positional] = rest;

  switch (first) {
    case "help":
      args.command = "help";
      break;
    case "version":
      args.command = "version";
      break;
    case "pr":
      args.command = "pr";
      args.positional = positional;
      if (positional[0]) args.base = positional[0];
      break;
    case "since":
      args.command = "since";
      args.positional = positional;
      break;
    case "log":
      args.command = "log";
      args.positional = positional;
      break;
    case "commit":
      args.command = "commit";
      args.positional = positional;
      break;
    default:
      args.command = "default";
      args.positional = rest;
  }

  return args;
}

async function buildSummary(opts: {
  mode: Summary["mode"];
  range: string;
  git: GitOptions;
  baseRef?: string;
  headRef?: string;
  limit: number;
  commitRange?: string;
}): Promise<Summary> {
  const { git, mode, limit } = opts;
  const diffRange = opts.commitRange ?? opts.range;
  const diffText = await getDiff(diffRange, git);
  const files = parseUnifiedDiff(diffText);
  const allCommits = await getCommits(diffRange, git);
  const commits: CommitInfo[] = allCommits.slice(0, limit);
  const summary = summarize({ mode, range: opts.range, commits, files });
  if (opts.baseRef) summary.baseRef = opts.baseRef;
  if (opts.headRef) summary.headRef = opts.headRef;
  return summary;
}

async function resolvePrRange(
  baseArg: string | undefined,
  git: GitOptions,
): Promise<{ range: string; baseRef: string; headRef: string } | null> {
  const head = "HEAD";
  const base =
    baseArg ??
    (await defaultBranch(git)) ??
    ((await mergeBase("HEAD~1", "HEAD", git)) ? "HEAD~1" : null);
  if (!base) return null;

  const baseResolved = await resolveRef(base, git);
  if (!baseResolved) return null;

  const mb = await mergeBase(baseResolved, head, git);
  const range = mb ? `${mb}..${head}` : `${baseResolved}..${head}`;
  return { range, baseRef: base, headRef: head };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === "help") {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  if (args.command === "version") {
    process.stdout.write(`${pkg.version}\n`);
    return;
  }

  const git: GitOptions = { cwd: process.cwd() };
  if (!(await isGitRepo(git))) {
    process.stderr.write("error: not a git repository\n");
    process.exitCode = 1;
    return;
  }

  let summary: Summary | null = null;

  if (args.command === "commit") {
    const ref = args.positional[0] ?? "HEAD";
    const range = `${ref}~1..${ref}`;
    if (!(await resolveRef(ref, git))) {
      process.stderr.write(`error: unknown commit "${ref}"\n`);
      process.exitCode = 1;
      return;
    }
    summary = await buildSummary({
      mode: "commit",
      range,
      git,
      limit: args.limit,
    });
  } else if (args.command === "log") {
    const n = Number(args.positional[0]);
    const count = Number.isInteger(n) && n > 0 ? n : 10;
    const headParent = await resolveRef(`HEAD~${count}`, git);
    const range = headParent ? `HEAD~${count}..HEAD` : `${EMPTY_TREE}..HEAD`;
    summary = await buildSummary({ mode: "log", range, git, limit: count });
  } else if (args.command === "since") {
    const when = args.positional.join(" ") || "2w";
    const since = normalizeSince(when);
    const sinceCommits = await getCommits(`--since=${since}`, git);
    const oldest = sinceCommits.at(-1);
    const oldestParent = oldest
      ? await resolveRef(`${oldest.hash}^`, git)
      : null;
    const range = oldest
      ? oldestParent
        ? `${oldest.hash}~1..HEAD`
        : `${EMPTY_TREE}..HEAD`
      : "HEAD..HEAD";
    summary = await buildSummary({
      mode: "since",
      range: `since ${when}`,
      git,
      limit: args.limit,
      commitRange: range,
    });
  } else if (args.command === "pr") {
    const pr = await resolvePrRange(args.base, git);
    if (!pr) {
      process.stderr.write(
        "error: could not determine base branch — pass one explicitly (e.g. `wtf-happened pr main`)\n",
      );
      process.exitCode = 1;
      return;
    }
    summary = await buildSummary({
      mode: "pr",
      range: pr.range,
      git,
      baseRef: pr.baseRef,
      headRef: pr.headRef,
      limit: args.limit,
    });
  } else {
    const branch = await currentBranch(git);
    const pr = branch ? await resolvePrRange(undefined, git) : null;
    if (pr) {
      const ahead = await getCommits(pr.range, git);
      if (ahead.length > 0) {
        summary = await buildSummary({
          mode: "pr",
          range: pr.range,
          git,
          baseRef: pr.baseRef,
          headRef: pr.headRef,
          limit: args.limit,
        });
      }
    }
    if (!summary) {
      const sinceCommits = await getCommits("--since=2 weeks ago", git);
      const oldest = sinceCommits.at(-1);
      const oldestParent = oldest
        ? await resolveRef(`${oldest.hash}^`, git)
        : null;
      const range = oldest
        ? oldestParent
          ? `${oldest.hash}~1..HEAD`
          : `${EMPTY_TREE}..HEAD`
        : "HEAD..HEAD";
      summary = await buildSummary({
        mode: "since",
        range: "the last 2 weeks",
        git,
        limit: args.limit,
        commitRange: range,
      });
    }
  }

  if (!summary) {
    process.stderr.write("error: nothing to summarize\n");
    process.exitCode = 1;
    return;
  }

  const output = args.json
    ? renderJson(summary)
    : args.markdown
      ? renderMarkdown(summary)
      : renderTerminal(summary, { verbose: args.verbose });

  process.stdout.write(`${output}\n`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`error: ${message}\n`);
  process.exitCode = 1;
});
