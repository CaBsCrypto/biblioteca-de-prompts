import { managedLibraryEnabled } from './libraryMode';
import { createHash } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { CatalogContentResult } from '../../mcp/contracts';
import type { CatalogContent, SavedCatalogSkill } from '../../typesCatalog';
import { libraryActivityCollection, writeLibraryActivity, type LibraryActivitySource } from './libraryActivity';
import { assertPromptMutation, readLibraryAccess } from './libraryAccess';

export const libraryResourceId = z.string().min(1).max(200).regex(/^[^/\u0000-\u001f]+$/).refine(id => id !== '.' && id !== '..');
export const recordLibraryUseInput = z.strictObject({
  kind: z.enum(['prompt', 'skill']), resourceId: libraryResourceId, requestId: z.uuid(),
});

export class LibraryCollectionError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function skillsCollection(db: Firestore, uid: string) {
  return db.collection('users').doc(uid).collection('savedCatalogSkills');
}

function skillSummary(id: string, data: SavedCatalogSkill) {
  return {
    id, title: data.metadata.title, summary: data.metadata.summary, submissionId: data.submissionId,
    authorName: data.metadata.authorName, license: data.metadata.license,
  };
}

export async function listLibrarySkills(db: Firestore, uid: string) {
  const result = await skillsCollection(db, uid).orderBy('savedAt', 'desc').limit(50).get();
  return result.docs.map(doc => skillSummary(doc.id, doc.data() as SavedCatalogSkill));
}

export async function getLibrarySkill(db: Firestore, uid: string, id: string) {
  const snapshot = await skillsCollection(db, uid).doc(id).get();
  if (!snapshot.exists) throw new LibraryCollectionError(404, 'Esta skill no está en tu biblioteca.');
  const data = snapshot.data() as SavedCatalogSkill;
  return { ...skillSummary(id, data), content: data.content as CatalogContent };
}

export async function saveLibrarySkill(db: Firestore, uid: string, result: CatalogContentResult, source: 'web' | 'chatgpt') {
  const { resource, content } = result;
  if (resource.kind !== 'skill') throw new LibraryCollectionError(400, 'Selecciona una skill publicada.');
  const ref = skillsCollection(db, uid).doc(resource.id);
  const eventId = createHash('sha256').update(JSON.stringify(['saved', 'skill', resource.id, resource.submissionId])).digest('base64url');
  return db.runTransaction(async transaction => {
    const previous = await transaction.get(ref);
    if (previous.get('submissionId') !== resource.submissionId) {
      if (managedLibraryEnabled()) {
        assertPromptMutation(await readLibraryAccess(db, uid, transaction), { promptCount: 0, promptLengths: [], additionalCount: 0 });
      }
      transaction.set(ref, {
        resourceId: resource.id, submissionId: resource.submissionId,
        metadata: resource.metadata, content, savedAt: FieldValue.serverTimestamp(),
      });
      writeLibraryActivity(transaction, db, uid, eventId, {
        kind: 'skill', action: 'saved', resourceId: resource.id, title: resource.metadata.title, source,
      });
    }
    return { id: resource.id };
  });
}

export async function recordLibraryUse(
  db: Firestore,
  uid: string,
  { kind, resourceId, requestId }: z.infer<typeof recordLibraryUseInput>,
  source: LibraryActivitySource,
) {
  const ref = kind === 'prompt' ? db.collection('prompts').doc(resourceId) : skillsCollection(db, uid).doc(resourceId);
  const eventId = 'use_' + requestId;
  return db.runTransaction(async transaction => {
    const event = await transaction.get(libraryActivityCollection(db, uid).doc(eventId));
    if (event.exists) return { recorded: true };
    const item = await transaction.get(ref);
    if (!item.exists || (kind === 'prompt' && item.get('userId') !== uid)) {
      throw new LibraryCollectionError(404, 'El recurso no está en tu biblioteca.');
    }
    const title = item.get(kind === 'prompt' ? 'title' : 'metadata.title');
    writeLibraryActivity(transaction, db, uid, eventId, {
      action: 'used', kind, resourceId, source, title: typeof title === 'string' ? title.slice(0, 150) : 'Recurso',
    });
    return { recorded: true };
  });
}
