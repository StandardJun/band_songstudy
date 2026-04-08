/**
 * Format seconds to mm:ss display string
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Parse mm:ss string to seconds
 */
export function parseTime(timeStr: string): number | null {
  const match = timeStr.match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

/**
 * Format a timestamp comment display
 * Point: "2:45" / Range: "3:30 - 3:45"
 */
export function formatCommentTime(
  timeStart: number,
  timeEnd: number | null
): string {
  if (timeEnd != null) {
    return `${formatTime(timeStart)} - ${formatTime(timeEnd)}`;
  }
  return formatTime(timeStart);
}
