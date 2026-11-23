import { createHash } from 'node:crypto';
import { Timestamp, type CollectionReference, type DocumentSnapshot } from 'firebase-admin/firestore';
import { errors, type Adapter, type AdapterPayload } from 'oidc-provider';

const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

export async function takeClientRegistrationSlot(collection: CollectionReference, network: string): Promise<boolean> {
  const now = Date.now();
  const day = Math.floor(now / dayMs);
  const hour = Math.floor(now / hourMs);
  const networkId = createHash('sha256').update(network).digest('hex');
  const daily = collection.doc(`day-${day}`);
  const hourly = collection.doc(`hour-${hour}-${networkId}`);
  return collection.firestore.runTransaction(async transaction => {
    const [total, fromNetwork] = await transaction.getAll(daily, hourly);
    const totalCount = Number(total.get('count') || 0);
    const networkCount = Number(fromNetwork.get('count') || 0);
    if (totalCount >= 100 || networkCount >= 20) return false;
    transaction.set(daily, { count: totalCount + 1, expiresAt: Timestamp.fromMillis((day + 1) * dayMs) });
    transaction.set(hourly, { count: networkCount + 1, expiresAt: Timestamp.fromMillis((hour + 1) * hourMs) });
    return true;
  });
}

export class FirestoreOAuthAdapter implements Adapter {
  constructor(private readonly collection: CollectionReference, private readonly model: string) {}

  private document(id: string) {
    const key = createHash('sha256').update(`${this.model}:${id}`).digest('hex');
    return this.collection.doc(key);
  }

  private payload(snapshot: DocumentSnapshot): AdapterPayload | undefined {
    const record = snapshot.data();
    if (!record || (record.expiresAt && record.expiresAt.toMillis() <= Date.now())) return undefined;
    return JSON.parse(record.payload) as AdapterPayload;
  }

  async upsert(id: string, payload: AdapterPayload, expiresIn?: number): Promise<void> {
    await this.document(id).set({
      payload: JSON.stringify(payload),
      ...(expiresIn === undefined ? {} : { expiresAt: Timestamp.fromMillis(Date.now() + expiresIn * 1000) }),
      ...(payload.grantId ? { grantIndex: `${this.model}:${payload.grantId}` } : {}),
      ...(payload.uid ? { uidIndex: `${this.model}:${payload.uid}` } : {}),
      ...(payload.userCode ? { userCodeIndex: `${this.model}:${payload.userCode}` } : {}),
    });
  }

  async find(id: string): Promise<AdapterPayload | undefined> {
    return this.payload(await this.document(id).get());
  }

  private async findBy(field: 'uidIndex' | 'userCodeIndex', value: string): Promise<AdapterPayload | undefined> {
    const snapshot = await this.collection.where(field, '==', `${this.model}:${value}`).limit(1).get();
    return snapshot.empty ? undefined : this.payload(snapshot.docs[0]);
  }

  findByUid(uid: string): Promise<AdapterPayload | undefined> {
    return this.findBy('uidIndex', uid);
  }

  findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
    return this.findBy('userCodeIndex', userCode);
  }

  async consume(id: string): Promise<void> {
    const ref = this.document(id);
    await this.collection.firestore.runTransaction(async transaction => {
      const payload = this.payload(await transaction.get(ref));
      if (!payload || payload.consumed) throw new errors.InvalidGrant('authorization artifact is no longer valid');
      transaction.update(ref, { payload: JSON.stringify({ ...payload, consumed: Math.floor(Date.now() / 1000) }) });
    });
  }

  async destroy(id: string): Promise<void> {
    await this.document(id).delete();
  }

  async revokeByGrantId(grantId: string): Promise<void> {
    const query = this.collection.where('grantIndex', '==', `${this.model}:${grantId}`).limit(200);
    let snapshot = await query.get();
    while (!snapshot.empty) {
      const batch = this.collection.firestore.batch();
      for (const record of snapshot.docs) batch.delete(record.ref);
      await batch.commit();
      snapshot = await query.get();
    }
  }
}
