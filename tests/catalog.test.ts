import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSkillRepositoryUrl, emptyCatalogDraft, filterCatalogResources, parseSkillMarkdown, toCatalogPrompt, validateCatalogDraft, verifySkillRepository } from '../src/utils/catalog';
import type { CatalogContent, CatalogDraftInput, CatalogPayload, CatalogResource } from '../src/typesCatalog';

const identity = { name: 'Ada', handle: 'ada', avatar: '' };
const skillText = '---\nname: review-code\ndescription: Review code changes and explain risks.\n---\nRead the diff and explain the findings.\n';
const commit = 'a'.repeat(40);

function completeDraft(kind: 'prompt' | 'skill' = 'prompt'): CatalogDraftInput {
  const draft = emptyCatalogDraft(identity, kind);
  draft.metadata = {
    ...draft.metadata, title: 'Revisar código', summary: 'Identifica riesgos en código.', outcome: 'Hallazgos accionables',
    category: 'Programación', tags: ['typescript'], compatibility: ['Codex'], usage: 'Pega el diff y revisa el resultado.',
    license: 'CC BY 4.0', exampleInput: 'Un diff de código', exampleOutput: 'Un hallazgo con explicación',
  };
  draft.content.text = kind === 'skill' ? skillText : 'Revisa el código de {{lenguaje}} y explica los riesgos.';
  return draft;
}

function githubContent(overrides: Partial<CatalogContent> = {}): CatalogContent {
  return { text: skillText, source: 'github', repositoryUrl: 'https://github.com/ada/review-skills', repositoryCommit: commit, repositoryPath: 'skills/review-code', ...overrides };
}

function resource(overrides: Partial<CatalogResource> = {}): CatalogResource {
  return { id: 'public-resource', ownerUid: 'author', kind: 'prompt', metadata: completeDraft().metadata, sourcePromptId: 'private-origin', sourceFolderId: '', submissionId: 'approved-v1', state: 'published', publishedAt: null, updatedAt: null, ...overrides };
}

afterEach(() => vi.unstubAllGlobals());

describe('Agent Skills format validation', () => {
  it('accepts CRLF, multiline descriptions, and optional standard fields without rewriting the source', () => {
    const text = '---\r\nname: review-code\r\ndescription: >\r\n  Review code.\r\n  Use for pull requests.\r\ncompatibility: Codex with git\r\nlicense: MIT\r\nallowed-tools: Read\r\nmetadata:\r\n  version: "1.0"\r\n---\r\n# Instructions\r\nRead the changes.\r\n';
    expect(parseSkillMarkdown(text)).toEqual({ name: 'review-code', description: 'Review code. Use for pull requests.\n' });
    const draft = completeDraft('skill');
    draft.content.text = text;
    expect(validateCatalogDraft(draft, true)).toEqual([]);
    expect(draft.content.text).toBe(text);
  });

  it.each(['Review-Code', '-review', 'review-', 'review--code', 'x'.repeat(65)])('rejects invalid skill name %s', name => {
    expect(() => parseSkillMarkdown(skillText.replace('review-code', name))).toThrow(/name/);
  });

  it('supports international skill names while keeping the original Markdown intact', () => {
    const text = skillText.replace('review-code', 'análisis-datos');
    expect(parseSkillMarkdown(text).name).toBe('análisis-datos');
    expect(buildSkillRepositoryUrl(githubContent({ text, repositoryPath: 'skills/análisis-datos' }))).toContain('/skills/an%C3%A1lisis-datos');
    expect(parseSkillMarkdown(skillText.replace('review-code', '数据分析')).name).toBe('数据分析');
    expect(() => parseSkillMarkdown(skillText.replace('review-code', 'Análisis'))).toThrow(/name/);
    expect(() => parseSkillMarkdown(skillText.replace('---\nRead', 'custom-option: true\n---\nRead'))).toThrow(/campos/);
  });

  it('rejects missing frontmatter/body, duplicate keys, custom tags and YAML aliases', () => {
    expect(() => parseSkillMarkdown('# Plain markdown')).toThrow(/frontmatter/);
    expect(() => parseSkillMarkdown('---\nname: review-code\ndescription: Review code\n---\n')).toThrow(/instrucciones/);
    expect(() => parseSkillMarkdown(skillText.replace('name: review-code', 'name: first\nname: second'))).toThrow(/duplicadas/);
    expect(() => parseSkillMarkdown(skillText.replace('name: review-code', 'name: !execute review-code'))).toThrow(/etiquetas/);
    expect(() => parseSkillMarkdown('---\nname: &name review-code\ndescription: *name\n---\nRead.')).toThrow(/alias/);
  });

  it('checks required and optional scalar types and bounded fields', () => {
    expect(() => parseSkillMarkdown(skillText.replace('description: Review code changes and explain risks.', 'description: false'))).toThrow(/description/);
    expect(() => parseSkillMarkdown(skillText.replace('description: Review code changes and explain risks.', 'description: ' + 'x'.repeat(1025)))).toThrow(/description/);
    expect(() => parseSkillMarkdown(skillText.replace('---\nRead', 'metadata:\n  version: 1\n---\nRead'))).toThrow(/metadata/);
    expect(() => parseSkillMarkdown(skillText.replace('---\nRead', 'compatibility: ' + 'x'.repeat(501) + '\n---\nRead'))).toThrow(/compatibility/);
    expect(() => parseSkillMarkdown('x'.repeat(50_001))).toThrow(/50.000/);
  });

  it('keeps hostile Markdown inert as raw deliverable text', () => {
    const hostile = skillText + '\n<script>fetch("https://evil.example")</script>\n[link](javascript:alert(1))';
    expect(parseSkillMarkdown(hostile).name).toBe('review-code');
    const draft = completeDraft('skill');
    draft.content.text = hostile;
    expect(validateCatalogDraft(draft, true)).toEqual([]);
    expect(draft.content.text).toContain('<script>');
  });
});

