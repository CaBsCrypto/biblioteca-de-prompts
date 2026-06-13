import type { Prompt, SocialFavorite, UserEvent } from "../types";

export interface ExploreSection {
  id: "destacados" | "recientes" | "guardados" | "remixeables";
  title: string;
  description: string;
  prompts: Prompt[];
}

export interface SocialFavoritePromptItem {
  favorite: SocialFavorite;
  prompt: Prompt | null;
}

export interface DailyWorkspaceState {
  recentPrompts: Prompt[];
  favoritePrompts: Prompt[];
  recentRemixes: Prompt[];
  socialFavoritePrompts: Prompt[];
  hasAny: boolean;
}

function promptLikes(prompt: Prompt) {
  return prompt.likesCount || prompt.likedBy?.length || 0;
}

function promptTime(prompt: Prompt) {
  return prompt.updatedAt?.seconds || prompt.createdAt?.seconds || 0;
}

function uniqueById(prompts: Prompt[]) {
  const seen = new Set<string>();
  return prompts.filter((prompt) => {
    if (seen.has(prompt.id)) return false;
    seen.add(prompt.id);
    return true;
  });
}

function firstFilledSections(sections: ExploreSection[]) {
  return sections.filter((section) => section.prompts.length > 0);
}

export function buildCommunityExploreSections({
  prompts,
  socialFavoritePromptIds,
  ownForkedSourceIds,
  limit = 4
}: {
  prompts: Prompt[];
  socialFavoritePromptIds: Set<string>;
  ownForkedSourceIds: Set<string>;
  limit?: number;
}): ExploreSection[] {
  const publicPrompts = prompts.filter((prompt) => prompt.isShared);

  const destacados = [...publicPrompts]
    .sort((a, b) => {
      const likeDiff = promptLikes(b) - promptLikes(a);
      if (likeDiff !== 0) return likeDiff;
      return promptTime(b) - promptTime(a);
    })
    .slice(0, limit);

  const recientes = [...publicPrompts]
    .sort((a, b) => promptTime(b) - promptTime(a))
    .slice(0, limit);

  const favoriteFirst = [
    ...publicPrompts.filter((prompt) => socialFavoritePromptIds.has(prompt.id)),
    ...destacados
  ];

  const guardados = uniqueById(favoriteFirst).slice(0, limit);

  const remixeables = [
    ...publicPrompts.filter((prompt) => !ownForkedSourceIds.has(prompt.forkedFromPromptId || prompt.id)),
    ...destacados
  ].slice(0, limit);

  return firstFilledSections([
    {
      id: "destacados",
      title: "Destacados",
      description: "Prompts publicos con mas senales de valor en la comunidad.",
      prompts: destacados
    },
    {
      id: "recientes",
      title: "Recientes",
      description: "Lo ultimo publicado para encontrar ideas frescas.",
      prompts: recientes
    },
    {
      id: "guardados",
      title: "Mas guardados",
      description: "Tus favoritos sociales primero; luego los mejor valorados.",
      prompts: guardados
    },
    {
      id: "remixeables",
      title: "Remixeables",
      description: "Buenas bases para convertir en una copia privada editable.",
      prompts: remixeables
    }
  ]);
}

export function buildDailyWorkspaceState({
  prompts,
  userEvents,
  socialFavoritePrompts,
  limit = 4
}: {
  prompts: Prompt[];
  userEvents: UserEvent[];
  socialFavoritePrompts: SocialFavoritePromptItem[];
  limit?: number;
}): DailyWorkspaceState {
  const promptById = new Map(prompts.map((prompt) => [prompt.id, prompt]));
  const workEventTypes = new Set<UserEvent["type"]>([
    "use",
    "copy",
    "recommendation_use",
    "recommendation_copy",
    "edit"
  ]);

  const recentPrompts = uniqueById(
    userEvents
      .filter((event) => event.promptId && workEventTypes.has(event.type))
      .map((event) => promptById.get(event.promptId || ""))
      .filter(Boolean) as Prompt[]
  ).slice(0, limit);

  const favoritePrompts = prompts
    .filter((prompt) => prompt.isFavorite)
    .sort((a, b) => promptTime(b) - promptTime(a))
    .slice(0, limit);

  const recentRemixes = prompts
    .filter((prompt) => prompt.forkedFromPromptId || prompt.forkedFrom)
    .sort((a, b) => promptTime(b) - promptTime(a))
    .slice(0, limit);

  const socialPrompts = socialFavoritePrompts
    .map((item) => item.prompt)
    .filter(Boolean) as Prompt[];

  const state = {
    recentPrompts,
    favoritePrompts,
    recentRemixes,
    socialFavoritePrompts: socialPrompts.slice(0, limit),
    hasAny: false
  };

  state.hasAny = Boolean(
    state.recentPrompts.length ||
    state.favoritePrompts.length ||
    state.recentRemixes.length ||
    state.socialFavoritePrompts.length
  );

  return state;
}
