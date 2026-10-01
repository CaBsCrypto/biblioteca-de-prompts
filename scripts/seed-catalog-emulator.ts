/**
 * Local browser fixtures only. Start the demo emulators with firebase.emulators.json,
 * then run: npx tsx scripts/seed-catalog-emulator.ts
 * Never import production Firebase configuration or clear an emulator database here.
 */
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import {
  approveCatalogSubmission, fetchOwnCatalogSubmissions, fetchPublishedCatalogResources,
  saveCatalogDraft, submitCatalogDraft,
} from '../src/services/firestore/catalogService';
import { emptyCatalogDraft } from '../src/utils/catalog';
import type { CatalogDraftInput, CatalogIdentity } from '../src/typesCatalog';

const PROJECT_ID = 'demo-biblioteca';
const HOSTS = {
  firestore: process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080',
  auth: process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099',
};

function assertLocalDemoOnly(): void {
  for (const project of [process.env.GCLOUD_PROJECT, process.env.GOOGLE_CLOUD_PROJECT, process.env.FIREBASE_PROJECT_ID]) {
    if (project && project !== PROJECT_ID) throw new Error('Seed rechazado: solo se permite el proyecto demo-biblioteca.');
  }
  if (!/^(?:localhost|127\.0\.0\.1):8080$/.test(HOSTS.firestore)) throw new Error('Seed rechazado: Firestore debe ser localhost:8080 o 127.0.0.1:8080.');
  if (!/^(?:localhost|127\.0\.0\.1):9099$/.test(HOSTS.auth)) throw new Error('Seed rechazado: Auth debe ser localhost:9099 o 127.0.0.1:9099.');
  if (process.argv.length > 2) throw new Error('Este seed usa un proyecto demo fijo; no admite otros proyectos ni argumentos.');
}

interface DemoAccount extends CatalogIdentity {
  email: string;
  subject: string;
  role: 'founder' | 'creator';
  uid?: string;
}

const founder: DemoAccount = { name: 'Fundador de prueba', handle: 'fundador-demo', avatar: '', email: 'fundador@biblioteca.test', subject: 'biblioteca-local-founder', role: 'founder' };
const creator: DemoAccount = { name: 'Creador de prueba', handle: 'creador-demo', avatar: '', email: 'creador@biblioteca.test', subject: 'biblioteca-local-creator', role: 'creator' };

async function seedGoogleAccount(account: DemoAccount): Promise<string> {
  // Auth emulator explicitly accepts literal JSON in place of a signed Google ID token.
  // The request is fixed to loopback and its returned audience is checked before any bootstrap write.
  const fakeGoogleToken = JSON.stringify({ sub: account.subject, email: account.email, email_verified: true, name: account.name });
  const response = await fetch('http://' + HOSTS.auth + '/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestUri: 'http://localhost', returnSecureToken: true, returnIdpCredential: true,
      postBody: new URLSearchParams({ providerId: 'google.com', id_token: fakeGoogleToken }).toString(),
    }),
  });
  if (!response.ok) throw new Error('No se pudo crear la cuenta Google local (' + response.status + '). Inicia el emulador Auth en 9099.');
  const result = await response.json() as { localId?: string; idToken?: string };
  if (!result.localId || !result.idToken) throw new Error('El emulador Auth devolvió una cuenta inválida.');
  const claims = JSON.parse(Buffer.from(result.idToken.split('.')[1], 'base64url').toString('utf8'));
  if (claims.aud !== PROJECT_ID || claims.sub !== result.localId) throw new Error('Seed rechazado: el token local no pertenece a demo-biblioteca.');
  return result.localId;
}

async function bootstrapProfile(env: RulesTestEnvironment, account: DemoAccount & { uid: string }): Promise<void> {
  await env.withSecurityRulesDisabled(async context => {
    const ref = doc(context.firestore(), 'users', account.uid);
    const existing = await getDoc(ref);
    await setDoc(ref, {
      uid: account.uid, displayName: account.name, photoURL: '', handle: account.handle,
      bio: 'Perfil ficticio para comprobar el catálogo en emuladores locales.', role: account.role, status: 'active',
      stats: { publicPromptsCount: 0, followersCount: 0, followingCount: 0 },
      createdAt: existing.exists() ? existing.data()?.createdAt : serverTimestamp(), updatedAt: serverTimestamp(),
    });
  });
}

function promptFixture(): CatalogDraftInput {
  const input = emptyCatalogDraft(creator, 'prompt');
  input.metadata = {
    ...input.metadata,
    title: '[DEMO] Resumir un informe en cinco puntos',
    summary: 'Convierte un informe extenso en una síntesis para decidir qué revisar primero.',
    outcome: 'Cinco conclusiones con sus datos de respaldo y una pregunta pendiente.', category: 'Investigación',
    tags: ['resumen', 'informes'], compatibility: ['ChatGPT', 'Claude', 'Codex'],
    requirements: 'Un informe de texto que puedas compartir con tu herramienta.',
    usage: 'Rellena las variables, pega el informe y comprueba las conclusiones contra su fuente.',
    license: 'CC0 1.0. Ejemplo ficticio de prueba local; se permite copiar y adaptar.',
    exampleInput: 'Audiencia: equipo de producto. Informe: 120 personas probaron el prototipo; 84 completaron el recorrido y 36 abandonaron al configurar la cuenta.',
    exampleOutput: '1. El 70 % completó el recorrido.\n2. El 30 % abandonó durante la configuración.\n3. La configuración merece una investigación específica.\n4. La muestra incluye 120 personas.\n5. El informe no identifica los motivos del abandono.\nPregunta pendiente: ¿qué paso de la configuración causa más dificultades?',
  };
  input.content.text = 'Resume el informe para {{audiencia}} en cinco puntos. Conserva las cifras, distingue hechos de inferencias y termina con una pregunta pendiente.\n\nInforme:\n{{informe}}';
  return input;
}

