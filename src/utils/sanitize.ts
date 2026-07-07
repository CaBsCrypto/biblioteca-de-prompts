const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#47;",
};

const HTML_ATTRIBUTE_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string): string {
  return String(input).replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

export function escapeHtmlAttribute(input: string): string {
  return String(input).replace(/[&<>"']/g, (char) => HTML_ATTRIBUTE_ESCAPE_MAP[char] || char);
}

export function stripHtml(input: string): string {
  return String(input).replace(/<[^>]*>/g, "");
}

const SAFE_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

export function isSafeUrl(url: string): boolean {
  if (typeof url !== "string" || url.length === 0) return false;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  if (url.startsWith("#")) return true;
  try {
    const parsed = new URL(url, window.location.origin);
    return SAFE_URL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export function sanitizeUrl(url: string): string {
  return isSafeUrl(url) ? url : "";
}

export function truncateForDisplay(input: string, max: number): string {
  const value = String(input);
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}