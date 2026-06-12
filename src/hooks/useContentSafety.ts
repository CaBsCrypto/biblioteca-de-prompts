import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { Prompt } from "../types";

interface UseContentSafetyOptions {
  user: User | null;
  onNotification: (message: string, type?: "success" | "info") => void;
}

function isFounderPackPrompt(prompt: Prompt) {
  return prompt.userId === "founder-pack" || prompt.id.startsWith("founder-pack-");
}

export function useContentSafety({ user, onNotification }: UseContentSafetyOptions) {
  const [hiddenPromptIds, setHiddenPromptIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setHiddenPromptIds(new Set());
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "hiddenPrompts"),
      (snapshot) => {
        setHiddenPromptIds(new Set(snapshot.docs.map((docSnap) => docSnap.id)));
      },
      (error) => {
        console.error("Error subscribing to hidden prompts:", error);
      }
    );

    return unsubscribe;
  }, [user]);

  const handleHidePrompt = async (prompt: Prompt) => {
    if (!user) {
      onNotification("Inicia sesion para ocultar prompts de tu feed.", "info");
      return;
    }

    if (hiddenPromptIds.has(prompt.id)) {
      onNotification("Este prompt ya estaba oculto de tu feed.", "info");
      return;
    }

    try {
      await setDoc(doc(db, "users", user.uid, "hiddenPrompts", prompt.id), {
        promptId: prompt.id,
        promptTitle: prompt.title,
        promptCategory: prompt.category,
        promptAuthorUid: prompt.userId,
        promptAuthorName: prompt.authorName || "Creador",
        createdAt: serverTimestamp()
      });
      onNotification("Prompt ocultado de tu feed.", "success");
    } catch (error) {
      console.error("Error hiding prompt:", error);
      onNotification("No se pudo ocultar este prompt.", "info");
    }
  };

  const handleUnhidePrompt = async (promptId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "hiddenPrompts", promptId));
      onNotification("Prompt restaurado en tu feed.", "success");
    } catch (error) {
      console.error("Error unhiding prompt:", error);
      onNotification("No se pudo restaurar este prompt.", "info");
    }
  };

  const handleReportPrompt = async (prompt: Prompt) => {
    if (!user) {
      onNotification("Inicia sesion para reportar contenido.", "info");
      return;
    }

    if (isFounderPackPrompt(prompt)) {
      await handleHidePrompt(prompt);
      onNotification("Ocultamos este prompt del Pack Fundador en tu feed.", "info");
      return;
    }

    if (prompt.userId === user.uid) {
      onNotification("Este prompt es tuyo. Puedes editarlo o dejar de compartirlo desde Mi Biblioteca.", "info");
      return;
    }

    try {
      await setDoc(doc(db, "prompts", prompt.id, "reports", user.uid), {
        reporterUid: user.uid,
        reason: "community_report",
        promptTitle: prompt.title,
        promptAuthorUid: prompt.userId,
        createdAt: serverTimestamp()
      });
      await handleHidePrompt(prompt);
      onNotification("Gracias. Reportamos el prompt y lo ocultamos de tu feed.", "success");
    } catch (error) {
      console.error("Error reporting prompt:", error);
      onNotification("No se pudo reportar este prompt.", "info");
    }
  };

  return {
    hiddenPromptIds,
    handleHidePrompt,
    handleUnhidePrompt,
    handleReportPrompt
  };
}
