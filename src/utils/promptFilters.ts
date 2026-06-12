import type { CategoryFilter, Prompt } from "../types";

export type LibraryTab = "mi-biblioteca" | "comunidad";
export type CommunityScope = "todos" | "siguiendo";
export type SelectedAuthor = { name: string; uid: string; avatar?: string } | null;

interface BasePromptSelectionInput {
  prompts: Prompt[];
  communityPrompts: Prompt[];
  currentTab: LibraryTab;
  selectedAuthor: SelectedAuthor;
  communityScope: CommunityScope;
  followedCreatorUids: string[];
}

function selectPromptSource({
  prompts,
  communityPrompts,
  currentTab,
  selectedAuthor,
  communityScope,
  followedCreatorUids
}: BasePromptSelectionInput) {
  let targetSource = currentTab === "mi-biblioteca" ? prompts : communityPrompts;
  if (currentTab === "comunidad" && selectedAuthor) {
    targetSource = targetSource.filter((p) => p.userId === selectedAuthor.uid);
  } else if (currentTab === "comunidad" && communityScope === "siguiendo") {
    targetSource = targetSource.filter((p) => followedCreatorUids.includes(p.userId));
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

    if (input.selectedCategory === "Favoritos") {
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
