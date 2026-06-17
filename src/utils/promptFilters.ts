import type { CategoryFilter, Prompt } from "../types";

export type LibraryTab = "mi-biblioteca" | "comunidad";
export type CommunityScope = "todos" | "siguiendo" | "favoritos" | "remixeados";
export type CommunitySort = "populares" | "recientes";
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
  hiddenPromptIds?: Set<string>;
  ownForkedSourceIds?: Set<string>;
  communitySort?: CommunitySort;
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
  hiddenPromptIds = new Set<string>(),
  ownForkedSourceIds = new Set<string>(),
  communitySort = "populares",
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

  if (currentTab !== "comunidad") return targetSource;

  return targetSource
    .filter((prompt) => !hiddenPromptIds.has(prompt.id))
    .sort((a, b) => {
      if (communitySort === "recientes") {
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      }
      const likeDiff = (b.likesCount || b.likedBy?.length || 0) - (a.likesCount || a.likedBy?.length || 0);
      if (likeDiff !== 0) return likeDiff;
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });
}

export interface ParsedQuery {
  tags: string[];
  categories: string[];
  authors: string[];
  isFavorite?: boolean;
  isShared?: boolean;
  isPrivate?: boolean;
  isRemix?: boolean;
  textTerms: string[];
}

export function parseSearchQuery(queryStr: string): ParsedQuery {
  const result: ParsedQuery = {
    tags: [],
    categories: [],
    authors: [],
    textTerms: []
  };

  const cleanQuery = queryStr.trim();
  if (!cleanQuery) return result;

  // Supports key:value and key:"value with spaces"
  const regex = /(?:(tag|etiqueta|category|categoria|author|autor|is):(?:([^"\s]+)|"([^"]+)"))|([^\s"]+)|"([^"]+)"/gi;
  let match;

  while ((match = regex.exec(cleanQuery)) !== null) {
    if (match[1]) {
      const key = match[1].toLowerCase();
      const val = (match[2] || match[3] || "").trim();
      if (!val) continue;

      if (key === "tag" || key === "etiqueta") {
        result.tags.push(val.toLowerCase());
      } else if (key === "category" || key === "categoria") {
        result.categories.push(val.toLowerCase());
      } else if (key === "author" || key === "autor") {
        result.authors.push(val.toLowerCase());
      } else if (key === "is") {
        const flag = val.toLowerCase();
        if (flag === "favorite" || flag === "favorito") {
          result.isFavorite = true;
        } else if (flag === "shared" || flag === "public" || flag === "publico") {
          result.isShared = true;
        } else if (flag === "private" || flag === "privado") {
          result.isPrivate = true;
        } else if (flag === "remix") {
          result.isRemix = true;
        }
      }
    } else {
      const term = (match[4] || match[5] || "").trim();
      if (term) {
        result.textTerms.push(term.toLowerCase());
      }
    }
  }

  return result;
}

export function filterPrompts(input: BasePromptSelectionInput & {
  selectedCategory: CategoryFilter;
  searchQuery: string;
  selectedTags: string[];
  selectedFolderId: string | null;
}) {
  const targetSource = selectPromptSource(input);
  const parsed = parseSearchQuery(input.searchQuery);

  return targetSource.filter((p) => {
    // 1. Folder constraints
    if (input.currentTab === "mi-biblioteca" && input.selectedFolderId) {
      if (input.selectedFolderId === "uncategorized") {
        if (p.folderId) return false;
      } else if (p.folderId !== input.selectedFolderId) {
        return false;
      }
    }

    // 2. Category sidebar / header filter
    if (input.selectedCategory === "Favoritos" && input.currentTab === "comunidad") {
      if (!input.socialFavoritePromptIds?.has(p.id)) return false;
    } else if (input.selectedCategory === "Favoritos") {
      if (!p.isFavorite) return false;
    } else if (input.selectedCategory !== "Todas" && p.category !== input.selectedCategory) {
      return false;
    }

    // 3. Selected Tags constraints
    if (input.selectedTags.length > 0) {
      const matchesAllSelectedTags = input.selectedTags.every((selTag) =>
        p.tags?.some((t) => t.toLowerCase() === selTag.toLowerCase())
      );
      if (!matchesAllSelectedTags) return false;
    }

    // 4. Smart Query Attributes Matching
    if (parsed.categories.length > 0) {
      const matchesCategory = parsed.categories.some((cat) =>
        p.category?.toLowerCase() === cat
      );
      if (!matchesCategory) return false;
    }

    if (parsed.tags.length > 0) {
      const matchesAllQueryTags = parsed.tags.every((qTag) =>
        p.tags?.some((t) => t.toLowerCase() === qTag)
      );
      if (!matchesAllQueryTags) return false;
    }

    if (parsed.authors.length > 0) {
      const matchesAuthor = parsed.authors.some((auth) =>
        p.authorName?.toLowerCase().includes(auth) || p.authorHandle?.toLowerCase().includes(auth)
      );
      if (!matchesAuthor) return false;
    }

    if (parsed.isFavorite !== undefined) {
      const isFav = input.currentTab === "comunidad"
        ? Boolean(input.socialFavoritePromptIds?.has(p.id))
        : Boolean(p.isFavorite);
      if (isFav !== parsed.isFavorite) return false;
    }

    if (parsed.isShared !== undefined) {
      if (Boolean(p.isShared) !== parsed.isShared) return false;
    }

    if (parsed.isPrivate !== undefined) {
      if (Boolean(!p.isShared) !== parsed.isPrivate) return false;
    }

    if (parsed.isRemix !== undefined) {
      const isRem = Boolean(p.forkedFromPromptId || p.forkedFrom);
      if (isRem !== parsed.isRemix) return false;
    }

    // 5. Smart Query Text Terms Matching (AND across all terms)
    if (parsed.textTerms.length > 0) {
      const matchesAllTerms = parsed.textTerms.every((term) => {
        const titleMatch = p.title?.toLowerCase().includes(term);
        const descMatch = p.description?.toLowerCase().includes(term);
        const promptMatch = p.promptText?.toLowerCase().includes(term);
        const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(term));
        const authorMatch = p.authorName?.toLowerCase().includes(term) || p.authorHandle?.toLowerCase().includes(term);
        return titleMatch || descMatch || promptMatch || tagMatch || authorMatch;
      });
      if (!matchesAllTerms) return false;
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
