/// <reference types="vitest" />
import { describe, expect, it } from "vitest";
import { clusterIntents } from "../src/classify/intent.js";
import type { CommitInfo, FileDiff } from "../src/types.js";

function commit(subject: string, files: string[]): CommitInfo {
  return {
    hash: "abc123",
    shortHash: "abc123",
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

describe("clusterIntents", () => {
  it("groups by change kind + area into intent clusters", () => {
    const commits = [
      commit("feat(auth): add oauth login", ["src/auth/oauth.ts"]),
      commit("fix: correct session cookie", ["src/auth/session.ts"]),
    ];
    const files = [
      file("src/auth/oauth.ts", 20, 0),
      file("src/auth/session.ts", 5, 2),
    ];

    const clusters = clusterIntents({ commits, files });
    expect(clusters.length).toBe(2);

    const authFeature = clusters.find(
      (c) => c.area === "auth" && c.change === "feature",
    );
    expect(authFeature).toBeDefined();
    expect(authFeature?.title).toContain("add oauth login");
    expect(authFeature?.files.length).toBe(1);
    expect(authFeature?.commits.length).toBe(1);

    const authFix = clusters.find(
      (c) => c.area === "auth" && c.change === "fix",
    );
    expect(authFix).toBeDefined();
    expect(authFix?.files.length).toBe(1);
  });

  it("detects dependency bumps as deps cluster", () => {
    const commits = [commit("deps: bump react to 19", ["package-lock.json"])];
    const files = [file("package-lock.json", 100, 50)];

    const clusters = clusterIntents({ commits, files });
    const deps = clusters.find((c) => c.change === "deps");
    expect(deps).toBeDefined();
    expect(deps?.signals.some((s) => s.includes("lockfile"))).toBe(true);
  });

  it("sorts clusters by impact descending", () => {
    const commits = [commit("chore: stuff", ["a.ts", "b.ts"])];
    const files = [file("a.ts", 1, 0), file("b.ts", 100, 0)];

    const clusters = clusterIntents({ commits, files });
    const second = clusters[1];
    expect(clusters[0]!.additions).toBeGreaterThanOrEqual(
      second ? second.additions : 0,
    );
  });

  it("returns empty for no input", () => {
    expect(clusterIntents({ commits: [], files: [] })).toEqual([]);
  });
});
