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

export type AppSection = "inicio" | "prompts" | "foro" | "hackathons" | "galeria" | "mi-biblioteca";
