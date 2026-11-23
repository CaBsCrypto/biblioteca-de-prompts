import type { Firestore, Transaction } from 'firebase-admin/firestore';

function closedTransaction(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 3) return false;
  const details = 'details' in error && typeof error.details === 'string' ? error.details
    : 'message' in error && typeof error.message === 'string' ? error.message.replace(/^3 INVALID_ARGUMENT: /, '') : '';
  return /^Transaction is invalid or closed\.?$/.test(details);
}

/** Firestore 7 retries expired IDs, but does not recognize this equivalent closed-ID response. */
export async function runLibraryTransaction<T>(db: Firestore, operation: (tx: Transaction) => Promise<T>): Promise<T> {
  for (let retry = 0; ; retry++) {
    try {
      return await db.runTransaction(operation);
    } catch (error) {
      // Restart the entire transaction, never a single RPC with the closed ID.
      // Domain errors, permissions and every other INVALID_ARGUMENT stay failures.
      if (retry >= 2 || !closedTransaction(error)) throw error;
      await new Promise(resolve => setTimeout(resolve, 100 * (retry + 1)));
    }
  }
}
