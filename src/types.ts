export interface PromptVariable {
  name: string;
  description: string;
  defaultValue?: string;
}

export interface Prompt {
  id: string;
  userId: string;
  title: string;
  description: string;
  promptText: string;
  category: "YouTube" | "Marketing" | "Programación" | "Redacción" | "IA Agentes" | "IA Imágenes" | "IA Videos" | "Acompañante Personal" | "Asistente de Prompts" | "General";
  tags: string[];
  isFavorite: boolean;
  notas?: string;
  isShared?: boolean;
  suggestedVariables?: PromptVariable[];
  authorName?: string;
  authorAvatar?: string;
  authorHandle?: string;
  likedBy?: string[];
  likesCount?: number;
  forkedFrom?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  folderId?: string | null; // Custom folder grouping
}

export interface Folder {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isShared?: boolean;
  authorName?: string;
  authorHandle?: string;
  createdAt: any; // Firestore Timestamp
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  handle: string;
  bio?: string;
  role?: "founder" | "creator" | "member";
  status?: "active" | "hidden" | "blocked";
  stats?: {
    publicPromptsCount?: number;
    followersCount?: number;
    followingCount?: number;
  };
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface UserEvent {
  id: string;
  type: "recommendation_open" | "recommendation_use" | "recommendation_copy" | "use" | "copy" | "edit";
  promptId?: string | null;
  promptTitle?: string | null;
  category?: Prompt["category"] | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: any; // Firestore Timestamp
}

export type CategoryFilter = "Todas" | "YouTube" | "Marketing" | "Programación" | "Redacción" | "IA Agentes" | "IA Imágenes" | "IA Videos" | "Acompañante Personal" | "Asistente de Prompts" | "General" | "Favoritos";
