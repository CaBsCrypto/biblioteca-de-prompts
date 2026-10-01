export type CatalogKind = 'prompt' | 'skill';

export interface CatalogMetadata {
  title: string;
  summary: string;
  outcome: string;
  category: string;
  tags: string[];
  compatibility: string[];
  requirements: string;
  usage: string;
  license: string;
  exampleInput: string;
  exampleOutput: string;
  imageUrl: string;
  demoUrl: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
}

export interface CatalogContent {
  text: string;
  source: 'inline' | 'github';
  repositoryUrl: string;
  repositoryCommit: string;
  repositoryPath: string;
}

export interface CatalogDraftInput {
  kind: CatalogKind;
  metadata: CatalogMetadata;
  content: CatalogContent;
  sourcePromptId: string;
  sourceFolderId: string;
}

export interface CatalogDraft extends CatalogDraftInput {
  id: string;
  ownerUid: string;
  createdAt: any;
  updatedAt: any;
}

export interface CatalogSubmission extends CatalogDraftInput {
  id: string;
  resourceId: string;
  ownerUid: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: any;
  decidedAt: any;
  reviewerUid: string;
  rejectionReason: string;
}

export interface CatalogResource {
  id: string;
  ownerUid: string;
  kind: CatalogKind;
  metadata: CatalogMetadata;
  sourcePromptId: string;
  sourceFolderId: string;
  submissionId: string;
  state: 'published' | 'withdrawn';
  publishedAt: any;
  updatedAt: any;
}

export interface CatalogPayload {
  id: string;
  resourceId: string;
  ownerUid: string;
  kind: CatalogKind;
  submissionId: string;
  content: CatalogContent;
  updatedAt: any;
}

export interface SavedCatalogSkill {
  id: string;
  resourceId: string;
  submissionId: string;
  metadata: CatalogMetadata;
  content: CatalogContent;
  savedAt: any;
}

export interface CatalogFilters {
  query: string;
  kind: CatalogKind | 'all';
  category: string;
  compatibility: string;
  author: string;
}

export interface CatalogIdentity {
  name: string;
  handle: string;
  avatar: string;
}
