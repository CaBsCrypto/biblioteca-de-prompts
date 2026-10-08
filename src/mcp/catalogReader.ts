import { createHash } from 'node:crypto';
import { doc, getDocFromServer, type Firestore } from 'firebase/firestore';
import type { CatalogContent, CatalogFilters, CatalogMetadata, CatalogPayload, CatalogResource } from '../typesCatalog';
import { fetchPublishedCatalogResources } from '../services/firestore/catalogService';
import { buildSkillRepositoryUrl, filterCatalogResources } from '../utils/catalog';
import {
  InvalidCatalogRequest, ResourceUnavailable, VersionChanged,
  type CatalogReader, type PublicCatalogResource,
} from './contracts';

const WEBSITE_ORIGIN = 'https://biblioteca.browns.studio';
const PAGE_SIZE = 20;

/** Injectable I/O keeps race and privacy tests independent of a live database. */
export interface CatalogReadAccess {
  published(): Promise<CatalogResource[]>;
  resource(id: string): Promise<CatalogResource | null>;
  payload(id: string): Promise<CatalogPayload | null>;
}

function isPermissionDenied(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    && (error.code === 'permission-denied' || error.code === 'firestore/permission-denied');
}

function validId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.length <= 200 && !/[\/#?\u0000-\u001f]/.test(id);
}

function isoTimestamp(value: unknown): string | null {
  let milliseconds: number;
  if (value instanceof Date) milliseconds = value.getTime();
  else if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') milliseconds = value.toMillis();
  else return null;
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}

function publicMetadata(metadata: CatalogMetadata): CatalogMetadata {
  return {
    title: metadata.title, summary: metadata.summary, outcome: metadata.outcome,
    category: metadata.category, tags: [...metadata.tags], compatibility: [...metadata.compatibility],
    requirements: metadata.requirements, usage: metadata.usage, license: metadata.license,
    exampleInput: metadata.exampleInput, exampleOutput: metadata.exampleOutput,
    imageUrl: metadata.imageUrl, demoUrl: metadata.demoUrl,
    authorName: metadata.authorName, authorHandle: metadata.authorHandle, authorAvatar: metadata.authorAvatar,
  };
}

function toPublicResource(resource: CatalogResource): PublicCatalogResource {
  return {
    id: resource.id, kind: resource.kind, metadata: publicMetadata(resource.metadata),
    submissionId: resource.submissionId, state: 'published',
    publishedAt: isoTimestamp(resource.publishedAt), updatedAt: isoTimestamp(resource.updatedAt),
    canonicalUrl: WEBSITE_ORIGIN + '/recurso/' + resource.kind + '/' + encodeURIComponent(resource.id),
  };
}

function normalizeFilters(filters: CatalogFilters): CatalogFilters {
  if (!filters || !['all', 'prompt', 'skill'].includes(filters.kind)) throw new InvalidCatalogRequest('El tipo debe ser prompt, skill o all.');
  const normalize = (value: string, max: number): string => {
    if (typeof value !== 'string' || value.length > max) throw new InvalidCatalogRequest('Los filtros contienen un valor inválido.');
    const trimmed = value.trim();
    return trimmed === 'all' ? '' : trimmed;
  };
  return {
    query: typeof filters.query === 'string' && filters.query.length <= 500 ? filters.query.trim() : (() => { throw new InvalidCatalogRequest('La búsqueda admite hasta 500 caracteres.'); })(),
    kind: filters.kind,
    category: normalize(filters.category, 200), compatibility: normalize(filters.compatibility, 200), author: normalize(filters.author, 200),
  };
}

function filterFingerprint(filters: CatalogFilters): string {
  return createHash('sha256').update(JSON.stringify(filters)).digest('hex');
}

