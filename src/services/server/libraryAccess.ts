import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { libraryMode } from './libraryMode';

const PILOT_DURATION_MS = 48 * 60 * 60_000;

export interface LibraryAccess {
  tier: 'free' | 'pro';
  invited: boolean;
  canRead: boolean;
  canMutate: boolean;
  promptLimit: number | null;
  promptCharacterLimit: 2500 | 10000;
  betaExpiresAt?: string;
  proExpiresAt?: string;
  bootstrapRequired?: boolean;
  bootstrapStartedAt?: number;
}

export class LibraryAccessError extends Error {
  constructor(readonly code: 'access_required' | 'access_expired' | 'prompt_limit' | 'prompt_too_long' | 'library_unavailable') {
    super({
      access_required: 'Esta cuenta todavía no tiene una invitación activa para la beta.',
      access_expired: 'Terminó tu acceso de prueba. Puedes consultar y exportar tus prompts o activar Pro para seguir guardando.',
      prompt_limit: 'El plan Gratis permite tres prompts guardados. Exporta o elimina uno para guardar otro.',
      prompt_too_long: 'El prompt supera el límite de caracteres de tu plan.',
      library_unavailable: 'Mi Biblioteca no está disponible por ahora. Inténtalo de nuevo.',
    }[code]);
  }
}

function timestampMillis(value: unknown): number {
  if (!value || typeof value !== 'object' || !('toMillis' in value) || typeof value.toMillis !== 'function') return 0;
  const result: unknown = value.toMillis();
  return typeof result === 'number' && Number.isFinite(result) ? result : 0;
}

export function libraryGrantRef(db: Firestore, uid: string, sourceId: string) {
  return db.collection('_bibliotecaAccessGrants').doc(uid).collection('sources').doc(sourceId);
}

/** Reads every source independently. Revoking a code never revokes a paid period. */
export async function readLibraryAccess(db: Firestore, uid: string, tx?: Transaction): Promise<LibraryAccess> {
  const now = Date.now();
  const mode = libraryMode();
  if (mode === 'commercial') {
    const configRef = db.collection('_bibliotecaConfig').doc('library');
    const config = tx ? await tx.get(configRef) : await configRef.get();
    if (config.get('enforced') !== true || config.get('mode') !== 'commercial') {
      throw new LibraryAccessError('library_unavailable');
    }
  }
  const invitationRef = db.collection('_bibliotecaEntitlements').doc(uid);
  const entryRef = db.collection('_bibliotecaPilotEntries').doc(uid);
  if (mode === 'legacy') {
    const invitation = tx ? await tx.get(invitationRef) : await invitationRef.get();
    const active = invitation.get('chatgptPersonalLibrary') === true && timestampMillis(invitation.get('expiresAt')) > now;
    return { tier: 'pro', invited: active, canRead: active, canMutate: active, promptLimit: null, promptCharacterLimit: 10000 };
  }
  const grantsQuery = db.collection('_bibliotecaAccessGrants').doc(uid).collection('sources')
    .where('expiresAt', '>', Timestamp.fromMillis(now));
  const grants = tx ? await tx.get(grantsQuery) : await grantsQuery.get();
  let proExpires = 0;
  for (const grant of grants.docs) {
    if (grant.get('tier') === 'pro' && !grant.get('revokedAt') && timestampMillis(grant.get('startsAt')) <= now) {
      proExpires = Math.max(proExpires, timestampMillis(grant.get('expiresAt')));
    }
  }
  const pro = proExpires > now;
  const plan: Pick<LibraryAccess, 'tier' | 'promptLimit' | 'promptCharacterLimit' | 'proExpiresAt'> = {
    tier: pro ? 'pro' : 'free',
    promptLimit: pro ? null : 3,
    promptCharacterLimit: pro ? 10000 : 2500,
    ...(pro ? { proExpiresAt: new Date(proExpires).toISOString() } : {}),
  };
  if (mode === 'commercial') return { ...plan, invited: false, canRead: true, canMutate: true };

  const [invitation, entry] = tx ? await tx.getAll(invitationRef, entryRef)
    : await Promise.all([invitationRef.get(), entryRef.get()]);
  const invited = invitation.get('chatgptPersonalLibrary') === true;
  const bootstrapRequired = invited && !entry.exists && timestampMillis(invitation.get('expiresAt')) > now;
  const betaExpires = entry.exists ? timestampMillis(entry.get('expiresAt')) : bootstrapRequired ? now + PILOT_DURATION_MS : 0;
  const canRead = invited && (entry.exists || bootstrapRequired);
  return {
    ...plan,
    invited,
    canRead,
    canMutate: canRead && (betaExpires > now || pro),
    ...(betaExpires ? { betaExpiresAt: new Date(betaExpires).toISOString() } : {}),
    ...(bootstrapRequired ? { bootstrapRequired: true, bootstrapStartedAt: now } : {}),
  };
}

