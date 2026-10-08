#!/usr/bin/env node

import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createVercelMcpFetch } from './vercel-mcp-fetch.mjs';

const args = process.argv.slice(2).filter(value => value !== '--vercel-auth');
const target = args[0] || process.env.SMOKE_MCP_URL;
if (!target) {
  console.error('Uso: npm run smoke:mcp -- https://biblioteca.browns.studio/api/mcp [id-publicado]');
  process.exit(1);
}
const endpoint = new URL(target);
const local = ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname);
if (endpoint.protocol !== 'https:' && !(local && endpoint.protocol === 'http:')) {
  throw new Error('El smoke requiere HTTPS, salvo emuladores locales.');
}
const expectedTools = ['search_resources', 'get_resource', 'get_resource_content', 'open_library'];
const client = new Client({ name: 'biblioteca-smoke', version: '0.1.0' });
const vercelAuth = process.argv.includes('--vercel-auth');
const transport = new StreamableHTTPClientTransport(endpoint, {
  ...(vercelAuth ? { fetch: createVercelMcpFetch(endpoint) } : {}),
  ...(!vercelAuth && process.env.SMOKE_MCP_BYPASS_SECRET ? { requestInit: { headers: { 'x-vercel-protection-bypass': process.env.SMOKE_MCP_BYPASS_SECRET } } } : {}),
});
const options = { timeout: 20_000 };

function toolData(result) {
  assert.notEqual(result.isError, true, 'La herramienta devolvió un error.');
  assert.ok(result.structuredContent && typeof result.structuredContent === 'object', 'Falta structuredContent.');
  return result.structuredContent;
}

try {
  await client.connect(transport, options);
  console.log('OK inicialización MCP con cliente oficial');
  const { tools } = await client.listTools({}, options);
  assert.deepEqual(tools.map(tool => tool.name).sort(), [...expectedTools].sort());
  for (const tool of tools) assert.equal(tool.annotations?.readOnlyHint, true, `${tool.name} debe ser de lectura.`);
  console.log(`OK herramientas de lectura: ${expectedTools.join(', ')}`);
  for (const kind of ['prompt', 'skill']) {
    const data = toolData(await client.callTool({ name: 'search_resources', arguments: { kind } }, undefined, options));
    assert.ok(Array.isArray(data.resources));
    assert.ok(data.resources.length <= 20, 'La página supera 20 recursos.');
    assert.ok(data.resources.every(resource => resource.kind === kind), 'El filtro mezcla tipos.');
    console.log(`OK búsqueda ${kind}: ${data.resources.length} resultados`);
  }
  const opened = toolData(await client.callTool({ name: 'open_library', arguments: { kind: 'all' } }, undefined, options));
  assert.ok(Array.isArray(opened.resources));
  const uri = 'ui://biblioteca/library-v1.html';
  const listed = await client.listResources({}, options);
  assert.ok(listed.resources.some(resource => resource.uri === uri), 'La interfaz no está registrada.');
  const ui = await client.readResource({ uri }, options);
  assert.ok(ui.contents.some(content => typeof content.text === 'string' && content.text.includes('<html')), 'La interfaz no contiene HTML.');
  console.log(`OK interfaz MCP App: ${uri}`);
  const id = args[1];
  if (id) {
    const detail = toolData(await client.callTool({ name: 'get_resource', arguments: { id } }, undefined, options));
    const resource = detail.resource;
    assert.equal(resource?.id, id);
    assert.equal(typeof resource.submissionId, 'string');
    toolData(await client.callTool({ name: 'get_resource_content', arguments: { id, expectedSubmissionId: resource.submissionId } }, undefined, options));
    console.log(`OK ficha y entregable de versión publicada: ${id}`);
  }
  console.log(`Smoke MCP OK: ${endpoint.origin}${endpoint.pathname}`);
} catch (error) {
  console.error(`Smoke MCP FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await client.close();
}
