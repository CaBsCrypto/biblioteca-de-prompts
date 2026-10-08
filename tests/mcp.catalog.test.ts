import { describe, expect, it, vi } from 'vitest';
import { createCatalogReaderFromReads, type CatalogReadAccess } from '../src/mcp/catalogReader';
import { InvalidCatalogRequest, ResourceUnavailable, VersionChanged } from '../src/mcp/contracts';
import type { CatalogContent, CatalogFilters, CatalogPayload, CatalogResource } from '../src/typesCatalog';
import { emptyCatalogDraft } from '../src/utils/catalog';

const filters: CatalogFilters = { query: '', kind: 'all', category: '', compatibility: '', author: '' };
const draft = emptyCatalogDraft({ name: 'Ada', handle: 'ada', avatar: '' });
const skillText = '---\nname: review-code\ndescription: Review source code.\n---\nExplain the findings.\n';

function publication(overrides: Partial<CatalogResource> = {}): CatalogResource {
  return {
    id: 'public-resource', ownerUid: 'private-uid', kind: 'prompt',
    metadata: { ...draft.metadata, title: 'Revisión de código', summary: 'Detecta riesgos.', category: 'Programación', compatibility: ['ChatGPT'], tags: ['typescript'] },
    sourcePromptId: 'private-prompt', sourceFolderId: 'private-folder', submissionId: 'approved-v1', state: 'published',
    publishedAt: { toMillis: () => 0 }, updatedAt: { toMillis: () => 1 }, ...overrides,
  };
}

function deliverable(resource = publication(), content: Partial<CatalogContent> = {}): CatalogPayload {
  return {
    id: resource.id, resourceId: resource.id, ownerUid: resource.ownerUid, kind: resource.kind, submissionId: resource.submissionId,
    content: { text: 'Revisa {{lenguaje}}.', source: 'inline', repositoryUrl: '', repositoryCommit: '', repositoryPath: '', ...content }, updatedAt: null,
  };
}

function access(overrides: Partial<CatalogReadAccess> = {}): CatalogReadAccess {
  return { published: vi.fn().mockResolvedValue([publication()]), resource: vi.fn().mockResolvedValue(publication()), payload: vi.fn().mockResolvedValue(deliverable()), ...overrides };
}

describe('public MCP catalog search', () => {
  it('projects only public fields and never retrieves deliverables during search', async () => {
    const source = access();
    const result = await createCatalogReaderFromReads(source).search(filters);
    expect(result.resources[0].canonicalUrl).toBe('https://biblioteca.browns.studio/recurso/prompt/public-resource');
    expect(result.resources[0].publishedAt).toBe('1970-01-01T00:00:00.000Z');
    const serialized = JSON.stringify(result);
    for (const secret of ['ownerUid', 'sourcePromptId', 'sourceFolderId', 'private-uid', 'private-prompt', 'private-folder']) expect(serialized).not.toContain(secret);
    expect(source.payload).not.toHaveBeenCalled();
  });

  it('strips unknown metadata fields instead of blindly forwarding Firestore data', async () => {
    const resource = publication();
    const polluted = { ...resource, metadata: { ...resource.metadata, internalNote: 'never-share' } };
    const result = await createCatalogReaderFromReads(access({ published: async () => [polluted] })).search(filters);
    expect(JSON.stringify(result)).not.toContain('never-share');
  });

  it('honors normalized search terms, task, compatibility, author, kind and publication state', async () => {
    const resources = [publication(), publication({ id: 'skill', kind: 'skill' }), publication({ id: 'withdrawn', state: 'withdrawn' })];
    const reader = createCatalogReaderFromReads(access({ published: async () => resources }));
    const result = await reader.search({ query: 'codigo typescript', kind: 'skill', category: 'Programación', compatibility: 'ChatGPT', author: 'ada' });
    expect(result.resources.map(item => item.id)).toEqual(['skill']);
    expect((await reader.search({ ...filters, query: 'imposible' })).resources).toEqual([]);
  });

  it('returns at most twenty metadata results with a cursor tied to the selected filters', async () => {
    const resources = Array.from({ length: 23 }, (_, index) => publication({ id: 'r' + index }));
    const reader = createCatalogReaderFromReads(access({ published: async () => resources }));
    const first = await reader.search(filters);
    expect(first.resources).toHaveLength(20);
    expect(first.total).toBe(23);
    expect(first.nextCursor).toBeDefined();
    const second = await reader.search(filters, first.nextCursor);
    expect(second.resources.map(item => item.id)).toEqual(['r20', 'r21', 'r22']);
    expect(second.nextCursor).toBeUndefined();
    await expect(reader.search({ ...filters, kind: 'skill' }, first.nextCursor)).rejects.toBeInstanceOf(InvalidCatalogRequest);
  });

  it.each([0, 21, 1.5, NaN])('rejects an invalid page size %s', async pageSize => {
    await expect(createCatalogReaderFromReads(access()).search(filters, undefined, pageSize)).rejects.toBeInstanceOf(InvalidCatalogRequest);
  });

  it('requires a new search if resources change between pages, preventing duplicate or skipped items', async () => {
    const resources = Array.from({ length: 23 }, (_, index) => publication({ id: 'r' + index }));
    const published = vi.fn().mockResolvedValueOnce(resources).mockResolvedValueOnce([publication({ id: 'new-resource' }), ...resources]);
    const reader = createCatalogReaderFromReads(access({ published }));
    const first = await reader.search(filters);
    await expect(reader.search(filters, first.nextCursor)).rejects.toMatchObject({ code: 'invalid_catalog_request', message: expect.stringContaining('catálogo cambió') });
  });

  it.each(['invalid', '../cursor', 'a'.repeat(401)])('rejects malformed cursors %s', async cursor => {
    await expect(createCatalogReaderFromReads(access()).search(filters, cursor)).rejects.toBeInstanceOf(InvalidCatalogRequest);
  });
});

