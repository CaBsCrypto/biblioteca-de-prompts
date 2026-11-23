import { createHash } from 'node:crypto';
import express, { type Express, type Request, type Response } from 'express';
import Provider, { errors, interactionPolicy, type Configuration, type InteractionResults } from 'oidc-provider';
import { FirestoreOAuthAdapter, takeClientRegistrationSlot } from './chatgptOAuthAdapter';
import { getBibliotecaAdmin } from './firebaseAdmin';
import { requesterNetwork } from './promptTransferHttp';

const oauthPath = '/api/biblioteca-oauth';
const interactionPath = `${oauthPath}/interaction`;
const authorizationMetadataPath = `/.well-known/oauth-authorization-server${oauthPath}`;
const scopes = ['library:read', 'library:write'] as const;
const accessTokenSeconds = 15 * 60;
const grantSeconds = 7 * 24 * 60 * 60;
const interactionSeconds = 5 * 60;
const opaqueIdPattern = /^[A-Za-z0-9_-]{21,128}$/;

type OAuthConfig = {
  issuer: string;
  origin: string;
  resource: string;
  resourceMetadataUrl: string;
  redirectUri: string;
  cookieKeys: string[];
  jwks: NonNullable<Configuration['jwks']>;
};

type OAuthDependencies = {
  adapter?: Configuration['adapter'];
  allowClientRegistration?(network: string): Promise<boolean>;
  verifyGoogleIdentity(token: string): Promise<string | null>;
  isActiveAccount(uid: string, authorizedAt: number): Promise<boolean>;
};

function httpLoopback(url: URL) {
  return url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname);
}

function configuredOAuth(): OAuthConfig | undefined {
  if (process.env.BIBLIOTECA_PERSONAL_LIBRARY_ENABLED !== 'true') return;
  let issuerSource = process.env.BIBLIOTECA_OAUTH_ISSUER || '';
  if (issuerSource === 'vercel-preview') {
    const deploymentHost = process.env.VERCEL_URL;
    if (process.env.VERCEL !== '1' || process.env.VERCEL_ENV !== 'preview'
      || !deploymentHost || !/^[a-z0-9-]+\.vercel\.app$/i.test(deploymentHost)) return;
    issuerSource = `https://${deploymentHost}${oauthPath}`;
  }
  const issuer = URL.parse(issuerSource);
  const redirect = URL.parse(process.env.BIBLIOTECA_OAUTH_REDIRECT_URI || '');
  const development = process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1';
  if (!issuer || issuer.href !== `${issuer.origin}${oauthPath}`
    || (issuer.protocol !== 'https:' && !(development && httpLoopback(issuer)))
    || !redirect || redirect.href !== `${redirect.origin}${redirect.pathname}`
    || !((redirect.origin === 'https://chatgpt.com'
      && /^\/(?:connector_platform_oauth_redirect|connector\/oauth\/[A-Za-z0-9_-]+)$/.test(redirect.pathname))
      || (development && httpLoopback(issuer) && httpLoopback(redirect)))) return;

  const cookieKeys = (process.env.BIBLIOTECA_OAUTH_COOKIE_KEYS || '').split(',').map(key => key.trim());
  if (cookieKeys.some(key => key.length < 32) || new Set(cookieKeys).size !== cookieKeys.length) return;
  try {
    const jwks = JSON.parse(process.env.BIBLIOTECA_OAUTH_JWKS || '{}') as OAuthConfig['jwks'];
    if (!Array.isArray(jwks.keys) || !jwks.keys.some(key => key.kty === 'RSA' && key.d && key.n && key.e)) return;
    return {
      issuer: issuer.href, origin: issuer.origin, redirectUri: redirect.href, cookieKeys, jwks,
      resource: `${issuer.origin}/api/mcp`,
      resourceMetadataUrl: `${issuer.origin}/.well-known/oauth-protected-resource/api/mcp`,
    };
  } catch {
    return undefined;
  }
}

