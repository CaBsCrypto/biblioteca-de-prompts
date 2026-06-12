import type { CategoryFilter, Prompt } from "../types";

export type LibraryTab = "mi-biblioteca" | "comunidad";
export type CommunityScope = "todos" | "siguiendo" | "favoritos" | "remixeados";
export type LibraryViewFilter = "todos" | "privados" | "publicados" | "remixes" | "favoritos";
export type SelectedAuthor = { name: string; uid: string; avatar?: string } | null;

interface BasePromptSelectionInput {
  prompts: Prompt[];
  communityPrompts: Prompt[];
  currentTab: LibraryTab;
  selectedAuthor: SelectedAuthor;
  communityScope: CommunityScope;
  followedCreatorUids: string[];
  socialFavoritePromptIds?: Set<string>;
  ownForkedSourceIds?: Set<string>;
  libraryViewFilter?: LibraryViewFilter;
}

function selectPromptSource({
  prompts,
  communityPrompts,
  currentTab,
  selectedAuthor,
  communityScope,
  followedCreatorUids,
  socialFavoritePromptIds = new Set<string>(),
  ownForkedSourceIds = new Set<string>(),
  libraryViewFilter = "todos"
}: BasePromptSelectionInput) {
  let targetSource = currentTab === "mi-biblioteca" ? prompts : communityPrompts;

  if (currentTab === "mi-biblioteca") {
    if (libraryViewFilter === "privados") {
      targetSource = targetSource.filter((p) => !p.isShared);
    } else if (libraryViewFilter === "publicados") {
      targetSource = targetSource.filter((p) => p.isShared);
    } else if (libraryViewFilter === "remixes") {
      targetSource = targetSource.filter((p) => Boolean(p.forkedFromPromptId || p.forkedFrom));
    } else if (libraryViewFilter === "favoritos") {
      targetSource = targetSource.filter((p) => p.isFavorite);
    }
  } else if (selectedAuthor) {
    targetSource = targetSource.filter((p) => p.userId === selectedAuthor.uid);
  } else if (communityScope === "siguiendo") {
    targetSource = targetSource.filter((p) => followedCreatorUids.includes(p.userId));
  } else if (communityScope === "favoritos") {
    targetSource = targetSource.filter((p) => socialFavoritePromptIds.has(p.id));
  } else if (communityScope === "remixeados") {
    targetSource = targetSource.filter((p) => ownForkedSourceIds.has(p.forkedFromPromptId || p.id));
  }
  return targetSource;
}

export function filterPrompts(input: BasePromptSelectionInput & {
  selectedCategory: CategoryFilter;
  searchQuery: string;
  selectedTags: string[];
  selectedFolderId: string | null;
}) {
  const targetSource = selectPromptSource(input);
  return targetSource.filter((p) => {
    if (input.currentTab === "mi-biblioteca" && input.selectedFolderId) {
      if (input.selectedFolderId === "uncategorized") {
        if (p.folderId) return false;
      } else if (p.folderId !== input.selectedFolderId) {
        return false;
      }
    }

    if (input.selectedCategory === "Favoritos" && input.currentTab === "comunidad") {
      if (!input.socialFavoritePromptIds?.has(p.id)) return false;
    } else if (input.selectedCategory === "Favoritos") {
      if (!p.isFavorite) return false;
    } else if (input.selectedCategory !== "Todas" && p.category !== input.selectedCategory) {
      return false;
    }

    if (input.selectedTags.length > 0) {
      const matchesAllSelectedTags = input.selectedTags.every((selTag) =>
        p.tags?.some((t) => t.toLowerCase() === selTag.toLowerCase())
      );
      if (!matchesAllSelectedTags) return false;
    }

    if (input.searchQuery.trim() !== "") {
      const queryClean = input.searchQuery.toLowerCase().trim();
      const titleMatch = p.title?.toLowerCase().includes(queryClean);
      const descMatch = p.description?.toLowerCase().includes(queryClean);
      const promptMatch = p.promptText?.toLowerCase().includes(queryClean);
      const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(queryClean));
      const authorMatch = p.authorName?.toLowerCase().includes(queryClean);
      return titleMatch || descMatch || promptMatch || tagMatch || authorMatch;
    }

    return true;
  });
}

export function getAvailableTags(input: BasePromptSelectionInput) {
  const tagsSet = new Set<string>();
  selectPromptSource(input).forEach((p) => {
    if (p.tags && Array.isArray(p.tags)) {
      p.tags.forEach((t) => {
        const trimmed = t.trim();
        if (trimmed) tagsSet.add(trimmed);
      });
    }
  });
  return Array.from(tagsSet).sort((a, b) => a.localeCompare(b));
}

export function getTagSuggestions(allAvailableTags: string[], tagSearchInput: string, selectedTags: string[]) {
  const cleanSearch = tagSearchInput.toLowerCase().trim();
  if (!cleanSearch) {
    return allAvailableTags.filter((tag) => !selectedTags.includes(tag));
  }
  return allAvailableTags.filter(
    (tag) => tag.toLowerCase().includes(cleanSearch) && !selectedTags.includes(tag)
  );
}

export function combineSearchablePrompts(prompts: Prompt[], communityPrompts: Prompt[]) {
  const map = new Map<string, Prompt>();
  prompts.forEach((p) => map.set(p.id, p));
  communityPrompts.forEach((p) => {
    if (!map.has(p.id)) map.set(p.id, p);
  });
  return Array.from(map.values());
}

export function getAuthorProfileStats(communityPrompts: Prompt[], selectedAuthor: SelectedAuthor) {
  if (!selectedAuthor) return { count: 0, likes: 0 };
  const authorPrompts = communityPrompts.filter((p) => p.userId === selectedAuthor.uid);
  return {
    count: authorPrompts.length,
    likes: authorPrompts.reduce((sum, p) => sum + (p.likesCount || p.likedBy?.length || 0), 0)
  };
}

export function getPublicFeaturedPrompts(communityPrompts: Prompt[]) {
  return communityPrompts
    .filter((prompt) => prompt.isShared)
    .sort((a, b) => (b.likesCount || b.likedBy?.length || 0) - (a.likesCount || a.likedBy?.length || 0))
    .slice(0, 6);
}

export function getPublicShowcasePrompts({
  prompts,
  selectedCategory,
  searchQuery,
  limit = 12
}: {
  prompts: Prompt[];
  selectedCategory: CategoryFilter;
  searchQuery: string;
  limit?: number;
}) {
  const cleanQuery = searchQuery.toLowerCase().trim();

  return prompts
    .filter((prompt) => {
      if (!prompt.isShared) return false;
      if (selectedCategory !== "Todas" && selectedCategory !== "Favoritos" && prompt.category !== selectedCategory) {
        return false;
      }
      if (!cleanQuery) return true;

      return Boolean(
        prompt.title?.toLowerCase().includes(cleanQuery) ||
        prompt.description?.toLowerCase().includes(cleanQuery) ||
        prompt.promptText?.toLowerCase().includes(cleanQuery) ||
        prompt.authorName?.toLowerCase().includes(cleanQuery) ||
        prompt.tags?.some((tag) => tag.toLowerCase().includes(cleanQuery))
      );
    })
    .sort((a, b) => {
      const likeDiff = (b.likesCount || b.likedBy?.length || 0) - (a.likesCount || a.likedBy?.length || 0);
      if (likeDiff !== 0) return likeDiff;
      return a.title.localeCompare(b.title, "es");
    })
    .slice(0, limit);
}
