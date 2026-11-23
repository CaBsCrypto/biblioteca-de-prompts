import { managedLibraryEnabled } from './libraryMode';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { publicReader } from '../../mcp/http';
import { InvalidCatalogRequest, ResourceUnavailable, VersionChanged } from '../../mcp/contracts';
import { getBibliotecaAdmin } from './firebaseAdmin';
import { ensurePilotEntry, LibraryAccessError, type LibraryAccess } from './libraryAccess';
import { listLibraryActivity } from './libraryActivity';
import { LibraryCollectionError, libraryResourceId, recordLibraryUse, recordLibraryUseInput, saveLibrarySkill } from './libraryCollections';

const saveInput = z.strictObject({ resourceId: libraryResourceId, submissionId: libraryResourceId });
type Work = (admin: ReturnType<typeof getBibliotecaAdmin>, uid: string, req: Request, access: LibraryAccess) => Promise<unknown>;

function privateRoute(work: Work) {
  return async (req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store');
    if (!managedLibraryEnabled()) {
      res.status(404).json({ message: 'Esta vista del piloto no está disponible.' });
      return;
    }
    const token = req.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token) { res.status(401).json({ message: 'Entra con Google para abrir Mi Biblioteca.' }); return; }
    try {
      const admin = getBibliotecaAdmin();
      const identity = await admin.auth.verifyIdToken(token, true).catch(() => null);
      if (!identity || identity.firebase.sign_in_provider !== 'google.com') {
        res.status(401).json({ message: 'Vuelve a entrar con Google para continuar.' });
        return;
      }
      const access = await ensurePilotEntry(admin.db, identity.uid);
      res.json(await work(admin, identity.uid, req, access));
    } catch (error) {
      const status = error instanceof LibraryAccessError ? (error.code === 'library_unavailable' ? 503 : 403) : error instanceof LibraryCollectionError ? error.status
        : error instanceof InvalidCatalogRequest ? 400 : error instanceof ResourceUnavailable ? 404
          : error instanceof VersionChanged ? 409 : 503;
      const message = status === 503 ? 'Mi Biblioteca no está disponible por ahora. Inténtalo de nuevo.' : (error as Error).message;
      res.status(status).json({ message });
    }
  };
}

export function installLibraryCollectionsHttp(app: Express) {
  app.get('/api/library/overview', privateRoute(async ({ db }, uid, _req, access) => ({
    access,
    activity: access.canRead ? await listLibraryActivity(db, uid) : [],
  })));
  app.post('/api/library/skills', privateRoute(async ({ db }, uid, req, access) => {
    if (!access.canRead) throw new LibraryAccessError('access_required');
    const input = saveInput.safeParse(req.body);
    if (!input.success) throw new LibraryCollectionError(400, 'Selecciona una skill y su versión aprobada.');
    const approved = await publicReader().content(input.data.resourceId, input.data.submissionId);
    return saveLibrarySkill(db, uid, approved, 'web');
  }));
  app.post('/api/library/activity', privateRoute(async ({ db }, uid, req, access) => {
    if (!access.canRead) throw new LibraryCollectionError(403, 'Esta cuenta aún no tiene acceso al piloto.');
    const input = recordLibraryUseInput.safeParse(req.body);
    if (!input.success) throw new LibraryCollectionError(400, 'Selecciona un recurso guardado.');
    return recordLibraryUse(db, uid, input.data, 'web');
  }));
}