export function privateLibraryOAuthConfig() {
  if (!runtimeConfig || process.env.BIBLIOTECA_PERSONAL_LIBRARY_ENABLED !== 'true') return;
  const { issuer, resource, resourceMetadataUrl } = runtimeConfig;
  return { issuer, resource, resourceMetadataUrl };
}

function oauthLogger(_ctx: unknown, _error: unknown) {
  console.warn('[Biblioteca OAuth] operation_failed');
}

function createProvider(config: OAuthConfig, dependencies: OAuthDependencies) {
  const policy = interactionPolicy.base();
  policy.get('login').checks.add(new interactionPolicy.Check(
    'biblioteca_account_confirmation', 'Confirm your Biblioteca account', ctx => !ctx.oidc.result?.login,
  ), 0);
  const secure = !httpLoopback(new URL(config.issuer));
  const provider = new Provider(config.issuer, {
    adapter: dependencies.adapter,
    jwks: config.jwks,
    scopes: ['openid', 'offline_access', ...scopes],
    clientAuthMethods: ['none', 'client_secret_basic', 'client_secret_post'],
    responseTypes: ['code'],
    clientDefaults: { response_types: ['code'], grant_types: ['authorization_code', 'refresh_token'], token_endpoint_auth_method: 'none' },
    pkce: { required: () => true },
    features: {
      devInteractions: { enabled: false },
      registration: { enabled: true, issueRegistrationAccessToken: false },
      revocation: { enabled: true, allowedPolicy: (_ctx, client, token) => token.clientId === client.clientId },
      userinfo: { enabled: false },
      rpInitiatedLogout: { enabled: false },
      resourceIndicators: {
        enabled: true,
        defaultResource: () => config.resource,
        useGrantedResource: () => true,
        getResourceServerInfo(_ctx, target) {
          if (target !== config.resource) throw new errors.InvalidTarget('unknown resource');
          return { scope: scopes.join(' '), audience: target, accessTokenFormat: 'opaque', accessTokenTTL: accessTokenSeconds };
        },
      },
    },
    // An app registered for any other redirect cannot be an OAuth client of this pilot.
    extraClientMetadata: {
      properties: ['redirect_uris'],
      validator(_ctx, _key, _value, metadata) {
        if (metadata.redirect_uris?.length !== 1 || metadata.redirect_uris[0] !== config.redirectUri) {
          throw new errors.InvalidClientMetadata('redirect_uri does not match the approved ChatGPT callback');
        }
      },
    },
    issueRefreshToken: (_ctx, client) => client.grantTypeAllowed('refresh_token'),
    rotateRefreshToken: true,
    ttl: { AccessToken: accessTokenSeconds, AuthorizationCode: 60, Grant: grantSeconds, RefreshToken: grantSeconds, Interaction: interactionSeconds, Session: 300 },
    cookies: {
      keys: config.cookieKeys,
      names: { session: 'biblioteca_oauth_session', interaction: 'biblioteca_oauth_interaction', resume: 'biblioteca_oauth_resume' },
      long: { secure, signed: true, httpOnly: true, sameSite: 'lax' },
      short: { secure, signed: true, httpOnly: true, sameSite: 'lax' },
    },
    async findAccount(_ctx, sub) {
      return { accountId: sub, async claims() { return { sub }; } };
    },
    interactions: { policy, url: (_ctx, interaction) => `${interactionPath}/${interaction.uid}` },
    renderError(_ctx, out) {
      _ctx.body = { error: out.error };
    },
  });
  provider.proxy = secure;
  provider.on('server_error', oauthLogger);
  return provider;
}

function requestedScopes(scope: unknown) {
  const requested = typeof scope === 'string' ? scope.split(/\s+/) : [];
  return scopes.filter(value => requested.includes(value));
}

function oauthNoStore(res: Response) {
  res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' });
}

