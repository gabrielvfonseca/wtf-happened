import { summarize } from "@/summarize.js";
import type { CommitInfo, FileDiff } from "@/types.js";
/// <reference types="vitest" />
import { describe, expect, it } from "vitest";

function commit(subject: string, files: string[]): CommitInfo {
  return {
    hash: "abc",
    shortHash: "abc",
    author: "Dev",
    email: "dev@example.com",
    date: "2026-10-01T10:00:00Z",
    subject,
    body: "",
    additions: 0,
    deletions: 0,
    files,
  };
}

function file(path: string, additions: number, deletions: number): FileDiff {
  return {
    path,
    status: "modified",
    binary: false,
    additions,
    deletions,
    hunks: [],
  };
}

describe("summarize", () => {
  it("builds a summary with clusters, authors, counts, warnings", () => {
    const commits = [
      commit("feat(auth): add oauth", ["src/auth/oauth.ts"]),
      commit("wip: stuff", ["src/utils.ts"]),
    ];
    const files = [
      file("src/auth/oauth.ts", 10, 0),
      file("src/utils.ts", 1, 0),
    ];

    const summary = summarize({
      mode: "log",
      range: "last 2 commits",
      commits,
      files,
    });

    expect(summary.mode).toBe("log");
    expect(summary.commitCount).toBe(2);
    expect(summary.authorCount).toBe(1);
    expect(summary.totalAdditions).toBe(11);
    expect(summary.totalDeletions).toBe(0);
    expect(summary.clusters.length).toBeGreaterThan(0);
    expect(summary.warnings.some((w) => w.includes("vague"))).toBe(true);
    expect(summary.dateRange).toBeDefined();
  });

  it("warns when code files change without tests", () => {
    const commits = [
      commit("fix: something", [
        "src/a.ts",
        "src/b.ts",
        "src/c.ts",
        "src/d.ts",
        "src/e.ts",
      ]),
    ];
    const files = [
      file("src/a.ts", 1, 0),
      file("src/b.ts", 1, 0),
      file("src/c.ts", 1, 0),
      file("src/d.ts", 1, 0),
      file("src/e.ts", 1, 0),
    ];

    const summary = summarize({
      mode: "commit",
      range: "single",
      commits,
      files,
    });

    expect(summary.warnings.some((w) => w.includes("no test updates"))).toBe(
      true,
    );
  });

  it("handles empty input", () => {
    const summary = summarize({
      mode: "log",
      range: "none",
      commits: [],
      files: [],
    });

    expect(summary.commitCount).toBe(0);
    expect(summary.clusters).toEqual([]);
    expect(summary.warnings).toEqual([]);
  });
});
