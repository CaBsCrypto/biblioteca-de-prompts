import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Server } from 'node:http';
import { installLibraryMcp } from '../src/mcp/http';
import { LIBRARY_URI } from '../src/mcp/server';
import { ResourceUnavailable, VersionChanged, type CatalogReader, type PublicCatalogResource } from '../src/mcp/contracts';

const resource: PublicCatalogResource = {
  id: 'approved', kind: 'prompt', state: 'published', submissionId: 'version-1', publishedAt: null, updatedAt: null,
  canonicalUrl: 'https://biblioteca.browns.studio/recurso/prompt/approved', metadata: {
    title: 'Recurso revisado', summary: '', outcome: '', category: 'Código', tags: [], compatibility: ['ChatGPT'],
    requirements: '', usage: '', license: 'CC BY 4.0', exampleInput: '<script>bad()</script>', exampleOutput: 'Resultado',
    imageUrl: '', demoUrl: '', authorName: 'Creador', authorHandle: 'creador', authorAvatar: '',
  },
};
const servers: Server[] = [];
const clients: Client[] = [];
async function fixture() {
  const reader: CatalogReader = { search: vi.fn(async () => ({ resources: [resource], total: 1 })),
    get: vi.fn(async () => resource), content: vi.fn(async () => ({ resource, repositoryFolderUrl: null,
      content: { text: 'Resume {{texto}}', source: 'inline' as const, repositoryUrl: '', repositoryCommit: '', repositoryPath: '' } })) };
  const app = express(); app.use(express.json({ limit: '64kb' }));
  installLibraryMcp(app, reader, () => '<!doctype html><div id="root">Biblioteca</div>');
  const http = await new Promise<Server>(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
  servers.push(http);
  const address = http.address();
  const url = new URL('http://127.0.0.1:' + (typeof address === 'object' && address ? address.port : 0) + '/api/mcp');
  const client = new Client({ name: 'biblioteca-test', version: '1.0.0' });
  clients.push(client); await client.connect(new StreamableHTTPClientTransport(url));
  return { reader, client, url };
}
afterEach(async () => { await Promise.all(clients.splice(0).map(client => client.close()));
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }))); });

describe('MCP público Streamable HTTP sin sesión', () => {
  it('inicializa y mantiene las cuatro herramientas disponibles entre peticiones', async () => {
    const { client, reader } = await fixture();
    const tools = await client.listTools();
    expect(tools.tools.map(tool => tool.name).sort()).toEqual(['get_resource', 'get_resource_content', 'open_library', 'search_resources']);
    expect(tools.tools.every(tool => tool.annotations?.readOnlyHint && !tool.annotations.destructiveHint)).toBe(true);
    const search = await client.callTool({ name: 'search_resources', arguments: { kind: 'prompt' } });
    expect(search.isError).not.toBe(true); expect(search.structuredContent).toMatchObject({ resources: [resource] });
    expect(reader.search).toHaveBeenCalledWith({ query: '', kind: 'prompt', category: '', compatibility: '', author: '' }, undefined, 20);
    expect((await client.callTool({ name: 'get_resource', arguments: { id: 'approved' } })).structuredContent).toMatchObject({ resource });
  });
  it('registra entrada de conversación y un recurso UI autónomo con CSP acotada', async () => {
    const { client } = await fixture(); const tools = await client.listTools();
    expect(tools.tools.find(tool => tool.name === 'open_library')?._meta?.['openai/ui']).toMatchObject({ entrypoints: [{ type: 'thread' }] });
    const result = await client.callTool({ name: 'open_library', arguments: { id: 'approved', kind: 'prompt' } });
    expect(result.structuredContent).toMatchObject({ resource, total: 1 });
    const ui = await client.readResource({ uri: LIBRARY_URI });
    expect(ui.contents[0].mimeType).toBe('text/html;profile=mcp-app');
    expect(ui.contents[0]._meta).toMatchObject({ ui: { permissions: { clipboardWrite: {} }, csp: { connectDomains: [], resourceDomains: [] } } });
  });
  it('rechaza entrada inválida sin consultar Firestore', async () => {
    const { reader, client } = await fixture();
    expect((await client.callTool({ name: 'search_resources', arguments: { limit: 21 } })).isError).toBe(true);
    expect((await client.callTool({ name: 'get_resource', arguments: { id: '../draft' } })).isError).toBe(true);
    expect(reader.search).not.toHaveBeenCalled(); expect(reader.get).not.toHaveBeenCalled();
  });
  it('no entrega versiones retiradas o desactualizadas y conserva errores recuperables', async () => {
    const { reader, client } = await fixture();
    vi.mocked(reader.content).mockRejectedValueOnce(new VersionChanged(resource));
    const changed = await client.callTool({ name: 'get_resource_content', arguments: { id: 'approved', expectedSubmissionId: 'version-1' } });
    expect(changed.isError).toBe(true); expect(JSON.stringify(changed.content)).toContain('version_changed'); expect(changed.structuredContent).toBeUndefined();
    vi.mocked(reader.get).mockRejectedValueOnce(new ResourceUnavailable());
    expect((await client.callTool({ name: 'get_resource', arguments: { id: 'approved' } })).isError).toBe(true);
  });
  it('bloquea métodos, origen hostil y lotes fuera del transporte permitido', async () => {
    const { url, reader } = await fixture();
    expect((await fetch(url)).status).toBe(405);
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
    expect((await fetch(url, { method: 'POST', headers: { ...headers, Origin: 'https://evil.example' }, body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'tools/list' }) })).status).toBe(403);
    expect((await fetch(url, { method: 'POST', headers, body: '[]' })).status).toBe(400);
    expect(reader.content).not.toHaveBeenCalled();
  });
});

