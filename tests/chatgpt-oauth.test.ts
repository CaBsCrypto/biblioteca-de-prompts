import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { describe, expect, it } from 'vitest';
import { createChatGptOAuthRuntime } from '../src/services/server/chatgptOAuth';

describe('Vinculación de Biblioteca en ChatGPT', () => {
  it('vincula un UID con PKCE y consentimiento, limita el alcance y revoca el acceso', async () => {
    const app = express();
    const server = createServer(app);
    await new Promise<void>((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
    try {
      const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const issuer = `${origin}/api/biblioteca-oauth`;
      const resource = `${origin}/api/mcp`;
      const redirectUri = `${origin}/test-callback`;
      const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
      const runtime = createChatGptOAuthRuntime({
        issuer, resource, origin, redirectUri, resourceMetadataUrl: `${origin}/.well-known/oauth-protected-resource/api/mcp`,
        cookieKeys: [randomBytes(32).toString('hex')],
        jwks: { keys: [{ ...privateKey.export({ format: 'jwk' }), kty: 'RSA', kid: 'test-rsa', use: 'sig', alg: 'RS256' }] },
      }, {
        async verifyGoogleIdentity(token) {
          return token === 'firebase-test-session' ? 'uid-dos' : token === 'firebase-other-session' ? 'uid-tres' : null;
        },
        async isActiveAccount(uid) { return ['uid-dos', 'uid-tres'].includes(uid); },
      });
      runtime.mount(app);

      const cookies = new Map<string, string>();
      async function request(path: string, options?: RequestInit) {
        const headers = new Headers(options?.headers);
        if (cookies.size) headers.set('Cookie', [...cookies.values()].join('; '));
        const url = new URL(path, origin);
        expect(url.origin).toBe(origin);
        const response = await fetch(url, { ...options, headers, redirect: 'manual' });
        for (const cookie of response.headers.getSetCookie()) {
          const first = cookie.split(';')[0];
          const name = first.split('=')[0];
          if (/^(?:[^=]+)=$/.test(first)) cookies.delete(name);
          else cookies.set(name, first);
        }
        return response;
      }

      const registration = (callback: string) => request(`${issuer}/reg`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_uris: [callback],
          grant_types: ['authorization_code', 'refresh_token'],
          token_endpoint_auth_method: 'none',
          scope: 'library:read library:write',
        }),
      });
      expect((await registration(`${origin}/unapproved`)).status).toBe(400);
      const registrationResponse = await registration(redirectUri);
      expect(registrationResponse.status).toBe(201);
      const { client_id } = await registrationResponse.json() as { client_id: string };

      const verifier = randomBytes(48).toString('base64url');
      const challenge = createHash('sha256').update(verifier).digest('base64url');
      const authQuery = new URLSearchParams({
        client_id, redirect_uri: redirectUri, response_type: 'code', resource,
        scope: 'library:read', state: randomBytes(24).toString('base64url'),
      });
      const missingChallenge = await request(`${issuer}/auth?${authQuery}`);
      expect(new URL(missingChallenge.headers.get('Location') || '', origin).searchParams.get('error')).toBe('invalid_request');

      authQuery.set('code_challenge', challenge);
      authQuery.set('code_challenge_method', 'S256');
      const auth = await request(`${issuer}/auth?${authQuery}`);
      expect(auth.status).toBe(303);
      const interaction = auth.headers.get('Location') || '';
      expect(interaction).toMatch(/^\/api\/biblioteca-oauth\/interaction\//);
      const status = await request(interaction, { headers: { Accept: 'application/json' } });
      expect(await status.json()).toEqual({ scopes: ['library:read'] });

      const approve = (requestOrigin: string, firebaseToken = 'firebase-test-session') => request(interaction, {
        method: 'POST', headers: { Origin: requestOrigin, 'Content-Type': 'application/json', Authorization: `Bearer ${firebaseToken}` },
        body: JSON.stringify({ allow: true }),
      });
      expect((await approve('https://unapproved.invalid')).status).toBe(403);
      expect((await approve(origin, 'wrong-firebase-token')).status).toBe(401);
      const approval = await approve(origin);
      expect(approval.status).toBe(200);
      const params = await approval.json() as { nextLocation: string };
      const resume = await request(params.nextLocation);
      expect(resume.status).toBe(303);
      const callback = new URL(resume.headers.get('Location') || '', origin);
      expect(callback.origin + callback.pathname).toBe(redirectUri);
      expect(callback.searchParams.get('state')).toBe(authQuery.get('state'));
      expect(callback.searchParams.get('iss')).toBe(issuer);
      const code = callback.searchParams.get('code');
      expect(code).toBeTruthy();

      const exchange = (value: string) => request(`${issuer}/token`, {
        method: 'POST', body: new URLSearchParams({ grant_type: 'authorization_code', client_id, code: code!, redirect_uri: redirectUri, code_verifier: value, resource }),
      });
      expect((await exchange('a'.repeat(48))).status).toBe(400);
      const credentials = await exchange(verifier);
      expect(credentials.status).toBe(200);
      const { access_token } = await credentials.json() as { access_token: string };
      expect(await runtime.verify(access_token, 'library:read')).toBe('uid-dos');
      expect(await runtime.verify(access_token, 'library:write')).toBeNull();
      expect(await runtime.verify(access_token, 'library:read library:write')).toBeNull();

      const revocation = await request(`${issuer}/token/revocation`, {
        method: 'POST', body: new URLSearchParams({ token: access_token, token_type_hint: 'access_token', client_id }),
      });
      expect(revocation.status).toBe(200);
      expect(await runtime.verify(access_token, 'library:read')).toBeNull();
      expect((await exchange(verifier)).status).toBe(400);

      authQuery.set('state', randomBytes(24).toString('base64url'));
      authQuery.set('scope', 'library:read library:write');
      const authAgain = await request(`${issuer}/auth?${authQuery}`);
      const nextInteraction = authAgain.headers.get('Location') || '';
      const reapproval = await request(nextInteraction, {
        method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Authorization: 'Bearer firebase-other-session' },
        body: JSON.stringify({ allow: true }),
      });
      expect(reapproval.status).toBe(200);
      const { nextLocation } = await reapproval.json() as { nextLocation: string };
      const secondResume = await request(nextLocation);
      expect(secondResume.status).toBe(303);
      const secondCallback = new URL(secondResume.headers.get('Location') || '', origin);
      const secondCode = secondCallback.searchParams.get('code');
      expect(secondCode).toBeTruthy();
      const otherCredentials = await request(`${issuer}/token`, {
        method: 'POST', body: new URLSearchParams({ grant_type: 'authorization_code', client_id, code: secondCode!, redirect_uri: redirectUri, code_verifier: verifier, resource }),
      });
      const { access_token: otherAccessToken } = await otherCredentials.json() as { access_token: string };
      expect(await runtime.verify(otherAccessToken, 'library:read library:write')).toBe('uid-tres');
      expect(await runtime.verify(otherAccessToken, 'library:read unknown-scope')).toBeNull();
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  }, 15000);
});
