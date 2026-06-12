import type { Folder, Prompt } from "../types";

export function mapPromptDoc<T extends { id: string; data: () => unknown }>(docSnap: T): Prompt {
  return {
    id: docSnap.id,
    ...(docSnap.data() as Record<string, unknown>)
  } as Prompt;
}

export function mapFolderDoc<T extends { id: string; data: () => unknown }>(docSnap: T): Folder {
  return {
    id: docSnap.id,
    ...(docSnap.data() as Record<string, unknown>)
  } as Folder;
}

export function sortOwnPrompts(list: Prompt[]) {
  return [...list].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });
}

export function sortCommunityPrompts(list: Prompt[]) {
  return [...list].sort((a, b) => {
    const aLikes = a.likesCount || a.likedBy?.length || 0;
    const bLikes = b.likesCount || b.likedBy?.length || 0;
    if (bLikes !== aLikes) return bLikes - aLikes;
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });
}
