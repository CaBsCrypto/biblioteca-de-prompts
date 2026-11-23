import { afterEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createLibraryMcpServer } from '../src/mcp/server';
import type { PromptToolOptions } from '../src/mcp/promptTools';
import { getBibliotecaAdmin } from '../src/services/server/firebaseAdmin';
import { assertPersonalLibraryAccess, getPersonalPrompt, listPersonalPrompts, PersonalLibraryError, savePersonalPrompt } from '../src/services/server/personalLibrary';
import { getLibrarySkill, listLibrarySkills, recordLibraryUse, saveLibrarySkill } from '../src/services/server/libraryCollections';
import { listLibraryActivity } from '../src/services/server/libraryActivity';
import { LibraryAccessError } from '../src/services/server/libraryAccess';
import { VersionChanged, type CatalogReader, type CatalogContentResult } from '../src/mcp/contracts';

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock('../src/services/server/firebaseAdmin', () => ({ getBibliotecaAdmin: vi.fn(() => ({ db: {}, auth: { getUser } })) }));
vi.mock('../src/services/server/personalLibrary', async importOriginal => {
  const original = await importOriginal<typeof import('../src/services/server/personalLibrary')>();
  return { ...original, assertPersonalLibraryAccess: vi.fn(), getPersonalPrompt: vi.fn(), listPersonalPrompts: vi.fn(), savePersonalPrompt: vi.fn() };
});
vi.mock('../src/services/server/libraryCollections', async importOriginal => {
  const original = await importOriginal<typeof import('../src/services/server/libraryCollections')>();
  return { ...original, getLibrarySkill: vi.fn(), listLibrarySkills: vi.fn(), recordLibraryUse: vi.fn(), saveLibrarySkill: vi.fn() };
});
vi.mock('../src/services/server/libraryActivity', async importOriginal => {
  const original = await importOriginal<typeof import('../src/services/server/libraryActivity')>();
  return { ...original, listLibraryActivity: vi.fn() };
});

const clients: Client[] = [];
const shell = '<div data-biblioteca-extra="guest"></div>';
async function start(options: PromptToolOptions = {}, overrides: Partial<CatalogReader> = {}) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createLibraryMcpServer({ search: vi.fn(), get: vi.fn(), content: vi.fn(), ...overrides }, () => shell, options);
  const client = new Client({ name: 'pilot-test', version: '1.0.0' });
  clients.push(client);
  await server.connect(serverTransport); await client.connect(clientTransport);
  return client;
}

afterEach(async () => { await Promise.all(clients.splice(0).map(client => client.close())); vi.clearAllMocks(); });

const metadataUrl = 'https://example.com/.well-known/oauth-protected-resource/api/mcp';

