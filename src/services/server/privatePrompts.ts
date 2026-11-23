import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

export const privateDraftSchema = z.strictObject({
  title: z.string().max(100).trim().min(1),
  promptText: z.string().max(10_000).refine(value => value.trim().length > 0),
});

export type PrivateDraft = z.infer<typeof privateDraftSchema>;

export function newPrivatePrompt(uid: string, draft: PrivateDraft) {
  return {
    ...draft,
    userId: uid,
    category: 'General',
    description: '',
    tags: [],
    likedBy: [],
    likesCount: 0,
    isFavorite: false,
    isShared: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}
