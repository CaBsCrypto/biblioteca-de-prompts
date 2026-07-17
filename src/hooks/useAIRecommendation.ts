/**
 * useAIRecommendation
 * -------------------
 * Extrae toda la lógica del modal de recomendaciones de IA:
 *  - Estado del objetivo/goal
 *  - Llamada al endpoint /api/ai/recomendar
 *  - Estado de carga y error
 *  - Resultado de GeminiRecommendationResult
 *
 * Se conecta al AppStore para abrir/cerrar el modal "recommendation".
 *
 * Uso en App.tsx:
 *   const rec = useAIRecommendation({ prompts, user });
 *   // rec.isOpen, rec.open(goal), rec.close(), rec.result, rec.loading, rec.error
 */

import { useState, useCallback } from "react";
import { useAppStore } from "../store/appStore";
import { auth } from "../firebase";
import type { Prompt } from "../types";
import type { User } from "firebase/auth";

export interface GeminiRecommendationResult {
  promptIds: string[];
  rationale: string;
  goal: string;
}

interface UseAIRecommendationOptions {
  prompts: Prompt[];
  user: User | null;
  onNotification?: (msg: string, type?: "success" | "info") => void;
}

export function useAIRecommendation({
  prompts,
  user,
  onNotification
}: UseAIRecommendationOptions) {
  const { state, openModal, closeModal } = useAppStore();

  const isOpen = state.modal === "recommendation";
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState<GeminiRecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const open = useCallback(
    (initialGoal = "") => {
      setGoal(initialGoal);
      setResult(null);
      setError("");
      openModal("recommendation", initialGoal);
    },
    [openModal]
  );

  const close = useCallback(() => {
    closeModal();
    setGoal("");
    setResult(null);
    setError("");
  }, [closeModal]);

  const fetchRecommendation = useCallback(
    async (goalText: string) => {
      if (!goalText.trim()) return;
      setLoading(true);
      setError("");
      setResult(null);

      try {
        const token = user
          ? await auth.currentUser?.getIdToken()
          : undefined;

        const promptSummaries = prompts
          .filter((p) => p.userId !== "founder-pack")
          .slice(0, 80)
          .map((p) => ({
            id: p.id,
            title: p.title,
            category: p.category,
            tags: p.tags?.slice(0, 5) ?? [],
            description: (p.description || "").slice(0, 120)
          }));

        const response = await fetch("/api/ai/recomendar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ goal: goalText, prompts: promptSummaries })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Error al generar recomendación.");

        setResult({
          promptIds: data.promptIds ?? [],
          rationale: data.rationale ?? "",
          goal: goalText
        });

        if (onNotification) {
          onNotification("¡Recomendación generada por IA!", "success");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error desconocido.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [prompts, user, onNotification]
  );

  return {
    isOpen,
    goal,
    setGoal,
    result,
    setResult,
    loading,
    error,
    setError,
    open,
    close,
    fetchRecommendation
  };
}
