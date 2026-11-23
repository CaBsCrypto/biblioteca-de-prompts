import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptGuestDraft, encryptGuestDraft, parseTransferSecret, transferFragment } from '../src/features/guestPrompt/draftHandoffCrypto';

const draft = {
  title: 'Revisar código 🔎',
  promptText: 'Muestra cómo funciona {{código}}. Conserva literalmente $500, acentos y emojis.\n<script>es texto</script>',
};

describe('draft handoff crypto', () => {
  it('round-trips a Unicode draft while exposing only a hash and an encrypted envelope to creation', async () => {
    const { secret, request } = await encryptGuestDraft(draft);
    expect(request.codeHash).toBe(createHash('sha256').update(secret.code, 'ascii').digest('base64url'));
    expect(Object.keys(request).sort()).toEqual(['codeHash', 'envelope']);
    expect(JSON.stringify(request)).not.toContain(draft.title);
    expect(JSON.stringify(request)).not.toContain(secret.key);
    const parsed = parseTransferSecret(`#${transferFragment(secret)}`);
    expect(parsed).toEqual(secret);
    await expect(decryptGuestDraft(request.envelope, parsed!)).resolves.toEqual(draft);
  });

  it('rejects modified ciphertext, a different link key, and malformed link fragments', async () => {
    const first = await encryptGuestDraft(draft);
    const second = await encryptGuestDraft(draft);
    const encoded = first.request.envelope.ciphertext;
    const modified = (encoded.startsWith('A') ? 'B' : 'A') + encoded.slice(1);
    await expect(decryptGuestDraft({ ...first.request.envelope, ciphertext: modified }, first.secret)).rejects.toThrow();
    await expect(decryptGuestDraft(first.request.envelope, second.secret)).rejects.toThrow();
    expect(parseTransferSecret(`${transferFragment(first.secret)}.extra`)).toBeNull();
    expect(parseTransferSecret(`#${first.secret.code}`)).toBeNull();
  });
});
