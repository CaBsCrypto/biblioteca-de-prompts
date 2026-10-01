import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch, type Firestore } from 'firebase/firestore';
import { approveCatalogSubmission, fetchCatalogPayload, fetchCatalogResource, fetchOwnCatalogResources, fetchOwnCatalogSubmissions, fetchPublishedCatalogResources, saveCatalogDraft, submitCatalogDraft, withdrawCatalogResource } from '../src/services/firestore/catalogService';
import type { CatalogDraftInput } from '../src/typesCatalog';

let env: RulesTestEnvironment;
const dbFor = (uid?: string) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore()) as unknown as Firestore;
const metadata = {
  title: 'Resumir un informe', summary: 'Obtén una síntesis', outcome: 'Informe de cinco puntos',
  category: 'Investigación', tags: ['informes'], compatibility: ['ChatGPT'], requirements: '',
  usage: 'Pega el informe y reemplaza el tema.', license: 'CC BY 4.0', exampleInput: 'Informe sobre energía',
  exampleOutput: 'Cinco conclusiones del informe', imageUrl: '', demoUrl: '',
  authorName: 'Alice', authorHandle: 'alice', authorAvatar: ''
};
const content = { text: 'Resume {{informe}} en cinco puntos.', source: 'inline', repositoryUrl: '', repositoryCommit: '', repositoryPath: '' };
const skillContent = { ...content, text: '---\nname: resumir-informe\ndescription: Resume informes de energía.\n---\n# Instrucciones\nResume el informe.' };
const snapshot = (overrides: Record<string, unknown> = {}) => ({ kind: 'prompt', metadata, content, sourcePromptId: '', sourceFolderId: '', ...overrides });
const draft = (ownerUid = 'alice', overrides: Record<string, unknown> = {}) => ({ ...snapshot(), ownerUid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...overrides });
const submission = (resourceId = 'resource-1', ownerUid = 'alice', overrides: Record<string, unknown> = {}) => ({
  ...snapshot(), resourceId, ownerUid, status: 'pending', submittedAt: serverTimestamp(), decidedAt: null, reviewerUid: '', rejectionReason: '', ...overrides
});
const seed = async (path: string, data: Record<string, unknown>) => env.withSecurityRulesDisabled(async context => { await setDoc(doc(context.firestore(), path), data); });
const prepare = async (resourceId = 'resource-1', submissionId = 'submission-1', ownerUid = 'alice', overrides: Record<string, unknown> = {}) => {
  await assertSucceeds(setDoc(doc(dbFor(ownerUid), 'catalogDrafts', resourceId), draft(ownerUid, overrides)));
  await assertSucceeds(setDoc(doc(dbFor(ownerUid), 'catalogSubmissions', submissionId), submission(resourceId, ownerUid, overrides)));
};
const approve = async (db: Firestore, resourceId = 'resource-1', submissionId = 'submission-1', options: {
  listing?: Record<string, unknown>; payload?: Record<string, unknown>; decision?: Record<string, unknown>;
  omitListing?: boolean; omitPayload?: boolean;
  listingDocumentId?: string; payloadDocumentId?: string;
} = {}) => {
  const submitted = (await getDoc(doc(db, 'catalogSubmissions', submissionId))).data()!;
  const previous = await getDoc(doc(db, 'catalogResources', resourceId));
  const batch = writeBatch(db);
  batch.update(doc(db, 'catalogSubmissions', submissionId), { status: 'approved', reviewerUid: 'founder', rejectionReason: '', decidedAt: serverTimestamp(), ...options.decision });
  if (!options.omitListing) batch.set(doc(db, 'catalogResources', options.listingDocumentId || resourceId), {
    ownerUid: submitted.ownerUid, kind: submitted.kind, metadata: submitted.metadata,
    sourcePromptId: submitted.sourcePromptId, sourceFolderId: submitted.sourceFolderId, submissionId,
    state: 'published', publishedAt: previous.exists() ? previous.data().publishedAt : serverTimestamp(), updatedAt: serverTimestamp(), ...options.listing
  });
  if (!options.omitPayload) batch.set(doc(db, 'catalogPayloads', options.payloadDocumentId || resourceId), {
    resourceId, ownerUid: submitted.ownerUid, kind: submitted.kind, submissionId,
    content: submitted.content, updatedAt: serverTimestamp(), ...options.payload
  });
  return batch.commit();
};

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'biblioteca-catalog-rules-test', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
}, 30000);
beforeEach(async () => {
  await env.clearFirestore();
  await seed('users/founder', { uid: 'founder', displayName: 'Fundador', handle: 'founder', role: 'founder', status: 'active' });
  await seed('users/alice', { uid: 'alice', displayName: 'Alice', handle: 'alice', role: 'creator', status: 'active' });
});
afterAll(async () => { await env?.cleanup(); });

