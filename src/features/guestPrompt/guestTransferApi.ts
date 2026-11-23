import type { CreateDraftTransfer, DraftEnvelope } from './draftHandoffCrypto';

type PreviewResult = { expiresAt: number; envelope: DraftEnvelope } | { promptId: string };

const endpoint = '/api/prompt-transfers';

export class GuestTransferUnavailableError extends Error {}

async function postTransfer<T>(path: string, payload: object, token?: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    cache: 'no-store',
    signal,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  }).catch(error => {
    if (signal?.aborted) throw error;
    throw new Error('No pudimos conectar con Biblioteca. Comprueba tu conexión y vuelve a intentarlo.');
  });
  if (response.ok) return response.json() as Promise<T>;
  switch (response.status) {
    case 401: throw new Error('Tu sesión venció. Vuelve a iniciar sesión y abre el enlace de nuevo.');
    case 404: throw new GuestTransferUnavailableError('Este enlace ya no está disponible. Genera uno nuevo desde el editor.');
    case 429: throw new Error('Hay demasiados intentos. Espera un momento y vuelve a intentarlo.');
    case 503: throw new Error('La transferencia no está disponible en este momento. Puedes copiar tu prompt desde el editor.');
    default: throw new Error('No pudimos completar la transferencia. Vuelve a intentarlo.');
  }
}

export const publishGuestTransfer = (input: CreateDraftTransfer) =>
  postTransfer<{ expiresAt: number }>(endpoint, input);

export const previewGuestTransfer = (code: string, token: string, signal: AbortSignal) =>
  postTransfer<PreviewResult>(`${endpoint}/preview`, { code }, token, signal);

export const claimGuestTransfer = (code: string, key: string, token: string) =>
  postTransfer<{ promptId: string }>(`${endpoint}/claim`, { code, key }, token);
