import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prompt } from '../src/types';

const harness = vi.hoisted(() => ({ rows: [] as unknown[], stateIndex: 0, refs: [] as { current: unknown }[],
  effects: [] as (() => unknown)[], setRows: vi.fn(), setLoading: vi.fn(), onSnapshot: vi.fn(),
  updatePrompt: vi.fn(), callback: undefined as undefined | ((snapshot: unknown) => void) }));
vi.mock('react', () => ({
  useState: () => harness.stateIndex++ === 0 ? [harness.rows, harness.setRows] : [false, harness.setLoading],
  useRef: (value: unknown) => { const ref = { current: value }; harness.refs.push(ref); return ref; },
  useEffect: (callback: () => unknown) => { harness.effects.push(callback); },
}));
vi.mock('../src/firebase', () => ({ db: {}, handleFirestoreError: vi.fn(), OperationType: {} }));
vi.mock('firebase/firestore', () => ({ collection: vi.fn(), query: vi.fn(), where: vi.fn(), onSnapshot: harness.onSnapshot }));
vi.mock('../src/services/firestore/promptsService', () => ({ updatePrompt: harness.updatePrompt,
  archivePromptVersion: vi.fn(), createPrompt: vi.fn(), deletePrompt: vi.fn(), importPromptsFromJSON: vi.fn(),
  seedPromptsForUser: vi.fn(), togglePromptFavorite: vi.fn() }));
import { usePromptLibrary } from '../src/hooks/usePromptLibrary';

const privatePrompt = { id: 'private-a', userId: 'account-a', title: 'Solo cuenta A', promptText: 'Contenido privado',
  createdAt: null, updatedAt: null, tags: [], category: 'General', isShared: false } as unknown as Prompt;
function render(uid: string | null, editingPrompt: Prompt | null = null) {
  harness.stateIndex = 0;
  const onNotification = vi.fn(), closeForm = vi.fn(), clearEditor = vi.fn();
  return { ...usePromptLibrary({ user: uid ? { uid } as never : null, editingPrompt,
    setEditingPrompt: clearEditor, setShowFormModal: closeForm,
    getAuthorIdentity: () => ({ authorName: uid || '', authorHandle: '', authorAvatar: '' }), onNotification }),
    onNotification, closeForm, clearEditor };
}
beforeEach(() => {
  vi.clearAllMocks(); harness.rows = [privatePrompt]; harness.refs = []; harness.effects = [];
  harness.onSnapshot.mockImplementation((_query, callback) => { harness.callback = callback; return vi.fn(); });
});

describe('private library account boundaries', () => {
  it('hides cached prompts immediately for a different account or visitor, including export inputs', () => {
    expect(render('account-a').prompts).toEqual([privatePrompt]);
    expect(render('account-b').prompts).toEqual([]);
    expect(render(null).prompts).toEqual([]);
  });

  it('ignores an old Firestore stream after the account changes before cleanup', () => {
    render('account-a'); harness.effects[0](); harness.setRows.mockClear(); harness.setLoading.mockClear();
    harness.refs[0].current = 'account-b';
    harness.callback?.({ docs: [{ id: 'private-a', data: () => privatePrompt }] });
    expect(harness.setRows).not.toHaveBeenCalled();
    expect(harness.setLoading).not.toHaveBeenCalled();
  });

  it('does not close the new account editor when an earlier account save finishes', async () => {
    let complete!: () => void;
    harness.updatePrompt.mockReturnValueOnce(new Promise<void>(resolve => { complete = resolve; }));
    const library = render('account-a', privatePrompt);
    const save = library.handleSavePrompt(privatePrompt);
    harness.refs[0].current = 'account-b'; complete(); await save;
    expect(library.onNotification).not.toHaveBeenCalled();
    expect(library.closeForm).not.toHaveBeenCalled();
    expect(library.clearEditor).not.toHaveBeenCalled();
  });
});
