import { createHash } from 'node:crypto';
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { z } from 'zod';
import { assertPromptMutation, LibraryAccessError, readLibraryAccess, writeLibraryAccessBootstrap } from './libraryAccess';
import { writeLibraryActivity } from './libraryActivity';
import { runLibraryTransaction } from './libraryTransaction';

const identifier = z.string().min(1).max(256).regex(/^[^/\u0000-\u001f]+$/).refine(value => value !== '.' && value !== '..');
const variable = z.strictObject({ name: z.string().max(100), description: z.string().max(500), defaultValue: z.string().max(500).optional() });
const promptFields = {
  title: z.string().max(150).trim().min(1),
  promptText: z.string().max(10_000).refine(value => value.trim().length > 0),
  description: z.string().max(1000).optional(), category: z.string().max(50).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(), isFavorite: z.boolean().optional(),
  isShared: z.boolean().optional(), notas: z.string().max(6000).optional(),
  suggestedVariables: z.array(variable).max(50).optional(), folderId: identifier.nullable().optional(),
  forkedFrom: z.string().max(150).optional(), forkedFromPromptId: identifier.optional(),
  forkedFromUserId: identifier.optional(), forkedFromAuthorName: z.string().max(150).optional(),
  forkedFromAuthorHandle: z.string().max(150).optional(), forkedFromTitle: z.string().max(150).optional(),
  sourceClassId: identifier.optional(), sourceClassTitle: z.string().max(150).optional(),
};
// Preserve gradual clients while ignoring ownership, authorship, reactions and timestamps.
export const libraryPromptSchema = z.object(promptFields);
const changesSchema = libraryPromptSchema.partial().refine(value => Object.keys(value).length > 0);
const common = { requestId: z.string().min(1).max(128).regex(/^[A-Za-z0-9._:-]+$/), source: z.enum(['web', 'chatgpt', 'qr']).optional() };
export const libraryWriteSchema = z.discriminatedUnion('action', [
  z.strictObject({ ...common, action: z.literal('create'), prompt: libraryPromptSchema }),
  z.strictObject({ ...common, action: z.literal('update'), promptId: identifier, changes: changesSchema, expectedRevision: z.number().int().min(0).optional() }),
  z.strictObject({ ...common, action: z.literal('delete'), promptId: identifier }),
  z.strictObject({ ...common, action: z.literal('import'), prompts: z.array(libraryPromptSchema).min(1).max(100) }),
  z.strictObject({ ...common, action: z.literal('seed'), prompts: z.array(libraryPromptSchema).min(1).max(100) }),
]);
export type LibraryWriteInput = z.infer<typeof libraryWriteSchema>;
export type LibraryWrite = LibraryWriteInput;
export type LibraryPromptInput = z.infer<typeof libraryPromptSchema>;
export type LibraryWriteIdentity = { authorName?: string; authorAvatar?: string; authorHandle?: string };
export type LibraryWriteResult = { promptIds: string[]; createdCount: number; promptId?: string; revision?: number };

export class LibraryWriteError extends Error {
  constructor(readonly code: 'invalid_request' | 'request_conflict' | 'not_found' | 'revision_conflict' | 'pro_required' | 'folder_unavailable', message: string, readonly status = 400) {
    super(message);
  }
}

function digest(value: string) { return createHash('sha256').update(value).digest('base64url'); }
function stable(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => JSON.stringify(key) + ':' + stable(item)).join(',') + '}';
  return JSON.stringify(value);
}
export function libraryUsageRef(db: Firestore, uid: string) { return db.collection('_bibliotecaLibraryUsage').doc(uid); }
function operationRef(db: Firestore, uid: string, requestId: string) { return db.collection('_bibliotecaLibraryOperations').doc(digest(JSON.stringify([uid, requestId]))); }
const unavailable = () => new LibraryWriteError('not_found', 'Este prompt no está disponible en tu biblioteca.', 404);
function canonicalPrompt(uid: string, prompt: LibraryPromptInput, identity: LibraryWriteIdentity) {
  return {
    description: '', category: 'General', tags: [], isFavorite: false, isShared: false,
    ...prompt, userId: uid,
    authorName: identity.authorName?.slice(0, 150) || 'Miembro',
    authorAvatar: identity.authorAvatar?.slice(0, 2000) || '', authorHandle: identity.authorHandle?.slice(0, 150) || '',
    likedBy: [], likesCount: 0, revision: 1,
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  };
}

