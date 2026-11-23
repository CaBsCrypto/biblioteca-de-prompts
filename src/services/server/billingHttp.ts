import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getBibliotecaAdmin } from './firebaseAdmin';
import { billingCheckoutSchema, createBillingCheckout, processBillingWebhook } from './billing';
import { billingRateLimit, issueBillingCode, issueCodeSchema, listBillingCodes, redeemBillingCode, redeemCodeSchema, revokeBillingCode, revokeCodeSchema } from './billingCodes';
import { BillingError, createDodoClient, previewBillingOrigin, readBillingOrigin, readDodoConfig, unavailableBilling, verifyDodoWebhook, type DodoClient, type DodoConfig } from './billingDodo';
import { ensurePilotEntry, LibraryAccessError } from './libraryAccess';

const ROOT = '/api/billing';
interface BillingDependencies {
  admin?: () => { db: Firestore; auth: Auth };
  config?: () => DodoConfig | undefined;
  client?: (config: DodoConfig) => DodoClient;
}

function replyError(res: Response, error: unknown) {
  if (error instanceof BillingError || error instanceof LibraryAccessError) {
    const code = error.code;
    const status = code === 'billing_unavailable' ? 503 : code === 'invalid_webhook' ? 401
      : code === 'access_required' || code === 'access_expired' ? 403 : code === 'code_unavailable' ? 404 : code === 'rate_limited' ? 429 : 400;
    res.status(status).json({ error: code, message: error.message });
  } else if (error instanceof z.ZodError || error instanceof SyntaxError) {
    res.status(400).json({ error: 'invalid_request', message: 'Revisa los datos de la solicitud.' });
  } else {
    console.warn('[Billing] operation_failed');
    res.status(503).json({ error: 'temporarily_unavailable', message: 'No pudimos completar la operación. Inténtalo de nuevo.' });
  }
}

function enabled(req: Request, res: Response, next: NextFunction) {
  res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  if (process.env.BIBLIOTECA_LIBRARY_BETA_ENABLED !== 'true') {
    res.status(503).json({ error: 'billing_unavailable', message: 'El acceso a planes todavía no está disponible.' });
    return;
  }
  next();
}

/** Mount before express.json(), which would otherwise discard the signed bytes. */
export function installBillingWebhook(app: Express, dependencies: BillingDependencies = {}) {
  const admin = dependencies.admin ?? getBibliotecaAdmin;
  const configFor = dependencies.config ?? readDodoConfig;
  const clientFor = dependencies.client ?? createDodoClient;
  app.post(ROOT + '/webhook', enabled, express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
    try {
      const config = configFor();
      if (!config || !Buffer.isBuffer(req.body)) throw unavailableBilling();
      const id = verifyDodoWebhook(req.body, { id: req.get('webhook-id'), timestamp: req.get('webhook-timestamp'), signature: req.get('webhook-signature') }, config.webhookKey);
      // Await durable processing before acknowledgement so serverless teardown cannot lose a grant.
      await processBillingWebhook(admin().db, clientFor(config), config, id, req.body);
      res.json({ received: true });
    } catch (error) { replyError(res, error); }
  });
  app.use(ROOT + '/webhook', (error: { status?: number }, _req: Request, res: Response, next: NextFunction) => {
    if (error.status === 413 || error.status === 400) {
      res.status(error.status).json({ error: 'invalid_request', message: 'El webhook supera el tamaño permitido o tiene un formato inválido.' });
    } else next(error);
  });
}

