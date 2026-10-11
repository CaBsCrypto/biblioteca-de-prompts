import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogDeliveryError, fetchCurrentCatalogDelivery } from '../src/utils/catalogDelivery';
import { copyText, selectCopyText } from '../src/utils/clipboard';
import { extractPromptVariables, fillPromptVariables } from '../src/utils/promptPreparation';
import { emptyCatalogDraft, toCatalogPrompt } from '../src/utils/catalog';
import type { CatalogPayload, CatalogResource } from '../src/typesCatalog';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function approved() {
  const draft = emptyCatalogDraft({ name: 'Ada', handle: 'ada', avatar: '' });
  draft.metadata.title = 'Documentar código';
  draft.metadata.license = 'CC BY 4.0';
  draft.content.text = 'Documenta {{código}} para {{audiencia}}.\r\n';
  const resource: CatalogResource = { id: 'published', ownerUid: 'author', kind: 'prompt', metadata: draft.metadata,
    sourcePromptId: 'private-source', sourceFolderId: '', submissionId: 'approved-v1', state: 'published', publishedAt: null, updatedAt: null };
  const payload: CatalogPayload = { id: resource.id, resourceId: resource.id, ownerUid: resource.ownerUid, kind: resource.kind,
    submissionId: resource.submissionId, content: draft.content, updatedAt: null };
  return { resource, payload };
}

describe('web catalog delivery before copy, download or remix', () => {
  it('reads fresh content on every operation and checks publication again before returning it', async () => {
    const { resource, payload } = approved();
    const catalog = { fetchPayload: vi.fn().mockResolvedValue(payload), fetchResource: vi.fn().mockResolvedValue(resource) };
    const first = await fetchCurrentCatalogDelivery(resource, catalog);
    catalog.fetchPayload.mockResolvedValue({ ...payload, content: { ...payload.content, text: 'Nueva lectura exacta\r\n' } });
    const second = await fetchCurrentCatalogDelivery(resource, catalog);
    expect(first.payload.content.text).toBe(payload.content.text);
    expect(second.payload.content.text).toBe('Nueva lectura exacta\r\n');
    expect(catalog.fetchPayload).toHaveBeenCalledTimes(2);
    expect(catalog.fetchResource).toHaveBeenCalledTimes(2);
    expect(catalog.fetchResource.mock.invocationCallOrder[0]).toBeGreaterThan(catalog.fetchPayload.mock.invocationCallOrder[0]);
  });

  it.each(['withdrawn', 'missing'])('blocks a %s publication even if its content was returned by a slower earlier read', async state => {
    const { resource, payload } = approved();
    const catalog = { fetchPayload: vi.fn().mockResolvedValue(payload), fetchResource: vi.fn().mockResolvedValue(state === 'missing' ? null : { ...resource, state: 'withdrawn' }) };
    await expect(fetchCurrentCatalogDelivery(resource, catalog)).rejects.toMatchObject({ reason: 'unavailable' });
  });

  it('requires explicit refresh when the publication changes during delivery', async () => {
    const { resource, payload } = approved();
    const catalog = { fetchPayload: vi.fn().mockResolvedValue(payload), fetchResource: vi.fn().mockResolvedValue({ ...resource, submissionId: 'approved-v2' }) };
    await expect(fetchCurrentCatalogDelivery(resource, catalog)).rejects.toMatchObject({ reason: 'updated' });
  });

  it('blocks a changed version when the service rejects the read before returning the payload', async () => {
    const { resource } = approved();
    const catalog = { fetchPayload: vi.fn().mockRejectedValue(new Error('Version changed during read.')), fetchResource: vi.fn().mockResolvedValue({ ...resource, submissionId: 'approved-v2' }) };
    await expect(fetchCurrentCatalogDelivery(resource, catalog)).rejects.toMatchObject({ reason: 'updated' });
  });

  it('treats a denied deliverable as unavailable and preserves a retryable network error for a current publication', async () => {
    const { resource } = approved();
    const catalog = { fetchPayload: vi.fn().mockRejectedValue({ code: 'permission-denied' }), fetchResource: vi.fn().mockResolvedValue(resource) };
    await expect(fetchCurrentCatalogDelivery(resource, catalog)).rejects.toMatchObject({ reason: 'unavailable' });
    const failure = new Error('No connection');
    catalog.fetchPayload.mockRejectedValue(failure);
    await expect(fetchCurrentCatalogDelivery(resource, catalog)).rejects.toBe(failure);
  });

  it.each([{ resourceId: 'another-resource' }, { submissionId: 'approved-v2' }, { ownerUid: 'another-author' }, { kind: 'skill' }])('rejects mismatched content %j without providing it to the caller', async changes => {
    const { resource, payload } = approved();
    const catalog = { fetchPayload: vi.fn().mockResolvedValue({ ...payload, ...changes }), fetchResource: vi.fn().mockResolvedValue(resource) };
    await expect(fetchCurrentCatalogDelivery(resource, catalog)).rejects.toBeInstanceOf(CatalogDeliveryError);
    expect(catalog.fetchResource).not.toHaveBeenCalled();
  });

  it('returns no deliverable after withdrawal and does not fetch known withdrawn snapshots', async () => {
    const { resource } = approved();
    const catalog = { fetchPayload: vi.fn().mockResolvedValue(null), fetchResource: vi.fn() };
    await expect(fetchCurrentCatalogDelivery(resource, catalog)).rejects.toMatchObject({ reason: 'unavailable' });
    catalog.fetchPayload.mockClear();
    await expect(fetchCurrentCatalogDelivery({ ...resource, state: 'withdrawn' }, catalog)).rejects.toMatchObject({ reason: 'unavailable' });
    expect(catalog.fetchPayload).not.toHaveBeenCalled();
  });

  it('keeps the original template, approval and author attribution when creating a private remix', async () => {
    const { resource, payload } = approved();
    const delivery = await fetchCurrentCatalogDelivery(resource, { fetchPayload: async () => payload, fetchResource: async () => resource });
    const remix = toCatalogPrompt(delivery.resource, delivery.payload);
    expect(remix.promptText).toBe(payload.content.text);
    expect(remix.isShared).toBe(false);
    expect(remix.forkedFromPromptId).toBe('private-source');
    expect(remix.forkedFromUserId).toBe('author');
    expect(remix.forkedFromAuthorName).toBe('Ada');
    expect(remix.notas).toContain('approved-v1');
    expect(remix.notas).toContain('CC BY 4.0');
  });
});

