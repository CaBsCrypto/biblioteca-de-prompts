import assert from 'node:assert/strict';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';

// Import the exact compiled artifact and Vercel entrypoint, not the TS source.
// No listener, credentials or provider request is needed for this regression check.
process.env.VERCEL = '1';
process.env.NODE_ENV = 'production';
process.env.GEMINI_API_KEY = 'compiled-startup-placeholder';
process.env.OPENROUTER_API_KEY = '';
delete process.env.MCP_FIRESTORE_EMULATOR;
globalThis.fetch = async () => { throw new Error('The compiled startup check must not make network requests.'); };

const { createApp } = await import('../dist/server.mjs');
assert.equal(typeof createApp, 'function', 'Compiled ESM backend must export createApp.');
const app = await createApp({ enableVite: false, serveStatic: false });
assert.equal(typeof app, 'function', 'Compiled backend must initialize an Express application.');

const { default: handler } = await import('../api/[...path].js');
assert.equal(typeof handler, 'function', 'Vercel entrypoint must import the compiled ESM backend.');

/** Exercise the production handler with real Node request/response types, entirely in memory. */
async function request(url) {
  const socket = new Socket();
  const req = new IncomingMessage(socket);
  req.method = 'GET'; req.url = url; req.headers = { host: 'biblioteca.browns.studio' };
  const res = new ServerResponse(req);
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Compiled handler did not respond: ${url}`)), 5000);
    res.end = function (chunk) {
      clearTimeout(timer);
      socket.destroy();
      resolve({ status: this.statusCode, headers: this.getHeaders(), body: chunk ? Buffer.from(chunk).toString('utf8') : '' });
      return this;
    };
    Promise.resolve(handler(req, res)).catch(error => { clearTimeout(timer); socket.destroy(); reject(error); });
  });
}

const mcp = await request('/api/mcp');
assert.equal(mcp.status, 405, 'MCP route must initialize and reject unsupported GET requests.');
assert.equal(mcp.headers.allow, 'POST');
assert.match(JSON.parse(mcp.body).error.message, /Streamable HTTP/);

const models = await request('/api/ai/models');
assert.equal(models.status, 200, 'Existing AI metadata route must survive the ESM conversion.');
assert.equal(JSON.parse(models.body).openrouterAvailable, false);
console.log('Compiled ESM backend and Vercel entrypoint initialized; MCP and AI metadata routes passed without network requests.');
