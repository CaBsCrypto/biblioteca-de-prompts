import type { Folder, Prompt, UserEvent } from "../types";

export type ActivationStepId = "seed" | "use" | "remix" | "folder" | "share";

export interface ActivationChecklistStep {
  id: ActivationStepId;
  title: string;
  description: string;
  ctaLabel: string;
  completed: boolean;
}

export interface ActivationChecklistState {
  steps: ActivationChecklistStep[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  defaultPromptsSavedCount: number;
}

interface ActivationChecklistInput {
  prompts: Prompt[];
  folders: Folder[];
  userEvents: UserEvent[];
  defaultPromptTitles: Set<string>;
  defaultPromptsTotal: number;
}

const normalizeTitle = (title: string) => title.trim().toLocaleLowerCase("es");

export function getActivationChecklistState({
  prompts,
  folders,
  userEvents,
  defaultPromptTitles,
  defaultPromptsTotal
}: ActivationChecklistInput): ActivationChecklistState {
  const savedDefaultTitles = new Set(
    prompts
      .map((prompt) => normalizeTitle(prompt.title))
      .filter((title) => defaultPromptTitles.has(title))
  );
  const defaultPromptsSavedCount = savedDefaultTitles.size;
  const hasUsedOrCopiedPrompt = userEvents.some((event) =>
    ["use", "copy", "recommendation_use", "recommendation_copy"].includes(event.type)
  );
  const hasRemix = prompts.some((prompt) => Boolean(prompt.forkedFromPromptId || prompt.forkedFrom));
  const hasFolder = folders.length > 0;
  const hasSharedPrompt = prompts.some((prompt) => prompt.isShared === true);

  const steps: ActivationChecklistStep[] = [
    {
      id: "seed",
      title: "Completa tu pack inicial",
      description: `Guarda prompts base para empezar tu workspace: ${defaultPromptsSavedCount}/${defaultPromptsTotal}.`,
      ctaLabel: defaultPromptsSavedCount === 0 ? "Cargar pack" : "Completar pack",
      completed: defaultPromptsSavedCount >= defaultPromptsTotal
    },
    {
      id: "use",
      title: "Usa o copia un prompt",
      description: "Convierte un recurso guardado en una accion real de trabajo.",
      ctaLabel: "Ir a mis prompts",
      completed: hasUsedOrCopiedPrompt
    },
    {
      id: "remix",
      title: "Haz tu primer remix",
      description: "Guarda un prompt social como copia privada y adaptalo a tu caso.",
      ctaLabel: "Explorar comunidad",
      completed: hasRemix
    },
    {
      id: "folder",
      title: "Organiza con una carpeta",
      description: "Agrupa prompts por proyecto, cliente, canal o formato.",
      ctaLabel: "Crear carpeta",
      completed: hasFolder
    },
    {
      id: "share",
      title: "Publica tu primer prompt",
      description: "Comparte una version util y empieza tu perfil de creador.",
      ctaLabel: "Elegir prompt",
      completed: hasSharedPrompt
    }
  ];

  const completedCount = steps.filter((step) => step.completed).length;
  return {
    steps,
    completedCount,
    totalCount: steps.length,
    isComplete: completedCount === steps.length,
    defaultPromptsSavedCount
  };
}
