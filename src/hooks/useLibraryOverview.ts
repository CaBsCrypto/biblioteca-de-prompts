import { useCallback, useEffect, useRef, useState } from 'react';
import { libraryBetaEnabled, requestLibrary, type LibraryOverview } from '../services/libraryClient';

export function useLibraryOverview(uid: string | undefined) {
  const [snapshot, setSnapshot] = useState<{ uid: string; value?: LibraryOverview; error?: string }>();
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    if (!libraryBetaEnabled || !uid) return;
    const current = ++revision.current;
    try {
      const value = await requestLibrary<LibraryOverview>(uid, '/api/library/overview');
      if (current === revision.current) setSnapshot({ uid, value });
    } catch (error) {
      if (current === revision.current) {
        setSnapshot({ uid, error: error instanceof Error ? error.message : 'No podemos cargar tu acceso al piloto.' });
      }
    }
  }, [uid]);

  useEffect(() => {
    if (!libraryBetaEnabled || !uid) return;
    void refresh();
    window.addEventListener('focus', refresh);
    return () => {
      revision.current += 1;
      window.removeEventListener('focus', refresh);
    };
  }, [uid, refresh]);

  const current = snapshot?.uid === uid ? snapshot : undefined;
  const access = current?.value?.access;
  const expiresAt = access?.tier === 'pro' ? access.proExpiresAt : access?.betaExpiresAt;
  useEffect(() => {
    if (!access?.canMutate || !expiresAt) return;
    const remaining = Date.parse(expiresAt) - Date.now();
    const timer = setTimeout(refresh, Math.max(1000, Math.min(remaining + 250, 2_147_000_000)));
    return () => clearTimeout(timer);
  }, [access, expiresAt, refresh]);

  return { overview: current?.value, error: current?.error, refresh };
}
