import { managedLibraryEnabled } from './libraryMode';
import { createHash } from 'node:crypto';
import type { UserRecord } from 'firebase-admin/auth';
import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { newPrivatePrompt, type PrivateDraft } from './privatePrompts';
import { ensurePilotEntry, readLibraryAccess, type LibraryAccess } from './libraryAccess';
import { prepareLibraryWrite, readLibraryPromptCount } from './libraryWrites';
import { runLibraryTransaction } from './libraryTransaction';

export class PersonalLibraryError extends Error {
  constructor(readonly code: 'entitlement_required' | 'not_found') {
    super(code === 'entitlement_required'
      ? 'La biblioteca personal en ChatGPT no está disponible para esta cuenta.'
      : 'Este prompt no está disponible en tu biblioteca.');
  }
}

const PAGE_SIZE = 20;

export type PersonalLibraryProfile = {
  displayName?: string;
  maskedEmail?: string;
};

export function personalLibraryProfile(user: UserRecord): PersonalLibraryProfile {
  const displayName = user.displayName?.trim().slice(0, 80);
  const email = user.emailVerified ? user.email : undefined;
  const separator = email?.lastIndexOf('@') ?? -1;
  const maskedEmail = email && separator > 0 && separator < email.length - 1
    ? [...email.slice(0, separator)].slice(0, 2).join('') + '•••' + email.slice(separator)
    : undefined;
  return { displayName, maskedEmail };
}

export async function assertPersonalLibraryAccess(db: Firestore, uid: string) {
  if (process.env.BIBLIOTECA_LIBRARY_BETA_ENABLED === 'true') {
    if (!(await readLibraryAccess(db, uid)).canRead) throw new PersonalLibraryError('entitlement_required');
    return;
  }
  const pilot = await db.collection('_bibliotecaEntitlements').doc(uid).get();
  if (pilot.get('chatgptPersonalLibrary') !== true || (pilot.get('expiresAt')?.toMillis?.() ?? 0) <= Date.now()) {
    throw new PersonalLibraryError('entitlement_required');
  }
}

export type PersonalLibraryAccess = Omit<LibraryAccess, 'bootstrapRequired' | 'bootstrapStartedAt'>;

export async function getPersonalLibraryStatus(db: Firestore, uid: string): Promise<{ access: PersonalLibraryAccess; count: number }> {
  const [access, count] = await Promise.all([ensurePilotEntry(db, uid), readLibraryPromptCount(db, uid)]);
  return { access, count };
}

export async function listPersonalPrompts(db: Firestore, uid: string, cursor?: string): Promise<{
  prompts: { id: string; title: string }[]; nextCursor?: string; access?: PersonalLibraryAccess; count?: number;
}> {
  const own = db.collection('prompts').where('userId', '==', uid).orderBy(FieldPath.documentId());
  const page = await (cursor ? own.startAfter(cursor) : own).limit(PAGE_SIZE + 1).get();
  const status = !cursor && managedLibraryEnabled()
    ? await getPersonalLibraryStatus(db, uid) : undefined;
  return {
    prompts: page.docs.slice(0, PAGE_SIZE).map(doc => ({ id: doc.id, title: String(doc.get('title') ?? 'Prompt').slice(0, 150) })),
    ...(page.size > PAGE_SIZE ? { nextCursor: page.docs[PAGE_SIZE - 1].id } : {}),
    ...status,
  };
}

export async function getPersonalPrompt(db: Firestore, uid: string, id: string) {
  const doc = await db.collection('prompts').doc(id).get();
  if (!doc.exists || doc.get('userId') !== uid || typeof doc.get('promptText') !== 'string') throw new PersonalLibraryError('not_found');
  return { id, title: String(doc.get('title') ?? 'Prompt').slice(0, 150), promptText: (doc.get('promptText') as string).slice(0, 10_000) };
}

export async function savePersonalPrompt(db: Firestore, uid: string, requestId: string, draft: PrivateDraft) {
  // A retry returns the same prompt and never replaces subsequent edits.
  const id = 'chat_' + createHash('sha256').update(JSON.stringify([uid, requestId])).digest('base64url');
  const ref = db.collection('prompts').doc(id);
  if (managedLibraryEnabled()) {
    const result = await runLibraryTransaction(db, async tx => {
      const operation = await prepareLibraryWrite(db, tx, uid, {
        action: 'create', requestId, prompt: draft, source: 'chatgpt',
      }, {}, { createPromptId: id });
      operation.commit();
      return operation.result;
    });
    return { promptId: result.promptId! };
  }
  await db.runTransaction(async tx => {
    const current = await tx.get(ref);
    if (!current.exists) tx.create(ref, newPrivatePrompt(uid, draft));
    else if (current.get('userId') !== uid) throw new PersonalLibraryError('not_found');
  });
  return { promptId: id };
}
