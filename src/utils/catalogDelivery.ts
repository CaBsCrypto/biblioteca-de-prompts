import type { CatalogPayload, CatalogResource } from '../typesCatalog';

interface CatalogDeliveryReader {
  fetchPayload: (id: string) => Promise<CatalogPayload | null>;
  fetchResource: (id: string) => Promise<CatalogResource | null>;
}

export class CatalogDeliveryError extends Error {
  constructor(public readonly reason: 'unavailable' | 'updated', message: string) {
    super(message);
    this.name = 'CatalogDeliveryError';
  }
}

/** Never hand an action cached content or silently switch its selected approved version. */
export async function fetchCurrentCatalogDelivery(selected: CatalogResource, catalog: CatalogDeliveryReader): Promise<{ resource: CatalogResource; payload: CatalogPayload }> {
  const unavailable = () => new CatalogDeliveryError('unavailable', 'Esta publicación ya no está disponible. Vuelve al catálogo para elegir otro recurso.');
  const updated = () => new CatalogDeliveryError('updated', 'Esta publicación tiene una versión nueva. Actualiza la ficha antes de continuar.');
  const matches = (current: CatalogResource) => current.id === selected.id && current.kind === selected.kind && current.submissionId === selected.submissionId && current.ownerUid === selected.ownerUid;
  if (selected.state !== 'published') throw unavailable();
  // fetchPayload itself re-reads the publication; Firestore rules also bind this read to its approval.
  let payload: CatalogPayload | null;
  try {
    payload = await catalog.fetchPayload(selected.id);
  } catch (cause) {
    if (typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === 'permission-denied') throw unavailable();
    // A version can change inside fetchPayload itself. Distinguish that from a retryable network error.
    let current: CatalogResource | null;
    try { current = await catalog.fetchResource(selected.id); } catch { throw cause; }
    if (!current || current.state !== 'published') throw unavailable();
    if (!matches(current)) throw updated();
    throw cause;
  }
  if (!payload) throw unavailable();
  if (payload.resourceId !== selected.id || payload.submissionId !== selected.submissionId || payload.kind !== selected.kind || payload.ownerUid !== selected.ownerUid) throw updated();
  // Check again after delivery so a withdrawal or update during a slow read cannot be used.
  const current = await catalog.fetchResource(selected.id);
  if (!current || current.state !== 'published') throw unavailable();
  if (!matches(current)) throw updated();
  return { resource: current, payload };
}
