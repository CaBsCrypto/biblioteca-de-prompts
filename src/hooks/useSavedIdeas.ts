import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import { db } from "../firebase";
import type { NewsItem, SavedIdea } from "../typesCommunity";
import { safeIdeaId } from "../utils/news";

interface UseSavedIdeasOptions {
  user: User | null;
  onNotification: (message: string, type?: "success" | "info") => void;
}

function mapSavedIdeaDoc<T extends { id: string; data: () => unknown }>(docSnap: T): SavedIdea {
  const data = docSnap.data() as Partial<SavedIdea>;
  return {
    id: docSnap.id,
    title: data.title || "",
    summary: data.summary || "",
    url: data.url || "",
    source: data.source || "",
    language: data.language || "unknown",
    category: data.category || "ai",
    tags: data.tags || [],
    imageUrl: data.imageUrl || "",
    savedAt: data.savedAt,
    createdFrom: data.createdFrom || "news"
  };
}

export function useSavedIdeas({ user, onNotification }: UseSavedIdeasOptions) {
  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
  const [loadingSavedIdeas, setLoadingSavedIdeas] = useState(false);

  useEffect(() => {
    if (!user) {
      setSavedIdeas([]);
      setLoadingSavedIdeas(false);
      return;
    }

    setLoadingSavedIdeas(true);
    const ideasQuery = query(collection(db, "users", user.uid, "savedIdeas"), orderBy("savedAt", "desc"));
    const unsubscribe = onSnapshot(
      ideasQuery,
      (snapshot) => {
        setSavedIdeas(snapshot.docs.map(mapSavedIdeaDoc));
        setLoadingSavedIdeas(false);
      },
      (error) => {
        console.error("Error subscribing to saved ideas:", error);
        setLoadingSavedIdeas(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const savedIdeaIds = useMemo(() => new Set(savedIdeas.map((idea) => idea.id)), [savedIdeas]);

  const saveIdeaFromNews = async (item: NewsItem) => {
    if (!user) {
      onNotification("Conecta con Google para guardar esta idea.", "info");
      return false;
    }

    const ideaId = safeIdeaId(item);
    if (savedIdeaIds.has(ideaId)) {
      onNotification("Ya tenias esta idea guardada.", "info");
      return true;
    }

    try {
      await setDoc(doc(db, "users", user.uid, "savedIdeas", ideaId), {
        title: item.title.slice(0, 180),
        summary: (item.summaryEs || item.summary || "Idea guardada desde el radar.").slice(0, 1200),
        url: item.url,
        source: item.source,
        language: item.language,
        category: item.category,
        tags: (item.tags || []).slice(0, 12),
        imageUrl: item.imageUrl || "",
        savedAt: serverTimestamp(),
        createdFrom: item.category === "hackathons" ? "hackathon" : "news"
      });
      onNotification("Idea guardada en tu radar personal.", "success");
      return true;
    } catch (error) {
      console.error("Error saving idea:", error);
      onNotification("No se pudo guardar la idea.", "info");
      return false;
    }
  };

  const deleteSavedIdea = async (idea: SavedIdea) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "savedIdeas", idea.id));
      onNotification("Idea eliminada.", "info");
    } catch (error) {
      console.error("Error deleting saved idea:", error);
      onNotification("No se pudo eliminar la idea.", "info");
    }
  };

  return {
    savedIdeas,
    savedIdeaIds,
    loadingSavedIdeas,
    saveIdeaFromNews,
    deleteSavedIdea
  };
}
