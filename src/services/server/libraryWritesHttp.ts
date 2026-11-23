import type { Express, Request } from 'express';
import { getBibliotecaAdmin } from './firebaseAdmin';
import { LibraryAccessError } from './libraryAccess';
import { libraryWriteSchema, LibraryWriteError, runLibraryWrite } from './libraryWrites';

function allowedOrigin(req: Request) {
  const origin = req.get('origin');
  if (!origin) return true;
  const hosts = ['biblioteca.browns.studio', process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL];
  if (process.env.NODE_ENV !== 'production') hosts.push(`localhost:${req.socket.localPort}`, `127.0.0.1:${req.socket.localPort}`);
  try {
    const url = new URL(origin);
    return url.origin === origin && hosts.includes(url.host) && (url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:'));
  } catch { return false; }
}

export function installLibraryWritesHttp(app: Express) {
  app.all('/api/library/prompts', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (process.env.BIBLIOTECA_LIBRARY_BETA_ENABLED !== 'true') {
      res.status(503).json({ error: 'library_disabled', message: 'La biblioteca beta todavía no está disponible.' }); return;
    }
    if (req.method !== 'POST' || !req.is('application/json')) {
      res.status(405).json({ error: 'invalid_request', message: 'Usa una solicitud POST en JSON.' }); return;
    }
    if (!allowedOrigin(req)) {
      res.status(403).json({ error: 'invalid_origin', message: 'Abre tu biblioteca desde Biblioteca.' }); return;
    }
    const token = req.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token) { res.status(401).json({ error: 'sign_in_required', message: 'Entra con Google para acceder a tu biblioteca.' }); return; }
    const parsed = libraryWriteSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'invalid_request', message: 'Revisa los datos del prompt e inténtalo de nuevo.' }); return; }
    try {
      const { auth, db } = getBibliotecaAdmin();
      const account = await auth.verifyIdToken(token, true).catch(() => null);
      if (!account || account.firebase.sign_in_provider !== 'google.com') {
        res.status(401).json({ error: 'sign_in_required', message: 'Vuelve a entrar con Google para acceder a tu biblioteca.' }); return;
      }
      const profile = await db.collection('users').doc(account.uid).get();
      const identity = { authorName: String(account.name ?? 'Miembro'), authorAvatar: String(account.picture ?? ''), authorHandle: String(profile.get('handle') ?? '') };
      res.json(await runLibraryWrite(db, account.uid, { ...parsed.data, source: 'web' }, identity));
    } catch (error) {
      if (error instanceof LibraryWriteError || error instanceof LibraryAccessError) {
        const status = error instanceof LibraryWriteError ? error.status : error.code === 'prompt_too_long' ? 400 : 403;
        res.status(status).json({ error: error.code, message: error.message }); return;
      }
      console.warn('[LibraryWrites] operation_failed');
      res.status(503).json({ error: 'temporarily_unavailable', message: 'No pudimos guardar el cambio. Intenta de nuevo.' });
    }
  });
}
