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
  createdAt: any; // Firestore Timestamp
}

export type CategoryFilter = "Todas" | "YouTube" | "Marketing" | "Programación" | "Redacción" | "IA Agentes" | "IA Imágenes" | "IA Videos" | "Acompañante Personal" | "Asistente de Prompts" | "General" | "Favoritos";
