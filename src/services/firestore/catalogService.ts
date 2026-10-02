import {
  collection, deleteDoc, doc, documentId, getDoc, getDocs, limit, orderBy, query, runTransaction,
  serverTimestamp, setDoc, startAfter, updateDoc, where,
  type Firestore, type QueryDocumentSnapshot, type DocumentData,
} from 'firebase/firestore';
import type { CatalogDraft, CatalogDraftInput, CatalogPayload, CatalogResource, CatalogSubmission, SavedCatalogSkill } from '../../typesCatalog';
import { validateCatalogDraft, verifySkillRepository } from '../../utils/catalog';

const DRAFTS = 'catalogDrafts';
const SUBMISSIONS = 'catalogSubmissions';
const RESOURCES = 'catalogResources';
const PAYLOADS = 'catalogPayloads';
const BATCH_SIZE = 50;

function assertValid(input: CatalogDraftInput, forSubmission: boolean): void {
  const errors = validateCatalogDraft(input, forSubmission);
  if (errors.length) throw new Error(errors.join('\n'));
}

function draftInput(input: CatalogDraftInput): CatalogDraftInput {
  // Explicitly omit runtime IDs, Firestore timestamps and UI state from snapshots.
  return {
    kind: input.kind,
    metadata: { ...input.metadata, tags: [...input.metadata.tags], compatibility: [...input.metadata.compatibility] },
    content: { ...input.content },
    sourcePromptId: input.sourcePromptId,
    sourceFolderId: input.sourceFolderId,
  };
}

function timestampMillis(value: any): number {
  return typeof value?.toMillis === 'function' ? value.toMillis() : 0;
}

function newestFirst<T>(values: T[], key: keyof T): T[] {
  return values.sort((a, b) => timestampMillis(b[key]) - timestampMillis(a[key]));
}

/** Only public metadata is downloaded here; deliverable content has a separate collection. */
export async function fetchPublishedCatalogResources(db: Firestore): Promise<CatalogResource[]> {
  const resources: CatalogResource[] = [];
  let cursor: QueryDocumentSnapshot<DocumentData> | undefined;
  while (true) {
    const constraints = [where('state', '==', 'published'), orderBy(documentId()), limit(BATCH_SIZE)];
    const snapshot = await getDocs(query(collection(db, RESOURCES), ...constraints, ...(cursor ? [startAfter(cursor)] : [])));
    resources.push(...snapshot.docs.map(item => ({ ...item.data(), id: item.id } as CatalogResource)));
    if (snapshot.size < BATCH_SIZE) break;
    cursor = snapshot.docs.at(-1);
  }
  return newestFirst(resources, 'updatedAt');
}

export async function fetchCatalogResource(db: Firestore, id: string): Promise<CatalogResource | null> {
  if (!id || id.includes('/')) return null;
  try {
    const snapshot = await getDoc(doc(db, RESOURCES, id));
    if (!snapshot.exists() || snapshot.data().state !== 'published') return null;
    return { ...snapshot.data(), id: snapshot.id } as CatalogResource;
  } catch (error) {
    // Withdrawal makes the metadata private again; a shared link should report unavailable.
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'permission-denied') return null;
    throw error;
  }
}

export async function fetchCatalogPayload(db: Firestore, resourceId: string): Promise<CatalogPayload | null> {
  const resource = await fetchCatalogResource(db, resourceId);
  if (!resource) return null;
  const snapshot = await getDoc(doc(db, PAYLOADS, resourceId));
  if (!snapshot.exists()) return null;
  const payload = { ...snapshot.data(), id: snapshot.id } as CatalogPayload;
  if (payload.submissionId !== resource.submissionId) throw new Error('La publicación cambió. Actualiza la ficha para obtener su nueva versión.');
  return payload;
}

export async function fetchPublishedResourceForSource(db: Firestore, source: { promptId?: string; folderId?: string }): Promise<CatalogResource[]> {
  const constraints = [where('state', '==', 'published')];
  if (source.promptId) constraints.push(where('sourcePromptId', '==', source.promptId));
  else if (source.folderId) constraints.push(where('sourceFolderId', '==', source.folderId));
  else return [];
  const snapshot = await getDocs(query(collection(db, RESOURCES), ...constraints));
  return newestFirst(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as CatalogResource)), 'updatedAt');
}

export async function fetchOwnCatalogDrafts(db: Firestore, uid: string): Promise<CatalogDraft[]> {
  const snapshot = await getDocs(query(collection(db, DRAFTS), where('ownerUid', '==', uid)));
  return newestFirst(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as CatalogDraft)), 'updatedAt');
}

export async function fetchOwnCatalogSubmissions(db: Firestore, uid: string): Promise<CatalogSubmission[]> {
  const snapshot = await getDocs(query(collection(db, SUBMISSIONS), where('ownerUid', '==', uid)));
  return newestFirst(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as CatalogSubmission)), 'submittedAt');
}

export async function fetchOwnCatalogResources(db: Firestore, uid: string): Promise<CatalogResource[]> {
  const snapshot = await getDocs(query(collection(db, RESOURCES), where('ownerUid', '==', uid)));
  return newestFirst(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as CatalogResource)), 'updatedAt');
}

export async function fetchPendingCatalogSubmissions(db: Firestore): Promise<CatalogSubmission[]> {
  const snapshot = await getDocs(query(collection(db, SUBMISSIONS), where('status', '==', 'pending')));
  return newestFirst(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as CatalogSubmission)), 'submittedAt');
}

export async function fetchSavedCatalogSkills(db: Firestore, uid: string): Promise<SavedCatalogSkill[]> {
  const snapshot = await getDocs(collection(db, 'users', uid, 'savedCatalogSkills'));
  return newestFirst(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as SavedCatalogSkill)), 'savedAt');
}

