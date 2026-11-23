export const DRAFT_TITLE_LIMIT = 100;
export const DRAFT_TEXT_LIMIT = 10_000;
const CIPHERTEXT_LIMIT = 60_000;

export type GuestDraft = { title: string; promptText: string };
export type TransferSecret = { code: string; key: string };
export type DraftEnvelope = { version: 1; iv: string; ciphertext: string };
export type CreateDraftTransfer = { codeHash: string; envelope: DraftEnvelope };

const secretPart = /^[A-Za-z0-9_-]{43}$/;

function encodeBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Texto cifrado no válido.');
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}

function validSecretPart(value: string) {
  return secretPart.test(value) && encodeBase64Url(decodeBase64Url(value)) === value;
}

export function parseTransferSecret(fragment: string): TransferSecret | null {
  const [code, key, extra] = fragment.replace(/^#/, '').split('.');
  if (!code || !key || extra !== undefined || !validSecretPart(code) || !validSecretPart(key)) return null;
  return { code, key };
}

export function transferFragment(secret: TransferSecret) {
  return `${secret.code}.${secret.key}`;
}

export function isValidGuestDraft(value: unknown): value is GuestDraft {
  if (!value || typeof value !== 'object') return false;
  const { title, promptText } = value as Partial<GuestDraft>;
  return typeof title === 'string' && title.trim().length > 0 && title.length <= DRAFT_TITLE_LIMIT
    && typeof promptText === 'string' && promptText.trim().length > 0 && promptText.length <= DRAFT_TEXT_LIMIT;
}

export async function encryptGuestDraft(draft: GuestDraft): Promise<{ secret: TransferSecret; request: CreateDraftTransfer }> {
  if (!isValidGuestDraft(draft)) throw new Error('Escribe un título y un prompt válidos.');
  if (!globalThis.crypto?.subtle) throw new Error('Abre Biblioteca en una conexión segura para generar el enlace.');
  const code = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(JSON.stringify({ title: draft.title.trim(), promptText: draft.promptText }));
  const [ciphertext, codeHash] = await Promise.all([
    crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes),
    crypto.subtle.digest('SHA-256', encoder.encode(code)),
  ]);
  const encodedCiphertext = encodeBase64Url(new Uint8Array(ciphertext));
  if (encodedCiphertext.length > CIPHERTEXT_LIMIT) throw new Error('El texto es demasiado largo para transferirlo. Acórtalo o copia el prompt.');

  return {
    secret: { code, key: encodeBase64Url(keyBytes) },
    request: {
      codeHash: encodeBase64Url(new Uint8Array(codeHash)),
      envelope: { version: 1, iv: encodeBase64Url(iv), ciphertext: encodedCiphertext },
    },
  };
}

export async function decryptGuestDraft(envelope: DraftEnvelope, secret: TransferSecret): Promise<GuestDraft> {
  if (envelope?.version !== 1 || typeof envelope.ciphertext !== 'string' || envelope.ciphertext.length > CIPHERTEXT_LIMIT) {
    throw new Error('Formato de borrador no compatible.');
  }
  const iv = decodeBase64Url(envelope.iv);
  const ciphertext = decodeBase64Url(envelope.ciphertext);
  if (iv.length !== 12 || ciphertext.length < 16) {
    throw new Error('Formato de borrador no compatible.');
  }
  const key = await crypto.subtle.importKey('raw', decodeBase64Url(secret.key), 'AES-GCM', false, ['decrypt']);
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  const draft: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (!isValidGuestDraft(draft)) throw new Error('El borrador no tiene un título y un prompt válidos.');
  return { title: draft.title, promptText: draft.promptText };
}
