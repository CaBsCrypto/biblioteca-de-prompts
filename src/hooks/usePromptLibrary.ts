import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { DEFAULT_PROMPTS } from "../data";
import type { Prompt } from "../types";
import { mapPromptDoc, sortOwnPrompts } from "../utils/firestoreMappers";

interface UsePromptLibraryOptions {
  user: User | null;
  editingPrompt: Prompt | null;
  setEditingPrompt: (prompt: Prompt | null) => void;
  setShowFormModal: (value: boolean) => void;
  getAuthorIdentity: () => {
    authorName: string;
    authorAvatar: string;
    authorHandle: string;
  };
  onNotification: (message: string, type?: "success" | "info") => void;
}

const normalizeSeedTitle = (title: string) => title.trim().toLocaleLowerCase("es");

export function usePromptLibrary({
  user,
  editingPrompt,
  setEditingPrompt,
  setShowFormModal,
  getAuthorIdentity,
  onNotification
}: UsePromptLibraryOptions) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);

  useEffect(() => {
    if (!user) {
      setPrompts([]);
      return;
    }

    setLoadingPrompts(true);
    const promptsCollectionPath = "prompts";
    const userPromptsQuery = query(
      collection(db, promptsCollectionPath),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      userPromptsQuery,
      (snapshot) => {
        setPrompts(sortOwnPrompts(snapshot.docs.map(mapPromptDoc)));
        setLoadingPrompts(false);
      },
      (error) => {
        setLoadingPrompts(false);
        handleFirestoreError(error, OperationType.LIST, promptsCollectionPath);
      }
    );

    return unsubscribe;
  }, [user]);

  const handleSeedDefaults = async () => {
    if (!user) return;
    setLoadingPrompts(true);

    try {
      const promptsCollectionPath = "prompts";
      const existingTitles = new Set(prompts.map((prompt) => normalizeSeedTitle(prompt.title)));
      const promptsToSeed = DEFAULT_PROMPTS.filter((prompt) => !existingTitles.has(normalizeSeedTitle(prompt.title)));

      if (promptsToSeed.length === 0) {
        onNotification("Tu biblioteca ya tiene todos los prompts recomendados.", "info");
        return;
      }

      await Promise.all(promptsToSeed.map((p) => {
        const newDocRef = doc(collection(db, promptsCollectionPath));
        return setDoc(newDocRef, {
          ...p,
          userId: user.uid,
          likedBy: [],
          likesCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }));

      onNotification(`Se añadieron ${promptsToSeed.length} prompts recomendados a tu biblioteca.`, "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "prompts");
    } finally {
      setLoadingPrompts(false);
    }
  };

  const handleSavePrompt = async (
    promptData: Omit<Prompt, "id" | "userId" | "createdAt" | "updatedAt">
  ) => {
    if (!user) return;
    const promptsCollectionPath = "prompts";
    const definedPromptData = Object.fromEntries(
      Object.entries(promptData).filter(([, value]) => value !== undefined)
    );
    const forkMetadata = Object.fromEntries(
      [
        ["forkedFrom", promptData.forkedFrom],
        ["forkedFromPromptId", promptData.forkedFromPromptId],
        ["forkedFromUserId", promptData.forkedFromUserId],
        ["forkedFromAuthorName", promptData.forkedFromAuthorName],
        ["forkedFromAuthorHandle", promptData.forkedFromAuthorHandle],
        ["forkedFromTitle", promptData.forkedFromTitle]
      ].filter(([, value]) => value !== undefined)
    );

    try {
      if (editingPrompt) {
        const docRef = doc(db, promptsCollectionPath, editingPrompt.id);

        if (editingPrompt.promptText !== promptData.promptText) {
          try {
            const versionsColRef = collection(db, promptsCollectionPath, editingPrompt.id, "versions");
            await addDoc(versionsColRef, {
              promptText: editingPrompt.promptText,
              createdAt: serverTimestamp()
            });

            const q = query(versionsColRef, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            if (snapshot.size > 3) {
              const docsToDelete = snapshot.docs.slice(3);
              for (const d of docsToDelete) {
                await deleteDoc(d.ref);
              }
            }
          } catch (verErr) {
            console.error("Error updating version subcollection in Firestore:", verErr);
          }
        }

        await updateDoc(docRef, {
          title: promptData.title,
          description: promptData.description,
          promptText: promptData.promptText,
          category: promptData.category,
          tags: promptData.tags,
          isFavorite: promptData.isFavorite,
          isShared: promptData.isShared || false,
          notas: promptData.notas || "",
          suggestedVariables: promptData.suggestedVariables || [],
          ...forkMetadata,
          ...getAuthorIdentity(),
          updatedAt: serverTimestamp(),
          folderId: promptData.folderId || null
        });
        onNotification("Prompt actualizado correctamente.");
      } else {
        const docRef = doc(collection(db, promptsCollectionPath));
        await setDoc(docRef, {
          ...definedPromptData,
          userId: user.uid,
          isShared: promptData.isShared || false,
          ...getAuthorIdentity(),
          likedBy: [],
          likesCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          folderId: promptData.folderId || null
        });
        onNotification("Nuevo prompt añadido a la biblioteca.");
      }
    } catch (error) {
      handleFirestoreError(error, editingPrompt ? OperationType.UPDATE : OperationType.CREATE, promptsCollectionPath);
    } finally {
      setShowFormModal(false);
      setEditingPrompt(null);
    }
  };

  const handleFavoriteToggle = async (target: Prompt) => {
    if (!user) return;
    const promptsCollectionPath = "prompts";
    try {
      await updateDoc(doc(db, promptsCollectionPath, target.id), {
        isFavorite: !target.isFavorite,
        updatedAt: serverTimestamp()
      });
      onNotification(
        target.isFavorite ? "Eliminado de favoritos." : "Guardado en tus favoritos.",
        "success"
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, promptsCollectionPath);
    }
  };

  const handleDeletePrompt = async (target: Prompt) => {
    if (!user) return;
    if (!window.confirm(`¿Estás seguro de que quieres eliminar "${target.title}"?`)) return;

    const promptsCollectionPath = "prompts";
    try {
      await deleteDoc(doc(db, promptsCollectionPath, target.id));
      onNotification("Prompt eliminado correctamente.", "info");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, promptsCollectionPath);
    }
  };

  const handleImportFromAI = async (aiData: {
    title: string;
    description: string;
    promptText: string;
    category: Prompt["category"];
    tags: string[];
    suggestedVariables: Prompt["suggestedVariables"];
  }) => {
    if (!user) {
      onNotification("Inicia sesión antes de guardar prompts creados con IA.", "info");
      return;
    }
    const promptsCollectionPath = "prompts";
    try {
      const docRef = doc(collection(db, promptsCollectionPath));
      await setDoc(docRef, {
        ...aiData,
        userId: user.uid,
        isFavorite: false,
        likedBy: [],
        likesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      onNotification("¡Importado con éxito desde el Asistente IA!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, promptsCollectionPath);
    }
  };

  return {
    prompts,
    loadingPrompts,
    setLoadingPrompts,
    handleSeedDefaults,
    handleSavePrompt,
    handleFavoriteToggle,
    handleDeletePrompt,
    handleImportFromAI
  };
}