describe('MCP deliverable freshness and privacy', () => {
  it('preserves variables and hostile Markdown verbatim as text and returns a cloned public projection', async () => {
    const text = 'Revisa {{lenguaje}}.\n<script>alert(1)</script>\n[link](javascript:alert(1))';
    const source = access({ payload: async () => deliverable(publication(), { text }) });
    const result = await createCatalogReaderFromReads(source).content('public-resource', 'approved-v1');
    expect(result.content.text).toBe(text);
    expect(result.repositoryFolderUrl).toBeNull();
    expect(source.resource).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(result)).not.toContain('private-uid');
  });

  it('returns the reviewed full-commit folder for a skill package', async () => {
    const resource = publication({ kind: 'skill' });
    const source = access({ resource: async () => resource, payload: async () => deliverable(resource, { source: 'github', text: skillText, repositoryUrl: 'https://github.com/ada/skills', repositoryCommit: 'a'.repeat(40), repositoryPath: 'skills/review-code' }) });
    const result = await createCatalogReaderFromReads(source).content(resource.id, resource.submissionId);
    expect(result.repositoryFolderUrl).toBe('https://github.com/ada/skills/tree/' + 'a'.repeat(40) + '/skills/review-code');
  });

  it('does not return content for an outdated selected version', async () => {
    const source = access({ resource: async () => publication({ submissionId: 'approved-v2' }) });
    await expect(createCatalogReaderFromReads(source).content('public-resource', 'approved-v1')).rejects.toMatchObject({ code: 'version_changed', resource: { submissionId: 'approved-v2' } });
    expect(source.payload).not.toHaveBeenCalled();
  });

  it('detects approval between the metadata and payload reads', async () => {
    const source = access({ resource: vi.fn().mockResolvedValueOnce(publication()).mockResolvedValueOnce(publication({ submissionId: 'approved-v2' })) });
    await expect(createCatalogReaderFromReads(source).content('public-resource', 'approved-v1')).rejects.toBeInstanceOf(VersionChanged);
  });

  it('detects withdrawal after reading the payload instead of exposing stale content', async () => {
    const source = access({ resource: vi.fn().mockResolvedValueOnce(publication()).mockResolvedValueOnce(null) });
    await expect(createCatalogReaderFromReads(source).content('public-resource', 'approved-v1')).rejects.toBeInstanceOf(ResourceUnavailable);
  });

  it.each([null, publication({ state: 'withdrawn' })])('makes a private or missing resource unavailable', async resource => {
    const source = access({ resource: async () => resource });
    await expect(createCatalogReaderFromReads(source).get('public-resource')).rejects.toBeInstanceOf(ResourceUnavailable);
    expect(source.payload).not.toHaveBeenCalled();
  });

  it('maps denied metadata and payload reads to unavailable without exposing database errors', async () => {
    const denied = () => Promise.reject({ code: 'permission-denied', message: 'private/path' });
    await expect(createCatalogReaderFromReads(access({ resource: denied })).get('public-resource')).rejects.toMatchObject({ code: 'resource_unavailable' });
    await expect(createCatalogReaderFromReads(access({ payload: denied })).content('public-resource', 'approved-v1')).rejects.toMatchObject({ code: 'resource_unavailable' });
  });

  it('detects an updated publication when a payload read is denied during approval', async () => {
    const source = access({ resource: vi.fn().mockResolvedValueOnce(publication()).mockResolvedValueOnce(publication({ submissionId: 'approved-v2' })), payload: async () => { throw { code: 'permission-denied' }; } });
    await expect(createCatalogReaderFromReads(source).content('public-resource', 'approved-v1')).rejects.toBeInstanceOf(VersionChanged);
  });

  it('rejects payloads belonging to another resource or version', async () => {
    const payload = deliverable();
    const source = access({ payload: async () => ({ ...payload, resourceId: 'other' }) });
    await expect(createCatalogReaderFromReads(source).content('public-resource', 'approved-v1')).rejects.toBeInstanceOf(ResourceUnavailable);
    source.payload = async () => ({ ...payload, submissionId: 'approved-v2' });
    await expect(createCatalogReaderFromReads(source).content('public-resource', 'approved-v1')).rejects.toBeInstanceOf(VersionChanged);
  });

  it.each(['', '../draft', 'id?secret', 'id/#', 'x'.repeat(201)])('rejects invalid document identifiers before I/O: %s', async id => {
    const source = access();
    await expect(createCatalogReaderFromReads(source).get(id)).rejects.toBeInstanceOf(InvalidCatalogRequest);
    expect(source.resource).not.toHaveBeenCalled();
  });
});