describe('web prompt preparation preserves literal user input', () => {
  it('detects unique Spanish, international and hyphenated fields while leaving unsupported placeholders alone', () => {
    const text = '{{ código }} / {{código}} / {{review-code}} / {{数据}} / {{sin valor}}';
    expect(extractPromptVariables(text)).toEqual(['código', 'review-code', '数据']);
    expect(fillPromptVariables(text, { código: 'TypeScript', 'review-code': '', 数据: 'texto' }))
      .toBe('TypeScript / TypeScript / {{review-code}} / texto / {{sin valor}}');
  });

  it('never interprets dollar replacement syntax, HTML or additional placeholders inside a variable', () => {
    const value = '<script>alert(1)</script> $& $1 $$ {{audiencia}}\r\n';
    expect(fillPromptVariables('Código: {{código}}; lector: {{audiencia}}', { código: value, audiencia: 'equipo' }))
      .toBe('Código: ' + value + '; lector: equipo');
  });

  it('does not fill from the prototype and does allow an explicitly supplied __proto__ field', () => {
    expect(fillPromptVariables('{{tema}} / {{__proto__}}', Object.create({ tema: 'heredado' }))).toBe('{{tema}} / {{__proto__}}');
    expect(fillPromptVariables('{{__proto__}}', JSON.parse('{"__proto__":"texto literal"}'))).toBe('texto literal');
  });
});

function fallbackDocument(result: boolean | Error = true) {
  const field = { value: '', style: {}, readOnly: false, tabIndex: 0, setAttribute: vi.fn(), focus: vi.fn(), select: vi.fn(), setSelectionRange: vi.fn(), remove: vi.fn() };
  const previousFocus = { isConnected: true, focus: vi.fn() };
  const execCommand = vi.fn(() => { if (result instanceof Error) throw result; return result; });
  const document = { body: { appendChild: vi.fn() }, activeElement: previousFocus, createElement: vi.fn(() => field), execCommand };
  vi.stubGlobal('document', document);
  return { field, previousFocus, document, execCommand };
}

describe('confirmed clipboard writes and manual fallback', () => {
  it('waits for the Clipboard API to confirm and preserves exact CRLF/Unicode contents', async () => {
    let complete: (() => void) | undefined;
    const writeText = vi.fn(() => new Promise<void>(resolve => { complete = resolve; }));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const value = 'Texto original\r\nñ $&\r\n';
    let settled = false;
    const result = copyText(value).then(value => { settled = true; return value; });
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(writeText).toHaveBeenCalledExactlyOnceWith(value);
    complete!();
    await expect(result).resolves.toBe(true);
  });

  it('falls back to the selected exact text when Clipboard API is denied and execCommand confirms', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const { field, previousFocus, execCommand } = fallbackDocument();
    const text = '---\r\nname: documentar-codigo\r\n---\r\nInstrucciones $&';
    await expect(copyText(text)).resolves.toBe(true);
    expect(field.value).toBe(text);
    expect(field.select).toHaveBeenCalledOnce();
    expect(field.setSelectionRange).toHaveBeenCalledWith(0, text.length);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(field.remove).toHaveBeenCalledOnce();
    expect(previousFocus.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it.each([false, new Error('blocked')])('returns false and cleans up when the browser cannot confirm copy %s', async denial => {
    vi.stubGlobal('navigator', {});
    const { field } = fallbackDocument(denial);
    await expect(copyText('No afirmar Copiado')).resolves.toBe(false);
    expect(field.remove).toHaveBeenCalledOnce();
  });

  it('returns false during SSR and selects the complete visible manual fallback without writing to the clipboard', async () => {
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('document', undefined);
    await expect(copyText('texto')).resolves.toBe(false);
    expect(() => selectCopyText(null)).not.toThrow();
    const field = { value: 'exacto\r\n', focus: vi.fn(), select: vi.fn(), setSelectionRange: vi.fn() };
    selectCopyText(field as unknown as HTMLTextAreaElement);
    expect(field.setSelectionRange).toHaveBeenCalledWith(0, field.value.length);
    expect(field.focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});
