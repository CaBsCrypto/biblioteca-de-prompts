import type { Prompt, SocialFavorite, UserEvent } from "../types";

export interface ExploreSection {
  id: "para-ti" | "destacados" | "recientes" | "guardados" | "remixeables";
  title: string;
  description: string;
  prompts: Prompt[];
}

export interface SuggestedCreator {
  uid: string;
  name: string;
  handle?: string;
  avatar?: string;
  promptsCount: number;
  likesCount: number;
  categories: string[];
  topPromptTitle: string;
}

export interface SocialFavoritePromptItem {
  favorite: SocialFavorite;
  prompt: Prompt | null;
}

export interface DailyWorkspaceState {
  recentPrompts: Prompt[];
  favoritePrompts: Prompt[];
  recentRemixes: Prompt[];
  publishCandidates: Prompt[];
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

function promptSocialScore(prompt: Prompt) {
  return promptLikes(prompt) * 10 + promptTime(prompt) / 100000;
}

function firstFilledSections(sections: ExploreSection[]) {
  return sections.filter((section) => section.prompts.length > 0);
}

export function buildCommunityExploreSections({
  prompts,
  ownPrompts = [],
  followedCreatorUids,
  socialFavoritePromptIds,
  ownForkedSourceIds,
  currentUserId,
  limit = 4
}: {
  prompts: Prompt[];
  ownPrompts?: Prompt[];
  followedCreatorUids: string[];
  socialFavoritePromptIds: Set<string>;
  ownForkedSourceIds: Set<string>;
  currentUserId?: string | null;
  limit?: number;
}): ExploreSection[] {
  const publicPrompts = prompts.filter((prompt) => prompt.isShared);
  const followedCreatorSet = new Set(followedCreatorUids);
  const ownCategories = new Set(ownPrompts.map((prompt) => prompt.category));
  const ownTags = new Set(ownPrompts.flatMap((prompt) => prompt.tags || []).map((tag) => tag.toLowerCase()));

  const paraTi = [...publicPrompts]
    .filter((prompt) => prompt.userId !== currentUserId)
    .sort((a, b) => {
      const scorePrompt = (prompt: Prompt) => {
        const sourceId = prompt.forkedFromPromptId || prompt.id;
        const matchingTags = (prompt.tags || []).filter((tag) => ownTags.has(tag.toLowerCase())).length;
        return promptSocialScore(prompt)
          + (followedCreatorSet.has(prompt.userId) ? 80 : 0)
          + (socialFavoritePromptIds.has(prompt.id) ? 70 : 0)
          + (ownCategories.has(prompt.category) ? 35 : 0)
          + matchingTags * 12
          + (!ownForkedSourceIds.has(sourceId) ? 25 : 0);
      };
      const scoreDiff = scorePrompt(b) - scorePrompt(a);
      if (scoreDiff !== 0) return scoreDiff;
      return promptTime(b) - promptTime(a);
    })
    .slice(0, limit);

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
      id: "para-ti",
      title: "Para ti",
      description: "Mezcla de creadores seguidos, favoritos, temas que ya usas y buenos candidatos para remix.",
      prompts: paraTi
    },
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

export function buildSuggestedCreators({
  prompts,
  followedCreatorUids,
  currentUserId,
  limit = 4
}: {
  prompts: Prompt[];
  followedCreatorUids: string[];
  currentUserId?: string | null;
  limit?: number;
}): SuggestedCreator[] {
  const followedCreatorSet = new Set(followedCreatorUids);
  const creatorMap = new Map<string, {
    uid: string;
    name: string;
    handle?: string;
    avatar?: string;
    prompts: Prompt[];
  }>();

  prompts
    .filter((prompt) =>
      prompt.isShared &&
      prompt.userId !== currentUserId &&
      prompt.userId !== "founder-pack" &&
      !followedCreatorSet.has(prompt.userId)
    )
    .forEach((prompt) => {
      const existing = creatorMap.get(prompt.userId);
      if (existing) {
        existing.prompts.push(prompt);
        return;
      }

      creatorMap.set(prompt.userId, {
        uid: prompt.userId,
        name: prompt.authorName || "Creador",
        handle: prompt.authorHandle,
        avatar: prompt.authorAvatar,
        prompts: [prompt]
      });
    });

  return Array.from(creatorMap.values())
    .map((creator) => {
      const sortedPrompts = [...creator.prompts].sort((a, b) => promptSocialScore(b) - promptSocialScore(a));
      const likesCount = creator.prompts.reduce((sum, prompt) => sum + promptLikes(prompt), 0);
      const categories = Array.from(new Set(creator.prompts.map((prompt) => prompt.category))).slice(0, 3);

      return {
        uid: creator.uid,
        name: creator.name,
        handle: creator.handle,
        avatar: creator.avatar,
        promptsCount: creator.prompts.length,
        likesCount,
        categories,
        topPromptTitle: sortedPrompts[0]?.title || "Prompt destacado"
      };
    })
    .sort((a, b) => {
      const scoreA = a.promptsCount * 12 + a.likesCount * 8;
      const scoreB = b.promptsCount * 12 + b.likesCount * 8;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.name.localeCompare(b.name, "es");
    })
    .slice(0, limit);
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

  const publishCandidates = prompts
    .filter((prompt) => !prompt.isShared && (prompt.forkedFromPromptId || prompt.forkedFrom || prompt.isFavorite))
    .sort((a, b) => {
      const remixDiff = Number(Boolean(b.forkedFromPromptId || b.forkedFrom)) - Number(Boolean(a.forkedFromPromptId || a.forkedFrom));
      if (remixDiff !== 0) return remixDiff;
      return promptTime(b) - promptTime(a);
    })
    .slice(0, limit);

  const socialPrompts = socialFavoritePrompts
    .map((item) => item.prompt)
    .filter(Boolean) as Prompt[];

  const state = {
    recentPrompts,
    favoritePrompts,
    recentRemixes,
    publishCandidates,
    socialFavoritePrompts: socialPrompts.slice(0, limit),
    hasAny: false
  };

  state.hasAny = Boolean(
    state.recentPrompts.length ||
    state.favoritePrompts.length ||
    state.recentRemixes.length ||
    state.publishCandidates.length ||
    state.socialFavoritePrompts.length
  );

  return state;
}
