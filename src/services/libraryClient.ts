import { auth } from '../firebase';
import type { LibraryActivity } from './server/libraryActivity';
import type { readLibraryAccess } from './server/libraryAccess';
import type { LibraryWrite } from './server/libraryWrites';

export const libraryBetaEnabled = import.meta.env.VITE_BIBLIOTECA_LIBRARY_BETA_ENABLED === 'true';

export type LibraryOverview = {
  access: Awaited<ReturnType<typeof readLibraryAccess>>;
  activity: LibraryActivity[];
};

export class LibraryApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export async function requestLibrary<T>(uid: string, path: string, input?: object): Promise<T> {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw new LibraryApiError(401, 'Vuelve a entrar con Google para continuar.');
  const token = await user.getIdToken();
  if (auth.currentUser?.uid !== uid) throw new LibraryApiError(401, 'La cuenta de Biblioteca cambió. Vuelve a abrir la vista.');
  const response = await fetch(path, {
    method: input ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(input && { 'Content-Type': 'application/json' }),
    },
    ...(input && { body: JSON.stringify(input) }),
  });
  const data: T & { message?: string } = await response.json().catch(() => ({}));
  if (!response.ok) throw new LibraryApiError(response.status, data.message || 'No pudimos completar la acción. Intenta de nuevo.');
  return data;
}

type WriteInput = LibraryWrite extends infer T ? T extends LibraryWrite ? Omit<T, 'requestId'> : never : never;

export async function writeLibraryPrompt(uid: string, input: WriteInput) {
  const request = { ...input, requestId: crypto.randomUUID() };
  const send = () => requestLibrary<{ promptIds: string[]; createdCount: number; promptId?: string; revision?: number }>(uid, '/api/library/prompts', request);
  try {
    return await send();
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    return send();
  }
}

export function recordWebLibraryUse(uid: string, kind: 'prompt' | 'skill', resourceId: string) {
  return requestLibrary(uid, '/api/library/activity', { kind, resourceId, requestId: crypto.randomUUID() });
}
