import type { Firestore } from 'firebase-admin/firestore';
import { afterEach, expect, it, vi } from 'vitest';
import { runLibraryTransaction } from '../src/services/server/libraryTransaction';

afterEach(() => vi.useRealTimers());

it('reinicia la transacción completa y conserva el resultado cuando el servidor cerró su ID', async () => {
  vi.useFakeTimers();
  const operation = vi.fn();
  const receipt = { promptId: 'original-receipt' };
  const runTransaction = vi.fn().mockRejectedValueOnce({ code: 3, details: 'Transaction is invalid or closed.' })
    .mockResolvedValueOnce(receipt);
  const result = runLibraryTransaction({ runTransaction } as unknown as Firestore, operation);
  await vi.runAllTimersAsync();
  await expect(result).resolves.toBe(receipt);
  expect(runTransaction).toHaveBeenCalledTimes(2);
  expect(runTransaction).toHaveBeenNthCalledWith(1, operation);
  expect(runTransaction).toHaveBeenNthCalledWith(2, operation);
});

it.each([
  { code: 3, details: 'Invalid document path.' },
  { code: 7, details: 'Missing or insufficient permissions.' },
  { code: 'prompt_limit', message: 'No quedan plazas.' },
])('no reintenta errores de entrada, permiso o plan: $code', async error => {
  const runTransaction = vi.fn().mockRejectedValue(error);
  await expect(runLibraryTransaction({ runTransaction } as unknown as Firestore, vi.fn())).rejects.toBe(error);
  expect(runTransaction).toHaveBeenCalledTimes(1);
});

it('limita a tres transacciones aun si el servidor sigue devolviendo el mismo ID cerrado', async () => {
  vi.useFakeTimers();
  const error = { code: 3, message: '3 INVALID_ARGUMENT: Transaction is invalid or closed.' };
  const runTransaction = vi.fn().mockRejectedValue(error);
  const result = runLibraryTransaction({ runTransaction } as unknown as Firestore, vi.fn());
  const rejected = expect(result).rejects.toBe(error);
  await vi.runAllTimersAsync();
  await rejected;
  expect(runTransaction).toHaveBeenCalledTimes(3);
});
