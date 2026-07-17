import type { Prompt, PromptVariable } from "./types";

export type CommunityPostType = "idea" | "question" | "team" | "showcase";

export interface CommunityPost {
  id: string;
  type: CommunityPostType;
  title: string;
  body: string;
  tags: string[];
  imageUrl?: string;
  linkUrl?: string;
  authorUid: string;
  authorName: string;
  authorHandle?: string;
  authorAvatar?: string;
  likesCount: number;
  likedBy: string[];
  createdAt: any;
  updatedAt: any;
}

export interface CommunityPostComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: any;
}

export type HackathonRole = "diseno" | "dev" | "ia" | "3d" | "marketing" | "research";

export interface HackathonOpportunity {
  id: string;
  title: string;
  description: string;
  url: string;
  deadline: string;
  mode: string;
  tags: string[];
  rolesNeeded: HackathonRole[];
  authorUid: string;
  authorName?: string;
  authorHandle?: string;
  createdAt: any;
  updatedAt: any;
}

export type NewsCategory = "ai" | "tech" | "startups" | "devtools" | "design" | "hackathons";
export type NewsLanguage = "en" | "es" | "unknown";

export interface NewsItem {
  id: string;
  title: string;
  titleEs?: string;
  summary?: string;
  summaryEs?: string;
  url: string;
  source: string;
  imageUrl?: string;
  publishedAt?: string;
  language: NewsLanguage;
  category: NewsCategory;
  tags: string[];
}

export type SavedIdeaSource = "news" | "hackathon" | "manual";

export interface SavedIdea {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  language: NewsLanguage;
  category: NewsCategory;
  tags: string[];
  imageUrl?: string;
  savedAt: any;
  createdFrom: SavedIdeaSource;
}

export interface BriefingItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  language: NewsLanguage;
  category: NewsCategory;
  tags: string[];
}

export interface Briefing {
  id: string;
  title: string;
  intro: string;
  items: BriefingItem[];
  tags: string[];
  language: NewsLanguage | "all";
  stats?: {
    opens?: number;
    linkCopies?: number;
    ideaSaves?: number;
    promptCreates?: number;
    forumPosts?: number;
  };
  authorUid: string;
  authorName: string;
  authorHandle?: string;
  isPublished: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface ClassroomPromptPackItem {
  title: string;
  description: string;
  promptText: string;
  category: Prompt["category"];
  tags: string[];
  isFavorite?: boolean;
  suggestedVariables?: PromptVariable[];
  teacherNotes?: string;
}

export interface Classroom {
  id: string;
  title: string;
  description: string;
  institution: string;
  eventDate: string;
  accessCode: string;
  isActive: boolean;
  promptPack: ClassroomPromptPackItem[];
  createdAt?: any;
}

export interface ClassroomMember {
  id: string;
  uid: string;
  displayName: string;
  handle?: string;
  photoURL?: string;
  joinedAt: any;
  savedPackAt?: any;
  savedPromptsCount?: number;
}

export type AppSection = "inicio" | "prompts" | "foro" | "hackathons" | "galeria" | "noticias" | "mi-biblioteca" | "progreso" | "admin";
