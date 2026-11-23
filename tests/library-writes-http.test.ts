import type { Express, Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryAccessError } from '../src/services/server/libraryAccess';

const harness = vi.hoisted(() => ({ verify: vi.fn(), profile: vi.fn(), write: vi.fn() }));
vi.mock('../src/services/server/firebaseAdmin', () => ({ getBibliotecaAdmin: () => ({
  auth: { verifyIdToken: harness.verify },
  db: { collection: () => ({ doc: () => ({ get: harness.profile }) }) },
}) }));
vi.mock('../src/services/server/libraryWrites', async importOriginal => ({
  ...await importOriginal<typeof import('../src/services/server/libraryWrites')>(), runLibraryWrite: harness.write,
}));
import { installLibraryWritesHttp } from '../src/services/server/libraryWritesHttp';

let handler: (req: Request, res: Response) => Promise<void>;
const input = { action: 'create', requestId: 'http-test-1', prompt: { title: 'Ficticio', promptText: 'Texto de prueba.' } };

beforeEach(() => {
  vi.stubEnv('BIBLIOTECA_LIBRARY_BETA_ENABLED', 'true');
  vi.clearAllMocks();
  harness.verify.mockResolvedValue({ uid: 'verified-google-uid', name: 'Cuenta Google', picture: 'https://example.com/avatar.png', firebase: { sign_in_provider: 'google.com' } });
  harness.profile.mockResolvedValue({ get: () => 'cuenta-google' });
  harness.write.mockResolvedValue({ promptId: 'saved-1', promptIds: ['saved-1'], createdCount: 1 });
  installLibraryWritesHttp({ all: (_path: string, fn: typeof handler) => { handler = fn; } } as unknown as Express);
});
afterEach(() => vi.unstubAllEnvs());
async function invoke(method: string, body: object = input, headers: Record<string, string> = {}) {
  const requestHeaders = Object.fromEntries(Object.entries({ 'Content-Type': 'application/json', Authorization: 'Bearer fixture-token', ...headers }).map(([key, value]) => [key.toLowerCase(), value]));
  const responseHeaders = new Map<string, string>();
  let status = 200, responseBody: unknown;
  const request = { method, body, socket: { localPort: 3000 }, get: (name: string) => requestHeaders[name.toLowerCase()], is: (type: string) => requestHeaders['content-type'] === type } as unknown as Request;
  const response = { set(name: string, value: string) { responseHeaders.set(name.toLowerCase(), value); return this; }, status(value: number) { status = value; return this; }, json(value: unknown) { responseBody = value; return this; } } as unknown as Response;
  await handler(request, response);
  return { status, headers: { get: (name: string) => responseHeaders.get(name.toLowerCase()) }, json: async () => responseBody };
}
function post(body: object = input, headers: Record<string, string> = {}) {
  return invoke('POST', body, headers);
}

describe('HTTP de escrituras privadas', () => {
  it('acepta una cuenta Google verificada en modo comercial con el piloto apagado', async () => {
    vi.stubEnv('BIBLIOTECA_LIBRARY_BETA_ENABLED', 'false');
    vi.stubEnv('BIBLIOTECA_LIBRARY_COMMERCIAL_ENABLED', 'true');
    expect((await post()).status).toBe(200);
    expect(harness.write).toHaveBeenCalledWith(expect.anything(), 'verified-google-uid', expect.objectContaining({ action: 'create' }), expect.anything());
  });
  it('se mantiene cerrado si la beta no está activada', async () => {
    vi.stubEnv('BIBLIOTECA_LIBRARY_BETA_ENABLED', 'false');
    expect((await post()).status).toBe(503);
    expect(harness.verify).not.toHaveBeenCalled();
    expect(harness.write).not.toHaveBeenCalled();
  });
  it('rechaza token ausente, revocado o de un proveedor distinto de Google', async () => {
    expect((await post(input, { Authorization: '' })).status).toBe(401);
    harness.verify.mockRejectedValueOnce(new Error('token revocado'));
    expect((await post()).status).toBe(401);
    harness.verify.mockResolvedValueOnce({ uid: 'anonymous', firebase: { sign_in_provider: 'anonymous' } });
    expect((await post()).status).toBe(401);
    harness.verify.mockResolvedValueOnce({ uid: 'password-user', firebase: { sign_in_provider: 'password' } });
    expect((await post()).status).toBe(401);
    expect(harness.write).not.toHaveBeenCalled();
  });
  it('rechaza un origen ajeno antes de consultar la cuenta', async () => {
    expect((await post(input, { Origin: 'https://outside.example' })).status).toBe(403);
    expect(harness.verify).not.toHaveBeenCalled();
    expect(harness.write).not.toHaveBeenCalled();
  });
  it('usa el UID verificado y la identidad del servidor, sin confiar en source del cliente', async () => {
    const response = await post({ ...input, source: 'chatgpt' });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(harness.verify).toHaveBeenCalledWith('fixture-token', true);
    expect(harness.write).toHaveBeenCalledWith(expect.anything(), 'verified-google-uid', { ...input, source: 'web' }, {
      authorName: 'Cuenta Google', authorAvatar: 'https://example.com/avatar.png', authorHandle: 'cuenta-google',
    });
  });
  it('descarta identidad, propietario, reacciones y fechas enviados dentro del prompt', async () => {
    const response = await post({ ...input, prompt: { ...input.prompt,
      userId: 'victim', authorName: 'Impostor', likedBy: ['victim'], likesCount: 900,
      createdAt: { seconds: 0 }, updatedAt: { seconds: 0 }, revision: 900,
      feedbackStatus: 'approved', feedbackComments: [{ authorName: 'Profesor falso', text: 'Aprobado' }],
    } });
    expect(response.status).toBe(200);
    expect(harness.write.mock.calls[0][2]).toEqual({ ...input, source: 'web' });
  });
  it('informa el límite de plan sin filtrar datos privados ni intentar una segunda escritura', async () => {
    harness.write.mockRejectedValueOnce(new LibraryAccessError('prompt_limit'));
    const response = await post();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: 'prompt_limit' });
    expect(harness.write).toHaveBeenCalledTimes(1);
  });
  it('rechaza UID suplantado en la envoltura y métodos de lectura', async () => {
    expect((await post({ ...input, uid: 'victim' })).status).toBe(400);
    expect((await invoke('GET')).status).toBe(405);
    expect(harness.write).not.toHaveBeenCalled();
  });
});
