import type { Express } from 'express';
import { getBibliotecaAdmin } from './firebaseAdmin';
import { GroupError, groupActionSchema, runGroupAction } from './workGroups';
import { ensurePilotEntry } from './libraryAccess';

export function installWorkGroupsHttp(app: Express) {
  app.post('/api/work-groups', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const token = req.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token) {
      res.status(401).json({ message: 'Inicia sesión con Google para acceder a tus grupos.' });
      return;
    }
    const parsed = groupActionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Revisa los datos e inténtalo de nuevo.' });
      return;
    }
    try {
      const { db, auth } = getBibliotecaAdmin();
      const account = await auth.verifyIdToken(token, true).catch(() => null);
      const pilot = process.env.BIBLIOTECA_LIBRARY_BETA_ENABLED === 'true';
      if (!account || account.firebase.sign_in_provider === 'anonymous' || (pilot && account.firebase.sign_in_provider !== 'google.com')) {
        res.status(401).json({ message: 'Vuelve a iniciar sesión para acceder a tus grupos.' });
        return;
      }
      if (pilot) {
        const access = await ensurePilotEntry(db, account.uid);
        if (!access.canRead) { res.status(403).json({ message: 'Esta cuenta aún no tiene acceso al piloto.' }); return; }
        if (['create', 'join', 'invite', 'share'].includes(parsed.data.action) && access.tier !== 'pro') {
          res.status(403).json({ message: 'Esta acción de grupos requiere Pro.' });
          return;
        }
      }
      res.json(await runGroupAction(db, { id: account.uid, name: account.name?.trim().slice(0, 80) || 'Miembro' }, parsed.data));
    } catch (error) {
      if (error instanceof GroupError) {
        res.status(error.status).json({ message: error.message });
        return;
      }
      console.warn('[WorkGroups] operation_failed');
      res.status(503).json({ message: 'No pudimos acceder a los grupos. Intenta de nuevo.' });
    }
  });
}
