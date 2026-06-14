import { useEffect, useState } from "react";
import type { NewsCategory, NewsItem } from "../typesCommunity";

export type NewsLanguageFilter = "all" | "en" | "es";

interface NewsResponse {
  category: NewsCategory;
  language: NewsLanguageFilter;
  hasPremiumSource: boolean;
  items: NewsItem[];
}

export function useNews(category: NewsCategory, language: NewsLanguageFilter) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasPremiumSource, setHasPremiumSource] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const loadNews = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ category, language });
        const response = await fetch(`/api/news?${params.toString()}`, {
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error("No se pudieron cargar las noticias.");
        }
        const payload = await response.json() as NewsResponse;
        setItems(payload.items || []);
        setHasPremiumSource(Boolean(payload.hasPremiumSource));
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        console.error("Error loading news:", err);
        setItems([]);
        setError("No se pudieron cargar las noticias ahora mismo.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadNews();
    return () => controller.abort();
  }, [category, language]);

  return {
    items,
    loading,
    error,
    hasPremiumSource
  };
}
