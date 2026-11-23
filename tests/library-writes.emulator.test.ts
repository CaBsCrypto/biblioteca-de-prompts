import { randomUUID } from 'node:crypto';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptGuestDraft } from '../src/features/guestPrompt/draftHandoffCrypto';
import { getBibliotecaAdmin } from '../src/services/server/firebaseAdmin';
import { runLibraryWrite, type LibraryPromptInput } from '../src/services/server/libraryWrites';
import { ensurePilotEntry } from '../src/services/server/libraryAccess';
import { getPersonalPrompt, listPersonalPrompts } from '../src/services/server/personalLibrary';
import { claimPromptTransfer, createPromptTransfer } from '../src/services/server/promptTransfers';

const local = process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8080'
  && process.env.FIREBASE_AUTH_EMULATOR_HOST === '127.0.0.1:9099';
const accounts: string[] = [];
const transfers: string[] = [];
const folders: string[] = [];
const text = (length: number) => 'a'.repeat(length);
const draft = (ordinal = 1) => ({ title: `Prompt ficticio ${ordinal}`, promptText: `Texto ficticio ${ordinal}` });
// The emulator can hold contended transaction locks for up to 30 seconds.
const concurrentTimeout = 60_000;

async function newCommercialAccount() {
  const { db } = getBibliotecaAdmin();
  if ((db as unknown as { projectId: string }).projectId !== 'demo-biblioteca') throw new Error('Esta prueba solo usa el emulador.');
  const uid = 'library-commercial-' + randomUUID();
  accounts.push(uid);
  return { db, uid };
}

async function account(pro = false) {
  const { db } = getBibliotecaAdmin();
  if ((db as unknown as { projectId: string }).projectId !== 'demo-biblioteca') throw new Error('Estas pruebas solo escriben en el proyecto de emulador.');
  const uid = 'library-writes-' + randomUUID();
  accounts.push(uid);
  const now = Date.now();
  await Promise.all([
    db.collection('_bibliotecaEntitlements').doc(uid).set({ chatgptPersonalLibrary: true, expiresAt: Timestamp.fromMillis(now + 3_600_000) }),
    db.collection('_bibliotecaPilotEntries').doc(uid).set({ startedAt: Timestamp.fromMillis(now), expiresAt: Timestamp.fromMillis(now + 48 * 3_600_000) }),
    ...(pro ? [db.collection('_bibliotecaAccessGrants').doc(uid).collection('sources').doc('test-code').set({
      tier: 'pro', source: 'code', startsAt: Timestamp.fromMillis(now - 60_000), expiresAt: Timestamp.fromMillis(now + 3_600_000),
    })] : []),
  ]);
  return { db, uid };
}

async function create(db: Firestore, uid: string, prompt: LibraryPromptInput = draft(), requestId = randomUUID()) {
  const receipt = await runLibraryWrite(db, uid, { action: 'create', requestId, prompt, source: 'web' });
  expect(receipt.promptId).toEqual(expect.any(String));
  if (!receipt.promptId) throw new Error('Falta el identificador del prompt guardado.');
  return receipt.promptId;
}

async function ownPrompts(db: Firestore, uid: string) {
  return db.collection('prompts').where('userId', '==', uid).get();
}

