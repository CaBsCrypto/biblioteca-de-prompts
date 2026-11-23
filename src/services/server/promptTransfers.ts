import { managedLibraryEnabled } from './libraryMode';
import { createDecipheriv, createHash } from 'node:crypto';
import { FieldValue, Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { z } from 'zod';
import { newPrivatePrompt, privateDraftSchema } from './privatePrompts';
import { LibraryAccessError } from './libraryAccess';
import { prepareLibraryWrite } from './libraryWrites';
import { runLibraryTransaction } from './libraryTransaction';

const TRANSFERS = '_promptTransfers';
const LIMITS = '_promptTransferLimits';
const WINDOW_MS = 15 * 60_000;
const RECEIPT_MS = 24 * 60 * 60_000;
const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;
const B64URL = /^[A-Za-z0-9_-]+$/;

const base64url = (bytes: number) => z.string().length(Math.ceil(bytes * 4 / 3)).regex(B64URL).refine(value => {
  const decoded = Buffer.from(value, 'base64url');
  return decoded.length === bytes && decoded.toString('base64url') === value;
});

export const transferSecretSchema = base64url(32);
export const envelopeSchema = z.strictObject({
  version: z.literal(1),
  iv: base64url(12),
  ciphertext: z.string().min(23).max(60_000).regex(B64URL).refine(value => Buffer.from(value, 'base64url').toString('base64url') === value),
});
export type TransferEnvelope = z.infer<typeof envelopeSchema>;

export const transferCreateSchema = z.strictObject({ codeHash: base64url(32), envelope: envelopeSchema });
export const transferPreviewSchema = z.strictObject({ code: transferSecretSchema });
export const transferClaimSchema = z.strictObject({ code: transferSecretSchema, key: transferSecretSchema });

export class TransferError extends Error {
  constructor(readonly code: 'invalid_transfer' | 'unavailable' | 'rate_limited' | 'access_required' | 'access_expired' | 'prompt_limit' | 'prompt_too_long', message: string) {
    super(message);
  }
}

const unavailable = () => new TransferError('unavailable', 'El enlace venció o ya no está disponible. Crea uno nuevo desde el borrador.');
const invalidTransfer = () => new TransferError('invalid_transfer', 'El borrador no es válido. Verifica el enlace o genera uno nuevo.');

function hash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('base64url');
}

export function decryptTransfer(envelope: TransferEnvelope, key: string) {
  const combined = Buffer.from(envelope.ciphertext, 'base64url');
  if (combined.length <= 16) throw invalidTransfer();
  try {
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'base64url'), Buffer.from(envelope.iv, 'base64url'));
    decipher.setAuthTag(combined.subarray(-16));
    const plaintext = Buffer.concat([decipher.update(combined.subarray(0, -16)), decipher.final()]);
    return privateDraftSchema.parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext)));
  } catch {
    throw invalidTransfer();
  }
}

async function consumeCreationQuota(db: Firestore, tx: Transaction, origin: string, now: number) {
  const day = Math.floor(now / DAY_MS);
  const hour = Math.floor(now / HOUR_MS);
  const daily = db.collection(LIMITS).doc(`day-${day}`);
  const hourly = db.collection(LIMITS).doc(`hour-${hour}-${hash(origin)}`);
  const [dailySnapshot, hourlySnapshot] = await tx.getAll(daily, hourly);
  const dailyCount = Number(dailySnapshot.get('count') ?? 0);
  const hourlyCount = Number(hourlySnapshot.get('count') ?? 0);
  if (dailyCount >= 1_000 || hourlyCount >= 20) {
    throw new TransferError('rate_limited', 'Hay demasiados enlaces nuevos. Espera un momento y vuelve a intentarlo.');
  }
  tx.set(daily, { count: dailyCount + 1, deleteAt: Timestamp.fromMillis((day + 1) * DAY_MS) });
  tx.set(hourly, { count: hourlyCount + 1, deleteAt: Timestamp.fromMillis((hour + 1) * HOUR_MS) });
}

export async function createPromptTransfer(db: Firestore, input: z.infer<typeof transferCreateSchema>, origin: string) {
  const ref = db.collection(TRANSFERS).doc(input.codeHash);
  return db.runTransaction(async tx => {
    const now = Date.now();
    const current = (await tx.get(ref)).data();
    if (current) {
      const existing = current.envelope as TransferEnvelope | undefined;
      if (current.expiresAt <= now || !existing || existing.iv !== input.envelope.iv || existing.ciphertext !== input.envelope.ciphertext) {
        throw unavailable();
      }
      return { expiresAt: current.expiresAt as number };
    }

    await consumeCreationQuota(db, tx, origin, now);
    const expiresAt = now + WINDOW_MS;
    tx.create(ref, { envelope: input.envelope, expiresAt, deleteAt: Timestamp.fromMillis(expiresAt) });
    return { expiresAt };
  });
}

export async function previewPromptTransfer(db: Firestore, code: string, uid: string) {
  const snapshot = await db.collection(TRANSFERS).doc(hash(code)).get();
  const transfer = snapshot.data();
  const now = Date.now();
  if (!transfer) throw unavailable();
  if (transfer.promptId && transfer.claimedUid === uid && transfer.deleteAt.toMillis() > now) {
    return { promptId: transfer.promptId as string };
  }
  if (!transfer.envelope || transfer.expiresAt <= now) throw unavailable();
  return { envelope: envelopeSchema.parse(transfer.envelope), expiresAt: transfer.expiresAt as number };
}

export async function claimPromptTransfer(db: Firestore, input: z.infer<typeof transferClaimSchema>, uid: string) {
  const transferRef = db.collection(TRANSFERS).doc(hash(input.code));
  const promptRef = db.collection('prompts').doc();
  return runLibraryTransaction(db, async tx => {
    const now = Date.now();
    const transfer = (await tx.get(transferRef)).data();
    if (!transfer) throw unavailable();
    if (transfer.promptId) {
      if (transfer.claimedUid !== uid || transfer.deleteAt.toMillis() <= now) throw unavailable();
      return { promptId: transfer.promptId as string };
    }
    if (transfer.expiresAt <= now || !transfer.envelope) throw unavailable();

    const draft = decryptTransfer(envelopeSchema.parse(transfer.envelope), input.key);
    let savedPromptId = promptRef.id;
    if (managedLibraryEnabled()) {
      try {
        const operation = await prepareLibraryWrite(db, tx, uid, {
          action: 'create', requestId: 'qr:' + hash(input.code), prompt: draft, source: 'qr',
        });
        operation.commit();
        savedPromptId = operation.result.promptId!;
      } catch (error) {
        if (error instanceof LibraryAccessError && error.code !== 'library_unavailable') throw new TransferError(error.code, error.message);
        throw error;
      }
    } else {
      tx.create(promptRef, newPrivatePrompt(uid, draft));
    }
    tx.update(transferRef, {
      envelope: FieldValue.delete(), claimedUid: uid, promptId: savedPromptId,
      deleteAt: Timestamp.fromMillis(now + RECEIPT_MS),
    });
    return { promptId: savedPromptId };
  });
}
