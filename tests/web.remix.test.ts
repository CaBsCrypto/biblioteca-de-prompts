import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prompt } from '../src/types';

const firestore = vi.hoisted(() => ({
  addDoc: vi.fn(), getDocs: vi.fn(), collection: vi.fn(() => 'prompts'), query: vi.fn(() => 'own-prompts'),
  where: vi.fn(), serverTimestamp: vi.fn(() => 'server-time'), onSnapshot: vi.fn(() => vi.fn()),
}));
const hookRefs = vi.hoisted(() => [] as { current: unknown }[]);
vi.mock('react', () => ({ useEffect: vi.fn(), useRef: (value: unknown) => {
  const ref = { current: value }; hookRefs.push(ref); return ref;
}, useState: (value: unknown) => [value, vi.fn()] }));
vi.mock('../src/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({ ...firestore, arrayRemove: vi.fn(), arrayUnion: vi.fn(), deleteDoc: vi.fn(), doc: vi.fn(), increment: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn() }));
import { useCommunity } from '../src/hooks/useCommunity';

const source = {
  id: 'catalog-publication', userId: 'creator', title: 'Documentar código', description: 'Recurso revisado',
  promptText: 'Documenta {{codigo}}.\n$& <script>texto literal</script>', category: 'Programación', tags: ['código'],
  isShared: false, notas: 'CC BY 4.0 · publicación catalog-publication · versión approved-1',
  forkedFromPromptId: 'original-private-id', forkedFromUserId: 'creator', forkedFromAuthorName: 'Autora original',
  forkedFromAuthorHandle: 'autora', forkedFromTitle: 'Original revisado',
  suggestedVariables: [{ name: 'codigo', description: 'Código' }],
} as unknown as Prompt;

function controller(prompts: Prompt[] = [], loggedIn = true) {
  const onOpenEdit = vi.fn();
  const onNotification = vi.fn();
  return { ...useCommunity({ user: loggedIn ? { uid: 'reader' } as never : null, prompts,
    setCurrentTab: vi.fn(), setLoadingPrompts: vi.fn(), onOpenEdit,
    getAuthorIdentity: () => ({ authorName: 'Lector', authorAvatar: '', authorHandle: 'lector' }), onNotification }),
    onOpenEdit, onNotification };
}

beforeEach(() => {
  vi.clearAllMocks();
  hookRefs.length = 0;
  firestore.getDocs.mockResolvedValue({ docs: [] });
  firestore.addDoc.mockResolvedValue({ id: 'new-private-remix' });
});

describe('compact web preserves private remix saves', () => {
  it('confirms only a completed write and retains source, version, license and exact variables', async () => {
    const actions = controller();
    expect(await actions.handleForkPrompt(source)).toBe(true);
    expect(firestore.addDoc).toHaveBeenCalledOnce();
    const saved = firestore.addDoc.mock.calls[0][1];
    expect(saved).toMatchObject({ userId: 'reader', isShared: false, promptText: source.promptText,
      notas: source.notas, forkedFromPromptId: 'original-private-id', forkedFromUserId: 'creator',
      forkedFromAuthorName: 'Autora original', forkedFromAuthorHandle: 'autora', forkedFromTitle: 'Original revisado',
      suggestedVariables: source.suggestedVariables, authorName: 'Lector' });
    expect(actions.onOpenEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-private-remix', isShared: false }));
  });

  it('reopens an existing private remix instead of overwriting its edits or duplicating it', async () => {
    const existing = { ...source, id: 'existing', userId: 'reader', promptText: 'Mis cambios privados' };
    const actions = controller([existing]);
    expect(await actions.handleForkPrompt(source)).toBe(true);
    expect(firestore.addDoc).not.toHaveBeenCalled();
    expect(actions.onOpenEdit).toHaveBeenCalledWith(existing);
  });

  it('returns failure and keeps the detail open when the write fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    firestore.addDoc.mockRejectedValueOnce(new Error('offline'));
    const actions = controller();
    expect(await actions.handleForkPrompt(source)).toBe(false);
    expect(actions.onOpenEdit).not.toHaveBeenCalled();
    expect(actions.onNotification).not.toHaveBeenCalledWith(expect.any(String), 'success');
    error.mockRestore();
  });

  it('does not write or query private prompts without an authenticated user', async () => {
    expect(await controller([], false).handleForkPrompt(source)).toBe(false);
    expect(firestore.getDocs).not.toHaveBeenCalled();
    expect(firestore.addDoc).not.toHaveBeenCalled();
  });

  it('navigates only after saving and before opening the editable remix', async () => {
    const actions = controller();
    const navigate = vi.fn();
    expect(await actions.handleForkPrompt(source, { beforeOpen: navigate })).toBe(true);
    expect(firestore.addDoc.mock.invocationCallOrder[0]).toBeLessThan(navigate.mock.invocationCallOrder[0]);
    expect(navigate.mock.invocationCallOrder[0]).toBeLessThan(actions.onOpenEdit.mock.invocationCallOrder[0]);
  });

  it('does not create or display an old account remix if the account changes during the lookup', async () => {
    let finish!: (value: unknown) => void;
    firestore.getDocs.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const actions = controller();
    const operation = actions.handleForkPrompt(source);
    hookRefs[0].current = 'another-account';
    finish({ docs: [] });
    expect(await operation).toBe(false);
    expect(firestore.addDoc).not.toHaveBeenCalled();
    expect(actions.onOpenEdit).not.toHaveBeenCalled();
  });

  it('does not reopen private content if the account changes while its write completes', async () => {
    let finish!: (value: unknown) => void;
    firestore.addDoc.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const actions = controller();
    const navigate = vi.fn();
    const operation = actions.handleForkPrompt(source, { beforeOpen: navigate });
    await vi.waitFor(() => expect(firestore.addDoc).toHaveBeenCalledOnce());
    hookRefs[0].current = 'another-account';
    finish({ id: 'saved-for-original-account' });
    expect(await operation).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(actions.onOpenEdit).not.toHaveBeenCalled();
    expect(actions.onNotification).not.toHaveBeenCalledWith(expect.any(String), 'success');
  });
});
