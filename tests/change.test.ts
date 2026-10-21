import {
  classifyCommit,
  classifyFromDiff,
  classifyFromMessage,
  dominantKind,
  parseConventional,
} from "@/classify/change.js";
import type { ChangeKind, CommitInfo, FileDiff } from "@/types.js";
/// <reference types="vitest" />
import { describe, expect, it } from "vitest";

describe("parseConventional", () => {
  it("parses feat with scope", () => {
    const p = parseConventional("feat(auth): add oauth login");
    expect(p).toEqual({
      kind: "feature",
      scope: "auth",
      description: "add oauth login",
    });
  });

  it("parses fix", () => {
    const p = parseConventional("fix(cart): correct rounding");
    expect(p?.kind).toBe("fix");
    expect(p?.description).toBe("correct rounding");
  });

  it("returns null for non-conventional", () => {
    expect(parseConventional("wip: stuff")).toBeNull();
    expect(parseConventional("update things")).toBeNull();
  });
});

describe("classifyFromMessage", () => {
  it.each([
    ["add oauth login", "feature"],
    ["fix session cookie bug", "fix"],
    ["remove deprecated api", "remove"],
    ["rename utils to helpers", "rename"],
    ["bump react to 19", "deps"],
    ["optimize hot loop", "perf"],
    ["refactor user model", "refactor"],
    ["update readme", "docs"],
    ["add tests for cart", "tests"],
    ["ci: deploy pipeline", "ci"],
    ["chore: cleanup", "chore"],
    ["asdfghjkl", "unknown"],
  ])("classifies %p as %s", (subject, expected) => {
    expect(classifyFromMessage(subject)).toBe(expected);
  });
});

describe("classifyFromDiff", () => {
  it("detects deps from lockfile", () => {
    const file: FileDiff = {
      path: "package-lock.json",
      status: "modified",
      binary: false,
      additions: 50,
      deletions: 10,
      hunks: [],
    };
    expect(classifyFromDiff(file)).toBe("deps");
  });

  it("detects tests from test file path", () => {
    const file: FileDiff = {
      path: "src/auth.test.ts",
      status: "added",
      binary: false,
      additions: 100,
      deletions: 0,
      hunks: [],
    };
    expect(classifyFromDiff(file)).toBe("tests");
  });

  it("detects removal from deletions", () => {
    const file: FileDiff = {
      path: "src/old.ts",
      status: "deleted",
      binary: false,
      additions: 0,
      deletions: 200,
      hunks: [],
    };
    expect(classifyFromDiff(file)).toBe("remove");
  });

  it("returns null for ambiguous source edit", () => {
    const file: FileDiff = {
      path: "src/utils.ts",
      status: "modified",
      binary: false,
      additions: 5,
      deletions: 3,
      hunks: [],
    };
    expect(classifyFromDiff(file)).toBeNull();
  });
});

describe("classifyCommit", () => {
  const base: CommitInfo = {
    hash: "abc",
    shortHash: "abc",
    author: "A",
    email: "a@b.c",
    date: "2026-01-01T00:00:00Z",
    subject: "",
    body: "",
    additions: 0,
    deletions: 0,
    files: [],
  };

  it("uses conventional commit kind", () => {
    expect(classifyCommit({ ...base, subject: "fix(cart): bug" })).toBe("fix");
  });

  it("uses message keywords", () => {
    expect(classifyCommit({ ...base, subject: "update stuff" })).toBe(
      "unknown",
    );
    expect(classifyCommit({ ...base, subject: "fix: typo in readme" })).toBe(
      "fix",
    );
  });
});

describe("dominantKind", () => {
  it("picks the most frequent kind", () => {
    expect(dominantKind(["fix", "fix", "feature", "chore"])).toBe("fix");
  });

  it("returns unknown for empty", () => {
    expect(dominantKind([])).toBe("unknown");
  });
});
