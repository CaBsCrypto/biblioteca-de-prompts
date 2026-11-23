import { createHash } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import type { OpenAIUiResourceMetadata, OpenAIUiToolMetadata } from '@openai/mcp-extensions/server';
import { escapeHtml } from '../utils/sanitize';
import { z } from 'zod';
import { privateDraftSchema } from '../services/server/privatePrompts';
import { TransferError, transferCreateSchema, type TransferEnvelope } from '../services/server/promptTransfers';
import { getBibliotecaAdmin } from '../services/server/firebaseAdmin';
import { assertPersonalLibraryAccess, getPersonalPrompt, listPersonalPrompts, PersonalLibraryError, personalLibraryProfile, savePersonalPrompt } from '../services/server/personalLibrary';
import { getLibrarySkill, LibraryCollectionError, listLibrarySkills, recordLibraryUse, saveLibrarySkill } from '../services/server/libraryCollections';
import { listLibraryActivity } from '../services/server/libraryActivity';
import { LibraryAccessError } from '../services/server/libraryAccess';
import { InvalidCatalogRequest, ResourceUnavailable, VersionChanged, type CatalogReader } from './contracts';

const privateRead = 'library:read';
const privateWrite = 'library:write';
const guestUri = 'ui://biblioteca/prompt-builder-v1.html';
const privateUri = 'ui://biblioteca/personal-library-v1.html';
const promptId = z.string().min(1).max(200).regex(/^[A-Za-z0-9_-]+$/);
const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true };
const creates = { ...readOnly, readOnlyHint: false };

export interface PromptToolOptions {
  widgetDomain?: string;
  claimOrigin?: string;
  extrasHtml?: () => string;
  transfer?: (data: { codeHash: string; envelope: TransferEnvelope }) => Promise<{ expiresAt: number }>;
  personal?: {
    metadataUrl: string;
    authorize: (scope: string) => Promise<string | null>;
  };
}

// The model receives only the generic status and view. Account and prompt data stay in the component.
function privateResult(payload: object, view?: 'personal') {
  return {
    content: [{ type: 'text' as const, text: view ? 'Biblioteca personal abierta en el mensaje.' : 'Listo en Biblioteca.' }],
    ...(view ? { structuredContent: { view } } : {}),
    _meta: { bibliotecaPrivate: payload },
  };
}

const errorResult = (message: string, authenticate?: string) => ({
  isError: true,
  content: [{ type: 'text' as const, text: message }],
  ...(authenticate ? { _meta: { 'mcp/www_authenticate': [authenticate] } } : {}),
});