async function validateFolders(db: Firestore, tx: Transaction, uid: string, folderIds: string[], tier: 'free' | 'pro') {
  if (!folderIds.length) return;
  if (tier !== 'pro') throw new LibraryWriteError('pro_required', 'Activa Pro para organizar prompts en carpetas.', 403);
  const folders = await tx.getAll(...folderIds.map(folderId => db.collection('folders').doc(folderId)));
  for (const folder of folders) {
    const collaborator = folder.get('collaborators')?.[uid];
    if (!folder.exists || typeof folder.get('userId') !== 'string' || typeof folder.get('name') !== 'string'
      || (folder.get('userId') !== uid && !(collaborator?.type === 'user' && collaborator.role === 'editor'))) {
      throw new LibraryWriteError('folder_unavailable', 'Esta carpeta no está disponible para guardar el prompt.', 404);
    }
  }
}

/** All reads happen here. Call commit only after the caller has finished its own reads. */
export async function prepareLibraryWrite(
  db: Firestore, tx: Transaction, uid: string, input: LibraryWriteInput,
  identity: LibraryWriteIdentity = {}, options: { createPromptId?: string } = {},
): Promise<{ result: LibraryWriteResult; commit: () => void }> {
  const receiptRef = operationRef(db, uid, input.requestId);
  const requestHash = digest(stable(input));
  const receipt = await tx.get(receiptRef);
  if (receipt.exists) {
    if (receipt.get('uid') !== uid || receipt.get('requestHash') !== requestHash) {
      throw new LibraryWriteError('request_conflict', 'Este intento ya se usó para otra operación. Vuelve a intentarlo con una solicitud nueva.', 409);
    }
    // Expiry never invalidates a completed write, while revoking the invitation still cuts access.
    if (!(await readLibraryAccess(db, uid, tx)).canRead) throw new LibraryAccessError('access_required');
    return { result: receipt.get('result') as LibraryWriteResult, commit() {} };
  }

  // Preserve retries created by the original ChatGPT pilot, before receipts existed.
  if (input.action === 'create' && options.createPromptId) {
    const existing = await tx.get(db.collection('prompts').doc(options.createPromptId));
    if (existing.exists) {
      if (existing.get('userId') !== uid) throw unavailable();
      if (!(await readLibraryAccess(db, uid, tx)).canRead) throw new LibraryAccessError('access_required');
      return { result: { promptId: existing.id, promptIds: [existing.id], createdCount: 0, revision: Number(existing.get('revision') ?? 0) }, commit() {} };
    }
  }

  const usageRef = libraryUsageRef(db, uid);
  // Finish each transaction RPC before issuing the next one. An aborted read must
  // not leave other reads running against an ID that Firestore has just closed.
  const usage = await tx.get(usageRef);
  const access = await readLibraryAccess(db, uid, tx);
  if (!access.canRead) throw new LibraryAccessError('access_required');
  const storedCount = usage.get('promptCount');
  const needsCount = !Number.isSafeInteger(storedCount) || storedCount < 0;
  const owned = needsCount || input.action === 'seed' || (input.action === 'create' && !!input.prompt.forkedFromPromptId)
    ? await tx.get(db.collection('prompts').where('userId', '==', uid)) : undefined;
  const promptCount = needsCount ? owned!.size : storedCount as number;
  let result: LibraryWriteResult;
  let writePrompts: () => void;
  let nextCount = promptCount;

  if (input.action === 'create' || input.action === 'import' || input.action === 'seed') {
    let prompts = input.action === 'create' ? [input.prompt] : input.prompts;
    const existingFork = input.action === 'create' && input.prompt.forkedFromPromptId
      ? owned?.docs.find(doc => doc.get('forkedFromPromptId') === input.prompt.forkedFromPromptId) : undefined;
    if (existingFork) {
      result = { promptId: existingFork.id, promptIds: [existingFork.id], createdCount: 0, revision: Number(existingFork.get('revision') ?? 0) };
      writePrompts = () => {};
    } else {
      if (input.action === 'seed') {
        const titles = new Set(owned!.docs.map(doc => String(doc.get('title') ?? '').trim().toLocaleLowerCase('es')));
        prompts = prompts.filter(prompt => {
          const key = prompt.title.trim().toLocaleLowerCase('es');
          if (titles.has(key)) return false;
          titles.add(key);
          return true;
        });
      }
      assertPromptMutation(access, { promptCount, additionalCount: prompts.length, promptLengths: prompts.map(prompt => prompt.promptText.length) });
      await validateFolders(db, tx, uid, [...new Set(prompts.flatMap(prompt => prompt.folderId ? [prompt.folderId] : []))], access.tier);
      const refs = prompts.map((_, index) => input.action === 'create' && options.createPromptId && index === 0
        ? db.collection('prompts').doc(options.createPromptId) : db.collection('prompts').doc());
      nextCount += prompts.length;
      result = { promptIds: refs.map(ref => ref.id), createdCount: refs.length, ...(input.action === 'create' ? { promptId: refs[0].id, revision: 1 } : {}) };
      writePrompts = () => refs.forEach((ref, index) => {
        tx.create(ref, canonicalPrompt(uid, prompts[index], identity));
        writeLibraryActivity(tx, db, uid, 'saved-' + digest(ref.id), {
          action: 'saved', kind: 'prompt', resourceId: ref.id, title: prompts[index].title, source: input.source ?? 'web',
        });
      });
    }
  } else {
    const ref = db.collection('prompts').doc(input.promptId);
    const current = await tx.get(ref);
    if (!current.exists || current.get('userId') !== uid) throw unavailable();
    if (input.action === 'delete') {
      nextCount = Math.max(0, promptCount - 1);
      // Versions contain private text and must be removed with their parent.
      const versions = await tx.get(ref.collection('versions'));
      if (versions.size > 400) throw new LibraryWriteError('invalid_request', 'Este prompt necesita una limpieza de historial antes de borrarse.');
      result = { promptId: ref.id, promptIds: [ref.id], createdCount: 0 };
      writePrompts = () => { versions.docs.forEach(version => tx.delete(version.ref)); tx.delete(ref); };
    } else {
      const revision = Number(current.get('revision') ?? 0);
      if (input.expectedRevision !== undefined && input.expectedRevision !== revision) {
        throw new LibraryWriteError('revision_conflict', 'El prompt cambió en otro dispositivo. Recarga la versión actual antes de guardar.', 409);
      }
      const text = input.changes.promptText ?? current.get('promptText');
      if (typeof text !== 'string') throw unavailable();
      assertPromptMutation(access, { promptCount, additionalCount: 0, promptLengths: [text.length] });
      if (input.changes.folderId && input.changes.folderId !== current.get('folderId')) {
        await validateFolders(db, tx, uid, [input.changes.folderId], access.tier);
      }
      const changedText = input.changes.promptText !== undefined && input.changes.promptText !== current.get('promptText');
      const versions = changedText && access.tier === 'pro' ? await tx.get(ref.collection('versions').orderBy('createdAt', 'desc')) : undefined;
      if (versions && versions.size > 400) throw new LibraryWriteError('invalid_request', 'Este prompt necesita una limpieza de historial antes de actualizarse.');
      result = { promptId: ref.id, promptIds: [ref.id], createdCount: 0, revision: revision + 1 };
      writePrompts = () => {
        if (versions) {
          tx.create(ref.collection('versions').doc(digest(input.requestId)), { promptText: current.get('promptText'), createdAt: FieldValue.serverTimestamp() });
          versions.docs.slice(2).forEach(version => tx.delete(version.ref));
        }
        tx.update(ref, { ...input.changes, revision: revision + 1, updatedAt: FieldValue.serverTimestamp() });
      };
    }
  }
  return { result, commit() {
    writeLibraryAccessBootstrap(tx, db, uid, access);
    writePrompts();
    tx.set(usageRef, { promptCount: nextCount, schemaVersion: 1, updatedAt: FieldValue.serverTimestamp() });
    tx.create(receiptRef, { uid, requestHash, result, createdAt: FieldValue.serverTimestamp() });
  } };
}

export async function runLibraryWrite(db: Firestore, uid: string, value: LibraryWriteInput, identity: LibraryWriteIdentity = {}) {
  const parsed = libraryWriteSchema.safeParse(value);
  if (!parsed.success) throw new LibraryWriteError('invalid_request', 'Revisa los datos del prompt e inténtalo de nuevo.');
  const input = parsed.data;
  return runLibraryTransaction(db, async tx => {
    const operation = await prepareLibraryWrite(db, tx, uid, input, identity);
    operation.commit();
    return operation.result;
  });
}

export async function readLibraryPromptCount(db: Firestore, uid: string): Promise<number> {
  // A count query remains correct for legacy records and never writes during a status read.
  return (await db.collection('prompts').where('userId', '==', uid).count().get()).data().count;
}