export function installBillingHttp(app: Express, dependencies: BillingDependencies = {}) {
  const admin = dependencies.admin ?? getBibliotecaAdmin;
  const configFor = dependencies.config ?? readDodoConfig;
  const clientFor = dependencies.client ?? createDodoClient;
  app.use(ROOT, enabled);

  async function identity(req: Request) {
    const token = req.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token) return null;
    try {
      const account = await admin().auth.verifyIdToken(token, true);
      if (account.firebase.sign_in_provider !== 'google.com') return null;
      const user = await admin().auth.getUser(account.uid);
      return user.disabled || !user.email || !user.emailVerified ? null : user;
    } catch { return null; }
  }

  function route(work: (req: Request, uid: string, email: string, name: string) => Promise<object>) {
    return async (req: Request, res: Response) => {
      const user = await identity(req);
      if (!user) {
        res.status(401).json({ error: 'sign_in_required', message: 'Entra con tu cuenta de Google para continuar.' });
        return;
      }
      try {
        if (req.method === 'POST') {
          if (!req.is('application/json')) {
            res.status(415).json({ error: 'invalid_request', message: 'Usa una solicitud JSON.' });
            return;
          }
          const origin = req.get('origin');
          const configured = configFor()?.origin || readBillingOrigin();
          const localOrigin = process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1'
            ? [`http://localhost:${req.socket.localPort}`, `http://127.0.0.1:${req.socket.localPort}`] : [];
          if (origin && origin !== configured && origin !== previewBillingOrigin() && !localOrigin.includes(origin)) {
            res.status(403).json({ error: 'invalid_origin', message: 'Abre esta acción desde Biblioteca.' });
            return;
          }
        }
        res.json(await work(req, user.uid, user.email!, user.displayName || 'Biblioteca'));
      } catch (error) { replyError(res, error); }
    };
  }

  app.get(ROOT + '/status', route(async (_req, uid) => {
    const db = admin().db;
    const [access, profile, account] = await Promise.all([
      ensurePilotEntry(db, uid), db.collection('users').doc(uid).get(), db.collection('_bibliotecaBillingAccounts').doc(uid).get(),
    ]);
    return {
      access, sandbox: true, checkoutReady: Boolean(configFor()),
      codeRedemptionAvailable: true,
      codeIssuanceAvailable: (process.env.BIBLIOTECA_BILLING_CODE_SECRET?.length ?? 0) >= 32,
      isFounder: profile.get('role') === 'founder',
      ...(account.exists ? { subscription: { status: account.get('subscriptionStatus') ?? null,
        currentPeriodEnd: account.get('currentPeriodEnd') ?? null, cancelAtPeriodEnd: account.get('cancelAtPeriodEnd') ?? false } } : {}),
    };
  }));
  app.post(ROOT + '/checkout', route(async (req, uid, email, name) => {
    const config = configFor();
    if (!config) throw unavailableBilling();
    const input = billingCheckoutSchema.parse(req.body);
    await billingRateLimit(admin().db, uid, 'checkout', 12);
    return createBillingCheckout(admin().db, clientFor(config), config, uid, { email, name }, input);
  }));
  app.post(ROOT + '/portal', route(async (_req, uid) => {
    const config = configFor();
    if (!config) throw unavailableBilling();
    await billingRateLimit(admin().db, uid, 'portal', 12);
    const account = await admin().db.collection('_bibliotecaBillingAccounts').doc(uid).get();
    const customer = account.get('customerId');
    if (!customer || account.get('environment') !== 'test_mode') throw new BillingError('invalid_request', 'Todavía no hay una suscripción para gestionar.');
    return { url: await clientFor(config).createPortal(customer) };
  }));
  app.post(ROOT + '/redeem', route(async (req, uid) => {
    const input = redeemCodeSchema.parse(req.body);
    await billingRateLimit(admin().db, uid, 'redeem');
    return redeemBillingCode(admin().db, uid, input.code);
  }));
  app.post(ROOT + '/founder/codes', route(async (req, uid) => {
    const input = issueCodeSchema.parse(req.body);
    await billingRateLimit(admin().db, uid, 'issue', 30);
    return issueBillingCode(admin().db, uid, input, process.env.BIBLIOTECA_BILLING_CODE_SECRET ?? '');
  }));
  app.get(ROOT + '/founder/codes', route(async (_req, uid) => listBillingCodes(admin().db, uid)));
  app.post(ROOT + '/founder/codes/revoke', route(async (req, uid) => {
    const input = revokeCodeSchema.parse(req.body);
    await billingRateLimit(admin().db, uid, 'revoke', 30);
    return revokeBillingCode(admin().db, uid, input.id);
  }));
}