export async function saveCatalogDraft(db: Firestore, uid: string, input: CatalogDraftInput, id?: string): Promise<CatalogDraft> {
  assertValid(input, false);
  const ref = id ? doc(db, DRAFTS, id) : doc(collection(db, DRAFTS));
  await runTransaction(db, async transaction => {
    const current = await transaction.get(ref);
    if (current.exists() && current.data().ownerUid !== uid) throw new Error('Este borrador pertenece a otra persona.');
    transaction.set(ref, {
      ...draftInput(input), ownerUid: uid,
      createdAt: current.exists() ? current.data().createdAt : serverTimestamp(), updatedAt: serverTimestamp(),
    });
  });
  const snapshot = await getDoc(ref);
  return { ...snapshot.data(), id: snapshot.id } as CatalogDraft;
}

export async function deleteCatalogDraft(db: Firestore, uid: string, draft: CatalogDraft): Promise<void> {
  if (draft.ownerUid !== uid) throw new Error('Este borrador pertenece a otra persona.');
  await deleteDoc(doc(db, DRAFTS, draft.id));
}

export async function submitCatalogDraft(db: Firestore, uid: string, draft: CatalogDraft): Promise<void> {
  const current = await getDoc(doc(db, DRAFTS, draft.id));
  if (!current.exists() || current.data().ownerUid !== uid) throw new Error('Guarda tu borrador antes de postularlo.');
  const input = draftInput(current.data() as CatalogDraftInput);
  assertValid(input, true);
  if (input.kind === 'skill') await verifySkillRepository(input.content);
  // A separate immutable snapshot means later draft edits never change the reviewed version.
  await setDoc(doc(collection(db, SUBMISSIONS)), {
    ...input, resourceId: draft.id, ownerUid: uid, status: 'pending', submittedAt: serverTimestamp(),
    decidedAt: null, reviewerUid: '', rejectionReason: '',
  });
}

export async function approveCatalogSubmission(db: Firestore, submission: CatalogSubmission, reviewerUid: string): Promise<void> {
  const submissionRef = doc(db, SUBMISSIONS, submission.id);
  const snapshot = await getDoc(submissionRef);
  if (!snapshot.exists() || snapshot.data().status !== 'pending') throw new Error('Esta postulación ya fue resuelta.');
  const reviewed = snapshot.data() as CatalogSubmission;
  assertValid(reviewed, true);
  if (reviewed.kind === 'skill') await verifySkillRepository(reviewed.content);
  await runTransaction(db, async transaction => {
    const current = await transaction.get(submissionRef);
    if (!current.exists() || current.data().status !== 'pending') throw new Error('Esta postulación ya fue resuelta.');
    const approved = current.data() as CatalogSubmission;
    if (JSON.stringify(draftInput(approved)) !== JSON.stringify(draftInput(reviewed))) throw new Error('La versión revisada cambió. Vuelve a revisarla.');
    const resourceRef = doc(db, RESOURCES, approved.resourceId);
    const resource = await transaction.get(resourceRef);
    if (resource.exists() && (resource.data().ownerUid !== approved.ownerUid || resource.data().kind !== approved.kind)) {
      throw new Error('El recurso existente tiene un autor o tipo diferente.');
    }
    transaction.update(submissionRef, { status: 'approved', reviewerUid, decidedAt: serverTimestamp(), rejectionReason: '' });
    transaction.set(resourceRef, {
      ownerUid: approved.ownerUid, kind: approved.kind, metadata: approved.metadata,
      sourcePromptId: approved.sourcePromptId, sourceFolderId: approved.sourceFolderId,
      submissionId: submission.id, state: 'published',
      publishedAt: resource.exists() ? resource.data().publishedAt : serverTimestamp(), updatedAt: serverTimestamp(),
    });
    transaction.set(doc(db, PAYLOADS, approved.resourceId), {
      resourceId: approved.resourceId, ownerUid: approved.ownerUid, kind: approved.kind,
      submissionId: submission.id, content: approved.content, updatedAt: serverTimestamp(),
    });
  });
}

export async function rejectCatalogSubmission(db: Firestore, submission: CatalogSubmission, reviewerUid: string, reason: string): Promise<void> {
  if (!reason.trim() || reason.length > 2000) throw new Error('Explica el rechazo en hasta 2.000 caracteres.');
  await runTransaction(db, async transaction => {
    const ref = doc(db, SUBMISSIONS, submission.id);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists() || snapshot.data().status !== 'pending') throw new Error('Esta postulación ya fue resuelta.');
    transaction.update(ref, { status: 'rejected', reviewerUid, decidedAt: serverTimestamp(), rejectionReason: reason.trim() });
  });
}

export async function withdrawCatalogResource(db: Firestore, resource: CatalogResource, uid: string): Promise<void> {
  if (resource.ownerUid !== uid) throw new Error('Solo el autor puede retirar esta publicación.');
  await updateDoc(doc(db, RESOURCES, resource.id), { state: 'withdrawn', updatedAt: serverTimestamp() });
}

export async function saveCatalogSkill(db: Firestore, uid: string, resource: CatalogResource, payload: CatalogPayload): Promise<void> {
  if (resource.kind !== 'skill' || payload.kind !== 'skill' || payload.resourceId !== resource.id || payload.submissionId !== resource.submissionId) {
    throw new Error('El contenido no corresponde a la versión de esta skill. Actualiza la ficha.');
  }
  await setDoc(doc(db, 'users', uid, 'savedCatalogSkills', resource.id), {
    resourceId: resource.id, submissionId: resource.submissionId,
    metadata: resource.metadata, content: payload.content, savedAt: serverTimestamp(),
  });
}
