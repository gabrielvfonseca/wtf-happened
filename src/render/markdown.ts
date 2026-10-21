import { AREA_LABELS } from "@/classify/area.js";
import { pluralize } from "@/render/ansi.js";
import type { Summary } from "@/types.js";

export function renderMarkdown(summary: Summary): string {
  const lines: string[] = [];

  const title =
    summary.mode === "pr"
      ? `What changed: ${summary.baseRef ?? "base"}…${summary.headRef ?? "HEAD"}`
      : `What happened (${summary.range})`;

  lines.push(`## ${title}`);
  lines.push("");
  lines.push(
    [
      `${summary.commitCount} ${pluralize(summary.commitCount, "commit")}`,
      `${summary.totalAdditions}+ / ${summary.totalDeletions}−`,
      `${summary.authorCount} ${pluralize(summary.authorCount, "author")}`,
    ].join(" · "),
  );
  lines.push("");

  if (summary.clusters.length === 0) {
    lines.push("_No changes found in this range._");
    return lines.join("\n");
  }

  for (const cluster of summary.clusters) {
    const areaLabel =
      cluster.area === "mixed" || cluster.area === "other"
        ? cluster.title
        : AREA_LABELS[cluster.area];
    const meta: string[] = [];
    if (cluster.commits.length > 0) {
      meta.push(
        `${cluster.commits.length} ${pluralize(cluster.commits.length, "commit")}`,
      );
    }
    if (cluster.files.length > 0) {
      meta.push(
        `${cluster.files.length} ${pluralize(cluster.files.length, "file")}`,
      );
    }
    if (cluster.additions > 0 || cluster.deletions > 0) {
      meta.push(`+${cluster.additions} −${cluster.deletions}`);
    }

    lines.push(`### ${areaLabel ?? cluster.title}`);
    if (meta.length > 0) lines.push(`_${meta.join(" · ")}_`);
    lines.push("");

    if (cluster.title !== areaLabel) {
      lines.push(`- ${cluster.title}`);
    }
    for (const c of cluster.commits) {
      lines.push(`- ${c.subject} (\`${c.shortHash}\`)`);
    }
    if (cluster.commits.length === 0) {
      for (const f of cluster.files.slice(0, 10)) {
        lines.push(
          `- \`${f.file.path}\` (+${f.file.additions}/−${f.file.deletions})`,
        );
      }
      if (cluster.files.length > 10) {
        lines.push(`- …and ${cluster.files.length - 10} more files`);
      }
    }
    lines.push("");
  }

  if (summary.warnings.length > 0) {
    lines.push("### Watch out");
    lines.push("");
    for (const w of summary.warnings) {
      lines.push(`- ⚠ ${w}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
