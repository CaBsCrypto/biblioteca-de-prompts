import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { getBibliotecaAdmin } from '../src/services/server/firebaseAdmin';
import { groupActionSchema, runGroupAction } from '../src/services/server/workGroups';

const local = process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8080'
  && process.env.FIREBASE_AUTH_EMULATOR_HOST === '127.0.0.1:9099';

it('valida acciones y códigos antes de consultar grupos', () => {
  expect(groupActionSchema.safeParse({ action: 'share', groupId: '../other', promptId: 'prompt-1' }).success).toBe(false);
  expect(groupActionSchema.safeParse({ action: 'join', code: 'guess' }).success).toBe(false);
  expect(groupActionSchema.parse({ action: 'create', name: ' Equipo ' })).toEqual({ action: 'create', name: 'Equipo' });
});

describe.skipIf(!local)('Grupos de trabajo con Firestore local', () => {
  it('restringe las copias a miembros y protege el prompt personal al retirar, salir o cerrar', async () => {
    const { db } = getBibliotecaAdmin();
    const owner = { id: randomUUID(), name: 'Dueña' };
    const colleague = { id: randomUUID(), name: 'Colega' };
    const outsider = { id: randomUUID(), name: 'Otra cuenta' };
    const promptId = randomUUID();
    const source = db.collection('prompts').doc(promptId);
    await source.set({ userId: colleague.id, title: 'Privado', promptText: 'Primera versión', isShared: false });
    const { group } = await runGroupAction(db, owner, { action: 'create', name: 'Equipo' });
    const groupId = group!.id;
    const open = { action: 'open', groupId } as const;
    const share = { action: 'share', groupId, promptId } as const;
    try {
      await expect(runGroupAction(db, colleague, open)).rejects.toMatchObject({ status: 404 });
      const { code } = await runGroupAction(db, owner, { action: 'invite', groupId });
      await runGroupAction(db, colleague, { action: 'join', code: code! });
      await expect(runGroupAction(db, outsider, { action: 'join', code: code! })).rejects.toMatchObject({ status: 404 });
      await expect(runGroupAction(db, owner, share)).rejects.toMatchObject({ status: 404 });
      await expect(runGroupAction(db, colleague, { action: 'invite', groupId })).rejects.toMatchObject({ status: 403 });
      await runGroupAction(db, colleague, share);
      await source.update({ promptText: 'Segunda versión' });
      await expect(runGroupAction(db, owner, open)).resolves.toMatchObject({ prompts: [{ promptText: 'Primera versión' }] });
      await runGroupAction(db, colleague, share);
      await expect(runGroupAction(db, owner, open)).resolves.toMatchObject({ prompts: [{ promptText: 'Segunda versión' }] });
      await runGroupAction(db, owner, { action: 'remove', groupId, memberId: colleague.id });
      await expect(runGroupAction(db, colleague, open)).rejects.toMatchObject({ status: 404 });
      await expect(runGroupAction(db, owner, open)).resolves.toMatchObject({ prompts: [] });
      await expect(source.get().then(doc => doc.data())).resolves.toMatchObject({ promptText: 'Segunda versión', isShared: false });
    } finally {
      await runGroupAction(db, owner, { action: 'close', groupId });
      await source.delete();
    }
    await expect(runGroupAction(db, owner, open)).rejects.toMatchObject({ status: 404 });
  }, 20_000);
});
