import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, increment, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import type { Prompt } from "../types";
import { mapPromptDoc, sortCommunityPrompts } from "../utils/firestoreMappers";
import type { CommunityScope } from "../utils/promptFilters";

export type CommunityAuthor = { name: string; uid: string; avatar?: string };

interface UseCommunityOptions {
  user: User | null;
  setCurrentTab: (tab: "mi-biblioteca" | "comunidad") => void;
  setLoadingPrompts: (loading: boolean) => void;
  getAuthorIdentity: () => {
    authorName: string;
    authorAvatar: string;
    authorHandle: string;
  };
  onNotification: (message: string, type?: "success" | "info") => void;
}

export function useCommunity({
  user,
  setCurrentTab,
  setLoadingPrompts,
  getAuthorIdentity,
  onNotification
}: UseCommunityOptions) {
  const [communityPrompts, setCommunityPrompts] = useState<Prompt[]>([]);
  const [loadingCommunityPrompts, setLoadingCommunityPrompts] = useState(false);
  const [communityScope, setCommunityScope] = useState<CommunityScope>("todos");
  const [selectedAuthor, setSelectedAuthor] = useState<CommunityAuthor | null>(null);
  const [followedCreatorUids, setFollowedCreatorUids] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setFollowedCreatorUids([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "following"),
      (snapshot) => {
        setFollowedCreatorUids(snapshot.docs.map((followDoc) => followDoc.id));
      },
      (error) => {
        console.error("Error subscribing to followed creators:", error);
      }
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    setLoadingCommunityPrompts(true);
    const communityQuery = query(collection(db, "prompts"), where("isShared", "==", true));

    const unsubscribe = onSnapshot(
      communityQuery,
      (snapshot) => {
        setCommunityPrompts(sortCommunityPrompts(snapshot.docs.map(mapPromptDoc)));
        setLoadingCommunityPrompts(false);
      },
      (error) => {
        console.error("Error subscribing to community prompts:", error);
        setLoadingCommunityPrompts(false);
      }
    );

    return unsubscribe;
  }, []);

  const handleLikeToggle = async (prompt: Prompt) => {
    if (!user) {
      onNotification("Debes iniciar sesión para reaccionar o dar 'Me Gusta'.", "info");
      return;
    }

    const docRef = doc(db, "prompts", prompt.id);
    const isLiked = (prompt.likedBy || []).includes(user.uid);

    try {
      await updateDoc(docRef, {
        likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likesCount: increment(isLiked ? -1 : 1),
        updatedAt: serverTimestamp()
      });
      onNotification(isLiked ? "Ya no te gusta este prompt." : "¡Te gusta este prompt!", "success");
    } catch (err) {
      console.error("Error toggling like:", err);
      onNotification("No se pudo registrar la reacción.", "info");
    }
  };

  const handleForkPrompt = async (prompt: Prompt) => {
    if (!user) {
      onNotification("Debes iniciar sesión para clonar prompts de la comunidad.", "info");
      return;
    }

    setLoadingPrompts(true);
    try {
      await addDoc(collection(db, "prompts"), {
        userId: user.uid,
        title: `${prompt.title} (Clon)`,
        description: prompt.description || "",
        promptText: prompt.promptText,
        category: prompt.category,
        tags: prompt.tags || [],
        isFavorite: false,
        isShared: false,
        notas: prompt.notas || "",
        forkedFrom: prompt.title,
        suggestedVariables: prompt.suggestedVariables || [],
        ...getAuthorIdentity(),
        likedBy: [],
        likesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      onNotification(`¡Prompt "${prompt.title}" clonado a tu biblioteca!`, "success");
      setCurrentTab("mi-biblioteca");
    } catch (err) {
      console.error("Error forking prompt:", err);
      onNotification("No se pudo clonar el prompt de la comunidad.", "info");
    } finally {
      setLoadingPrompts(false);
    }
  };

  const handleToggleFollowCreator = async (creatorUid: string) => {
    if (!user) {
      onNotification("Inicia sesión para seguir creadores.", "info");
      return;
    }
    if (creatorUid === user.uid) {
      onNotification("Este es tu propio perfil.", "info");
      return;
    }

    const isFollowing = followedCreatorUids.includes(creatorUid);
    const followRef = doc(db, "users", user.uid, "following", creatorUid);

    try {
      if (isFollowing) {
        await deleteDoc(followRef);
      } else {
        const targetProfile = selectedAuthor?.uid === creatorUid ? selectedAuthor : null;
        await setDoc(followRef, {
          targetUid: creatorUid,
          targetName: targetProfile?.name || "Creador",
          targetAvatar: targetProfile?.avatar || "",
          createdAt: serverTimestamp()
        });
      }
      onNotification(
        isFollowing ? "Has dejado de seguir a este creador." : "Ahora sigues a este creador.",
        "success"
      );
    } catch (error) {
      console.error("Error toggling creator follow:", error);
      onNotification("No se pudo actualizar el seguimiento.", "info");
    }
  };

  const handleSelectAuthor = (author: CommunityAuthor) => {
    setCommunityScope("todos");
    setSelectedAuthor(author);
  };

  return {
    communityPrompts,
    loadingCommunityPrompts,
    communityScope,
    setCommunityScope,
    selectedAuthor,
    setSelectedAuthor,
    followedCreatorUids,
    handleLikeToggle,
    handleForkPrompt,
    handleToggleFollowCreator,
    handleSelectAuthor
  };
}
