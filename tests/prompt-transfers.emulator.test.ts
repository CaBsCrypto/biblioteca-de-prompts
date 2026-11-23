import { randomBytes, randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { encryptGuestDraft } from '../src/features/guestPrompt/draftHandoffCrypto';
import { getBibliotecaAdmin } from '../src/services/server/firebaseAdmin';
import { claimPromptTransfer, createPromptTransfer, previewPromptTransfer } from '../src/services/server/promptTransfers';

const local = process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8080' && process.env.FIREBASE_AUTH_EMULATOR_HOST === '127.0.0.1:9099';

describe.skipIf(!local)('Traspasos privados con Firestore local', () => {
  it('permite reintentar la creación y da el borrador a una sola cuenta aunque ambas confirmen a la vez', async () => {
    const { db } = getBibliotecaAdmin();
    const draft = { title: 'Traspaso piloto', promptText: 'Explica {{código}} con un ejemplo.' };
    const { request, secret } = await encryptGuestDraft(draft);
    const origin = randomUUID();
    const owners = ['first-' + randomUUID(), 'second-' + randomUUID()];
    const receipt = await createPromptTransfer(db, request, origin);
    await expect(createPromptTransfer(db, request, origin)).resolves.toEqual(receipt);
    await expect(previewPromptTransfer(db, secret.code, owners[0])).resolves.toEqual({ ...receipt, envelope: request.envelope });
    await expect(claimPromptTransfer(db, { ...secret, key: randomBytes(32).toString('base64url') }, owners[0]))
      .rejects.toMatchObject({ code: 'invalid_transfer' });

    const outcomes = await Promise.allSettled(owners.map(uid => claimPromptTransfer(db, secret, uid)));
    expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const winner = outcomes.findIndex(result => result.status === 'fulfilled');
    const accepted = outcomes[winner];
    if (accepted.status !== 'fulfilled') throw new Error('El recibo no está disponible');
    await expect(claimPromptTransfer(db, secret, owners[winner])).resolves.toEqual(accepted.value);
    await expect(previewPromptTransfer(db, secret.code, owners[1 - winner])).rejects.toMatchObject({ code: 'unavailable' });
    const saved = await db.collection('prompts').doc(accepted.value.promptId).get();
    expect(saved.data()).toMatchObject({ ...draft, userId: owners[winner], isShared: false });
    const transfer = await db.collection('_promptTransfers').doc(request.codeHash).get();
    expect(transfer.get('envelope')).toBeUndefined();
  }, 30000);

  it('rechaza un enlace vencido aunque la limpieza TTL no lo haya borrado', async () => {
    const { db } = getBibliotecaAdmin();
    const { request, secret } = await encryptGuestDraft({ title: 'Vence', promptText: 'Texto ficticio' });
    await createPromptTransfer(db, request, randomUUID());
    const transfer = db.collection('_promptTransfers').doc(request.codeHash);
    await transfer.update({ expiresAt: Date.now() - 1 });
    const uid = 'expired-' + randomUUID();
    await expect(previewPromptTransfer(db, secret.code, uid)).rejects.toMatchObject({ code: 'unavailable' });
    await expect(claimPromptTransfer(db, secret, uid)).rejects.toMatchObject({ code: 'unavailable' });
    expect((await transfer.get()).exists).toBe(true);
  });
});
