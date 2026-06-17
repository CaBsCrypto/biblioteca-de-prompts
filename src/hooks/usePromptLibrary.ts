import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { DEFAULT_PROMPTS } from "../data";
import type { Prompt } from "../types";
import { mapPromptDoc, sortOwnPrompts } from "../utils/firestoreMappers";

type SeedPrompt = Omit<Prompt, "id" | "userId" | "createdAt" | "updatedAt">;

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

  const handleSeedDefaults = async (selectedPrompts: SeedPrompt[] = DEFAULT_PROMPTS) => {
    if (!user) return;
    setLoadingPrompts(true);

    try {
      const promptsCollectionPath = "prompts";
      const existingTitles = new Set(prompts.map((prompt) => normalizeSeedTitle(prompt.title)));
      const promptsToSeed = selectedPrompts.filter((prompt) => !existingTitles.has(normalizeSeedTitle(prompt.title)));

      if (promptsToSeed.length === 0) {
        onNotification("Tu biblioteca ya tiene los prompts de este pack.", "info");
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

      onNotification(`Se añadieron ${promptsToSeed.length} prompts de este pack a tu biblioteca.`, "success");
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
        ["forkedFromTitle", promptData.forkedFromTitle],
        ["sourceClassId", promptData.sourceClassId],
        ["sourceClassTitle", promptData.sourceClassTitle]
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

  const handleExportJSON = () => {
    if (prompts.length === 0) {
      onNotification("No hay prompts para exportar.", "info");
      return;
    }

    const dataToExport = prompts.map((p) => ({
      title: p.title || "",
      description: p.description || "",
      promptText: p.promptText || "",
      category: p.category || "General",
      tags: p.tags || [],
      isFavorite: p.isFavorite || false,
      isShared: p.isShared || false,
      notas: p.notas || "",
      suggestedVariables: p.suggestedVariables || [],
      folderId: p.folderId || null
    }));

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `biblioteca_prompts_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotification("Biblioteca exportada con éxito.");
  };

  const handleImportJSON = async (fileContent: string): Promise<{ successCount: number; error?: string }> => {
    if (!user) {
      onNotification("Inicia sesión antes de importar prompts.", "info");
      return { successCount: 0, error: "No autenticado" };
    }

    try {
      const parsed = JSON.parse(fileContent);
      if (!Array.isArray(parsed)) {
        throw new Error("El archivo JSON debe contener una lista de prompts (array).");
      }

      setLoadingPrompts(true);
      const promptsCollectionPath = "prompts";

      const validPrompts = parsed.filter((item: any) => {
        return (
          item &&
          typeof item === "object" &&
          typeof item.title === "string" &&
          item.title.trim().length > 0 &&
          typeof item.promptText === "string" &&
          item.promptText.trim().length > 0
        );
      });

      if (validPrompts.length === 0) {
        throw new Error("No se encontraron prompts válidos en el archivo JSON (se requiere título y texto del prompt).");
      }

      await Promise.all(
        validPrompts.map((p: any) => {
          const docRef = doc(collection(db, promptsCollectionPath));
          const docData = {
            title: p.title.slice(0, 150),
            description: typeof p.description === "string" ? p.description.slice(0, 1000) : "",
            promptText: p.promptText.slice(0, 10000),
            category: typeof p.category === "string" ? p.category.slice(0, 50) : "General",
            tags: Array.isArray(p.tags) ? p.tags.slice(0, 10).map((t: any) => String(t).slice(0, 50)) : [],
            isFavorite: Boolean(p.isFavorite),
            isShared: Boolean(p.isShared),
            notas: typeof p.notas === "string" ? p.notas.slice(0, 6000) : "",
            suggestedVariables: Array.isArray(p.suggestedVariables)
              ? p.suggestedVariables.map((v: any) => ({
                  name: typeof v.name === "string" ? v.name.slice(0, 100) : "",
                  description: typeof v.description === "string" ? v.description.slice(0, 500) : "",
                  defaultValue: typeof v.defaultValue === "string" ? v.defaultValue.slice(0, 500) : ""
                }))
              : [],
            userId: user.uid,
            folderId: typeof p.folderId === "string" ? p.folderId.slice(0, 128) : null,
            ...getAuthorIdentity(),
            likedBy: [],
            likesCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          return setDoc(docRef, docData);
        })
      );

      onNotification(`Se importaron ${validPrompts.length} prompts correctamente.`);
      return { successCount: validPrompts.length };
    } catch (err) {
      console.error("Error importing JSON:", err);
      const msg = err instanceof Error ? err.message : "Error al procesar el archivo JSON";
      onNotification(msg, "info");
      return { successCount: 0, error: msg };
    } finally {
      setLoadingPrompts(false);
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
    handleImportFromAI,
    handleExportJSON,
    handleImportJSON
  };
}
