import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { DEFAULT_PROMPTS } from "../data";
import type { Prompt } from "../types";
import { mapPromptDoc, sortOwnPrompts } from "../utils/firestoreMappers";
import {
  archivePromptVersion,
  createPrompt,
  deletePrompt,
  importPromptsFromJSON,
  seedPromptsForUser,
  togglePromptFavorite,
  updatePrompt,
  type PromptAuthorIdentity,
  type PromptSeed,
} from "../services/firestore/promptsService";

interface UsePromptLibraryOptions {
  user: User | null;
  editingPrompt: Prompt | null;
  setEditingPrompt: (prompt: Prompt | null) => void;
  setShowFormModal: (value: boolean) => void;
  getAuthorIdentity: () => PromptAuthorIdentity;
  onNotification: (message: string, type?: "success" | "info") => void;
}

const normalizeSeedTitle = (title: string) => title.trim().toLocaleLowerCase("es");
const PROMPTS_COLLECTION = "prompts";

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

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
    const userPromptsQuery = query(
      collection(db, PROMPTS_COLLECTION),
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
        handleFirestoreError(error, OperationType.LIST, PROMPTS_COLLECTION);
      }
    );

    return unsubscribe;
  }, [user]);

  const handleSeedDefaults = async (selectedPrompts: PromptSeed[] = DEFAULT_PROMPTS) => {
    if (!user) return;
    setLoadingPrompts(true);
    try {
      const existingTitles = new Set<string>(prompts.map((prompt) => normalizeSeedTitle(prompt.title)));
      const identity = getAuthorIdentity();
      const seededCount = await seedPromptsForUser(
        db,
        user.uid,
        selectedPrompts,
        identity,
        existingTitles
      );

      if (seededCount === 0) {
        onNotification("Tu biblioteca ya tiene los prompts de este pack.", "info");
      } else {
        onNotification(`Se añadieron ${seededCount} prompts de este pack a tu biblioteca.`, "success");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, PROMPTS_COLLECTION);
    } finally {
      setLoadingPrompts(false);
    }
  };

  const handleSavePrompt = async (
    promptData: Omit<Prompt, "id" | "userId" | "createdAt" | "updatedAt">
  ) => {
    if (!user) return;
    const identity = getAuthorIdentity();

    try {
      if (editingPrompt) {
        if (editingPrompt.promptText !== promptData.promptText) {
          await archivePromptVersion(db, editingPrompt.id, editingPrompt.promptText);
        }

        const forkMetadata = stripUndefined({
          forkedFrom: promptData.forkedFrom,
          forkedFromPromptId: promptData.forkedFromPromptId,
          forkedFromUserId: promptData.forkedFromUserId,
          forkedFromAuthorName: promptData.forkedFromAuthorName,
          forkedFromAuthorHandle: promptData.forkedFromAuthorHandle,
          forkedFromTitle: promptData.forkedFromTitle,
          sourceClassId: promptData.sourceClassId,
          sourceClassTitle: promptData.sourceClassTitle,
        });

        await updatePrompt(db, editingPrompt.id, {
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
          ...identity,
          folderId: promptData.folderId || null,
        });
        onNotification("Prompt actualizado correctamente.");
      } else {
        const data: PromptSeed = {
          ...stripUndefined({
            title: promptData.title,
            description: promptData.description,
            promptText: promptData.promptText,
            category: promptData.category,
            tags: promptData.tags,
            isFavorite: promptData.isFavorite,
            notas: promptData.notas,
            isShared: promptData.isShared || false,
            suggestedVariables: promptData.suggestedVariables,
            forkedFrom: promptData.forkedFrom,
            forkedFromPromptId: promptData.forkedFromPromptId,
            forkedFromUserId: promptData.forkedFromUserId,
            forkedFromAuthorName: promptData.forkedFromAuthorName,
            forkedFromAuthorHandle: promptData.forkedFromAuthorHandle,
            forkedFromTitle: promptData.forkedFromTitle,
            sourceClassId: promptData.sourceClassId,
            sourceClassTitle: promptData.sourceClassTitle,
            folderId: promptData.folderId || null,
          }),
        } as PromptSeed;
        await createPrompt(db, user.uid, data, identity);
        onNotification("Nuevo prompt añadido a la biblioteca.");
      }
    } catch (error) {
      handleFirestoreError(error, editingPrompt ? OperationType.UPDATE : OperationType.CREATE, PROMPTS_COLLECTION);
    } finally {
      setShowFormModal(false);
      setEditingPrompt(null);
    }
  };

  const handleFavoriteToggle = async (target: Prompt) => {
    if (!user) return;
    try {
      await togglePromptFavorite(db, target.id, !target.isFavorite);
      onNotification(
        target.isFavorite ? "Eliminado de favoritos." : "Guardado en tus favoritos.",
        "success"
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, PROMPTS_COLLECTION);
    }
  };

  const handleDeletePrompt = async (target: Prompt) => {
    if (!user) return;
    if (!window.confirm(`¿Estás seguro de que quieres eliminar "${target.title}"?`)) return;

    try {
      await deletePrompt(db, target.id);
      onNotification("Prompt eliminado correctamente.", "info");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, PROMPTS_COLLECTION);
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
    try {
      const identity = getAuthorIdentity();
      await createPrompt(
        db,
        user.uid,
        {
          ...aiData,
          isFavorite: false,
        } as PromptSeed,
        identity
      );
      onNotification("¡Importado con éxito desde el Asistente IA!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, PROMPTS_COLLECTION);
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
      setLoadingPrompts(true);
      const identity = getAuthorIdentity();
      const successCount = await importPromptsFromJSON(db, user.uid, parsed, identity);
      onNotification(`Se importaron ${successCount} prompts correctamente.`);
      return { successCount };
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