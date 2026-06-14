import { useState } from "react";
import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase";
import type { Briefing, BriefingItem, NewsCategory, NewsItem } from "../typesCommunity";

interface UseBriefingsOptions {
  user: User | null;
  getAuthorIdentity: () => {
    authorName: string;
    authorAvatar: string;
    authorHandle: string;
  };
  onNotification: (message: string, type?: "success" | "info") => void;
}

function mapBriefingDoc<T extends { id: string; data: () => unknown }>(docSnap: T): Briefing {
  const data = docSnap.data() as Partial<Briefing>;
  return {
    id: docSnap.id,
    title: data.title || "",
    intro: data.intro || "",
    items: data.items || [],
    tags: data.tags || [],
    language: data.language || "all",
    authorUid: data.authorUid || "",
    authorName: data.authorName || "Creador",
    authorHandle: data.authorHandle || "",
    isPublished: Boolean(data.isPublished),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

function toBriefingItem(item: NewsItem): BriefingItem {
  return {
    title: item.title.slice(0, 180),
    summary: (item.summaryEs || item.summary || "Sin resumen disponible.").slice(0, 1200),
    url: item.url,
    source: item.source,
    language: item.language,
    category: item.category,
    tags: (item.tags || []).slice(0, 10)
  };
}

export function useBriefings({ user, getAuthorIdentity, onNotification }: UseBriefingsOptions) {
  const [loadingSharedBriefing, setLoadingSharedBriefing] = useState(false);

  const createBriefingFromNews = async (items: NewsItem[], category: NewsCategory, isPublished = true) => {
    if (!user) {
      onNotification("Conecta con Google para crear un briefing publico.", "info");
      return null;
    }

    const selectedItems = items.slice(0, 5);
    if (selectedItems.length === 0) {
      onNotification("Selecciona noticias para crear el briefing.", "info");
      return null;
    }

    const author = getAuthorIdentity();
    const uniqueTags = Array.from(new Set(["radar", "briefing", category, ...selectedItems.flatMap((item) => item.tags || [])])).slice(0, 12);
    const languageSet = new Set(selectedItems.map((item) => item.language).filter((language) => language !== "unknown"));
    const language = languageSet.size === 1 ? Array.from(languageSet)[0] : "all";

    try {
      const docRef = await addDoc(collection(db, "briefings"), {
        title: `Briefing ${category.toUpperCase()}: ${selectedItems[0].title}`.slice(0, 180),
        intro: "Una seleccion curada del radar para convertir tendencias en prompts, posts y oportunidades de proyecto.",
        items: selectedItems.map(toBriefingItem),
        tags: uniqueTags,
        language,
        authorUid: user.uid,
        authorName: author.authorName,
        authorHandle: author.authorHandle,
        isPublished,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      onNotification(isPublished ? "Briefing publico creado." : "Borrador de briefing creado.", "success");
      return docRef.id;
    } catch (error) {
      console.error("Error creating briefing:", error);
      onNotification("No se pudo crear el briefing.", "info");
      return null;
    }
  };

  const loadBriefing = async (briefingId: string) => {
    setLoadingSharedBriefing(true);
    try {
      const briefingSnap = await getDoc(doc(db, "briefings", briefingId));
      if (!briefingSnap.exists()) return null;
      return mapBriefingDoc(briefingSnap);
    } catch (error) {
      console.error("Error loading briefing:", error);
      onNotification("No se pudo cargar el briefing.", "info");
      return null;
    } finally {
      setLoadingSharedBriefing(false);
    }
  };

  const unpublishBriefing = async (briefing: Briefing) => {
    if (!user || briefing.authorUid !== user.uid) {
      onNotification("Solo puedes editar tus briefings.", "info");
      return;
    }

    try {
      await updateDoc(doc(db, "briefings", briefing.id), {
        isPublished: false,
        updatedAt: serverTimestamp()
      });
      onNotification("Briefing pasado a borrador.", "info");
    } catch (error) {
      console.error("Error unpublishing briefing:", error);
      onNotification("No se pudo actualizar el briefing.", "info");
    }
  };

  return {
    createBriefingFromNews,
    loadBriefing,
    loadingSharedBriefing,
    unpublishBriefing
  };
}
