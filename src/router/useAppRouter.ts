import { useCallback, useEffect, type SetStateAction } from 'react';
import { useAppStore, type AppRouterState, type AppSectionId } from '../store/appStore';
import type { CatalogKind } from '../typesCatalog';

export type DeepLinkKey = keyof AppRouterState;
const SECTIONS = new Set(['inicio', 'explorar', 'creadores', 'publicar', 'revisiones', 'prompts', 'skills', 'mi-biblioteca', 'progreso', 'foro', 'hackathons', 'galeria', 'noticias', 'admin']);
const safeId = (value: string | null) => value && value.length <= 200 && !/[\/#?\u0000-\u001f]/.test(value) ? value : undefined;

export function parseSearchParams(search: string): AppRouterState {
  const params = new URLSearchParams(search);
  const result: AppRouterState = {};
  result.share = safeId(params.get('share'));
  result.folder = safeId(params.get('collection') || params.get('folder'));
  result.profile = safeId(params.get('user') || params.get('profile'));
  result.briefing = safeId(params.get('briefing'));
  result.class = safeId(params.get('class'));
  const section = params.get('section');
  if (section && SECTIONS.has(section)) result.section = section === 'prompts' || section === 'inicio' ? 'explorar' : section;
  if (result.section === 'mi-biblioteca' && params.get('tab') === 'skills') result.libraryKind = 'skill';
  return Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined)) as AppRouterState;
}

export function catalogResourcePath(kind: CatalogKind, id: string): string {
  return '/recurso/' + kind + '/' + encodeURIComponent(id);
}

export function parseLocation(pathname: string, search: string): AppRouterState {
  const result = parseSearchParams(search);
  if (/^\/(prompts|skills)\/?$/.test(pathname)) return { section: pathname.startsWith('/prompts') ? 'prompts' : 'skills' };
  const match = /^\/recurso\/(prompt|skill)\/([^/]+)\/?$/.exec(pathname);
  const profileMatch = /^\/creador\/([^/]+)\/?$/.exec(pathname);
  try {
    if (match) {
      const resourceId = safeId(decodeURIComponent(match[2]));
      if (resourceId) return { section: 'explorar', resourceKind: match[1] as CatalogKind, resourceId };
    }
    if (profileMatch) {
      const profile = safeId(decodeURIComponent(profileMatch[1]));
      if (profile) return { section: 'creadores', profile };
    }
  } catch { /* Malformed links never resolve to a raw draft. */ }
  if (!result.section) result.section = result.profile ? 'creadores' : 'explorar';
  return result;
}

export function serializeRouterState(state: AppRouterState): string {
  const params = new URLSearchParams();
  for (const [key, alias] of [['share', 'share'], ['folder', 'collection'], ['profile', 'user'], ['briefing', 'briefing'], ['class', 'class']] as const) {
    if (state[key]) params.set(alias, state[key]!);
  }
  if (state.section && state.section !== 'explorar' && !state.profile) params.set('section', state.section);
  if (state.section === 'mi-biblioteca' && state.libraryKind === 'skill') params.set('tab', 'skills');
  return params.toString();
}

export function serializeLocation(state: AppRouterState): string {
  if (state.resourceId && state.resourceKind) return catalogResourcePath(state.resourceKind, state.resourceId);
  if (state.profile && !state.share && !state.folder && !state.briefing && !state.class) return '/creador/' + encodeURIComponent(state.profile);
  if ((state.section === 'prompts' || state.section === 'skills') && !state.share && !state.folder && !state.briefing && !state.class) return '/' + state.section;
  const qs = serializeRouterState(state);
  return qs ? '/?' + qs : '/';
}

export function useAppRouter() {
  const { state: store, dispatch, goSection } = useAppStore();
  const apply = useCallback((next: AppRouterState) => {
    dispatch({ type: 'router', router: next });
    if (next.section && SECTIONS.has(next.section)) goSection(next.section as AppSectionId);
  }, [dispatch, goSection]);

  useEffect(() => {
    const sync = () => apply(parseLocation(window.location.pathname, window.location.search));
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [apply]);

  const setRouter = useCallback((next: SetStateAction<AppRouterState>, replace = false) => {
    const resolved = typeof next === 'function' ? next(store.router) : next;
    const desired = serializeLocation(resolved);
    if (window.location.pathname + window.location.search !== desired) {
      window.history[replace ? 'replaceState' : 'pushState'](null, '', desired);
    }
    apply(resolved);
  }, [store.router, apply]);

  const navigateUrl = useCallback((url: URL, replace = false) => {
    setRouter(parseLocation(url.pathname, url.search), replace);
  }, [setRouter]);

  const clearDeepLink = useCallback((key: DeepLinkKey) => setRouter(previous => {
    const next = { ...previous };
    delete next[key];
    return next;
  }), [setRouter]);
  const clearAll = useCallback(() => setRouter({ section: 'explorar' }), [setRouter]);
  return { state: store.router, setRouter, navigateUrl, clearDeepLink, clearAll };
}
