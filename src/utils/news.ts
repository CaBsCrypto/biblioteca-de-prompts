import type { NewsItem } from "../typesCommunity";

export function safeIdeaId(item: NewsItem) {
  const rawId = item.id || item.url || item.title;
  const normalized = rawId.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized.slice(0, 96) || `idea-${Date.now()}`;
}