function externalConsentRedirect(result: string, config: OAuthConfig): string {
  const url = new URL(result, config.origin);
  if (url.origin !== config.origin || !url.pathname.startsWith(`${oauthPath}/`)) {
    throw new Error('Invalid OAuth resume route');
  }
  return url.pathname + url.search;
}

export function createChatGptOAuthRuntime(config: OAuthConfig, dependencies: OAuthDependencies) {
  const provider = createProvider(config, dependencies);
  const providerHandler = provider.callback();

  async function consentInteraction(req: Request, res: Response) {
    const uid = req.params.uid;
    if (typeof uid !== 'string' || !opaqueIdPattern.test(uid)) return res.status(404).json({ error: 'interaction_invalid' });
    if (req.method === 'GET' && req.accepts(['html', 'json']) !== 'json') {
      return res.redirect(303, `/chatgpt/conectar?interaction=${encodeURIComponent(uid)}`);
    }
    try {
      const detail = await provider.interactionDetails(req, res);
      if (detail.uid !== uid) return res.status(404).json({ error: 'interaction_invalid' });
      const grantedScopes = requestedScopes(detail.params.scope);
      if (!grantedScopes.length) return res.status(400).json({ error: 'scope_required' });
      if (req.method === 'GET') return res.json({ scopes: grantedScopes });
      if (req.get('origin') !== config.origin || typeof req.body?.allow !== 'boolean') {
        return res.status(403).json({ error: 'interaction_invalid' });
      }
      const finish = async (result: InteractionResults) => res.json({
        nextLocation: externalConsentRedirect(await provider.interactionResult(req, res, result, { mergeWithLastSubmission: true }), config),
      });
      if (!req.body.allow) return await finish({ error: 'access_denied' });
      const token = req.get('authorization')?.match(/^Bearer ([^\s]{1,8192})$/i)?.[1];
      const account = token ? await dependencies.verifyGoogleIdentity(token).catch(() => null) : null;
      if (!account) return res.status(401).json({ error: 'google_sign_in_required' });
      const clientId = detail.params.client_id;
      if (typeof clientId !== 'string' || !clientId.length) return res.status(400).json({ error: 'interaction_invalid' });
      if (detail.session?.accountId && detail.prompt.name === 'consent' && detail.session.accountId !== account) {
        return res.status(409).json({ error: 'account_mismatch' });
      }
      const grant = new provider.Grant({ accountId: account, clientId });
      grant.addOIDCScope(grantedScopes.join(' '));
      grant.addResourceScope(config.resource, grantedScopes);
      return await finish({ login: { accountId: account, remember: false }, consent: { grantId: await grant.save() } });
    } catch (error) {
      if (error instanceof errors.SessionNotFound) return res.status(404).json({ error: 'interaction_expired' });
      oauthLogger(null, error);
      return res.status(503).json({ error: 'oauth_unavailable' });
    }
  }

  function mount(app: Express) {
    app.get(authorizationMetadataPath, (_req, res) => {
      oauthNoStore(res);
      res.json({
        issuer: config.issuer,
        authorization_endpoint: `${config.issuer}/auth`, token_endpoint: `${config.issuer}/token`,
        registration_endpoint: `${config.issuer}/reg`, revocation_endpoint: `${config.issuer}/token/revocation`,
        authorization_response_iss_parameter_supported: true, code_challenge_methods_supported: ['S256'],
        response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_methods_supported: ['none', 'client_secret_basic', 'client_secret_post'],
        scopes_supported: scopes,
      });
    });
    app.use(oauthPath, (req, res, next) => {
      oauthNoStore(res);
      const origin = new URL(config.origin);
      if (req.get('host') !== origin.host) return res.status(421).json({ error: 'invalid_oauth_host' });
      // Ignore client forwarded headers. The issuer determines which host and protocol can mint links.
      req.headers['x-forwarded-host'] = origin.host;
      req.headers['x-forwarded-proto'] = origin.protocol.slice(0, -1);
      next();
    });
    app.all(`${oauthPath}/auth`, (req, res, next) => {
      // A new authorization uses a freshly confirmed Firebase account, even if a prior OIDC session exists.
      const sessionCookie = provider.cookieName('session');
      const cookies = req.get('cookie');
      if (cookies) {
        const options = { path: '/', secure: !httpLoopback(new URL(config.issuer)), httpOnly: true, sameSite: 'lax' as const };
        const sessionNames = new Set([sessionCookie, `${sessionCookie}.sig`]);
        req.headers.cookie = cookies.split(';').filter(cookie => {
          const name = cookie.trimStart().split('=', 1)[0];
          if (!sessionNames.has(name)) return true;
          res.clearCookie(name, options);
          return false;
        }).join(';');
      }
      next();
    });
    app.get(`${interactionPath}/:uid`, consentInteraction);
    app.post(`${interactionPath}/:uid`, express.json({ limit: '1kb' }), consentInteraction);
    app.post(`${oauthPath}/reg`, async (req, res, next) => {
      try {
        if (dependencies.allowClientRegistration && !await dependencies.allowClientRegistration(requesterNetwork(req))) {
          return res.status(429).json({ error: 'registration_rate_limit' });
        }
        next();
      } catch (error) {
        oauthLogger(null, error);
        return res.status(503).json({ error: 'oauth_unavailable' });
      }
    });
    app.use(oauthPath, (req, res) => providerHandler(req, res));
  }

  async function verify(rawToken: string, requestedScope: string): Promise<string | null> {
    const requiredScopes = requestedScope.trim().split(/\s+/);
    if (!opaqueIdPattern.test(rawToken) || !requiredScopes.every(required => scopes.some(scope => scope === required))) return null;
    try {
      const token = await provider.AccessToken.find(rawToken);
      if (!token?.isValid || token.aud !== config.resource || !requiredScopes.every(scope => token.scopes.has(scope))
        || !token.accountId || !token.grantId) return null;
      const grant = await provider.Grant.find(token.grantId);
      if (!grant?.isValid || grant.accountId !== token.accountId || grant.clientId !== token.clientId) return null;
      return await dependencies.isActiveAccount(token.accountId, grant.iat) ? token.accountId : null;
    } catch {
      return null;
    }
  }

  return { mount, verify };
}

