/**
 * Formats a UTC ISO 8601 timestamp as a human-readable relative time string.
 *
 * @param timestamp - An ISO 8601 UTC timestamp string (e.g., "2025-01-15T10:30:00Z")
 * @returns A formatted string like "Generated just now", "Generated 5 minutes ago", etc.
 *          Returns null if the input is null or undefined.
 */
export function formatRelativeTime(timestamp: string | null | undefined): string | null {
  if (timestamp == null) {
    return null;
  }

  const generatedDate = new Date(timestamp);

  // Handle invalid date parsing
  if (isNaN(generatedDate.getTime())) {
    return null;
  }

  const now = new Date();
  const diffMs = now.getTime() - generatedDate.getTime();

  // Future timestamps
  if (diffMs < 0) {
    return "Generated just now";
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return "Generated just now";
  }

  if (diffMinutes < 60) {
    return diffMinutes === 1
      ? "Generated 1 minute ago"
      : `Generated ${diffMinutes} minutes ago`;
  }

  if (diffHours < 24) {
    return diffHours === 1
      ? "Generated 1 hour ago"
      : `Generated ${diffHours} hours ago`;
  }

  if (diffDays < 7) {
    return diffDays === 1
      ? "Generated 1 day ago"
      : `Generated ${diffDays} days ago`;
  }

  if (diffWeeks < 4) {
    return diffWeeks === 1
      ? "Generated 1 week ago"
      : `Generated ${diffWeeks} weeks ago`;
  }

  if (diffMonths < 12) {
    return diffMonths === 1
      ? "Generated 1 month ago"
      : `Generated ${diffMonths} months ago`;
  }

  return diffYears === 1
    ? "Generated 1 year ago"
    : `Generated ${diffYears} years ago`;
}