describe('private drafts and submission completeness', () => {
  it('allows incomplete private drafts but requires examples, conditions, usage and compatibility for submission', () => {
    expect(validateCatalogDraft(emptyCatalogDraft(identity), false)).toEqual([]);
    const errors = validateCatalogDraft(emptyCatalogDraft(identity), true);
    expect(errors.join(' ')).toContain('ejemplo de entrada');
    expect(errors.join(' ')).toContain('ejemplo de resultado');
    expect(errors.join(' ')).toContain('condiciones de uso');
    expect(errors.join(' ')).toContain('herramienta compatible');
    expect(validateCatalogDraft(completeDraft(), true)).toEqual([]);
  });

  it('rejects unsafe media links and malformed fields even when saving privately', () => {
    const draft = completeDraft();
    draft.metadata.imageUrl = 'javascript:alert(1)';
    draft.metadata.demoUrl = 'https://user:password@example.com';
    draft.content.text = 'x'.repeat(10001);
    const errors = validateCatalogDraft(draft, false).join(' ');
    expect(errors).toContain('HTTPS');
    expect(errors).toContain('10.000');
  });

  it.each(['Run scripts/extract.py.', '[Read](references/guide.md)', '[Read](./GUIDE.md)', 'Load assets\\template.json.'])('requires a pinned repository for package dependency %s', instructions => {
    const draft = completeDraft('skill');
    draft.content.text += '\n' + instructions;
    expect(validateCatalogDraft(draft, true).join(' ')).toContain('repositorio público');
  });

  it('allows external web links and same-document anchors without a repository', () => {
    const draft = completeDraft('skill');
    draft.content.text += '\n[Docs](https://example.com/doc) [Section](#review)';
    expect(validateCatalogDraft(draft, true)).toEqual([]);
  });
});

