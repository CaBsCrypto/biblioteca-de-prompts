import { parseDocument } from 'yaml';
import type { Prompt } from '../types';
import type { CatalogContent, CatalogDraftInput, CatalogFilters, CatalogIdentity, CatalogKind, CatalogPayload, CatalogResource } from '../typesCatalog';

export const MAX_SKILL_LENGTH = 50_000;
export const MAX_PROMPT_LENGTH = 10_000;
const MAX_REPOSITORY_RESPONSE_BYTES = 200_000;

export function emptyCatalogDraft(identity: CatalogIdentity, kind: CatalogKind = 'prompt'): CatalogDraftInput {
  return {
    kind,
    metadata: {
      title: '', summary: '', outcome: '', category: 'General', tags: [], compatibility: [],
      requirements: '', usage: '', license: '', exampleInput: '', exampleOutput: '', imageUrl: '', demoUrl: '',
      authorName: identity.name, authorHandle: identity.handle, authorAvatar: identity.avatar,
    },
    content: { text: '', source: 'inline', repositoryUrl: '', repositoryCommit: '', repositoryPath: '' },
    sourcePromptId: '', sourceFolderId: '',
  };
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export interface SkillFrontmatter {
  name: string;
  description: string;
}

/** Validate data only. Markdown is preserved verbatim and must be rendered as text by consumers. */
export function parseSkillMarkdown(text: string): SkillFrontmatter {
  if (typeof text !== 'string' || text.length > MAX_SKILL_LENGTH) {
    throw new Error('SKILL.md admite como máximo 50.000 caracteres.');
  }
  const match = text.match(/^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error('SKILL.md debe comenzar con frontmatter YAML entre líneas --- .');
  const document = parseDocument(match[1], { uniqueKeys: true, strict: true, prettyErrors: false });
  if (document.errors.length || document.warnings.length) throw new Error('El frontmatter YAML contiene claves duplicadas, etiquetas desconocidas o sintaxis inválida.');
  let data: unknown;
  try {
    data = document.toJS({ maxAliasCount: 0 });
  } catch {
    throw new Error('El frontmatter debe usar valores directos, sin alias YAML.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('El frontmatter debe ser un mapa YAML.');
  const fields = data as Record<string, unknown>;
  const supportedFields = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
  if (Object.keys(fields).some(key => !supportedFields.has(key))) throw new Error('El frontmatter incluye campos fuera de Agent Skills. Coloca tus campos adicionales dentro de metadata.');
  const name = typeof fields.name === 'string' ? fields.name.trim().normalize('NFKC') : '';
  if (!/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(name) || name !== name.toLowerCase() || [...name].length > 64) {
    throw new Error('name debe tener entre 1 y 64 caracteres: minúsculas, números y guiones simples.');
  }
  if (typeof fields.description !== 'string' || !fields.description.trim() || fields.description.length > 1024) {
    throw new Error('description debe ser texto no vacío de hasta 1.024 caracteres.');
  }
  for (const key of ['license', 'allowed-tools']) {
    if (key in fields && typeof fields[key] !== 'string') throw new Error(key + ' debe ser texto.');
  }
  if ('compatibility' in fields && (typeof fields.compatibility !== 'string' || !fields.compatibility.trim() || fields.compatibility.length > 500)) {
    throw new Error('compatibility debe ser texto no vacío de hasta 500 caracteres.');
  }
  if ('metadata' in fields) {
    const metadata = fields.metadata;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || Object.values(metadata).some(value => typeof value !== 'string')) {
      throw new Error('metadata debe ser un mapa de claves y valores de texto.');
    }
  }
  if (!match[2].trim()) throw new Error('SKILL.md debe incluir instrucciones después del frontmatter.');
  return { name, description: fields.description };
}

interface SkillRepositoryLocation {
  owner: string;
  repository: string;
  commit: string;
  path: string;
}

function parseSkillRepository(content: CatalogContent): SkillRepositoryLocation {
  let url: URL;
  try {
    url = new URL(content.repositoryUrl);
  } catch {
    throw new Error('Introduce la URL de un repositorio público de GitHub.');
  }
  const match = url.pathname.match(/^\/([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38}))\/([a-zA-Z0-9_.-]+)\/?$/);
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash || !match) {
    throw new Error('Usa https://github.com/autor/repositorio, sin ramas, credenciales ni parámetros.');
  }
  const repository = match[2].replace(/\.git$/, '');
  if (!repository || repository === '.' || repository === '..') throw new Error('El nombre del repositorio es inválido.');
  if (!/^[a-fA-F0-9]{40}$/.test(content.repositoryCommit)) throw new Error('Fija la versión con el SHA completo del commit (40 caracteres hexadecimales).');
  const path = content.repositoryPath;
  if (path !== '.' && (!path || path.length > 500 || path.split('/').some(part => !/^[\p{L}\p{N}_.-]+$/u.test(part) || part === '.' || part === '..'))) {
    throw new Error('La ruta debe ser una carpeta relativa segura, por ejemplo skills/pdf-processing, o . para la raíz.');
  }
  const skill = parseSkillMarkdown(content.text);
  if (path !== '.' && path.split('/').at(-1)?.normalize('NFKC') !== skill.name) throw new Error('name en SKILL.md debe coincidir con el nombre de su carpeta.');
  return { owner: match[1], repository, commit: content.repositoryCommit, path: path === '.' ? '' : path };
}

function requiresSkillPackage(text: string): boolean {
  // Recognize both Markdown links and plain instructions referencing conventional package directories.
  if (/(?:^|[\s(["'\x60])(?:\.\/)?(?:scripts|references|assets)[/\\]/im.test(text)) return true;
  return [...text.matchAll(/\]\(\s*<?([^\s)>]+)>?(?:\s+['"][^)]*)?\)/g)].some(match => {
    const target = match[1];
    return !target.startsWith('#') && !/^[a-z][a-z0-9+.-]*:/i.test(target);
  });
}

export function validateCatalogDraft(input: CatalogDraftInput, forSubmission = false): string[] {
  const errors: string[] = [];
  if (input.kind !== 'prompt' && input.kind !== 'skill') errors.push('Elige prompt o skill.');
  const fields: [keyof CatalogDraftInput['metadata'], string, number][] = [
    ['title', 'Título', 150], ['summary', 'Problema que resuelve', 1000], ['outcome', 'Resultado esperado', 2000],
    ['category', 'Categoría', 100], ['requirements', 'Requisitos', 10000], ['usage', 'Instrucciones de uso', 20000],
    ['license', 'Condiciones de uso', 2000], ['exampleInput', 'Ejemplo de entrada', 10000], ['exampleOutput', 'Ejemplo de resultado', 20000],
    ['imageUrl', 'URL de imagen', 2048], ['demoUrl', 'URL de demo', 2048], ['authorName', 'Nombre de autor', 120],
    ['authorHandle', 'Identificador de autor', 40], ['authorAvatar', 'Avatar', 1000],
  ];
  for (const [key, label, max] of fields) {
    const value = input.metadata?.[key];
    if (typeof value !== 'string' || value.length > max) errors.push(label + ' debe ser texto de hasta ' + max + ' caracteres.');
  }
  for (const [key, max] of [['tags', 64], ['compatibility', 100]] as const) {
    const value = input.metadata?.[key];
    if (!Array.isArray(value) || value.length > (key === 'tags' ? 10 : 20) || value.some(entry => typeof entry !== 'string' || !entry.trim() || entry.length > max)) {
      errors.push(key === 'tags' ? 'Usa hasta 10 etiquetas de 64 caracteres.' : 'Usa hasta 20 herramientas compatibles de 100 caracteres.');
    }
  }
  for (const [key, label] of [['imageUrl', 'La imagen'], ['demoUrl', 'La demo'], ['authorAvatar', 'El avatar']] as const) {
    const value = input.metadata?.[key];
    if (typeof value === 'string' && value && !isHttpsUrl(value)) errors.push(label + ' debe usar una URL HTTPS sin credenciales.');
  }
  for (const key of ['sourcePromptId', 'sourceFolderId'] as const) {
    if (typeof input[key] !== 'string' || input[key].length > 128 || (input[key] && !/^[a-zA-Z0-9_-]+$/.test(input[key]))) errors.push('La referencia de origen es inválida.');
  }
  const content = input.content;
  if (!content || (content.source !== 'inline' && content.source !== 'github')) errors.push('El origen del contenido es inválido.');
  if (typeof content?.text !== 'string' || content.text.length > (input.kind === 'skill' ? MAX_SKILL_LENGTH : MAX_PROMPT_LENGTH)) {
    errors.push(input.kind === 'skill' ? 'SKILL.md admite hasta 50.000 caracteres.' : 'El prompt admite hasta 10.000 caracteres.');
  }
  for (const [key, maximum] of [['repositoryUrl', 2048], ['repositoryCommit', 40], ['repositoryPath', 500]] as const) {
    if (typeof content?.[key] !== 'string' || content[key].length > maximum) errors.push('La referencia al repositorio es inválida.');
  }
  if (!forSubmission) return errors;
  for (const [key, label] of [['title', 'título'], ['summary', 'problema que resuelve'], ['outcome', 'resultado esperado'], ['category', 'categoría'], ['usage', 'instrucciones de uso'], ['license', 'condiciones de uso'], ['exampleInput', 'ejemplo de entrada'], ['exampleOutput', 'ejemplo de resultado'], ['authorName', 'nombre de autor']] as const) {
    const value = input.metadata?.[key];
    if (typeof value !== 'string' || !value.trim()) errors.push('Completa ' + label + '.');
  }
  if (!input.metadata?.compatibility?.length) errors.push('Indica al menos una herramienta compatible.');
  if (typeof content?.text !== 'string' || !content.text.trim()) errors.push('Añade el contenido del recurso.');
  if (content?.source === 'inline' && (content.repositoryUrl || content.repositoryCommit || content.repositoryPath)) errors.push('El contenido inline debe tener las referencias al repositorio vacías.');
  if (input.kind === 'prompt' && content?.source !== 'inline') errors.push('Los prompts se entregan como texto.');
  if (input.kind === 'skill' && typeof content?.text === 'string') {
    try {
      parseSkillMarkdown(content.text);
      if (content.source === 'github') parseSkillRepository(content);
      else if (requiresSkillPackage(content.text)) errors.push('Una skill que usa scripts, referencias o assets necesita su repositorio público y commit.');
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'SKILL.md es inválido.');
    }
  }
  return [...new Set(errors)];
}

export function buildSkillRepositoryUrl(content: CatalogContent): string {
  if (content.source !== 'github') return '';
  const location = parseSkillRepository(content);
  return 'https://github.com/' + location.owner + '/' + location.repository + '/tree/' + location.commit + (location.path ? '/' + location.path.split('/').map(encodeURIComponent).join('/') : '');
}

async function readBoundedText(response: Response, maxBytes: number): Promise<string> {
  const length = response.headers.get('content-length');
  if (length && Number(length) > maxBytes) throw new Error('El archivo remoto supera el tamaño permitido.');
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).length > maxBytes) throw new Error('El archivo remoto supera el tamaño permitido.');
    return text;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > maxBytes) throw new Error('El archivo remoto supera el tamaño permitido.');
      chunks.push(result.value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
}

/** Retrieve pinned public source only; this never runs scripts or interprets Markdown as HTML. */
export async function verifySkillRepository(content: CatalogContent): Promise<void> {
  parseSkillMarkdown(content.text);
  if (content.source !== 'github') {
    if (requiresSkillPackage(content.text)) throw new Error('Los archivos complementarios necesitan un repositorio público fijado a un commit.');
    return;
  }
  const location = parseSkillRepository(content);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const repoResponse = await fetch('https://api.github.com/repos/' + location.owner + '/' + location.repository, { signal: controller.signal, redirect: 'error' });
    if (!repoResponse.ok) throw new Error('No se pudo comprobar el repositorio público. Revisa la URL o el límite de solicitudes de GitHub.');
    const repo = JSON.parse(await readBoundedText(repoResponse, 100_000));
    if (!repo || repo.private !== false) throw new Error('El repositorio debe ser público.');
    const rawUrl = 'https://raw.githubusercontent.com/' + location.owner + '/' + location.repository + '/' + location.commit + '/' + (location.path ? location.path.split('/').map(encodeURIComponent).join('/') + '/' : '') + 'SKILL.md';
    const fileResponse = await fetch(rawUrl, { signal: controller.signal, redirect: 'error' });
    if (!fileResponse.ok) throw new Error('SKILL.md no existe o no es accesible en esa carpeta y commit.');
    const remote = await readBoundedText(fileResponse, MAX_REPOSITORY_RESPONSE_BYTES);
    if (remote !== content.text) throw new Error('El SKILL.md del repositorio no coincide exactamente con el contenido postulado.');
    parseSkillMarkdown(remote);
  } catch (error) {
    if (controller.signal.aborted) throw new Error('GitHub tardó demasiado. Vuelve a comprobar el repositorio.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function searchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}

export function filterCatalogResources(resources: CatalogResource[], filters: CatalogFilters): CatalogResource[] {
  const terms = searchText(filters.query).split(/\s+/).filter(Boolean);
  return resources.filter(resource => {
    if (resource.state !== 'published' || (filters.kind !== 'all' && resource.kind !== filters.kind)) return false;
    const metadata = resource.metadata;
    if (filters.category && filters.category !== 'all' && metadata.category !== filters.category) return false;
    if (filters.compatibility && filters.compatibility !== 'all' && !metadata.compatibility.includes(filters.compatibility)) return false;
    if (filters.author && filters.author !== 'all' && resource.ownerUid !== filters.author && metadata.authorHandle !== filters.author) return false;
    const haystack = searchText([metadata.title, metadata.summary, metadata.outcome, metadata.category, metadata.authorName, metadata.authorHandle, ...metadata.tags, ...metadata.compatibility].join(' '));
    return terms.every(term => haystack.includes(term));
  });
}

export function toCatalogPrompt(resource: CatalogResource, payload: CatalogPayload): Prompt {
  if (resource.kind !== 'prompt' || payload.kind !== 'prompt' || payload.resourceId !== resource.id || payload.submissionId !== resource.submissionId) {
    throw new Error('El contenido no corresponde a la versión de este prompt. Actualiza la ficha.');
  }
  const categories: Prompt['category'][] = ['YouTube', 'Marketing', 'Programación', 'Redacción', 'IA Agentes', 'IA Imágenes', 'IA Videos', 'Acompañante Personal', 'Asistente de Prompts', 'Refactorización', 'Seguridad', 'Buenas Prácticas', 'General'];
  return {
    id: resource.id, userId: resource.ownerUid, title: resource.metadata.title, description: resource.metadata.summary,
    promptText: payload.content.text, category: categories.includes(resource.metadata.category as Prompt['category']) ? resource.metadata.category as Prompt['category'] : 'General',
    tags: [...resource.metadata.tags], isFavorite: false, isShared: false,
    authorName: resource.metadata.authorName, authorAvatar: resource.metadata.authorAvatar, authorHandle: resource.metadata.authorHandle,
    forkedFrom: resource.sourcePromptId || resource.id, forkedFromPromptId: resource.sourcePromptId || resource.id,
    forkedFromUserId: resource.ownerUid, forkedFromAuthorName: resource.metadata.authorName,
    forkedFromAuthorHandle: resource.metadata.authorHandle, forkedFromTitle: resource.metadata.title,
    notas: 'Recurso del catálogo: ' + resource.id + '\nVersión aprobada: ' + resource.submissionId + '\nCondiciones: ' + resource.metadata.license,
    createdAt: resource.publishedAt, updatedAt: resource.updatedAt,
  };
}

export function downloadSkill(content: CatalogContent): void {
  parseSkillMarkdown(content.text);
  const url = URL.createObjectURL(new Blob([content.text], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'SKILL.md';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