let runtime: ReturnType<typeof createChatGptOAuthRuntime> | undefined;
let runtimeConfig: OAuthConfig | undefined;

export function installChatGptOAuth(app: Express) {
  const config = configuredOAuth();
  if (!config) return;
  try {
    const { auth, db } = getBibliotecaAdmin();
    const issuerId = createHash('sha256').update(config.issuer).digest('hex');
    const issuerRecord = db.collection('_bibliotecaOAuthIssuers').doc(issuerId);
    const collection = issuerRecord.collection('_bibliotecaOAuthRecords');
    const quotas = issuerRecord.collection('_bibliotecaOAuthRegistrationQuota');
    runtime = createChatGptOAuthRuntime(config, {
      adapter: model => new FirestoreOAuthAdapter(collection, model),
      allowClientRegistration: network => takeClientRegistrationSlot(quotas, network),
      async verifyGoogleIdentity(token) {
        const identity = await auth.verifyIdToken(token, true);
        return identity.firebase.sign_in_provider === 'google.com' ? identity.uid : null;
      },
      async isActiveAccount(uid, authorizedAt) {
        const user = await auth.getUser(uid);
        return !user.disabled && (!user.tokensValidAfterTime || Date.parse(user.tokensValidAfterTime) <= authorizedAt * 1000);
      },
    });
    runtime.mount(app);
    runtimeConfig = config;
  } catch (error) {
    oauthLogger(null, error);
  }
}

export async function verifyChatGptAccessToken(rawToken: string, requestedScope: string): Promise<string | null> {
  if (!runtime || !privateLibraryOAuthConfig()) return null;
  return runtime.verify(rawToken, requestedScope);
}
