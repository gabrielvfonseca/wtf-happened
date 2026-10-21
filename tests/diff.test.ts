import { parseUnifiedDiff } from "@/parse/diff.js";
import type { FileDiff } from "@/types.js";
/// <reference types="vitest" />
import { describe, expect, it } from "vitest";

const DIFF = `diff --git a/src/auth/oauth.ts b/src/auth/oauth.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/auth/oauth.ts
@@ -0,0 +1,10 @@
+import { OAuth2 } from "oauth";
+export function login() {}
+
diff --git a/src/auth/session.ts b/src/auth/session.ts
index 1111111..2222222 100644
--- a/src/auth/session.ts
+++ b/src/auth/session.ts
@@ -5,3 +5,6 @@ export function session() {
  return s;
 }
+cookie.maxAge = 3600;
+
diff --git a/src/billing/portal.ts b/src/billing/portal.ts
new file mode 100644
index 0000000..3333333
--- /dev/null
+++ b/src/billing/portal.ts
@@ -0,0 +1,5 @@
+export function portal() {}
+
diff --git a/package-lock.json b/package-lock.json
index 4444444..5555555 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,3 +1,3 @@
-{"deps": {"old": "1.0"}}
+{"deps": {"new": "2.0"}}
diff --git a/docs/README.md b/docs/README.md
index 6666666..7777777 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -10,7 +10,9 @@
 # Project
 
-This is old.
+This is new and improved.
+- Bullet added.
`;

describe("parseUnifiedDiff", () => {
  it("parses multiple files with statuses and counts", () => {
    const files = parseUnifiedDiff(DIFF);
    expect(files.map((f) => f.path)).toEqual([
      "src/auth/oauth.ts",
      "src/auth/session.ts",
      "src/billing/portal.ts",
      "package-lock.json",
      "docs/README.md",
    ]);

    const byPath = new Map<string, FileDiff>();
    for (const f of files) byPath.set(f.path, f);

    const oauth = byPath.get("src/auth/oauth.ts")!;
    expect(oauth.status).toBe("added");
    expect(oauth.additions).toBe(3);
    expect(oauth.deletions).toBe(0);
    expect(oauth.binary).toBe(false);
    expect(oauth.oldPath).toBeUndefined();

    const session = byPath.get("src/auth/session.ts")!;
    expect(session.status).toBe("modified");
    expect(session.additions).toBe(2);
    expect(session.deletions).toBe(0);

    const lock = byPath.get("package-lock.json")!;
    expect(lock.status).toBe("modified");
    expect(lock.additions).toBe(1);
    expect(lock.deletions).toBe(1);

    const readme = byPath.get("docs/README.md")!;
    expect(readme.additions).toBe(2);
    expect(readme.deletions).toBe(1);
  });

  it("parses hunk headers and context lines correctly", () => {
    const files = parseUnifiedDiff(DIFF);
    const hunk = files[1]!.hunks[0]!;
    expect(hunk.oldStart).toBe(5);
    expect(hunk.oldLines).toBe(3);
    expect(hunk.newStart).toBe(5);
    expect(hunk.newLines).toBe(6);
    expect(hunk.header).toBe("export function session() {");
    expect(hunk.added).toEqual(["cookie.maxAge = 3600;", ""]);
    expect(hunk.removed).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(parseUnifiedDiff("")).toEqual([]);
    expect(parseUnifiedDiff("\n\n")).toEqual([]);
  });

  it("exposes total helpers", () => {
    const files = parseUnifiedDiff(DIFF);
    expect(files.reduce((s, f) => s + f.additions, 0)).toBe(10);
    expect(files.reduce((s, f) => s + f.deletions, 0)).toBe(2);
  });
});
