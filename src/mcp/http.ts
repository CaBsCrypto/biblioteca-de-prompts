import type { Express } from 'express';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import config from '../../firebase-applet-config.json';
import { createCatalogReader } from './catalogReader';
import { createLibraryMcpServer } from './server';
import type { CatalogReader } from './contracts';

let defaultReader: CatalogReader | undefined;
function publicReader() {
  if (defaultReader) return defaultReader;
  const emulator = process.env.MCP_FIRESTORE_EMULATOR === 'true';
  if (emulator && process.env.NODE_ENV === 'production') throw new Error('El MCP de producción no permite emuladores.');
  const name = 'biblioteca-public-mcp';
  const app = getApps().find(value => value.name === name) ?? initializeApp(emulator
    ? { projectId: 'demo-biblioteca', apiKey: 'demo-key', appId: 'demo-app' } : config, name);
  const db = initializeFirestore(app, { experimentalForceLongPolling: true }, emulator ? '(default)' : config.firestoreDatabaseId);
  if (emulator) connectFirestoreEmulator(db, '127.0.0.1', 8080);
  defaultReader = createCatalogReader(db);
  return defaultReader;
}

export function installLibraryMcp(app: Express, reader?: CatalogReader, widgetHtml = () => readFileSync(path.resolve('dist/mcp-widget.html'), 'utf8')) {
  if (process.env.MCP_FIRESTORE_EMULATOR === 'true' && process.env.NODE_ENV !== 'production') {
    app.get('/__mcp-test', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.type('html').send(readFileSync(path.resolve('dist/mcp-harness.html'), 'utf8'));
    });
  }
  // Best-effort per-instance throttling supplements request/schema limits on serverless.
  const buckets = new Map<string, { count: number; until: number }>();
  app.all('/api/mcp', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Usa POST con Streamable HTTP.' } });
      return;
    }
    const now = Date.now();
    for (const [key, value] of buckets) if (value.until <= now) buckets.delete(key);
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const bucket = buckets.get(key) ?? { count: 0, until: now + 60_000 };
    if (++bucket.count > 120) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.until - now) / 1000))));
      res.status(429).json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Demasiadas consultas. Intenta de nuevo en un minuto.' } });
      return;
    }
    buckets.set(key, bucket);
    if (!req.is('application/json') || Array.isArray(req.body)) {
      res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Se requiere una petición JSON-RPC individual.' } });
      return;
    }
    const localPort = process.env.NODE_ENV !== 'production' ? req.socket.localPort : undefined;
    const hosts = ['biblioteca.browns.studio', process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL,
      ...(localPort ? ['localhost:' + localPort, '127.0.0.1:' + localPort] : [])].filter(Boolean) as string[];
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true,
      enableDnsRebindingProtection: true, allowedHosts: hosts,
      allowedOrigins: ['https://chatgpt.com', 'https://chat.openai.com',
        ...(localPort ? ['http://localhost:' + localPort, 'http://127.0.0.1:' + localPort, 'http://localhost:6274'] : [])] });
    try {
      const server = createLibraryMcpServer(reader ?? publicReader(), widgetHtml);
      let finished = false;
      res.on('close', () => { if (!finished) { finished = true; void server.close(); } });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      console.warn('[MCP]', JSON.stringify({ operation: 'http', code: 'transport_error' }));
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Biblioteca no está disponible temporalmente.' } });
    }
  });
}