export interface LibraryGrant {
  tier: 'pro';
  source: 'dodo' | 'code';
  startsAt: Timestamp;
  expiresAt: Timestamp;
  revokedAt?: Timestamp | null;
}

export async function readLibraryGrantState(db: Firestore, uid: string, tx: Transaction) {
  const summary = db.collection('_bibliotecaAccessGrants').doc(uid);
  // Reading the parent serializes updates from independent payment and code sources.
  await tx.get(summary);
  const active = await tx.get(summary.collection('sources').where('expiresAt', '>', Timestamp.now()));
  return active.docs.map(doc => ({ id: doc.id, ...doc.data() } as LibraryGrant & { id: string }));
}

export function writeLibraryGrant(
  tx: Transaction, db: Firestore, uid: string, id: string, grant: LibraryGrant,
  existing: Array<LibraryGrant & { id: string }>,
) {
  const now = Date.now();
  const sources = [...existing.filter(value => value.id !== id), { ...grant, id }];
  const expires = sources.reduce((latest, value) => value.revokedAt || value.startsAt.toMillis() > now
    ? latest : Math.max(latest, value.expiresAt.toMillis()), 0);
  tx.set(libraryGrantRef(db, uid, id), grant, { merge: true });
  tx.set(db.collection('_bibliotecaAccessGrants').doc(uid), {
    proExpiresAt: Timestamp.fromMillis(expires), updatedAt: Timestamp.fromMillis(now),
  }, { merge: true });
}

/** Invoke after all transaction reads. The previously read entry makes creation conflict-safe. */
export function writeLibraryAccessBootstrap(tx: Transaction, db: Firestore, uid: string, access: LibraryAccess) {
  if (access.bootstrapRequired && access.bootstrapStartedAt && access.betaExpiresAt) {
    tx.create(db.collection('_bibliotecaPilotEntries').doc(uid), {
      startedAt: Timestamp.fromMillis(access.bootstrapStartedAt),
      expiresAt: Timestamp.fromDate(new Date(access.betaExpiresAt)),
    });
  }
}

export async function ensurePilotEntry(db: Firestore, uid: string): Promise<LibraryAccess> {
  return db.runTransaction(async tx => {
    const access = await readLibraryAccess(db, uid, tx);
    writeLibraryAccessBootstrap(tx, db, uid, access);
    const { bootstrapRequired: _pending, bootstrapStartedAt: _started, ...result } = access;
    return result;
  });
}

export function assertPromptMutation(
  access: LibraryAccess,
  input: { promptCount: number; promptLengths: number[]; additionalCount: number },
) {
  if (!access.canRead) throw new LibraryAccessError('access_required');
  if (!access.canMutate) throw new LibraryAccessError('access_expired');
  if (access.promptLimit !== null && input.additionalCount > 0 && input.promptCount + input.additionalCount > access.promptLimit) {
    throw new LibraryAccessError('prompt_limit');
  }
  if (input.promptLengths.some(length => length > access.promptCharacterLimit)) throw new LibraryAccessError('prompt_too_long');
}