describe('catálogo: aislamiento y postulaciones inmutables', () => {
  test('permite borradores incompletos propios y deniega lecturas ajenas, incluso founder', async () => {
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'catalogDrafts/resource-1'), draft('alice', { metadata: { ...metadata, title: '', exampleOutput: '' }, content: { ...content, text: '' } })));
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'catalogDrafts/resource-1')));
    for (const uid of [undefined, 'bob', 'founder']) await assertFails(getDoc(doc(dbFor(uid), 'catalogDrafts/resource-1')));
    await assertFails(updateDoc(doc(dbFor('bob'), 'catalogDrafts/resource-1'), { ownerUid: 'bob', updatedAt: serverTimestamp() }));
  });

  test('exige una postulación completa idéntica al borrador y pendiente', async () => {
    await setDoc(doc(dbFor('alice'), 'catalogDrafts/resource-1'), draft());
    for (const changes of [{ metadata: { ...metadata, exampleOutput: '' } }, { content: { ...content, text: 'Snapshot cambiado' } }, { status: 'approved' }, { reviewerUid: 'founder' }, { resourceId: 'otra-carpeta' }, { sourcePromptId: 'prompt-de-bob' }]) {
      await assertFails(setDoc(doc(dbFor('alice'), 'catalogSubmissions/submission-1'), submission('resource-1', 'alice', changes)));
    }
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'catalogSubmissions/submission-1'), submission()));
    await assertFails(setDoc(doc(dbFor('bob'), 'catalogSubmissions/submission-2'), submission()));
  });

  test('autores y founder no pueden editar el snapshot ya postulado', async () => {
    await prepare();
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'catalogDrafts/resource-1'), { content: { ...content, text: 'Versión privada nueva' }, updatedAt: serverTimestamp() }));
    for (const uid of ['alice', 'founder']) {
      for (const change of [{ content: { ...content, text: 'Sustitución' } }, { 'metadata.title': 'Otro título' }, { ownerUid: 'bob' }, { resourceId: 'otra' }, { submittedAt: serverTimestamp() }]) {
        await assertFails(updateDoc(doc(dbFor(uid), 'catalogSubmissions/submission-1'), change));
      }
    }
    expect((await getDoc(doc(dbFor('alice'), 'catalogSubmissions/submission-1'))).data()?.content).toEqual(content);
    await assertFails(getDoc(doc(dbFor(), 'catalogSubmissions/submission-1')));
    await assertFails(getDoc(doc(dbFor('bob'), 'catalogSubmissions/submission-1')));
    await assertSucceeds(getDoc(doc(dbFor('founder'), 'catalogSubmissions/submission-1')));
  });

  test('valida longitud, URLs seguras y el pin exacto de repositorios para skills', async () => {
    const badContents = [
      { ...skillContent, text: 'Sin frontmatter' },
      { ...skillContent, text: 'x'.repeat(50001) },
      { ...skillContent, source: 'github', repositoryUrl: 'https://github.com.evil.test/alice/repo', repositoryCommit: 'a'.repeat(40), repositoryPath: 'skills/resumir-informe' },
      { ...skillContent, source: 'github', repositoryUrl: 'https://github.com/alice/repo', repositoryCommit: 'main', repositoryPath: 'skills/resumir-informe' },
      { ...skillContent, source: 'github', repositoryUrl: 'https://github.com/alice/repo', repositoryCommit: 'a'.repeat(40), repositoryPath: '../privado' },
      { ...skillContent, source: 'github', repositoryUrl: 'https://github.com/alice/repo', repositoryCommit: 'a'.repeat(40), repositoryPath: 'skills/../privado' }
    ];
    for (let i = 0; i < badContents.length; i++) {
      const changes = { kind: 'skill', content: badContents[i] };
      await seed(`catalogDrafts/bad-${i}`, draft('alice', changes));
      await assertFails(setDoc(doc(dbFor('alice'), 'catalogSubmissions', `bad-${i}`), submission(`bad-${i}`, 'alice', changes)));
    }
    await prepare('skill-1', 'skill-submit', 'alice', { kind: 'skill', content: { ...skillContent, source: 'github', repositoryUrl: 'https://github.com/alice/repo.git/', repositoryCommit: 'a'.repeat(40), repositoryPath: 'skills/resumir-informe' } });
    await prepare('skill-bom', 'skill-bom-submit', 'alice', { kind: 'skill', content: { ...skillContent, text: '\uFEFF' + skillContent.text } });
  });

  test('admite los límites de listas sin exceder el presupuesto de evaluación de reglas', async () => {
    const maximalMetadata = { ...metadata, tags: Array.from({ length: 10 }, (_, i) => `tag-${i}`), compatibility: Array.from({ length: 20 }, (_, i) => `tool-${i}`) };
    await prepare('max-list', 'max-list-submit', 'alice', { metadata: maximalMetadata });
    await assertFails(setDoc(doc(dbFor('alice'), 'catalogDrafts/bad-list'), draft('alice', { metadata: { ...metadata, tags: Array.from({ length: 11 }, (_, i) => `tag-${i}`) } })));
    await assertFails(setDoc(doc(dbFor('alice'), 'catalogDrafts/bad-type'), draft('alice', { metadata: { ...metadata, compatibility: ['ChatGPT', { secret: 'nested-map' }] } })));
  });
});

