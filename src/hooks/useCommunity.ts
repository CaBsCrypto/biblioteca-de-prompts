import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDocs, increment, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import type { Folder, Prompt } from "../types";
import { mapFolderDoc, mapPromptDoc, sortCommunityPrompts } from "../utils/firestoreMappers";
import type { CommunityScope } from "../utils/promptFilters";

export type CommunityAuthor = { name: string; uid: string; avatar?: string; handle?: string };

interface UseCommunityOptions {
  user: User | null;
  prompts: Prompt[];
  setCurrentTab: (tab: "mi-biblioteca" | "comunidad") => void;
  setLoadingPrompts: (loading: boolean) => void;
  onOpenEdit: (prompt: Prompt) => void;
  getAuthorIdentity: () => {
    authorName: string;
    authorAvatar: string;
    authorHandle: string;
  };
  onNotification: (message: string, type?: "success" | "info") => void;
}

export function useCommunity({
  user,
  prompts,
  setCurrentTab,
  setLoadingPrompts,
  onOpenEdit,
  getAuthorIdentity,
  onNotification
}: UseCommunityOptions) {
  const [communityPrompts, setCommunityPrompts] = useState<Prompt[]>([]);
  const [communityFolders, setCommunityFolders] = useState<Folder[]>([]);
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

  useEffect(() => {
    const foldersQuery = query(collection(db, "folders"), where("isShared", "==", true));
    const unsubscribe = onSnapshot(
      foldersQuery,
      (snapshot) => {
        setCommunityFolders(snapshot.docs.map(mapFolderDoc));
      },
      (error) => {
        console.error("Error subscribing to community folders:", error);
      }
    );

    return unsubscribe;
  }, []);

  const handleLikeToggle = async (prompt: Prompt) => {
    if (!user) {
      onNotification("Debes iniciar sesion para reaccionar o dar Me Gusta.", "info");
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
      onNotification(isLiked ? "Ya no te gusta este prompt." : "Te gusta este prompt.", "success");
    } catch (err) {
      console.error("Error toggling like:", err);
      onNotification("No se pudo registrar la reaccion.", "info");
    }
  };

  const handleForkPrompt = async (prompt: Prompt) => {
    if (!user) {
      onNotification("Debes iniciar sesion para clonar prompts de la comunidad.", "info");
      return;
    }

    setLoadingPrompts(true);
    try {
      const sourcePromptId = prompt.forkedFromPromptId || prompt.id;
      let existingFork = prompts.find((candidate) =>
        candidate.forkedFromPromptId === sourcePromptId ||
        (!candidate.forkedFromPromptId && candidate.forkedFrom === prompt.title)
      );

      if (!existingFork) {
        const ownPromptsSnapshot = await getDocs(query(collection(db, "prompts"), where("userId", "==", user.uid)));
        existingFork = ownPromptsSnapshot.docs
          .map(mapPromptDoc)
          .find((candidate) =>
            candidate.forkedFromPromptId === sourcePromptId ||
            (!candidate.forkedFromPromptId && candidate.forkedFrom === prompt.title)
          );
      }

      if (existingFork) {
        setCurrentTab("mi-biblioteca");
        onOpenEdit(existingFork);
        onNotification("Ya tenias este prompt en tu biblioteca. Abrimos tu copia: editala, usala o publicala cuando este lista.", "info");
        return;
      }

      const forkData = {
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
        forkedFromPromptId: sourcePromptId,
        forkedFromUserId: prompt.forkedFromUserId || prompt.userId,
        forkedFromAuthorName: prompt.forkedFromAuthorName || prompt.authorName || "Creador",
        forkedFromAuthorHandle: prompt.forkedFromAuthorHandle || prompt.authorHandle || "",
        forkedFromTitle: prompt.forkedFromTitle || prompt.title,
        suggestedVariables: prompt.suggestedVariables || [],
        ...getAuthorIdentity(),
        likedBy: [],
        likesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "prompts"), forkData);
      const editableFork = {
        id: docRef.id,
        ...forkData,
        createdAt: null,
        updatedAt: null
      } as Prompt;

      setCurrentTab("mi-biblioteca");
      onOpenEdit(editableFork);
      onNotification(`Remix guardado. Editalo ahora, usalo en tu flujo o publicalo cuando este listo.`, "success");
    } catch (err) {
      console.error("Error forking prompt:", err);
      onNotification("No se pudo clonar el prompt de la comunidad.", "info");
    } finally {
      setLoadingPrompts(false);
    }
  };

  const handleToggleFollowCreator = async (creatorUid: string) => {
    if (!user) {
      onNotification("Inicia sesion para seguir creadores.", "info");
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
    communityFolders,
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
