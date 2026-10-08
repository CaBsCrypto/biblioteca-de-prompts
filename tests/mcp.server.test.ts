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