describe('Herramientas de Biblioteca para el piloto', () => {
  it('no anuncia escrituras ni APIs de cuenta con el piloto desactivado', async () => {
    const client = await start({ extrasHtml: () => shell });
    expect((await client.listTools()).tools.map(tool => tool.name).sort()).toEqual([
      'get_resource', 'get_resource_content', 'open_library', 'search_resources',
    ]);
  });

  it('abre el editor inline y limita el traspaso al componente', async () => {
    const transfer = vi.fn(async () => ({ expiresAt: 1_800_000_000_000 }));
    const client = await start({ extrasHtml: () => shell, transfer, claimOrigin: 'https://example.com' });
    const { tools } = await client.listTools();
    expect(tools.find(tool => tool.name === 'open_prompt_builder')).toMatchObject({ _meta: {
      'openai/ui': { preferredModelDisplayMode: 'inline' }, ui: { resourceUri: 'ui://biblioteca/prompt-builder-v1.html' },
    } });
    expect(tools.find(tool => tool.name === 'create_prompt_transfer')).toMatchObject({ _meta: { ui: { visibility: ['app'] } } });
    const opened = await client.callTool({ name: 'open_prompt_builder', arguments: {} });
    expect(opened.structuredContent).toEqual({ view: 'guest' });
    const payload = { codeHash: Buffer.alloc(32, 1).toString('base64url'), envelope: {
      version: 1, iv: Buffer.alloc(12, 2).toString('base64url'), ciphertext: Buffer.alloc(32, 3).toString('base64url'),
    } };
    const transferred = await client.callTool({ name: 'create_prompt_transfer', arguments: payload });
    expect(transfer).toHaveBeenCalledWith(payload);
    expect(transferred.structuredContent).toEqual({ expiresAt: 1_800_000_000_000 });
    expect(JSON.stringify(transferred)).not.toContain(payload.codeHash);
  });

  it('exige OAuth antes de consultar Firestore y protege los alcances de escritura', async () => {
    const authorize = vi.fn(async () => null);
    const client = await start({ extrasHtml: () => shell, personal: { authorize, metadataUrl } });
    const open = await client.callTool({ name: 'open_my_library', arguments: {} });
    expect(open).toMatchObject({ isError: true, _meta: { 'mcp/www_authenticate': [expect.stringContaining(metadataUrl)] } });
    expect(getBibliotecaAdmin).not.toHaveBeenCalled();
    const write = (await client.listTools()).tools.find(tool => tool.name === 'save_my_prompt');
    expect(write).toMatchObject({ annotations: { readOnlyHint: false }, _meta: {
      securitySchemes: [{ type: 'oauth2', scopes: ['library:write'] }], ui: { visibility: ['app'] },
    } });
    const result = await client.callTool({ name: 'save_my_prompt', arguments: {
      draft: { title: 'Prueba', promptText: 'Ejemplo' }, requestId: '63a6ef62-50ab-4529-833b-233a0767b060',
    } });
    expect(result.isError).toBe(true);
    expect(authorize.mock.calls).toEqual([['library:read library:write'], ['library:write']]);
  });

  it('entrega el prompt al componente y no al contenido del modelo, y revalida el acceso', async () => {
    const draft = { id: 'abc123', title: 'Título privado', promptText: 'Cuerpo privado {{tarea}}' };
    vi.mocked(getPersonalPrompt).mockResolvedValue(draft);
    const client = await start({ extrasHtml: () => shell, personal: { authorize: async () => 'firebase-user-a', metadataUrl } });
    const allowed = await client.callTool({ name: 'get_my_prompt', arguments: { id: draft.id } });
    expect(assertPersonalLibraryAccess).toHaveBeenCalledWith(expect.anything(), 'firebase-user-a');
    expect(getPersonalPrompt).toHaveBeenCalledWith(expect.anything(), 'firebase-user-a', 'abc123');
    expect(allowed._meta).toMatchObject({ bibliotecaPrivate: draft });
    expect(JSON.stringify([allowed.content, allowed.structuredContent])).not.toContain(draft.promptText);
    expect(JSON.stringify([allowed.content, allowed.structuredContent])).not.toContain(draft.title);
    vi.mocked(assertPersonalLibraryAccess).mockRejectedValueOnce(new PersonalLibraryError('entitlement_required'));
    expect((await client.callTool({ name: 'get_my_prompt', arguments: { id: draft.id } })).isError).toBe(true);
    expect(getPersonalPrompt).toHaveBeenCalledTimes(1);
  });

  it('identifica la cuenta autorizada solo en el componente de Mi Biblioteca', async () => {
    const authorize = vi.fn<NonNullable<PromptToolOptions['personal']>['authorize']>().mockResolvedValue('firebase-user-a');
    getUser.mockResolvedValue({ displayName: 'Cuenta piloto', emailVerified: true, email: 'piloto@example.com' });
    vi.mocked(listPersonalPrompts).mockResolvedValue({ prompts: [] });
    const client = await start({ extrasHtml: () => shell, personal: { authorize, metadataUrl } });
    const firstPage = await client.callTool({ name: 'list_my_prompts', arguments: {} });
    expect(getUser).toHaveBeenCalledWith('firebase-user-a');
    expect(firstPage._meta).toEqual({ bibliotecaPrivate: {
      prompts: [], accountKey: expect.any(String), profile: { displayName: 'Cuenta piloto', maskedEmail: 'pi•••@example.com' },
    } });
    expect(firstPage.content).toEqual([{ type: 'text', text: 'Listo en Biblioteca.' }]);
    expect(firstPage.structuredContent).toBeUndefined();

    const next = await client.callTool({ name: 'list_my_prompts', arguments: { cursor: 'abc123' } });
    const { accountKey } = firstPage._meta?.bibliotecaPrivate as { accountKey: string };
    expect(next._meta).toEqual({ bibliotecaPrivate: { prompts: [], accountKey } });
    expect(accountKey).not.toContain('firebase-user-a');
    authorize.mockResolvedValueOnce(null);
    const disconnected = await client.callTool({ name: 'list_my_prompts', arguments: {} });
    expect(disconnected).toMatchObject({ isError: true });
    expect(disconnected._meta?.bibliotecaPrivate).toBeUndefined();
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it('entrega skills y actividad por la misma cuenta solo al componente', async () => {
    const skill = { id: 'skill-1', title: 'Skill personal', summary: 'Resumen privado', submissionId: 'approved-1', authorName: 'Autora', license: 'CC BY 4.0', content: {
      text: 'Contenido guardado', source: 'inline' as const, repositoryUrl: '', repositoryCommit: '', repositoryPath: '',
    } };
    const activity = [{ id: 'event-1', action: 'saved' as const, kind: 'skill' as const, resourceId: skill.id,
      title: skill.title, source: 'web' as const, at: '2026-11-22T15:00:00.000Z' }];
    vi.mocked(listLibrarySkills).mockResolvedValue([skill]);
    vi.mocked(getLibrarySkill).mockResolvedValue(skill);
    vi.mocked(listLibraryActivity).mockResolvedValue(activity);
    const client = await start({ extrasHtml: () => shell, personal: { authorize: async () => 'owner-a', metadataUrl } });
    for (const [name, args, expected] of [
      ['list_my_skills', {}, { skills: [skill] }],
      ['get_my_skill', { id: skill.id }, skill],
      ['list_my_activity', {}, { activity }],
    ] as const) {
      const response = await client.callTool({ name, arguments: args });
      expect(response._meta).toMatchObject({ bibliotecaPrivate: { ...expected, accountKey: expect.any(String) } });
      expect(JSON.stringify([response.content, response.structuredContent])).not.toMatch(/Skill personal|Resumen privado|Contenido guardado|owner-a/);
    }
    expect(getLibrarySkill).toHaveBeenCalledWith(expect.anything(), 'owner-a', skill.id);
    expect(listLibraryActivity).toHaveBeenCalledWith(expect.anything(), 'owner-a');
    const tools = (await client.listTools()).tools;
    for (const name of ['list_my_skills', 'get_my_skill', 'list_my_activity', 'record_my_activity', 'save_my_skill']) {
      expect(tools.find(tool => tool.name === name)?._meta?.ui).toMatchObject({ visibility: ['app'] });
    }
  });

  it('revalida la versión pública antes de guardar una skill y conserva el historial de la cuenta', async () => {
    const delivery = { resource: { id: 'skill-1', kind: 'skill', submissionId: 'approved-1' },
      content: { text: 'Skill.md aprobado' }, repositoryFolderUrl: null } as CatalogContentResult;
    const content = vi.fn(async () => delivery);
    vi.mocked(saveLibrarySkill).mockResolvedValue({ id: 'skill-1' });
    const client = await start({ extrasHtml: () => shell, personal: { authorize: async () => 'owner-a', metadataUrl } }, { content });
    const response = await client.callTool({ name: 'save_my_skill', arguments: { resourceId: 'skill-1', expectedSubmissionId: 'approved-1' } });
    expect(response.isError).not.toBe(true);
    expect(content).toHaveBeenCalledWith('skill-1', 'approved-1');
    expect(saveLibrarySkill).toHaveBeenCalledWith(expect.anything(), 'owner-a', delivery, 'chatgpt');
    content.mockRejectedValueOnce(new VersionChanged(delivery.resource));
    const changed = await client.callTool({ name: 'save_my_skill', arguments: { resourceId: 'skill-1', expectedSubmissionId: 'approved-1' } });
    expect(changed.isError).toBe(true);
    expect(saveLibrarySkill).toHaveBeenCalledTimes(1);
    const usage = { kind: 'skill', resourceId: 'skill-1', requestId: '63a6ef62-50ab-4529-833b-233a0767b060' };
    expect((await client.callTool({ name: 'record_my_activity', arguments: usage })).isError).not.toBe(true);
    expect(recordLibraryUse).toHaveBeenCalledWith(expect.anything(), 'owner-a', usage, 'chatgpt');
  });

  it('explica el acceso expirado sin promover compras dentro del complemento', async () => {
    vi.mocked(assertPersonalLibraryAccess).mockRejectedValueOnce(new LibraryAccessError('access_expired'));
    const client = await start({ extrasHtml: () => shell, personal: { authorize: async () => 'owner-a', metadataUrl } });
    const response = await client.callTool({ name: 'list_my_prompts', arguments: {} });
    expect(response.isError).toBe(true);
    expect(JSON.stringify(response.content)).toContain('El guardado está pausado');
    expect(JSON.stringify(response.content)).not.toMatch(/activar Pro|checkout|suscripción/i);
  });

  it('rechaza un guardado si la cuenta conectada cambió mientras se redactaba', async () => {
    const client = await start({ extrasHtml: () => shell, personal: { authorize: async () => 'owner-b', metadataUrl } });
    const result = await client.callTool({ name: 'save_my_prompt', arguments: {
      draft: { title: 'Solo para A', promptText: 'Borrador de A' }, requestId: '63a6ef62-50ab-4529-833b-233a0767b060',
      expectedAccountKey: Buffer.alloc(32, 5).toString('base64url'),
    } });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain('La cuenta conectada cambió');
    expect(savePersonalPrompt).not.toHaveBeenCalled();
  });
});
