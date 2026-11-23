import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Timestamp } from 'firebase-admin/firestore';
import { expect, it, vi } from 'vitest';
import { createLibraryMcpServer } from '../src/mcp/server';
import type { CatalogContentResult } from '../src/mcp/contracts';
import { getBibliotecaAdmin } from '../src/services/server/firebaseAdmin';
import { listLibraryActivity } from '../src/services/server/libraryActivity';
import { getLibrarySkill, listLibrarySkills, saveLibrarySkill } from '../src/services/server/libraryCollections';
import { runLibraryWrite } from '../src/services/server/libraryWrites';
import { listPersonalPrompts } from '../src/services/server/personalLibrary';

const local = process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8080'
  && process.env.FIREBASE_AUTH_EMULATOR_HOST === '127.0.0.1:9099';

it.skipIf(!local)('comparte guardados y actividad entre el servicio web y conexiones MCP independientes', async () => {
  vi.stubEnv('BIBLIOTECA_LIBRARY_BETA_ENABLED', 'true');
  const { db, auth } = getBibliotecaAdmin();
  const owner = randomUUID();
  const other = randomUUID();
  const invitation = (uid: string) => db.collection('_bibliotecaEntitlements').doc(uid);
  const clients: Client[] = [];
  const sample = (id: string): CatalogContentResult => ({
    resource: {
      id, kind: 'skill', submissionId: 'reviewed-1', state: 'published', publishedAt: null, updatedAt: null, canonicalUrl: '',
      metadata: {
        title: 'Skill de prueba ' + id, summary: '', outcome: '', category: 'General', tags: [], compatibility: [],
        requirements: '', usage: '', license: 'CC BY 4.0', exampleInput: '', exampleOutput: '', imageUrl: '', demoUrl: '',
        authorName: 'Creador de prueba', authorAvatar: '', authorHandle: 'creador',
      },
    },
    content: { text: 'Texto ficticio de una skill aprobada', source: 'inline', repositoryUrl: '', repositoryCommit: '', repositoryPath: '' },
    repositoryFolderUrl: null,
  });

  async function connect(uid: string) {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createLibraryMcpServer({
      async search() { return { resources: [], total: 0 }; },
      async get(id) { return sample(id).resource; },
      async content(id) { return sample(id); },
    }, () => '<div/>', {
      extrasHtml: () => '<div/>',
      personal: { authorize: async () => uid, metadataUrl: 'https://example.com/metadata' },
    });
    const client = new Client({ name: 'beta-compartida', version: '1' });
    clients.push(client);
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    return client;
  }

  try {
    for (const uid of [owner, other]) {
      await auth.createUser({ uid, displayName: 'Cuenta ficticia', email: `${uid}@example.com`, emailVerified: true });
      await invitation(uid).set({ chatgptPersonalLibrary: true, expiresAt: Timestamp.fromMillis(Date.now() + 60_000) });
    }
    const web = await runLibraryWrite(db, owner, {
      action: 'create', requestId: randomUUID(), prompt: { title: 'Desde la web', promptText: 'Un texto de prueba.' },
    });
    await saveLibrarySkill(db, owner, sample('web-skill'), 'web');

    const firstChat = await connect(owner);
    const { _meta: webPrompts } = await firstChat.callTool({ name: 'list_my_prompts', arguments: {} });
    expect(webPrompts?.bibliotecaPrivate).toMatchObject({ prompts: [{ id: web.promptId, title: 'Desde la web' }] });
    const { _meta: webSkills } = await firstChat.callTool({ name: 'list_my_skills', arguments: {} });
    expect(webSkills?.bibliotecaPrivate).toMatchObject({ skills: [{ id: 'web-skill' }] });
    const save = await firstChat.callTool({ name: 'save_my_prompt', arguments: {
      draft: { title: 'Desde ChatGPT', promptText: 'Un segundo texto de prueba.' }, requestId: randomUUID(),
    } });
    expect(save.isError).not.toBe(true);
    const savedSkill = await firstChat.callTool({ name: 'save_my_skill', arguments: {
      resourceId: 'chat-skill', expectedSubmissionId: 'reviewed-1',
    } });
    expect(savedSkill.isError).not.toBe(true);
    await firstChat.callTool({ name: 'record_my_activity', arguments: {
      kind: 'skill', resourceId: 'web-skill', requestId: randomUUID(),
    } });

    expect((await listPersonalPrompts(db, owner)).prompts.map(prompt => prompt.title)).toContain('Desde ChatGPT');
    expect(await getLibrarySkill(db, owner, 'chat-skill')).toMatchObject({ license: 'CC BY 4.0' });
    expect((await listLibrarySkills(db, owner)).map(skill => skill.id)).toContain('chat-skill');
    expect(await listLibraryActivity(db, owner)).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Desde la web', action: 'saved', source: 'web' }),
      expect.objectContaining({ title: 'Desde ChatGPT', action: 'saved', source: 'chatgpt' }),
      expect.objectContaining({ resourceId: 'web-skill', action: 'used', source: 'chatgpt' }),
    ]));

    const newChat = await connect(owner);
    const activity = await newChat.callTool({ name: 'list_my_activity', arguments: {} });
    expect(activity._meta?.bibliotecaPrivate).toMatchObject({ activity: expect.arrayContaining([
      expect.objectContaining({ title: 'Desde ChatGPT' }),
    ]) });
    expect(JSON.stringify([activity.structuredContent, activity.content])).not.toContain('Desde ChatGPT');
    const anotherAccount = await connect(other);
    const prompts = await anotherAccount.callTool({ name: 'list_my_prompts', arguments: {} });
    const skills = await anotherAccount.callTool({ name: 'list_my_skills', arguments: {} });
    const privateActivity = await anotherAccount.callTool({ name: 'list_my_activity', arguments: {} });
    expect(prompts._meta?.bibliotecaPrivate).toMatchObject({ prompts: [] });
    expect(skills._meta?.bibliotecaPrivate).toMatchObject({ skills: [] });
    expect(privateActivity._meta?.bibliotecaPrivate).toMatchObject({ activity: [] });
  } finally {
    await Promise.all(clients.map(client => client.close()));
    vi.unstubAllEnvs();
  }
}, 30_000);
