import type { DiffHunk, FileDiff } from "@/types.js";

const FILE_HEADER = /^diff --git (?:"?a\/(.+?)"?) (?:"?b\/(.+?)"?)$/;
const RENAME_FROM = /^rename from (.+)$/;
const RENAME_TO = /^rename to (.+)$/;
const NEW_FILE = /^new file mode/;
const DELETED_FILE = /^deleted file mode/;
const BINARY = /^Binary files .* differ$/;
const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;

const isFileHeader = (line: string): boolean => line.startsWith("diff --git ");
const isHunkHeader = (line: string): boolean => HUNK_HEADER.test(line);

function splitFileSections(lines: string[]): string[][] {
  const headerIndexes = lines
    .map((line, index) => (isFileHeader(line) ? index : -1))
    .filter((index) => index >= 0);

  return headerIndexes.map((start, i) => {
    const end =
      i + 1 < headerIndexes.length
        ? (headerIndexes[i + 1] as number)
        : lines.length;
    return lines.slice(start, end);
  });
}

function parseHunk(hunkLines: string[]): DiffHunk {
  const headerLine = hunkLines[0] ?? "";
  const match = HUNK_HEADER.exec(headerLine);
  const oldStart = Number(match?.[1] ?? 0);
  const oldLines = match?.[2] === undefined ? 1 : Number(match[2]);
  const newStart = Number(match?.[3] ?? 0);
  const newLines = match?.[4] === undefined ? 1 : Number(match[4]);
  const header = (match?.[5] ?? "").trim();

  const bodyLines = hunkLines.slice(1);
  const added = bodyLines
    .filter((line) => line.startsWith("+"))
    .map((line) => line.slice(1));
  const removed = bodyLines
    .filter((line) => line.startsWith("-"))
    .map((line) => line.slice(1));

  return { oldStart, oldLines, newStart, newLines, header, added, removed };
}

function splitHunkSections(lines: string[]): string[][] {
  const hunkStarts = lines
    .map((line, index) => (isHunkHeader(line) ? index : -1))
    .filter((index) => index >= 0);

  return hunkStarts.map((start, i) => {
    const end =
      i + 1 < hunkStarts.length ? (hunkStarts[i + 1] as number) : lines.length;
    return lines.slice(start, end);
  });
}

interface FileMeta {
  status: FileDiff["status"];
  binary: boolean;
  renameFrom?: string;
  renameTo?: string;
}

function parseFileMeta(metaLines: string[]): FileMeta {
  const status: FileDiff["status"] = metaLines.some((line) =>
    NEW_FILE.test(line),
  )
    ? "added"
    : metaLines.some((line) => DELETED_FILE.test(line))
      ? "deleted"
      : metaLines.some((line) => RENAME_FROM.test(line))
        ? "renamed"
        : "modified";

  const fromMatch = metaLines
    .map((line) => RENAME_FROM.exec(line))
    .find((m): m is RegExpExecArray => m !== null);
  const toMatch = metaLines
    .map((line) => RENAME_TO.exec(line))
    .find((m): m is RegExpExecArray => m !== null);

  const meta: FileMeta = {
    status,
    binary: metaLines.some((line) => BINARY.test(line)),
  };
  if (fromMatch?.[1]) meta.renameFrom = fromMatch[1];
  if (toMatch?.[1]) meta.renameTo = toMatch[1];
  return meta;
}

function parseFileSection(section: string[]): FileDiff {
  const headerLine = section[0] ?? "";
  const headerMatch = FILE_HEADER.exec(headerLine);
  const bodyLines = section.slice(1);

  const metaLines = bodyLines.filter(
    (line) =>
      !isHunkHeader(line) &&
      !line.startsWith(" ") &&
      !line.startsWith("+") &&
      !line.startsWith("-") &&
      !line.startsWith("\\"),
  );
  const meta = parseFileMeta(metaLines);

  const hunks = splitHunkSections(bodyLines).map(parseHunk);
  const additions = hunks.reduce((sum, h) => sum + h.added.length, 0);
  const deletions = hunks.reduce((sum, h) => sum + h.removed.length, 0);

  const newPath = meta.renameTo ?? headerMatch?.[2];
  const oldPathHeader = headerMatch?.[1];
  const path = newPath ?? oldPathHeader ?? "unknown";
  const oldPath = meta.renameFrom ?? oldPathHeader;

  const file: FileDiff = {
    path,
    status:
      meta.binary && meta.status === "modified" ? "modified" : meta.status,
    binary: meta.binary,
    additions,
    deletions,
    hunks,
  };
  if (oldPath && oldPath !== path) file.oldPath = oldPath;
  return file;
}

export function parseUnifiedDiff(diff: string): FileDiff[] {
  if (diff.trim() === "") return [];
  const lines = diff.split("\n");
  return splitFileSections(lines).map(parseFileSection);
}

export function totalAdditions(files: FileDiff[]): number {
  return files.reduce((sum, f) => sum + f.additions, 0);
}

export function totalDeletions(files: FileDiff[]): number {
  return files.reduce((sum, f) => sum + f.deletions, 0);
}
