import { AREA_LABELS } from "@/classify/area.js";
import {
  bold,
  cyan,
  dim,
  formatNum,
  gray,
  green,
  italic,
  pluralize,
  red,
  yellow,
} from "@/render/ansi.js";
import type { IntentCluster, Summary } from "@/types.js";

const CHANGE_ICONS: Record<string, string> = {
  feature: green("✓"),
  fix: green("✓"),
  perf: green("⚡"),
  refactor: cyan("↻"),
  remove: yellow("−"),
  rename: yellow("→"),
  deps: gray("⇪"),
  config: gray("⚙"),
  docs: gray("✎"),
  tests: gray("⚗"),
  style: gray("❋"),
  ci: gray("⇄"),
  chore: gray("·"),
  unknown: gray("?"),
};

function formatCount(cluster: IntentCluster): string {
  const parts: string[] = [];
  if (cluster.commits.length > 0) {
    parts.push(
      `${cluster.commits.length} ${pluralize(cluster.commits.length, "commit")}`,
    );
  }
  if (cluster.files.length > 0) {
    parts.push(
      `${cluster.files.length} ${pluralize(cluster.files.length, "file")}`,
    );
  }
  return parts.join(", ");
}

function formatDelta(cluster: IntentCluster): string {
  const a = cluster.additions;
  const d = cluster.deletions;
  if (a === 0 && d === 0) return "";
  return `${green(`+${formatNum(a)}`)} ${red(`−${formatNum(d)}`)}`;
}

function renderCluster(cluster: IntentCluster, verbose: boolean): string[] {
  const lines: string[] = [];
  const icon = CHANGE_ICONS[cluster.change] ?? "?";
  const areaLabel =
    cluster.area === "mixed" || cluster.area === "other"
      ? cluster.title
      : AREA_LABELS[cluster.area];

  const header = `${icon} ${bold(areaLabel ?? cluster.title)}`;
  const meta = [formatCount(cluster), formatDelta(cluster)]
    .filter((s) => s !== "")
    .join("  ");
  lines.push(`${header}${meta ? ` ${dim(`(${meta})`)}` : ""}`);

  if (
    cluster.area !== "mixed" &&
    cluster.area !== "other" &&
    cluster.title !== areaLabel
  ) {
    lines.push(`  ${cluster.title}`);
  }

  const shownCommits = verbose ? cluster.commits : cluster.commits.slice(0, 3);
  for (const c of shownCommits) {
    lines.push(`  ${dim("•")} ${c.subject} ${gray(c.shortHash)}`);
  }
  if (!verbose && cluster.commits.length > 3) {
    lines.push(
      dim(`  … and ${cluster.commits.length - 3} more commits (use --verbose)`),
    );
  }

  const shownFiles = verbose ? cluster.files : cluster.files.slice(0, 4);
  if (shownFiles.length > 0 && (verbose || cluster.commits.length === 0)) {
    for (const f of shownFiles) {
      const delta = `${green(`+${f.file.additions}`)}${gray("/")}${red(`−${f.file.deletions}`)}`;
      lines.push(`  ${gray(f.file.path)}  ${dim(delta)}`);
    }
    if (!verbose && cluster.files.length > 4) {
      lines.push(dim(`  … and ${cluster.files.length - 4} more files`));
    }
  }

  for (const signal of cluster.signals) {
    lines.push(`  ${yellow("⚠")} ${dim(signal)}`);
  }

  return lines;
}

export interface RenderOptions {
  verbose?: boolean;
}

export function renderTerminal(
  summary: Summary,
  opts: RenderOptions = {},
): string {
  const lines: string[] = [];
  const { verbose = false } = opts;

  const stats: string[] = [];
  if (summary.commitCount > 0) {
    stats.push(
      `${summary.commitCount} ${pluralize(summary.commitCount, "commit")}`,
    );
  }
  stats.push(`${summary.totalAdditions}+ / ${summary.totalDeletions}−`);
  if (summary.authorCount > 0) {
    stats.push(
      `${summary.authorCount} ${pluralize(summary.authorCount, "author")}`,
    );
  }

  const rangeLabel =
    summary.mode === "pr"
      ? `${summary.baseRef ?? "base"}…${summary.headRef ?? "HEAD"}`
      : summary.range;

  lines.push(
    bold("What happened") +
      dim(` — ${stats.join(" · ")}`) +
      (rangeLabel ? `\n${dim(rangeLabel)}` : ""),
  );
  lines.push("");

  if (summary.clusters.length === 0) {
    lines.push(dim("No changes found in this range."));
    return lines.join("\n");
  }

  for (const cluster of summary.clusters) {
    lines.push(...renderCluster(cluster, verbose));
    lines.push("");
  }

  if (summary.warnings.length > 0) {
    lines.push(bold("Watch out:"));
    for (const w of summary.warnings) {
      lines.push(`  ${yellow("⚠")} ${w}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
