import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { Prompt, SocialFavorite } from "../types";

interface UseSocialFavoritesOptions {
  user: User | null;
  onNotification: (message: string, type?: "success" | "info") => void;
}

export function useSocialFavorites({ user, onNotification }: UseSocialFavoritesOptions) {
  const [socialFavorites, setSocialFavorites] = useState<SocialFavorite[]>([]);
  const [loadingSocialFavorites, setLoadingSocialFavorites] = useState(false);

  useEffect(() => {
    if (!user) {
      setSocialFavorites([]);
      setLoadingSocialFavorites(false);
      return;
    }

    setLoadingSocialFavorites(true);
    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "favorites"),
      (snapshot) => {
        setSocialFavorites(snapshot.docs.map((favoriteDoc) => ({
          id: favoriteDoc.id,
          ...favoriteDoc.data()
        } as SocialFavorite)));
        setLoadingSocialFavorites(false);
      },
      (error) => {
        console.error("Error subscribing to social favorites:", error);
        setLoadingSocialFavorites(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const socialFavoritePromptIds = useMemo(
    () => new Set(socialFavorites.map((favorite) => favorite.promptId)),
    [socialFavorites]
  );

  const handleToggleSocialFavorite = async (prompt: Prompt) => {
    if (!user) {
      onNotification("Inicia sesion para guardar favoritos sociales.", "info");
      return;
    }

    if (prompt.userId === "founder-pack" || prompt.id.startsWith("founder-pack-")) {
      onNotification("Para guardar prompts del Pack Fundador, usa Guardar y crea tu remix privado.", "info");
      return;
    }

    if (!prompt.isShared) {
      onNotification("Solo puedes marcar como favorito un prompt publico.", "info");
      return;
    }

    const favoriteRef = doc(db, "users", user.uid, "favorites", prompt.id);
    const isFavorite = socialFavoritePromptIds.has(prompt.id);

    try {
      if (isFavorite) {
        await deleteDoc(favoriteRef);
        onNotification("Quitado de tus favoritos sociales.", "info");
        return;
      }

      await setDoc(favoriteRef, {
        promptId: prompt.id,
        promptTitle: prompt.title,
        promptCategory: prompt.category,
        promptAuthorUid: prompt.userId,
        promptAuthorName: prompt.authorName || "Creador",
        promptAuthorHandle: prompt.authorHandle || "",
        createdAt: serverTimestamp()
      });
      onNotification("Guardado como favorito social.", "success");
    } catch (error) {
      console.error("Error toggling social favorite:", error);
      onNotification("No se pudo actualizar el favorito social.", "info");
    }
  };

  return {
    socialFavorites,
    socialFavoritePromptIds,
    loadingSocialFavorites,
    handleToggleSocialFavorite
  };
}