describe.skipIf(!local)('Escrituras y cuotas compartidas con Firestore local', () => {
  beforeEach(() => vi.stubEnv('BIBLIOTECA_LIBRARY_BETA_ENABLED', 'true'));

  afterEach(async () => {
    const { db } = getBibliotecaAdmin();
    if ((db as unknown as { projectId: string }).projectId !== 'demo-biblioteca') throw new Error('No se limpiarán datos fuera del emulador.');
    for (const uid of accounts.splice(0)) {
      const prompts = await ownPrompts(db, uid);
      await Promise.all(prompts.docs.map(prompt => db.recursiveDelete(prompt.ref)));
      const operationQueries = await Promise.all(['uid', 'userId'].map(field =>
        db.collection('_bibliotecaLibraryOperations').where(field, '==', uid).get()));
      const operations = new Map(operationQueries.flatMap(snapshot => snapshot.docs.map(doc => [doc.id, doc.ref] as const)));
      await Promise.all([...operations.values()].map(ref => ref.delete()));
      await Promise.all([
        db.collection('_bibliotecaEntitlements').doc(uid).delete(),
        db.collection('_bibliotecaPilotEntries').doc(uid).delete(),
        db.collection('_bibliotecaLibraryUsage').doc(uid).delete(),
        db.recursiveDelete(db.collection('_bibliotecaAccessGrants').doc(uid)),
        db.recursiveDelete(db.collection('users').doc(uid).collection('libraryActivity')),
      ]);
    }
    await Promise.all(transfers.splice(0).map(id => db.collection('_promptTransfers').doc(id).delete()));
    await Promise.all(folders.splice(0).map(id => db.collection('folders').doc(id).delete()));
    vi.unstubAllEnvs();
  });

  it('abre Gratis sin invitación, conserva datos al bajar de Pro y libera plazas', async () => {
    vi.stubEnv('BIBLIOTECA_LIBRARY_BETA_ENABLED', 'false');
    vi.stubEnv('BIBLIOTECA_LIBRARY_COMMERCIAL_ENABLED', 'true');
    const { db, uid } = await newCommercialAccount();
    const config = db.collection('_bibliotecaConfig').doc('library');
    const original = await config.get();
    try {
      await config.set({ enforced: true });
      await expect(ensurePilotEntry(db, uid)).rejects.toMatchObject({ code: 'library_unavailable' });
      await config.set({ enforced: true, mode: 'commercial' });
      const access = await ensurePilotEntry(db, uid);
      expect(access).toMatchObject({ tier: 'free', canRead: true, canMutate: true, promptLimit: 3, promptCharacterLimit: 2500 });
      expect(access.betaExpiresAt).toBeUndefined();
      expect((await db.collection('_bibliotecaPilotEntries').doc(uid).get()).exists).toBe(false);
      const first = await create(db, uid, { title: 'Primero', promptText: text(2500) });
      await expect(runLibraryWrite(db, uid, { action: 'create', requestId: randomUUID(), prompt: { title: 'Demasiado largo', promptText: text(2501) } })).rejects.toMatchObject({ code: 'prompt_too_long' });
      await create(db, uid, draft(2));
      await create(db, uid, draft(3));
      await expect(runLibraryWrite(db, uid, { action: 'create', requestId: randomUUID(), prompt: draft(4) })).rejects.toMatchObject({ code: 'prompt_limit' });

      const grant = db.collection('_bibliotecaAccessGrants').doc(uid).collection('sources').doc('gift');
      await grant.set({ tier: 'pro', source: 'code', startsAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(Date.now() + 60_000) });
      const fourth = await create(db, uid, { title: 'Guardado Pro', promptText: text(10_000) });
      await grant.update({ expiresAt: Timestamp.fromMillis(Date.now() - 1) });
      expect(await ensurePilotEntry(db, uid)).toMatchObject({ tier: 'free', canRead: true, canMutate: true });
      expect((await ownPrompts(db, uid)).size).toBe(4);
      await expect(getPersonalPrompt(db, uid, fourth)).resolves.toMatchObject({ promptText: text(10_000) });
      await runLibraryWrite(db, uid, { action: 'delete', promptId: fourth, requestId: randomUUID() });
      await expect(runLibraryWrite(db, uid, { action: 'create', requestId: randomUUID(), prompt: draft(5) })).rejects.toMatchObject({ code: 'prompt_limit' });
      await runLibraryWrite(db, uid, { action: 'delete', promptId: first, requestId: randomUUID() });
      await create(db, uid, draft(6));
      expect((await ownPrompts(db, uid)).size).toBe(3);
    } finally {
      if (original.exists) await config.set(original.data()!);
      else await config.delete();
    }
  });

  it('serializa cuatro altas simultáneas de web y ChatGPT en tres plazas Gratis', async () => {
    const { db, uid } = await account();
    const outcomes = await Promise.allSettled(Array.from({ length: 4 }, (_, index) => runLibraryWrite(db, uid, {
      action: 'create', requestId: randomUUID(), prompt: draft(index), source: index % 2 ? 'web' : 'chatgpt',
    })));
    expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(3);
    expect(outcomes.filter(outcome => outcome.status === 'rejected')).toMatchObject([
      { reason: { code: 'prompt_limit' } },
    ]);
    expect((await ownPrompts(db, uid)).size).toBe(3);
  }, concurrentTimeout);

  it('acepta 2500 caracteres Gratis y rechaza 2501 sin escribir', async () => {
    const { db, uid } = await account();
    const id = await create(db, uid, { title: 'Límite Gratis', promptText: text(2500) });
    await expect(runLibraryWrite(db, uid, {
      action: 'create', requestId: randomUUID(), prompt: { title: 'Sobre el límite', promptText: text(2501) },
    })).rejects.toMatchObject({ code: 'prompt_too_long' });
    const saved = await ownPrompts(db, uid);
    expect(saved.docs.map(doc => doc.id)).toEqual([id]);
    expect(saved.docs[0].get('promptText')).toHaveLength(2500);
  });

  it('acepta 10000 caracteres Pro y rechaza 10001 sin truncar el original', async () => {
    const { db, uid } = await account(true);
    const id = await create(db, uid, { title: 'Límite Pro', promptText: text(10_000) });
    await expect(runLibraryWrite(db, uid, {
      action: 'create', requestId: randomUUID(), prompt: { title: 'Sobre el límite Pro', promptText: text(10_001) },
    })).rejects.toMatchObject({ code: expect.stringMatching(/^(invalid_request|prompt_too_long)$/) });
    expect((await ownPrompts(db, uid)).size).toBe(1);
    expect((await db.collection('prompts').doc(id).get()).get('promptText')).toHaveLength(10_000);
  });

  it('devuelve el recibo original tras vencer el acceso sin crear otra copia', async () => {
    const { db, uid } = await account();
    const input = { action: 'create' as const, requestId: randomUUID(), prompt: draft(), source: 'chatgpt' as const };
    const first = await runLibraryWrite(db, uid, input);
    await db.collection('_bibliotecaPilotEntries').doc(uid).update({ expiresAt: Timestamp.fromMillis(Date.now() - 1) });
    await expect(runLibraryWrite(db, uid, input)).resolves.toEqual(first);
    await expect(runLibraryWrite(db, uid, { ...input, requestId: randomUUID() })).rejects.toMatchObject({ code: 'access_expired' });
    expect((await ownPrompts(db, uid)).size).toBe(1);
  });

  it('rechaza reutilizar requestId con otro contenido y conserva la primera escritura', async () => {
    const { db, uid } = await account();
    const input = { action: 'create' as const, requestId: randomUUID(), prompt: draft() };
    const first = await runLibraryWrite(db, uid, input);
    await expect(runLibraryWrite(db, uid, { ...input, prompt: draft(2) })).rejects.toMatchObject({ code: 'request_conflict' });
    expect((await ownPrompts(db, uid)).docs.map(doc => doc.data().promptText)).toEqual([input.prompt.promptText]);
    await expect(runLibraryWrite(db, uid, input)).resolves.toEqual(first);
  });

  it('permite consultar y borrar al vencer la beta, bloquea cambios y respeta revocar la invitación', async () => {
    const { db, uid } = await account();
    const input = { action: 'create' as const, requestId: randomUUID(), prompt: draft() };
    const first = await runLibraryWrite(db, uid, input);
    const id = first.promptId!;
    await db.collection('_bibliotecaPilotEntries').doc(uid).update({ expiresAt: Timestamp.fromMillis(Date.now() - 1) });
    expect((await listPersonalPrompts(db, uid)).prompts.map(prompt => prompt.id)).toEqual([id]);
    await expect(getPersonalPrompt(db, uid, id)).resolves.toMatchObject({ id, ...draft() });
    await expect(runLibraryWrite(db, uid, {
      action: 'update', requestId: randomUUID(), promptId: id, changes: { title: 'Edición bloqueada' },
    })).rejects.toMatchObject({ code: 'access_expired' });
    await expect(runLibraryWrite(db, uid, { ...input, requestId: randomUUID() })).rejects.toMatchObject({ code: 'access_expired' });
    await expect(runLibraryWrite(db, uid, input)).resolves.toEqual(first);
    await runLibraryWrite(db, uid, { action: 'delete', requestId: randomUUID(), promptId: id });
    expect((await ownPrompts(db, uid)).empty).toBe(true);
    await db.collection('_bibliotecaEntitlements').doc(uid).update({ chatgptPersonalLibrary: false });
    await expect(runLibraryWrite(db, uid, input)).rejects.toMatchObject({ code: 'access_required' });
  });

  it('borra una sola vez y libera exactamente una plaza aunque se reintente', async () => {
    const { db, uid } = await account();
    const ids = await Promise.all([1, 2, 3].map(index => create(db, uid, draft(index))));
    const input = { action: 'delete' as const, requestId: randomUUID(), promptId: ids[0] };
    const first = await runLibraryWrite(db, uid, input);
    await expect(runLibraryWrite(db, uid, input)).resolves.toEqual(first);
    expect((await ownPrompts(db, uid)).size).toBe(2);
    await create(db, uid, draft(4));
    await expect(runLibraryWrite(db, uid, { action: 'create', requestId: randomUUID(), prompt: draft(5) })).rejects.toMatchObject({ code: 'prompt_limit' });
    expect((await ownPrompts(db, uid)).size).toBe(3);
  }, concurrentTimeout);

  it('actualiza sin consumir una plaza y aplica el límite al nuevo cuerpo', async () => {
    const { db, uid } = await account();
    const ids = await Promise.all([1, 2, 3].map(index => create(db, uid, draft(index))));
    await runLibraryWrite(db, uid, { action: 'update', requestId: randomUUID(), promptId: ids[0], changes: { promptText: text(2500) } });
    await expect(runLibraryWrite(db, uid, {
      action: 'update', requestId: randomUUID(), promptId: ids[0], changes: { promptText: text(2501) },
    })).rejects.toMatchObject({ code: 'prompt_too_long' });
    expect((await db.collection('prompts').doc(ids[0]).get()).get('promptText')).toHaveLength(2500);
    expect((await ownPrompts(db, uid)).size).toBe(3);
    await expect(runLibraryWrite(db, uid, { action: 'create', requestId: randomUUID(), prompt: draft(4) })).rejects.toMatchObject({ code: 'prompt_limit' });
  }, concurrentTimeout);

  it('impide editar o borrar el prompt de otra cuenta', async () => {
    const { db, uid } = await account();
    const other = await account();
    const id = await create(db, uid);
    await expect(runLibraryWrite(db, other.uid, {
      action: 'update', requestId: randomUUID(), promptId: id, changes: { promptText: 'Cambio ajeno' },
    })).rejects.toMatchObject({ code: 'not_found' });
    await expect(runLibraryWrite(db, other.uid, { action: 'delete', requestId: randomUUID(), promptId: id })).rejects.toMatchObject({ code: 'not_found' });
    expect((await db.collection('prompts').doc(id).get()).data()).toMatchObject({ userId: uid, ...draft() });
    expect((await ownPrompts(db, other.uid)).empty).toBe(true);
  });

  it('reconcilia una biblioteca heredada sobre la cuota sin borrar ni impedir consultar sus originales', async () => {
    const { db, uid } = await account();
    const refs = Array.from({ length: 4 }, () => db.collection('prompts').doc());
    await Promise.all(refs.map((ref, index) => ref.set({
      userId: uid, ...draft(index), isShared: false, createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    })));
    await expect(runLibraryWrite(db, uid, { action: 'create', requestId: randomUUID(), prompt: draft(5) })).rejects.toMatchObject({ code: 'prompt_limit' });
    expect((await listPersonalPrompts(db, uid)).prompts).toHaveLength(4);
    await expect(getPersonalPrompt(db, uid, refs[0].id)).resolves.toMatchObject({ id: refs[0].id, ...draft(0) });
    await runLibraryWrite(db, uid, { action: 'delete', requestId: randomUUID(), promptId: refs[0].id });
    expect((await ownPrompts(db, uid)).size).toBe(3);
    await expect(runLibraryWrite(db, uid, { action: 'create', requestId: randomUUID(), prompt: draft(6) })).rejects.toMatchObject({ code: 'prompt_limit' });
  }, 20_000);

  it('rechaza una importación sobre la cuota de forma atómica', async () => {
    const { db, uid } = await account();
    await expect(runLibraryWrite(db, uid, {
      action: 'import', requestId: randomUUID(), prompts: [1, 2, 3, 4].map(index => draft(index)),
    })).rejects.toMatchObject({ code: 'prompt_limit' });
    expect((await ownPrompts(db, uid)).empty).toBe(true);
    const input = { action: 'import' as const, requestId: randomUUID(), prompts: [1, 2, 3].map(index => draft(index)) };
    const first = await runLibraryWrite(db, uid, input);
    expect(first).toMatchObject({ createdCount: 3, promptIds: expect.any(Array) });
    await expect(runLibraryWrite(db, uid, input)).resolves.toEqual(first);
    expect((await ownPrompts(db, uid)).size).toBe(3);
  }, 20_000);

  it('conserva el QR sin reclamar cuando falla la cuota y permite guardarlo al liberar una plaza', async () => {
    const { db, uid } = await account();
    const ids = await Promise.all([1, 2, 3].map(index => create(db, uid, draft(index))));
    const { request, secret } = await encryptGuestDraft(draft(4));
    transfers.push(request.codeHash);
    await createPromptTransfer(db, request, randomUUID());
    await expect(claimPromptTransfer(db, secret, uid)).rejects.toMatchObject({ code: 'prompt_limit' });
    const ref = db.collection('_promptTransfers').doc(request.codeHash);
    const rejected = await ref.get();
    expect(rejected.get('envelope')).toEqual(request.envelope);
    expect(rejected.get('claimedUid')).toBeUndefined();
    expect(rejected.get('promptId')).toBeUndefined();
    expect((await ownPrompts(db, uid)).size).toBe(3);
    await runLibraryWrite(db, uid, { action: 'delete', requestId: randomUUID(), promptId: ids[0] });
    const claimed = await claimPromptTransfer(db, secret, uid);
    await expect(claimPromptTransfer(db, secret, uid)).resolves.toEqual(claimed);
    expect((await ownPrompts(db, uid)).size).toBe(3);
    expect((await ref.get()).get('envelope')).toBeUndefined();
  }, concurrentTimeout);

  it('solo permite asignar carpetas a Pro si es propietario o editor individual', async () => {
    const { db, uid } = await account(true);
    const owner = await account(true);
    const own = db.collection('folders').doc();
    const shared = db.collection('folders').doc();
    folders.push(own.id, shared.id);
    await Promise.all([
      own.set({ userId: uid, name: 'Propia', createdAt: Timestamp.now() }),
      shared.set({ userId: owner.uid, name: 'Compartida', collaborators: { [uid]: { type: 'user', role: 'editor' } }, createdAt: Timestamp.now() }),
    ]);
    await create(db, uid, { ...draft(1), folderId: own.id });
    const id = await create(db, uid, { ...draft(2), folderId: shared.id });
    expect((await db.collection('prompts').doc(id).get()).get('folderId')).toBe(shared.id);
    for (const collaborator of [{ type: 'user', role: 'viewer' }, { type: 'classroom', role: 'editor' }]) {
      await shared.update({ collaborators: { [uid]: collaborator } });
      await expect(runLibraryWrite(db, uid, {
        action: 'create', requestId: randomUUID(), prompt: { ...draft(3), folderId: shared.id },
      })).rejects.toMatchObject({ code: 'folder_unavailable' });
    }
    expect((await ownPrompts(db, uid)).size).toBe(2);
  }, 20_000);

  it('conserva o limpia la carpeta al bajar a Gratis pero impide nuevas asignaciones', async () => {
    const { db, uid } = await account(true);
    const first = db.collection('folders').doc();
    const second = db.collection('folders').doc();
    folders.push(first.id, second.id);
    await Promise.all([first, second].map(ref => ref.set({ userId: uid, name: ref.id, createdAt: Timestamp.now() })));
    const id = await create(db, uid, { ...draft(), folderId: first.id });
    await db.collection('_bibliotecaAccessGrants').doc(uid).collection('sources').doc('test-code').delete();
    await runLibraryWrite(db, uid, { action: 'update', requestId: randomUUID(), promptId: id, changes: { title: 'Sigue en su carpeta', folderId: first.id } });
    expect((await db.collection('prompts').doc(id).get()).get('folderId')).toBe(first.id);
    await expect(runLibraryWrite(db, uid, {
      action: 'update', requestId: randomUUID(), promptId: id, changes: { folderId: second.id },
    })).rejects.toMatchObject({ code: 'pro_required' });
    await runLibraryWrite(db, uid, { action: 'update', requestId: randomUUID(), promptId: id, changes: { folderId: null } });
    expect((await db.collection('prompts').doc(id).get()).get('folderId')).toBeNull();
    await expect(runLibraryWrite(db, uid, {
      action: 'create', requestId: randomUUID(), prompt: { ...draft(2), folderId: first.id },
    })).rejects.toMatchObject({ code: 'pro_required' });
    expect((await ownPrompts(db, uid)).size).toBe(1);
  }, 20_000);

  it('crea versiones nuevas solo con Pro y conserva el historial después de bajar a Gratis', async () => {
    const { db, uid } = await account();
    const id = await create(db, uid);
    const ref = db.collection('prompts').doc(id);
    await runLibraryWrite(db, uid, { action: 'update', requestId: randomUUID(), promptId: id, changes: { promptText: 'Edición Gratis' } });
    expect((await ref.collection('versions').get()).empty).toBe(true);
    await db.collection('_bibliotecaAccessGrants').doc(uid).collection('sources').doc('test-code').set({
      tier: 'pro', source: 'code', startsAt: Timestamp.fromMillis(Date.now() - 60_000), expiresAt: Timestamp.fromMillis(Date.now() + 3_600_000),
    });
    await runLibraryWrite(db, uid, { action: 'update', requestId: randomUUID(), promptId: id, changes: { promptText: 'Edición Pro' } });
    const history = await ref.collection('versions').get();
    expect(history.docs.map(doc => doc.get('promptText'))).toEqual(['Edición Gratis']);
    await db.collection('_bibliotecaAccessGrants').doc(uid).collection('sources').doc('test-code').delete();
    await runLibraryWrite(db, uid, { action: 'update', requestId: randomUUID(), promptId: id, changes: { promptText: 'Otra edición Gratis' } });
    expect((await ref.collection('versions').get()).docs.map(doc => doc.data())).toEqual(history.docs.map(doc => doc.data()));
    expect((await ref.get()).get('promptText')).toBe('Otra edición Gratis');
  }, 20_000);

  it('deduplica el mismo remix entre web y ChatGPT y conserva la copia editada con la cuota llena', async () => {
    const { db, uid } = await account();
    const prompt = { ...draft(), forkedFromPromptId: 'public-source-' + randomUUID() };
    const results = await Promise.all(['web', 'chatgpt'].map(source => runLibraryWrite(db, uid, {
      action: 'create', requestId: randomUUID(), source: source as 'web' | 'chatgpt', prompt,
    })));
    expect(new Set(results.map(result => result.promptId)).size).toBe(1);
    expect(results.map(result => result.createdCount).sort()).toEqual([0, 1]);
    const id = results[0].promptId!;
    await runLibraryWrite(db, uid, { action: 'update', requestId: randomUUID(), promptId: id, changes: { promptText: 'Mi edición personal' } });
    await Promise.all([2, 3].map(index => create(db, uid, draft(index))));
    await expect(runLibraryWrite(db, uid, { action: 'create', requestId: randomUUID(), prompt })).resolves.toMatchObject({ promptId: id, createdCount: 0 });
    expect((await ownPrompts(db, uid)).size).toBe(3);
    expect((await db.collection('prompts').doc(id).get()).get('promptText')).toBe('Mi edición personal');
  }, concurrentTimeout);
});
