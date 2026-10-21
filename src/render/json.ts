import type { Summary } from "@/types.js";

export function renderJson(summary: Summary): string {
  return JSON.stringify(summary, null, 2);
}
