import { isIP } from 'node:net';
import type { Express, Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import { getBibliotecaAdmin } from './firebaseAdmin';
import {
  claimPromptTransfer, createPromptTransfer, previewPromptTransfer,
  TransferError, transferClaimSchema, transferCreateSchema, transferPreviewSchema,
} from './promptTransfers';

const transferPath = '/api/prompt-transfers';

function verifyOrigin(req: Request): boolean {
  const origin = req.get('origin');
  if (!origin) return true;
  const hosts = ['biblioteca.browns.studio', process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL];
  if (process.env.NODE_ENV !== 'production') {
    hosts.push(`localhost:${req.socket.localPort}`, `127.0.0.1:${req.socket.localPort}`);
  }
  try {
    const url = new URL(origin);
    return hosts.includes(url.host) && (url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:'));
  } catch {
    return false;
  }
}

export function requesterNetwork(req: Request): string {
  const address = process.env.VERCEL === '1' ? req.get('x-vercel-forwarded-for') : req.socket.remoteAddress;
  return address && isIP(address) ? address : 'unknown';
}

function handle<T>(schema: ZodType<T>, authenticated: boolean, status: number, fn: (input: T, req: Request, uid: string) => Promise<object>) {
  return async (req: Request, res: Response) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_transfer', message: 'Verifica el borrador o genera un enlace nuevo.' });
      return;
    }

    let uid = '';
    if (authenticated) {
      const token = req.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
      if (!token) {
        res.status(401).json({ error: 'sign_in_required', message: 'Entra con Google en este dispositivo para guardar el borrador.' });
        return;
      }
      try {
        const account = await getBibliotecaAdmin().auth.verifyIdToken(token, true);
        const provider = account.firebase.sign_in_provider;
        if (process.env.BIBLIOTECA_LIBRARY_BETA_ENABLED === 'true' ? provider === 'google.com' : provider !== 'anonymous') uid = account.uid;
      } catch {
        // Revoked, disabled or invalid accounts do not get draft access.
      }
      if (!uid) {
        res.status(401).json({ error: 'sign_in_required', message: 'Vuelve a iniciar sesión para recuperar el borrador.' });
        return;
      }
    }

    try {
      res.status(status).json(await fn(parsed.data, req, uid));
    } catch (error) {
      if (error instanceof TransferError) {
        res.status(error.code === 'rate_limited' ? 429 : error.code === 'unavailable' ? 404
          : ['access_required', 'access_expired', 'prompt_limit'].includes(error.code) ? 403 : 400)
          .json({ error: error.code, message: error.message });
        return;
      }
      console.warn('[PromptTransfers] operation_failed');
      res.status(503).json({ error: 'temporarily_unavailable', message: 'No pudimos completar el traspaso. Intenta de nuevo.' });
    }
  };
}

export function installPromptTransferHttp(app: Express) {
  app.use(transferPath, (req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    if (process.env.BIBLIOTECA_PROMPT_TRANSFERS_ENABLED !== 'true') {
      res.status(503).json({ error: 'transfer_disabled', message: 'El traspaso todavía no está disponible.' });
      return;
    }
    if (req.method !== 'POST' || !req.is('application/json')) {
      res.status(405).json({ error: 'invalid_request', message: 'Usa una solicitud POST en JSON.' });
      return;
    }
    if (!verifyOrigin(req)) {
      res.status(403).json({ error: 'invalid_origin', message: 'Abre el borrador desde Biblioteca.' });
      return;
    }
    next();
  });
  app.post(transferPath, handle(transferCreateSchema, false, 201,
    (input, req) => createPromptTransfer(getBibliotecaAdmin().db, input, requesterNetwork(req))));
  app.post(`${transferPath}/preview`, handle(transferPreviewSchema, true, 200,
    (input, _req, uid) => previewPromptTransfer(getBibliotecaAdmin().db, input.code, uid)));
  app.post(`${transferPath}/claim`, handle(transferClaimSchema, true, 200,
    (input, _req, uid) => claimPromptTransfer(getBibliotecaAdmin().db, input, uid)));
}

export function handleTransferBodyError(error: { status?: number }, req: Request, res: Response, next: NextFunction) {
  if (req.path.startsWith(transferPath) && (error.status === 413 || error.status === 400)) {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    res.status(error.status).json({ error: 'invalid_transfer', message: 'El borrador supera el tamaño permitido o tiene un formato inválido.' });
    return;
  }
  next(error);
}
