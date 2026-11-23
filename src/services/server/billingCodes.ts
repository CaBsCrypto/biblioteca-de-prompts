import { createHash, createHmac } from 'node:crypto';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { BillingError } from './billingDodo';
import { libraryGrantRef, readLibraryAccess, readLibraryGrantState, writeLibraryAccessBootstrap, writeLibraryGrant, type LibraryGrant } from './libraryAccess';

const DAY = 24 * 60 * 60_000;
export const billingRequestId = z.string().uuid();
export const issueCodeSchema = z.strictObject({
  requestId: billingRequestId,
  durationDays: z.number().int().min(1).max(365).default(30),
  redeemWithinDays: z.number().int().min(1).max(90).default(7),
});
export const redeemCodeSchema = z.strictObject({ code: z.string().trim().regex(/^BIB-[A-Za-z0-9_-]{43}$/) });
export const revokeCodeSchema = z.strictObject({ id: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });
const hash = (value: string) => createHash('sha256').update(value).digest('base64url');
const unavailableCode = () => new BillingError('code_unavailable', 'El código no está disponible. Revisa el código o solicita uno nuevo.');

export async function billingRateLimit(db: Firestore, uid: string, action: string, maximum = 20) {
  const hour = Math.floor(Date.now() / (60 * 60_000));
  const ref = db.collection('_bibliotecaBillingLimits').doc(hash(JSON.stringify([uid, action, hour])));
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    const count = snapshot.get('count') ?? 0;
    if (count >= maximum) throw new BillingError('rate_limited', 'Espera unos minutos antes de volver a intentarlo.');
    tx.set(ref, { count: count + 1, deleteAt: Timestamp.fromMillis((hour + 1) * 60 * 60_000) });
  });
}

/** Codes grant complimentary access only. No balance, payment or transfer is created. */
export async function issueBillingCode(db: Firestore, founderUid: string, input: z.infer<typeof issueCodeSchema>, signingSecret: string) {
  if (signingSecret.length < 32) throw new BillingError('billing_unavailable', 'La creación de códigos todavía no está configurada.');
  const code = 'BIB-' + createHmac('sha256', signingSecret).update(JSON.stringify([founderUid, input.requestId])).digest('base64url');
  const ref = db.collection('_bibliotecaGiftCodes').doc(hash(code));
  return db.runTransaction(async tx => {
    const [founder, existing] = await tx.getAll(db.collection('users').doc(founderUid), ref);
    if (founder.get('role') !== 'founder') throw new BillingError('access_required', 'Esta acción requiere la cuenta del fundador.');
    if (existing.exists) {
      if (existing.get('durationDays') !== input.durationDays || existing.get('redeemWithinDays') !== input.redeemWithinDays) {
        throw new BillingError('invalid_request', 'Usa una solicitud nueva para cambiar las condiciones del código.');
      }
      return { code, durationDays: input.durationDays, redeemBy: existing.get('redeemBy').toDate().toISOString() as string };
    }
    const now = Date.now();
    const redeemBy = Timestamp.fromMillis(now + input.redeemWithinDays * DAY);
    const data = {
      createdBy: founderUid, createdAt: Timestamp.fromMillis(now), durationDays: input.durationDays,
      redeemWithinDays: input.redeemWithinDays, redeemBy, redeemedUid: null, revokedAt: null,
    };
    tx.create(ref, data);
    tx.create(db.collection('_bibliotecaGiftCodeIssuers').doc(founderUid).collection('codes').doc(ref.id), {
      createdAt: data.createdAt, durationDays: data.durationDays, redeemBy: data.redeemBy, redeemed: false, revoked: false,
    });
    return { code, durationDays: input.durationDays, redeemBy: redeemBy.toDate().toISOString() };
  });
}

