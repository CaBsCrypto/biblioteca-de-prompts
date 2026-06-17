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
  forkedFromPromptId?: string;
  forkedFromUserId?: string;
  forkedFromAuthorName?: string;
  forkedFromAuthorHandle?: string;
  forkedFromTitle?: string;
  sourceClassId?: string;
  sourceClassTitle?: string;
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

export interface SocialFavorite {
  id: string;
  promptId: string;
  promptTitle: string;
  promptCategory: Prompt["category"];
  promptAuthorUid: string;
  promptAuthorName: string;
  promptAuthorHandle?: string;
  createdAt: any; // Firestore Timestamp
}

export interface HiddenPrompt {
  id: string;
  promptId: string;
  promptTitle: string;
  promptCategory: Prompt["category"];
  promptAuthorUid: string;
  promptAuthorName: string;
  createdAt: any; // Firestore Timestamp
}

export type ConnectionStatus = "pending_sent" | "pending_received" | "connected";

export interface UserConnection {
  id: string;
  ownerUid: string;
  targetUid: string;
  targetName: string;
  targetAvatar?: string;
  targetHandle?: string;
  status: ConnectionStatus;
  requestedBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface ChatThread {
  id: string;
  participants: string[];
  participantNames?: Record<string, string>;
  participantHandles?: Record<string, string>;
  participantAvatars?: Record<string, string>;
  lastMessage?: string;
  lastMessageSenderUid?: string;
  lastMessageAt?: any;
  updatedAt: any;
  createdAt: any;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderUid: string;
  senderName: string;
  senderAvatar?: string;
  recipientUid: string;
  text: string;
  createdAt: any;
}

export interface BlockedUser {
  id: string;
  targetUid: string;
  targetName: string;
  targetHandle?: string;
  reason?: string;
  createdAt: any;
}

export interface ChatReport {
  id: string;
  reporterUid: string;
  reportedUid: string;
  reason: string;
  createdAt: any;
}

export interface UserEvent {
  id: string;
  type:
    | "recommendation_open"
    | "recommendation_use"
    | "recommendation_copy"
    | "use"
    | "copy"
    | "edit"
    | "briefing_open"
    | "briefing_link_copy"
    | "briefing_idea_save"
    | "briefing_prompt_create"
    | "briefing_forum_post";
  promptId?: string | null;
  promptTitle?: string | null;
  category?: Prompt["category"] | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: any; // Firestore Timestamp
}

export type CategoryFilter = "Todas" | "YouTube" | "Marketing" | "Programación" | "Redacción" | "IA Agentes" | "IA Imágenes" | "IA Videos" | "Acompañante Personal" | "Asistente de Prompts" | "General" | "Favoritos";
