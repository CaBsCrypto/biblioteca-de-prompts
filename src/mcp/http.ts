import type { Express } from 'express';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import config from '../../firebase-applet-config.json';
import { createCatalogReader } from './catalogReader';
import { createLibraryMcpServer } from './server';
import { InvalidCatalogRequest, ResourceUnavailable, VersionChanged, type CatalogReader } from './contracts';

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
  // A reviewed inline skill can be downloaded outside hosts that block iframe downloads.
  // This uses the same anonymous reader and version/withdrawal checks as its MCP deliverable.
  const downloadBuckets = new Map<string, { count: number; until: number }>();
  app.all('/api/catalog/skills/:id/download', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      res.status(405).json({ code: 'method_not_allowed', message: 'Usa GET o HEAD para descargar SKILL.md.' });
      return;
    }
    const now = Date.now();
    for (const [key, bucket] of downloadBuckets) if (bucket.until <= now) downloadBuckets.delete(key);
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const bucket = downloadBuckets.get(key) ?? { count: 0, until: now + 60_000 };
    downloadBuckets.set(key, bucket);
    if (++bucket.count > 60) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.until - now) / 1000))));
      res.status(429).json({ code: 'rate_limited', message: 'Demasiadas descargas. Intenta de nuevo en un minuto.' });
      return;
    }
    const validId = (value: unknown): value is string => typeof value === 'string'
      && value.length > 0 && value.length <= 200 && !/[\/#?\u0000-\u001f]/.test(value);
    const id = req.params.id;
    const expectedSubmissionId = req.query.expectedSubmissionId;
    if (!validId(id) || !validId(expectedSubmissionId)) {
      res.status(400).json({ code: 'invalid_catalog_request', message: 'Indica un recurso y una versión aprobada válidos.' });
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        (reader ?? publicReader()).content(id, expectedSubmissionId),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(Object.assign(new Error('download_timeout'), { code: 'download_timeout' })), 12_000);
        }),
      ]);
      if (result.resource.kind !== 'skill' || result.content.source !== 'inline') {
        res.status(409).json({ code: 'not_inline_skill', message: 'Esta descarga admite únicamente skills de texto. Los paquetes se obtienen desde su carpeta revisada.' });
        return;
      }
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="SKILL.md"');
      res.status(200).send(Buffer.from(result.content.text, 'utf8'));
    } catch (error) {
      const timeout = typeof error === 'object' && error !== null && 'code' in error && error.code === 'download_timeout';
      const known = error instanceof InvalidCatalogRequest || error instanceof ResourceUnavailable || error instanceof VersionChanged;
      const code = known ? error.code : timeout ? 'download_timeout' : 'temporarily_unavailable';
      const status = error instanceof InvalidCatalogRequest ? 400 : error instanceof ResourceUnavailable ? 404
        : error instanceof VersionChanged ? 409 : timeout ? 504 : 503;
      console.warn('[MCP]', JSON.stringify({ operation: 'skill_download', code, elapsedMs: Date.now() - now }));
      res.status(status).json({ code, message: known ? error.message : 'No pudimos descargar la skill. Intenta de nuevo.' });
    } finally { clearTimeout(timer); }
  });
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