function cursorState(cursor: string | undefined, fingerprint: string): { offset: number; snapshot?: string } {
  if (!cursor) return { offset: 0 };
  try {
    if (cursor.length > 400 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error();
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (decoded.v !== 1 || decoded.filters !== fingerprint || !Number.isSafeInteger(decoded.offset) || decoded.offset < 1 || !/^[a-f0-9]{64}$/.test(decoded.snapshot)) throw new Error();
    return { offset: decoded.offset, snapshot: decoded.snapshot };
  } catch {
    throw new InvalidCatalogRequest('El cursor es inválido o corresponde a otros filtros. Reinicia la búsqueda.');
  }
}

function nextCursor(offset: number, fingerprint: string, snapshot: string): string {
  return Buffer.from(JSON.stringify({ v: 1, filters: fingerprint, snapshot, offset })).toString('base64url');
}

export function createCatalogReaderFromReads(reads: CatalogReadAccess): CatalogReader {
  const getPublished = async (id: string): Promise<CatalogResource> => {
    if (!validId(id)) throw new InvalidCatalogRequest('El identificador del recurso es inválido.');
    let resource: CatalogResource | null;
    try { resource = await reads.resource(id); }
    catch (error) { if (isPermissionDenied(error)) throw new ResourceUnavailable(); throw error; }
    if (!resource || resource.id !== id || resource.state !== 'published') throw new ResourceUnavailable();
    return resource;
  };

  return {
    async search(filters, cursor, pageSize = PAGE_SIZE) {
      const normalized = normalizeFilters(filters);
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > PAGE_SIZE) throw new InvalidCatalogRequest('Solicita entre 1 y 20 resultados por página.');
      const fingerprint = filterFingerprint(normalized);
      const { offset, snapshot } = cursorState(cursor, fingerprint);
      let all: CatalogResource[];
      try { all = await reads.published(); }
      catch (error) { if (isPermissionDenied(error)) throw new ResourceUnavailable(); throw error; }
      const filtered = filterCatalogResources(all, normalized);
      const currentSnapshot = createHash('sha256').update(JSON.stringify(filtered.map(resource => [resource.id, resource.submissionId, resource.kind]))).digest('hex');
      if ((snapshot && snapshot !== currentSnapshot) || offset > filtered.length) throw new InvalidCatalogRequest('El catálogo cambió. Reinicia la búsqueda.');
      const resources = filtered.slice(offset, offset + pageSize).map(toPublicResource);
      const followingOffset = offset + resources.length;
      return {
        resources, total: filtered.length,
        ...(followingOffset < filtered.length ? { nextCursor: nextCursor(followingOffset, fingerprint, currentSnapshot) } : {}),
      };
    },
    async get(id) { return toPublicResource(await getPublished(id)); },
    async content(id, expectedSubmissionId) {
      if (!validId(expectedSubmissionId)) throw new InvalidCatalogRequest('Selecciona una versión aprobada válida.');
      const selected = await getPublished(id);
      if (selected.submissionId !== expectedSubmissionId) throw new VersionChanged(toPublicResource(selected));
      let payload: CatalogPayload | null;
      try { payload = await reads.payload(id); }
      catch (error) {
        if (!isPermissionDenied(error)) throw error;
        const latest = await getPublished(id);
        if (latest.submissionId !== expectedSubmissionId) throw new VersionChanged(toPublicResource(latest));
        throw new ResourceUnavailable();
      }
      // An approval or withdrawal can occur between the metadata and payload reads.
      const latest = await getPublished(id);
      if (latest.submissionId !== expectedSubmissionId) throw new VersionChanged(toPublicResource(latest));
      if (!payload || payload.id !== id || payload.resourceId !== id || payload.kind !== latest.kind || payload.ownerUid !== latest.ownerUid) throw new ResourceUnavailable();
      if (payload.submissionId !== expectedSubmissionId) throw new VersionChanged(toPublicResource(latest));
      const content: CatalogContent = {
        text: payload.content.text, source: payload.content.source,
        repositoryUrl: payload.content.repositoryUrl, repositoryCommit: payload.content.repositoryCommit, repositoryPath: payload.content.repositoryPath,
      };
      let repositoryFolderUrl: string | null = null;
      if (latest.kind === 'skill' && content.source === 'github') {
        try { repositoryFolderUrl = buildSkillRepositoryUrl(content); }
        catch { throw new ResourceUnavailable(); }
      }
      return { resource: toPublicResource(latest), content, repositoryFolderUrl };
    },
  };
}

/** The browser SDK applies the same anonymous Firestore rules as the public website. */
export function createCatalogReader(db: Firestore): CatalogReader {
  return createCatalogReaderFromReads({
    published: () => fetchPublishedCatalogResources(db),
    resource: async id => {
      const snapshot = await getDocFromServer(doc(db, 'catalogResources', id));
      return snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } as CatalogResource : null;
    },
    payload: async id => {
      const snapshot = await getDocFromServer(doc(db, 'catalogPayloads', id));
      return snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } as CatalogPayload : null;
    },
  });
}
