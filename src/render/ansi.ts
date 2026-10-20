const enabled = (): boolean =>
  process.env.NO_COLOR === undefined &&
  process.env.FORCE_COLOR !== "0" &&
  process.stdout.isTTY;

function wrap(open: number, close: number) {
  return (text: string): string =>
    enabled() ? `\u001b[${open}m${text}\u001b[${close}m` : text;
}

export const bold = wrap(1, 22);
export const dim = wrap(2, 22);
export const italic = wrap(3, 23);
export const red = wrap(31, 39);
export const green = wrap(32, 39);
export const yellow = wrap(33, 39);
export const cyan = wrap(36, 39);
export const gray = wrap(90, 39);

export function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const diffMs = Date.now() - t;
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

export function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function pluralize(
  n: number,
  singular: string,
  plural?: string,
): string {
  return n === 1 ? singular : (plural ?? `${singular}s`);
}
