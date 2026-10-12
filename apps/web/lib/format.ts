/* =========================================================
   SHARED FORMATTING HELPERS
========================================================= */

/**
 * Human-friendly relative time ("2 mins ago", "3 hours ago").
 * Falls back to a date string for anything older than a week.
 */
export function timeAgo(iso: string): string {
  const then = new Date(iso);

  if (Number.isNaN(then.getTime())) {
    return "unknown";
  }

  const diffMs = Date.now() - then.getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSeconds < 60) {
    return "just now";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays <= 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  return then.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      then.getFullYear() === new Date().getFullYear()
        ? undefined
        : "numeric",
  });
}

/** Human-friendly file size ("1.4 MB"). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / 1024 ** exponent;

  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}
