import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';

export type LibraryActivitySource = 'web' | 'chatgpt' | 'qr';
export type LibraryActivityInput = {
  action: 'saved' | 'used';
  kind: 'prompt' | 'skill';
  resourceId: string;
  title: string;
  source: LibraryActivitySource;
};
export type LibraryActivity = LibraryActivityInput & { id: string; at: string };

export function libraryActivityCollection(db: Firestore, uid: string) {
  return db.collection('users').doc(uid).collection('libraryActivity');
}

export function writeLibraryActivity(transaction: Transaction, db: Firestore, uid: string, id: string, input: LibraryActivityInput) {
  transaction.set(libraryActivityCollection(db, uid).doc(id), { ...input, createdAt: FieldValue.serverTimestamp() });
}

export async function listLibraryActivity(db: Firestore, uid: string): Promise<LibraryActivity[]> {
  const snapshot = await libraryActivityCollection(db, uid).orderBy('createdAt', 'desc').limit(30).get();
  return snapshot.docs.flatMap(doc => {
    const data = doc.data() as LibraryActivityInput & { createdAt?: { toDate(): Date } };
    return data.createdAt ? [{
      id: doc.id, action: data.action, kind: data.kind, resourceId: data.resourceId, title: data.title,
      source: data.source, at: data.createdAt.toDate().toISOString(),
    }] : [];
  });
}
