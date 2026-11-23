import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Timestamp } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';
import { createLibraryMcpServer } from '../src/mcp/server';
import { getBibliotecaAdmin } from '../src/services/server/firebaseAdmin';
import { assertPersonalLibraryAccess, getPersonalPrompt, listPersonalPrompts, savePersonalPrompt } from '../src/services/server/personalLibrary';
import { FirestoreOAuthAdapter } from '../src/services/server/chatgptOAuthAdapter';

const local = process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8080' && process.env.FIREBASE_AUTH_EMULATOR_HOST === '127.0.0.1:9099';

describe.skipIf(!local)('Biblioteca personal con Firestore local', () => {
  it('sincroniza un prompt de cuenta, respeta ediciones y rechaza otra cuenta', async () => {
    const { db } = getBibliotecaAdmin();
    const owner = 'pilot-' + randomUUID();
    const other = 'pilot-' + randomUUID();
    const requestId = randomUUID();
    const draft = { title: 'Mi prompt piloto', promptText: 'Explica {{código}}' };
    const entitlement = db.collection('_bibliotecaEntitlements').doc(owner);
    await expect(assertPersonalLibraryAccess(db, owner)).rejects.toMatchObject({ code: 'entitlement_required' });
    await entitlement.set({ chatgptPersonalLibrary: true, expiresAt: Timestamp.fromMillis(Date.now() + 60_000) });
    await expect(assertPersonalLibraryAccess(db, owner)).resolves.toBeUndefined();

    const { promptId } = await savePersonalPrompt(db, owner, requestId, draft);
    const saved = db.collection('prompts').doc(promptId);
    expect((await saved.get()).data()).toMatchObject({ ...draft, userId: owner, isShared: false });
    await expect(listPersonalPrompts(db, owner)).resolves.toEqual({ prompts: [{ id: promptId, title: draft.title }] });
    await expect(listPersonalPrompts(db, other)).resolves.toEqual({ prompts: [] });
    await expect(getPersonalPrompt(db, other, promptId)).rejects.toMatchObject({ code: 'not_found' });
    await saved.update({ promptText: 'Edición hecha en la web' });
    await expect(savePersonalPrompt(db, owner, requestId, draft)).resolves.toEqual({ promptId });
    await expect(getPersonalPrompt(db, owner, promptId)).resolves.toMatchObject({ promptText: 'Edición hecha en la web' });
    await entitlement.delete();
    await expect(assertPersonalLibraryAccess(db, owner)).rejects.toMatchObject({ code: 'entitlement_required' });
  });

  it('consume un código OAuth una sola vez y elimina los tokens revocados por concesión', async () => {
    const { db } = getBibliotecaAdmin();
    const records = db.collection('_bibliotecaOAuthIssuers').doc(randomUUID()).collection('_bibliotecaOAuthRecords');
    const codes = new FirestoreOAuthAdapter(records, 'AuthorizationCode');
    const tokens = new FirestoreOAuthAdapter(records, 'AccessToken');
    const grantId = randomUUID();
    await codes.upsert('code', { accountId: 'pilot-account', grantId }, 60);
    const results = await Promise.allSettled([codes.consume('code'), codes.consume('code')]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect((await codes.find('code'))?.consumed).toBeGreaterThan(0);

    await tokens.upsert('first', { accountId: 'pilot-account', grantId }, 60);
    await tokens.upsert('second', { accountId: 'another-account', grantId: randomUUID() }, 60);
    await tokens.revokeByGrantId(grantId);
    await expect(tokens.find('first')).resolves.toBeUndefined();
    await expect(tokens.find('second')).resolves.toMatchObject({ accountId: 'another-account' });
  });

  it('recupera desde otra conexión MCP el prompt que guardó la misma cuenta', async () => {
    const { auth, db } = getBibliotecaAdmin();
    const uid = 'pilot-' + randomUUID();
    const entitlement = db.collection('_bibliotecaEntitlements').doc(uid);
    const draft = { title: 'Prueba ChatGPT · Guardado privado', promptText: 'Resume una reunión ficticia.' };
    let savedId: string | undefined;
    const clients: Client[] = [];

    async function connect() {
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const server = createLibraryMcpServer({
        async search() { throw new Error('El catálogo público queda fuera de esta prueba'); },
        async get() { throw new Error('El catálogo público queda fuera de esta prueba'); },
        async content() { throw new Error('El catálogo público queda fuera de esta prueba'); },
      }, () => '<div></div>', {
        extrasHtml: () => '<div></div>',
        personal: { authorize: async () => uid, metadataUrl: 'https://example.com/oauth-resource' },
      });
      const client = new Client({ name: 'biblioteca-pilot', version: '1.0.0' });
      clients.push(client);
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      return client;
    }

    try {
      await auth.createUser({ uid, displayName: 'Cuenta piloto', email: uid + '@example.com', emailVerified: true });
      await entitlement.set({ chatgptPersonalLibrary: true, expiresAt: Timestamp.fromMillis(Date.now() + 60_000) });
      const first = await connect();
      const saved = await first.callTool({ name: 'save_my_prompt', arguments: { draft, requestId: randomUUID() } });
      const receipt = saved._meta?.bibliotecaPrivate as { promptId?: string } | undefined;
      savedId = receipt?.promptId;
      expect(savedId).toEqual(expect.any(String));
      await first.close();

      const second = await connect();
      const listed = await second.callTool({ name: 'list_my_prompts', arguments: {} });
      expect(listed._meta).toMatchObject({ bibliotecaPrivate: {
        prompts: [{ id: savedId, title: draft.title }],
        profile: { displayName: 'Cuenta piloto', maskedEmail: 'pi•••@example.com' },
      } });
      const opened = await second.callTool({ name: 'get_my_prompt', arguments: { id: savedId } });
      expect(opened._meta).toMatchObject({ bibliotecaPrivate: { id: savedId, ...draft } });
      expect(JSON.stringify([opened.structuredContent, opened.content])).not.toContain(draft.promptText);
    } finally {
      await Promise.all(clients.map(client => client.close()));
      await entitlement.delete();
      if (savedId) await db.collection('prompts').doc(savedId).delete();
      await auth.deleteUser(uid);
    }
  }, 20_000);
});
