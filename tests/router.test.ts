import { describe, expect, test } from 'vitest';
import { catalogResourcePath, parseLocation, parseSearchParams, serializeLocation } from '../src/router/useAppRouter';

describe('catalog navigation and legacy aliases', () => {
  test('resolves canonical kind/id and refresh independently of query parameters', () => {
    expect(parseLocation('/recurso/skill/skill-a', '')).toEqual({ section: 'explorar', resourceKind: 'skill', resourceId: 'skill-a' });
    expect(parseLocation('/recurso/prompt/prompt-a', '?share=old')).toEqual({ section: 'explorar', resourceKind: 'prompt', resourceId: 'prompt-a' });
    expect(catalogResourcePath('skill', 'skill-a')).toBe('/recurso/skill/skill-a');
  });
  test('normalizes aliases instead of reading draft documents', () => {
    expect(parseSearchParams('?collection=folder-a&user=alice&share=prompt-a')).toEqual({ folder: 'folder-a', profile: 'alice', share: 'prompt-a' });
    expect(parseSearchParams('?folder=folder-a&profile=alice')).toEqual({ folder: 'folder-a', profile: 'alice' });
    expect(parseLocation('/', '?share=prompt-a')).toEqual({ share: 'prompt-a', section: 'explorar' });
  });
  test('creator links and independent classroom/briefing links survive serialization', () => {
    expect(parseLocation('/creador/alice', '')).toEqual({ section: 'creadores', profile: 'alice' });
    expect(serializeLocation({ profile: 'alice' })).toBe('/creador/alice');
    expect(parseLocation('/', '?briefing=brief-a&class=class-a')).toMatchObject({ briefing: 'brief-a', class: 'class-a' });
    expect(serializeLocation({ section: 'publicar' })).toBe('/?section=publicar');
  });
  test('rejects malformed/path-injected identifiers and unknown sections', () => {
    expect(parseLocation('/recurso/skill/%ZZ', '')).toEqual({ section: 'explorar' });
    expect(parseLocation('/recurso/skill/%2Fusers%2Falice', '')).toEqual({ section: 'explorar' });
    expect(parseSearchParams('?share=../prompts/private&section=admin%2Ffake')).toEqual({});
    expect(parseSearchParams('?share=' + 'x'.repeat(201))).toEqual({});
  });
  test('canonical URLs round-trip for back/forward state restoration', () => {
    const state = { section: 'explorar', resourceKind: 'prompt' as const, resourceId: 'abc' };
    expect(parseLocation(serializeLocation(state), '')).toEqual(state);
    expect(parseLocation('/', '?section=prompts')).toEqual({ section: 'explorar' });
  });
  test('type sections use canonical paths and survive navigation independently of stale parameters', () => {
    for (const section of ['prompts', 'skills']) {
      expect(serializeLocation({ section })).toBe('/' + section);
      expect(parseLocation('/' + section, '?section=publicar&share=old')).toEqual({ section });
      expect(parseLocation('/' + section + '/', '')).toEqual({ section });
    }
  });
  test('library tabs survive refresh without changing legacy prompt library URLs', () => {
    const state = { section: 'mi-biblioteca', libraryKind: 'skill' as const };
    expect(serializeLocation(state)).toBe('/?section=mi-biblioteca&tab=skills');
    expect(parseLocation('/', '?section=mi-biblioteca&tab=skills')).toEqual(state);
    expect(parseLocation('/', '?section=mi-biblioteca')).toEqual({ section: 'mi-biblioteca' });
    expect(parseLocation('/', '?tab=skills')).toEqual({ section: 'explorar' });
  });
});