describe('descarga pública de una skill inline revisada', () => {
  const skillText = '---\r\nname: documentar-codigo\r\ndescription: Documenta código revisado.\r\n---\r\n# Instrucciones\r\nExplica el código sin ejecutarlo.\r\n';
  const approvedSkill = { ...resource, kind: 'skill' as const };
  function inlineSkill() {
    return { resource: approvedSkill, repositoryFolderUrl: null,
      content: { text: skillText, source: 'inline' as const, repositoryUrl: '', repositoryCommit: '', repositoryPath: '' } };
  }
  function downloadUrl(base: URL, id = 'approved', version = 'version-1') {
    return new URL('/api/catalog/skills/' + encodeURIComponent(id) + '/download?expectedSubmissionId=' + encodeURIComponent(version), base);
  }

  it('entrega los bytes revisados como SKILL.md con UTF-8, sin caché y sin interpretar Markdown', async () => {
    const { reader, url } = await fixture();
    const hostileText = skillText + '<script>alert("no ejecutar")</script>\r\n';
    vi.mocked(reader.content).mockResolvedValue({ ...inlineSkill(), content: { ...inlineSkill().content, text: hostileText } });
    const response = await fetch(downloadUrl(url));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="SKILL.md"');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from(hostileText, 'utf8'));
    expect(reader.content).toHaveBeenCalledWith('approved', 'version-1');
  });

  it('HEAD comprueba la misma versión y devuelve cabeceras y tamaño sin entregar el cuerpo', async () => {
    const { reader, url } = await fixture();
    vi.mocked(reader.content).mockResolvedValue(inlineSkill());
    const response = await fetch(downloadUrl(url), { method: 'HEAD' });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="SKILL.md"');
    expect(Number(response.headers.get('content-length'))).toBe(Buffer.byteLength(skillText, 'utf8'));
    expect(await response.text()).toBe('');
    expect(reader.content).toHaveBeenCalledWith('approved', 'version-1');
  });

  it('rechaza entradas ausentes, repetidas o inválidas antes de consultar el lector', async () => {
    const { reader, url } = await fixture();
    const invalid = [
      new URL('/api/catalog/skills/approved/download', url),
      downloadUrl(url, 'approved', ''), downloadUrl(url, 'approved', 'x'.repeat(201)),
      downloadUrl(url, 'approved', 'version/other'), downloadUrl(url, 'approved/bad', 'version-1'),
      new URL('/api/catalog/skills/approved/download?expectedSubmissionId=first&expectedSubmissionId=second', url),
    ];
    for (const endpoint of invalid) expect((await fetch(endpoint)).status).toBe(400);
    expect(reader.content).not.toHaveBeenCalled();
  });

  it('retirada devuelve 404 y una versión antigua devuelve 409 sin archivo ni contenido', async () => {
    const { reader, url } = await fixture();
    vi.mocked(reader.content).mockRejectedValueOnce(new ResourceUnavailable()).mockRejectedValueOnce(new VersionChanged(approvedSkill));
    const unavailable = await fetch(downloadUrl(url));
    expect(unavailable.status).toBe(404);
    expect(unavailable.headers.get('content-disposition')).toBeNull();
    expect(await unavailable.json()).toMatchObject({ code: 'resource_unavailable' });
    const changed = await fetch(downloadUrl(url));
    expect(changed.status).toBe(409);
    expect(changed.headers.get('content-disposition')).toBeNull();
    expect(await changed.json()).toMatchObject({ code: 'version_changed' });
  });

  it('no convierte prompts ni paquetes con archivos complementarios en descargas inline', async () => {
    const { reader, url } = await fixture();
    vi.mocked(reader.content).mockResolvedValueOnce({ ...inlineSkill(), resource })
      .mockResolvedValueOnce({ ...inlineSkill(), repositoryFolderUrl: 'https://github.com/author/skills/tree/' + 'a'.repeat(40),
        content: { ...inlineSkill().content, source: 'github', repositoryUrl: 'https://github.com/author/skills', repositoryCommit: 'a'.repeat(40), repositoryPath: '.' } });
    for (let index = 0; index < 2; index++) {
      const response = await fetch(downloadUrl(url));
      expect(response.status).toBe(409);
      expect(response.headers.get('content-disposition')).toBeNull();
      expect(await response.json()).toMatchObject({ code: 'not_inline_skill' });
    }
  });

  it('bloquea otros métodos sin consultar el lector', async () => {
    const { reader, url } = await fixture();
    const response = await fetch(downloadUrl(url), { method: 'POST' });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
    expect(reader.content).not.toHaveBeenCalled();
  });

  it('limita las descargas a sesenta por minuto independientemente del transporte MCP', async () => {
    const { reader, url, client } = await fixture();
    vi.mocked(reader.content).mockResolvedValue(inlineSkill());
    for (let index = 0; index < 60; index++) expect((await fetch(downloadUrl(url))).status).toBe(200);
    const response = await fetch(downloadUrl(url));
    expect(response.status).toBe(429);
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(reader.content).toHaveBeenCalledTimes(60);
    expect((await client.listTools()).tools).toHaveLength(4);
  });

  it('oculta errores internos en la respuesta y en los registros', async () => {
    const { reader, url } = await fixture();
    vi.mocked(reader.content).mockRejectedValueOnce(new Error('private-path SECRET-content'));
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const response = await fetch(downloadUrl(url));
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain('SECRET-content');
      expect(JSON.stringify(log.mock.calls)).not.toContain('SECRET-content');
    } finally { log.mockRestore(); }
  });

  it('interrumpe una consulta que no responde tras doce segundos sin entregar un archivo', async () => {
    const { reader, url } = await fixture();
    vi.mocked(reader.content).mockImplementationOnce(() => new Promise(() => undefined));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const pending = fetch(downloadUrl(url));
      await vi.waitFor(() => expect(reader.content).toHaveBeenCalledOnce());
      await vi.advanceTimersByTimeAsync(12_000);
      const response = await pending;
      expect(response.status).toBe(504);
      expect(response.headers.get('content-disposition')).toBeNull();
      expect(await response.json()).toMatchObject({ code: 'download_timeout' });
    } finally { vi.useRealTimers(); }
  });
});