export function registerPromptTools(server: McpServer, { extrasHtml, widgetDomain, claimOrigin, transfer, personal }: PromptToolOptions, reader?: CatalogReader) {
  if (!extrasHtml) return;
  const resource = (uri: string, view: 'guest' | 'personal', description: string) => registerAppResource(
    server, description, uri, {}, async () => ({ contents: [{
      uri, mimeType: RESOURCE_MIME_TYPE,
      text: extrasHtml().replace('data-biblioteca-extra="guest"',
        `data-biblioteca-extra="${view}" data-claim-origin="${escapeHtml(claimOrigin ?? 'https://biblioteca.browns.studio')}"`),
      _meta: {
        ui: { ...(widgetDomain ? { domain: widgetDomain } : {}), prefersBorder: true, permissions: { clipboardWrite: {} }, csp: { connectDomains: [], resourceDomains: [] } },
        'openai/ui': { availableDisplayModes: ['inline'], preferredDisplayMode: 'inline' } satisfies OpenAIUiResourceMetadata,
        'openai/widgetDescription': description,
      },
    }] }),
  );

  if (transfer) {
    resource(guestUri, 'guest', 'Editor de prompts de Biblioteca para crear un borrador y trasladarlo a otro dispositivo.');
    registerAppTool(server, 'open_prompt_builder', {
      title: 'Crear prompt en Biblioteca', description: 'Abre un editor de prompts dentro del mensaje para que la persona redacte su borrador.',
      inputSchema: {}, outputSchema: { view: z.literal('guest') }, annotations: readOnly,
      _meta: { securitySchemes: [{ type: 'noauth' }], ui: { resourceUri: guestUri },
        'openai/ui': { preferredModelDisplayMode: 'inline' } satisfies OpenAIUiToolMetadata },
    }, async () => ({ structuredContent: { view: 'guest' as const }, content: [{ type: 'text', text: 'Editor de Biblioteca abierto.' }] }));
    registerAppTool(server, 'create_prompt_transfer', {
      title: 'Generar enlace temporal', description: 'Entrega un enlace de traslado para un borrador cifrado en el editor.',
      inputSchema: transferCreateSchema.shape, outputSchema: { expiresAt: z.number() }, annotations: creates,
      _meta: { securitySchemes: [{ type: 'noauth' }], ui: { visibility: ['app'] } },
    }, async input => {
      try {
        const data = await transfer(input);
        return { structuredContent: data, content: [{ type: 'text' as const, text: 'Enlace temporal generado.' }] };
      } catch (error) {
        return errorResult(error instanceof TransferError ? error.message : 'No pudimos generar el enlace. Intenta de nuevo.');
      }
    });
  }

  if (!personal) return;
  resource(privateUri, 'personal', 'Mi Biblioteca: prompts y skills guardados, estado de cuenta y actividad reciente. El contenido privado queda en la interfaz hasta que la persona decide usarlo.');
  const oauth = (scopes: string[]) => [{ type: 'oauth2', scopes }];

  async function authorized(scope: string, work: (uid: string) => Promise<ReturnType<typeof privateResult>>) {
    try {
      const uid = await personal!.authorize(scope);
      if (!uid) return errorResult('Conecta tu cuenta de Biblioteca para continuar.',
        `Bearer resource_metadata="${personal!.metadataUrl}", scope="${scope}", error="insufficient_scope", error_description="Connect your Biblioteca account to continue"`);
      await assertPersonalLibraryAccess(getBibliotecaAdmin().db, uid);
      const result = await work(uid);
      result._meta.bibliotecaPrivate = { ...result._meta.bibliotecaPrivate, accountKey: createHash('sha256').update(uid).digest('base64url') };
      return result;
    } catch (error) {
      if (error instanceof LibraryAccessError) {
        const text = error.code === 'access_expired' ? 'El guardado está pausado para esta cuenta. Tus recursos siguen disponibles.' : error.message;
        return errorResult(text);
      }
      const known = error instanceof PersonalLibraryError || error instanceof LibraryCollectionError || error instanceof ResourceUnavailable || error instanceof VersionChanged || error instanceof InvalidCatalogRequest;
      return errorResult(known ? error.message : 'La biblioteca personal no está disponible temporalmente.');
    }
  }

  registerAppTool(server, 'open_my_library', {
    title: 'Abrir Mi Biblioteca', description: 'Abre prompts, skills guardadas y actividad reciente de la cuenta conectada dentro del mensaje. Solicita autorización si aún no está conectada.',
    inputSchema: {}, outputSchema: { view: z.literal('personal') }, annotations: readOnly,
    _meta: { securitySchemes: oauth([privateRead, privateWrite]), ui: { resourceUri: privateUri },
      'openai/ui': { preferredModelDisplayMode: 'inline' } satisfies OpenAIUiToolMetadata },
  }, async () => authorized(`${privateRead} ${privateWrite}`, async () => privateResult({}, 'personal')));
  registerAppTool(server, 'list_my_prompts', {
    title: 'Ver mis prompts', description: 'Lista los prompts de la cuenta conectada en la interfaz privada.',
    inputSchema: { cursor: promptId.optional() }, annotations: readOnly,
    _meta: { securitySchemes: oauth([privateRead]), ui: { visibility: ['app'] } },
  }, async ({ cursor }) => authorized(privateRead, async uid => {
    const { db, auth } = getBibliotecaAdmin();
    const accountKey = createHash('sha256').update(uid).digest('base64url');
    if (cursor) return privateResult({ ...await listPersonalPrompts(db, uid, cursor), accountKey });
    const [page, user] = await Promise.all([listPersonalPrompts(db, uid), auth.getUser(uid)]);
    return privateResult({ ...page, accountKey, profile: personalLibraryProfile(user) });
  }));
  registerAppTool(server, 'get_my_prompt', {
    title: 'Ver prompt personal', description: 'Abre el contenido del prompt que la persona seleccionó en su biblioteca.',
    inputSchema: { id: promptId }, annotations: readOnly,
    _meta: { securitySchemes: oauth([privateRead]), ui: { visibility: ['app'] } },
  }, async ({ id }) => authorized(privateRead, async uid => privateResult(await getPersonalPrompt(getBibliotecaAdmin().db, uid, id))));
  registerAppTool(server, 'save_my_prompt', {
    title: 'Guardar prompt privado', description: 'Guarda el título y el texto que la persona confirmó en su biblioteca privada.',
    inputSchema: { draft: privateDraftSchema, requestId: z.uuid(), expectedAccountKey: z.string().length(43).regex(/^[A-Za-z0-9_-]+$/).optional() }, annotations: creates,
    _meta: { securitySchemes: oauth([privateWrite]), ui: { visibility: ['app'] } },
  }, async ({ draft, requestId, expectedAccountKey }) => authorized(privateWrite, async uid => {
    if (expectedAccountKey && expectedAccountKey !== createHash('sha256').update(uid).digest('base64url')) {
      throw new LibraryCollectionError(409, 'La cuenta conectada cambió. Actualiza Mi Biblioteca antes de guardar.');
    }
    return privateResult(await savePersonalPrompt(getBibliotecaAdmin().db, uid, requestId, draft));
  }));

  registerAppTool(server, 'list_my_skills', {
    title: 'Ver mis skills', description: 'Lista las versiones de skills que la cuenta conectada guardó en Mi Biblioteca.',
    inputSchema: {}, annotations: readOnly,
    _meta: { securitySchemes: oauth([privateRead]), ui: { visibility: ['app'] } },
  }, async () => authorized(privateRead, async uid => privateResult({ skills: await listLibrarySkills(getBibliotecaAdmin().db, uid) })));
  registerAppTool(server, 'get_my_skill', {
    title: 'Ver skill guardada', description: 'Abre la versión de una skill guardada en la biblioteca privada de la cuenta conectada.',
    inputSchema: { id: promptId }, annotations: readOnly,
    _meta: { securitySchemes: oauth([privateRead]), ui: { visibility: ['app'] } },
  }, async ({ id }) => authorized(privateRead, async uid => privateResult(await getLibrarySkill(getBibliotecaAdmin().db, uid, id))));
  registerAppTool(server, 'save_my_skill', {
    title: 'Guardar skill en Mi Biblioteca', description: 'Guarda la versión aprobada de la skill que la persona seleccionó en el catálogo público.',
    inputSchema: { resourceId: promptId, expectedSubmissionId: promptId }, annotations: creates,
    _meta: { securitySchemes: oauth([privateWrite]), ui: { visibility: ['app'] } },
  }, async ({ resourceId, expectedSubmissionId }) => authorized(privateWrite, async uid => {
    if (!reader) throw new Error('Catalog reader unavailable');
    const delivery = await reader.content(resourceId, expectedSubmissionId);
    if (delivery.resource.kind !== 'skill') throw new InvalidCatalogRequest('Selecciona una skill del catálogo para guardarla.');
    return privateResult(await saveLibrarySkill(getBibliotecaAdmin().db, uid, delivery, 'chatgpt'));
  }));
  registerAppTool(server, 'list_my_activity', {
    title: 'Ver actividad reciente', description: 'Muestra las acciones recientes de guardado y uso en la cuenta conectada.',
    inputSchema: {}, annotations: readOnly,
    _meta: { securitySchemes: oauth([privateRead]), ui: { visibility: ['app'] } },
  }, async () => authorized(privateRead, async uid => privateResult({ activity: await listLibraryActivity(getBibliotecaAdmin().db, uid) })));
  registerAppTool(server, 'record_my_activity', {
    title: 'Registrar uso del recurso', description: 'Registra que la persona usó un prompt o una skill de su biblioteca desde ChatGPT.',
    inputSchema: { kind: z.enum(['prompt', 'skill']), resourceId: promptId, requestId: z.uuid() }, annotations: creates,
    _meta: { securitySchemes: oauth([privateRead]), ui: { visibility: ['app'] } },
  }, async input => authorized(privateRead, async uid => {
    await recordLibraryUse(getBibliotecaAdmin().db, uid, input, 'chatgpt');
    return privateResult({ recorded: true });
  }));
}