describe('pinned GitHub skill packages', () => {
  it('builds a commit-pinned folder URL, accepting repository .git and root folder', () => {
    expect(buildSkillRepositoryUrl(githubContent({ repositoryUrl: 'https://github.com/ada/review-skills.git/' }))).toBe('https://github.com/ada/review-skills/tree/' + commit + '/skills/review-code');
    expect(buildSkillRepositoryUrl(githubContent({ repositoryPath: '.' }))).toBe('https://github.com/ada/review-skills/tree/' + commit);
  });

  it.each([
    { repositoryUrl: 'https://github.com.evil.example/ada/repo' },
    { repositoryUrl: 'https://user:secret@github.com/ada/repo' },
    { repositoryUrl: 'https://github.com/ada/repo?ref=main' },
    { repositoryCommit: 'main' },
    { repositoryCommit: 'abc1234' },
    { repositoryPath: '../review-code' },
    { repositoryPath: 'skills/%2e%2e/review-code' },
    { repositoryPath: 'skills\\review-code' },
    { repositoryPath: 'skills/another-name' },
  ])('rejects invalid or unpinned repository reference %j without a request', async overrides => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(verifySkillRepository(githubContent(overrides))).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('checks public visibility and exactly matches SKILL.md at the supplied full commit', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ private: false })))
      .mockResolvedValueOnce(new Response(skillText));
    vi.stubGlobal('fetch', fetchMock);
    await expect(verifySkillRepository(githubContent())).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/ada/review-skills');
    expect(fetchMock.mock.calls[1][0]).toBe('https://raw.githubusercontent.com/ada/review-skills/' + commit + '/skills/review-code/SKILL.md');
    expect(fetchMock.mock.calls[1][1].redirect).toBe('error');
  });

  it('rejects inaccessible, private or changed repository files', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(verifySkillRepository(githubContent())).rejects.toThrow(/repositorio público/);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ private: true })));
    await expect(verifySkillRepository(githubContent())).rejects.toThrow(/público/);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ private: false }))).mockResolvedValueOnce(new Response(skillText.trim()));
    await expect(verifySkillRepository(githubContent())).rejects.toThrow(/exactamente/);
  });

  it('rejects oversized streamed files before comparing content', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ private: false })))
      .mockResolvedValueOnce(new Response('x'.repeat(200_001)));
    vi.stubGlobal('fetch', fetchMock);
    await expect(verifySkillRepository(githubContent())).rejects.toThrow(/tamaño/);
  });
});

describe('public metadata search and attributed prompt delivery', () => {
  it('finds all normalized search terms in metadata and honors independent filters', () => {
    const first = resource();
    const second = resource({ id: 'skill', kind: 'skill', ownerUid: 'other', metadata: { ...first.metadata, title: 'Crear imágenes', compatibility: ['Claude'] } });
    const withdrawn = resource({ id: 'withdrawn', state: 'withdrawn' });
    const filters = { query: 'revision', kind: 'all' as const, category: '', compatibility: '', author: '' };
    expect(filterCatalogResources([first, second, withdrawn], { ...filters, query: 'codigo typescript', kind: 'prompt', compatibility: 'Codex', author: 'author' })).toEqual([first]);
    expect(filterCatalogResources([first, second], { ...filters, query: '', kind: 'skill', author: 'other' })).toEqual([second]);
    expect(filterCatalogResources([first], { ...filters, query: 'código inexistente' })).toEqual([]);
  });

  it('preserves exact prompt variables and attribution in a private remix', () => {
    const publication = resource();
    const payload: CatalogPayload = { id: publication.id, resourceId: publication.id, ownerUid: publication.ownerUid, kind: 'prompt', submissionId: publication.submissionId, content: completeDraft().content, updatedAt: null };
    const prompt = toCatalogPrompt(publication, payload);
    expect(prompt.promptText).toContain('{{lenguaje}}');
    expect(prompt.isShared).toBe(false);
    expect(prompt.forkedFromAuthorName).toBe(identity.name);
    expect(prompt.forkedFromPromptId).toBe('private-origin');
    expect(prompt.notas).toContain(publication.id);
    expect(prompt.notas).toContain(publication.submissionId);
    expect(prompt.notas).toContain('CC BY 4.0');
    expect(() => toCatalogPrompt(publication, { ...payload, submissionId: 'different-version' })).toThrow(/versión/);
  });
});