describe('catálogo: aprobación atómica y entrega pública', () => {
  test('los servicios recorren crear, postular, aprobar, obtener y retirar con las reglas reales', async () => {
    const input = snapshot() as CatalogDraftInput;
    const created = await saveCatalogDraft(dbFor('alice'), 'alice', input);
    await submitCatalogDraft(dbFor('alice'), 'alice', created);
    const submissions = await fetchOwnCatalogSubmissions(dbFor('alice'), 'alice');
    expect(submissions).toHaveLength(1);
    await approveCatalogSubmission(dbFor('founder'), submissions[0], 'founder');
    const published = await fetchCatalogResource(dbFor(), created.id);
    expect(published?.metadata.title).toBe(metadata.title);
    expect((await fetchCatalogPayload(dbFor(), created.id))?.content).toEqual(content);
    expect(await fetchPublishedCatalogResources(dbFor())).toHaveLength(1);
    await withdrawCatalogResource(dbFor('alice'), published!, 'alice');
    expect(await fetchCatalogResource(dbFor(), created.id)).toBeNull();
    expect(await fetchCatalogPayload(dbFor(), created.id)).toBeNull();
    expect((await fetchOwnCatalogResources(dbFor('alice'), 'alice'))[0]?.state).toBe('withdrawn');
  });

  test('solo founder aprueba; el autor no puede publicar o elevar su rol', async () => {
    await prepare();
    await assertFails(updateDoc(doc(dbFor('alice'), 'catalogSubmissions/submission-1'), { status: 'approved', reviewerUid: 'alice', decidedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'users/alice'), { role: 'founder', updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(dbFor('alice'), 'catalogResources/resource-1'), { state: 'published', metadata }));
    await assertFails(setDoc(doc(dbFor('founder'), 'catalogResources/fake'), { state: 'published', metadata }));
    await assertSucceeds(approve(dbFor('founder')));
    await assertSucceeds(getDoc(doc(dbFor(), 'catalogResources/resource-1')));
    expect((await getDoc(doc(dbFor(), 'catalogResources/resource-1'))).data()).not.toHaveProperty('content');
    expect((await getDoc(doc(dbFor(), 'catalogPayloads/resource-1'))).data()?.content).toEqual(content);
    await assertSucceeds(getDocs(query(collection(dbFor(), 'catalogResources'), where('state', '==', 'published'))));
    await assertFails(getDocs(collection(dbFor(), 'catalogResources')));
    await assertFails(getDocs(collection(dbFor(), 'catalogPayloads')));
    await assertFails(getDocs(collection(dbFor(), 'catalogDrafts')));
  });

  test('founder puede revisar sus recursos iniciales sin saltarse la transacción', async () => {
    await prepare('founder-resource', 'founder-submission', 'founder');
    await assertSucceeds(approve(dbFor('founder'), 'founder-resource', 'founder-submission'));
  });

  test('no permite aprobar sin ficha/entregable o con contenido diferente', async () => {
    await prepare();
    for (const options of [
      { omitListing: true }, { omitPayload: true },
      { listing: { metadata: { ...metadata, title: 'No revisado' } } },
      { listing: { sourcePromptId: 'prompt-ajeno' } },
      { listing: { ownerUid: 'bob' } },
      { payload: { content: { ...content, text: 'No revisado' } } },
      { payload: { resourceId: 'otro' } },
      { payload: { submissionId: 'otra' } },
      { listingDocumentId: 'otro-recurso' },
      { payloadDocumentId: 'otro-recurso' },
      { decision: { reviewerUid: 'alice' } }
    ]) await assertFails(approve(dbFor('founder'), 'resource-1', 'submission-1', options));
    expect((await getDoc(doc(dbFor('alice'), 'catalogSubmissions/submission-1'))).data()?.status).toBe('pending');
    await assertSucceeds(approve(dbFor('founder')));
    await assertFails(updateDoc(doc(dbFor('alice'), 'catalogResources/resource-1'), { 'metadata.title': 'Cambio del autor sin revisar', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'catalogPayloads/resource-1'), { content: { ...content, text: 'Cambio del autor sin revisar' }, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(dbFor('founder'), 'catalogPayloads/resource-1'), { content: { ...content, text: 'Cambio sin revisar' }, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(dbFor('founder'), 'catalogResources/resource-1'), { 'metadata.title': 'Cambio sin revisar', updatedAt: serverTimestamp() }));
  });

  test('rechaza con motivo privado, sin permitir cambiar la decisión posteriormente', async () => {
    await prepare();
    await assertFails(updateDoc(doc(dbFor('founder'), 'catalogSubmissions/submission-1'), { status: 'rejected', reviewerUid: 'founder', rejectionReason: '', decidedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(dbFor('founder'), 'catalogSubmissions/submission-1'), { status: 'rejected', reviewerUid: 'founder', rejectionReason: 'Completa el ejemplo de salida', decidedAt: serverTimestamp() }));
    await assertFails(getDoc(doc(dbFor(), 'catalogSubmissions/submission-1')));
    await assertFails(getDoc(doc(dbFor('bob'), 'catalogSubmissions/submission-1')));
    await assertFails(getDoc(doc(dbFor(), 'catalogPayloads/resource-1')));
    await assertFails(approve(dbFor('founder')));
  });

  test('una nueva postulación mantiene la versión aprobada y reemplaza ficha/entrega juntas', async () => {
    await prepare(); await approve(dbFor('founder'));
    const first = (await getDoc(doc(dbFor(), 'catalogResources/resource-1'))).data()!;
    const next = { ...content, text: 'Nueva revisión {{informe}}' };
    await updateDoc(doc(dbFor('alice'), 'catalogDrafts/resource-1'), { content: next, updatedAt: serverTimestamp() });
    await setDoc(doc(dbFor('alice'), 'catalogSubmissions/submission-2'), submission('resource-1', 'alice', { content: next }));
    expect((await getDoc(doc(dbFor(), 'catalogPayloads/resource-1'))).data()?.content).toEqual(content);
    await assertFails(approve(dbFor('founder'), 'resource-1', 'submission-2', { omitPayload: true }));
    await assertSucceeds(approve(dbFor('founder'), 'resource-1', 'submission-2'));
    expect((await getDoc(doc(dbFor(), 'catalogPayloads/resource-1'))).data()?.content).toEqual(next);
    expect((await getDoc(doc(dbFor(), 'catalogResources/resource-1'))).data()?.publishedAt).toEqual(first.publishedAt);
  });

  test('retirar corta lectura pública y el autor no puede republicar sin revisión', async () => {
    await prepare(); await approve(dbFor('founder'));
    await assertFails(updateDoc(doc(dbFor('bob'), 'catalogResources/resource-1'), { state: 'withdrawn', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(dbFor('alice'), 'catalogResources/resource-1'), { state: 'withdrawn', 'metadata.title': 'Otro título', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'catalogResources/resource-1'), { state: 'withdrawn', updatedAt: serverTimestamp() }));
    await assertFails(getDoc(doc(dbFor(), 'catalogResources/resource-1')));
    await assertFails(getDoc(doc(dbFor(), 'catalogPayloads/resource-1')));
    await assertFails(updateDoc(doc(dbFor('alice'), 'catalogResources/resource-1'), { state: 'published', updatedAt: serverTimestamp() }));
    await assertFails(approve(dbFor('founder')));
  });

  test('skills guardadas permanecen privadas y preservan la versión guardada', async () => {
    await prepare('skill-1', 'skill-submit', 'alice', { kind: 'skill', content: skillContent });
    await approve(dbFor('founder'), 'skill-1', 'skill-submit');
    const saved = { resourceId: 'skill-1', submissionId: 'skill-submit', metadata, content: skillContent, savedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(dbFor('bob'), 'users/bob/savedCatalogSkills/skill-1'), saved));
    await assertFails(setDoc(doc(dbFor('alice'), 'users/bob/savedCatalogSkills/skill-1'), saved));
    await assertFails(getDoc(doc(dbFor(), 'users/bob/savedCatalogSkills/skill-1')));
    await assertFails(getDoc(doc(dbFor('alice'), 'users/bob/savedCatalogSkills/skill-1')));
    await assertFails(getDoc(doc(dbFor('founder'), 'users/bob/savedCatalogSkills/skill-1')));
    await updateDoc(doc(dbFor('alice'), 'catalogResources/skill-1'), { state: 'withdrawn', updatedAt: serverTimestamp() });
    expect((await getDoc(doc(dbFor('bob'), 'users/bob/savedCatalogSkills/skill-1'))).data()?.content).toEqual(skillContent);
    await assertSucceeds(getDocs(collection(dbFor('bob'), 'users/bob/savedCatalogSkills')));
  });
});