function skillFixture(): CatalogDraftInput {
  const input = emptyCatalogDraft(founder, 'skill');
  input.metadata = {
    ...input.metadata,
    title: '[DEMO] Revisar una propuesta de producto',
    summary: 'Ayuda a detectar supuestos y vacíos antes de desarrollar una idea.',
    outcome: 'Una revisión con objetivo, evidencia disponible y tres decisiones pendientes.', category: 'Producto',
    tags: ['producto', 'revisión'], compatibility: ['Codex', 'Claude Code'],
    requirements: 'Un agente compatible con Agent Skills y el texto de una propuesta.',
    usage: 'Crea una carpeta revisar-propuesta en tu directorio de skills, añade SKILL.md y pide al agente que revise la propuesta usando esta skill.',
    license: 'CC0 1.0. Ejemplo ficticio de prueba local; se permite copiar y adaptar.',
    exampleInput: 'Queremos permitir que equipos compartan sus plantillas. Esperamos ahorrar tiempo, pero todavía no entrevistamos a usuarios.',
    exampleOutput: 'Objetivo: reducir el tiempo dedicado a recrear plantillas.\nEvidencia: aún no hay entrevistas.\nSupuesto: los equipos reutilizarán plantillas compartidas.\nDecisiones pendientes: audiencia inicial, forma de encontrar plantillas y criterio para medir tiempo ahorrado.',
  };
  input.content.text = '---\nname: revisar-propuesta\ndescription: Revisa propuestas de producto para identificar objetivos, evidencia, supuestos y decisiones pendientes. Úsala antes de empezar una implementación.\nlicense: CC0-1.0\n---\n\n# Revisar una propuesta\n\n1. Lee la propuesta que comparte la persona.\n2. Resume el objetivo en una frase concreta.\n3. Separa la evidencia disponible de los supuestos.\n4. Señala hasta tres decisiones necesarias para continuar.\n5. Explica qué dato permitiría resolver cada decisión.\n\nPresenta el resultado como texto claro. Si falta información, indícalo sin inventar datos.\n';
  return input;
}

async function publishFixture(env: RulesTestEnvironment, resourceId: string, owner: DemoAccount & { uid: string }, input: CatalogDraftInput): Promise<void> {
  const ownerDb = env.authenticatedContext(owner.uid, { email: owner.email, email_verified: true }).firestore() as unknown as Firestore;
  const reviewerDb = env.authenticatedContext(founder.uid!, { email: founder.email, email_verified: true }).firestore() as unknown as Firestore;
  const draft = await saveCatalogDraft(ownerDb, owner.uid, input, resourceId);
  await submitCatalogDraft(ownerDb, owner.uid, draft);
  const submission = (await fetchOwnCatalogSubmissions(ownerDb, owner.uid)).find(item => item.resourceId === resourceId && item.status === 'pending');
  if (!submission) throw new Error('No se encontró la postulación local de ' + resourceId + '.');
  await approveCatalogSubmission(reviewerDb, submission, founder.uid!);
  console.log('Publicada mediante reglas: /recurso/' + input.kind + '/' + resourceId);
}

async function main(): Promise<void> {
  assertLocalDemoOnly();
  // Explicit endpoints prevent SDK fallback to real Firebase even if no emulator is running.
  process.env.FIRESTORE_EMULATOR_HOST = HOSTS.firestore;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = HOSTS.auth;
  process.env.GCLOUD_PROJECT = PROJECT_ID;
  founder.uid = await seedGoogleAccount(founder);
  creator.uid = await seedGoogleAccount(creator);
  const [firestoreHost, firestorePort] = HOSTS.firestore.split(':');
  const env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: firestoreHost, port: Number(firestorePort), rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
  try {
    await bootstrapProfile(env, founder as DemoAccount & { uid: string });
    await bootstrapProfile(env, creator as DemoAccount & { uid: string });
    await publishFixture(env, 'demo-prompt-resumen', creator as DemoAccount & { uid: string }, promptFixture());
    await publishFixture(env, 'demo-skill-revision', founder as DemoAccount & { uid: string }, skillFixture());
    const publicDb = env.unauthenticatedContext().firestore() as unknown as Firestore;
    const resources = await fetchPublishedCatalogResources(publicDb);
    if (!resources.some(item => item.id === 'demo-prompt-resumen') || !resources.some(item => item.id === 'demo-skill-revision')) throw new Error('Las fichas demo no están disponibles para visitantes.');
    console.log('Seed local verificado en demo-biblioteca. No se modificaron datos de producción.');
    console.log('En el popup Google del emulador puedes elegir:');
    console.log('  ' + founder.email + ' — rol founder, UID ' + founder.uid);
    console.log('  ' + creator.email + ' — rol creator, UID ' + creator.uid);
  } finally {
    await env.cleanup();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Falló la preparación del catálogo local.');
  process.exitCode = 1;
});