export async function redeemBillingCode(db: Firestore, uid: string, code: string) {
  const id = hash(code);
  const ref = db.collection('_bibliotecaGiftCodes').doc(id);
  return db.runTransaction(async tx => {
    const access = await readLibraryAccess(db, uid, tx);
    const snapshot = await tx.get(ref);
    const grants = await readLibraryGrantState(db, uid, tx);
    if (!access.canRead) throw new BillingError('access_required', 'Necesitas una invitación activa a Biblioteca para canjear el código.');
    if (!snapshot.exists || snapshot.get('revokedAt')) throw unavailableCode();
    const previousUid = snapshot.get('redeemedUid');
    if (previousUid) {
      if (previousUid !== uid) throw unavailableCode();
      return { expiresAt: snapshot.get('grantExpiresAt').toDate().toISOString() as string };
    }
    if ((snapshot.get('redeemBy')?.toMillis?.() ?? 0) <= Date.now()) throw unavailableCode();
    const now = Date.now();
    const expiresAt = Timestamp.fromMillis(now + snapshot.get('durationDays') * DAY);
    writeLibraryAccessBootstrap(tx, db, uid, access);
    writeLibraryGrant(tx, db, uid, 'code_' + id, {
      tier: 'pro', source: 'code', startsAt: Timestamp.fromMillis(now), expiresAt, revokedAt: null,
    }, grants);
    tx.update(ref, { redeemedUid: uid, redeemedAt: Timestamp.fromMillis(now), grantExpiresAt: expiresAt });
    tx.set(db.collection('_bibliotecaGiftCodeIssuers').doc(snapshot.get('createdBy')).collection('codes').doc(id),
      { redeemed: true, grantExpiresAt: expiresAt }, { merge: true });
    return { expiresAt: expiresAt.toDate().toISOString() };
  });
}

export async function listBillingCodes(db: Firestore, founderUid: string) {
  const profile = await db.collection('users').doc(founderUid).get();
  if (profile.get('role') !== 'founder') throw new BillingError('access_required', 'Esta acción requiere la cuenta del fundador.');
  const codes = await db.collection('_bibliotecaGiftCodeIssuers').doc(founderUid).collection('codes').orderBy('createdAt', 'desc').limit(20).get();
  return { codes: codes.docs.map(doc => ({
    id: doc.id, durationDays: doc.get('durationDays') as number, redeemed: doc.get('redeemed') === true, revoked: doc.get('revoked') === true,
    createdAt: doc.get('createdAt').toDate().toISOString() as string, redeemBy: doc.get('redeemBy').toDate().toISOString() as string,
    ...(doc.get('grantExpiresAt') ? { grantExpiresAt: doc.get('grantExpiresAt').toDate().toISOString() as string } : {}),
  })) };
}

export async function revokeBillingCode(db: Firestore, founderUid: string, id: string) {
  const codeRef = db.collection('_bibliotecaGiftCodes').doc(id);
  return db.runTransaction(async tx => {
    const [profile, code] = await tx.getAll(db.collection('users').doc(founderUid), codeRef);
    if (profile.get('role') !== 'founder' || code.get('createdBy') !== founderUid) {
      throw new BillingError('access_required', 'Esta acción requiere la cuenta que creó el código.');
    }
    if (code.get('revokedAt')) return { revoked: true };
    const uid = code.get('redeemedUid') as string | null;
    const sourceId = 'code_' + id;
    const sources = uid ? await readLibraryGrantState(db, uid, tx) : [];
    const source = uid ? await tx.get(libraryGrantRef(db, uid, sourceId)) : null;
    const revokedAt = Timestamp.now();
    if (uid && source?.exists) {
      writeLibraryGrant(tx, db, uid, sourceId, { ...source.data() as LibraryGrant, revokedAt }, sources);
    }
    tx.update(codeRef, { revokedAt });
    tx.set(db.collection('_bibliotecaGiftCodeIssuers').doc(founderUid).collection('codes').doc(id), { revoked: true }, { merge: true });
    return { revoked: true };
  });
}
