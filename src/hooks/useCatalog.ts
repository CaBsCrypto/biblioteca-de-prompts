import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { db } from '../firebase';
import type { CatalogDraft, CatalogDraftInput, CatalogIdentity, CatalogPayload, CatalogResource, CatalogSubmission, SavedCatalogSkill } from '../typesCatalog';
import {
  approveCatalogSubmission, deleteCatalogDraft, fetchCatalogPayload, fetchCatalogResource, fetchOwnCatalogDrafts,
  fetchOwnCatalogResources, fetchOwnCatalogSubmissions, fetchPendingCatalogSubmissions, fetchPublishedCatalogResources,
  fetchPublishedResourceForSource, fetchSavedCatalogSkills, rejectCatalogSubmission, saveCatalogDraft,
  saveCatalogSkill, submitCatalogDraft, withdrawCatalogResource,
} from '../services/firestore/catalogService';

interface UseCatalogOptions {
  user: User | null;
  identity: CatalogIdentity;
  isFounder: boolean;
}

function errorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code === 'permission-denied') return 'No pudimos acceder al catálogo. Vuelve a intentarlo más tarde.';
  if (code === 'unavailable') return 'No hay conexión con la biblioteca. Comprueba tu conexión e inténtalo de nuevo.';
  if (code === 'failed-precondition') return 'El catálogo todavía se está preparando. Vuelve a intentarlo más tarde.';
  return error instanceof Error ? error.message : 'No se pudo completar la operación del catálogo.';
}

export function useCatalog({ user, identity, isFounder }: UseCatalogOptions) {
  const [resources, setResources] = useState<CatalogResource[]>([]);
  const [drafts, setDrafts] = useState<CatalogDraft[]>([]);
  const [submissions, setSubmissions] = useState<CatalogSubmission[]>([]);
  const [myResources, setMyResources] = useState<CatalogResource[]>([]);
  const [pending, setPending] = useState<CatalogSubmission[]>([]);
  const [savedSkills, setSavedSkills] = useState<SavedCatalogSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPrivate, setLoadingPrivate] = useState(false);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const activeMutations = useRef(0);
  const mounted = useRef(true);
  const uid = user?.uid;
  const accountUid = useRef(uid);
  accountUid.current = uid;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; requestId.current += 1; };
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setLoadingPrivate(Boolean(uid));
    setError(null);
    const privateReads = uid ? Promise.all([
      fetchOwnCatalogDrafts(db, uid), fetchOwnCatalogSubmissions(db, uid), fetchOwnCatalogResources(db, uid),
      fetchSavedCatalogSkills(db, uid), isFounder ? fetchPendingCatalogSubmissions(db) : Promise.resolve([] as CatalogSubmission[]),
    ]) : Promise.resolve([[], [], [], [], []] as [CatalogDraft[], CatalogSubmission[], CatalogResource[], SavedCatalogSkill[], CatalogSubmission[]]);
    const [publicResult, privateResult] = await Promise.allSettled([fetchPublishedCatalogResources(db), privateReads]);
    if (!mounted.current || currentRequest !== requestId.current) return;
    const failures: string[] = [];
    if (publicResult.status === 'fulfilled') setResources(publicResult.value);
    else failures.push('Catálogo: ' + errorMessage(publicResult.reason));
    if (privateResult.status === 'fulfilled') {
      const [nextDrafts, nextSubmissions, nextResources, nextSaved, nextPending] = privateResult.value;
      setDrafts(nextDrafts); setSubmissions(nextSubmissions); setMyResources(nextResources); setSavedSkills(nextSaved); setPending(nextPending);
    } else failures.push('Tu biblioteca de catálogo: ' + errorMessage(privateResult.reason));
    setError(failures.length ? failures.join('\n') : null);
    setLoading(false);
    setLoadingPrivate(false);
  }, [uid, isFounder]);

  useEffect(() => {
    // Account changes immediately discard private snapshots from the previous account.
    setDrafts([]); setSubmissions([]); setMyResources([]); setSavedSkills([]); setPending([]);
    void refresh();
    return () => { requestId.current += 1; };
  }, [refresh]);

  const requireUid = useCallback((): string => {
    if (!uid) throw new Error('Inicia sesión para usar tu biblioteca y publicar.');
    return uid;
  }, [uid]);

  const mutate = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    activeMutations.current += 1;
    setMutationBusy(true);
    setError(null);
    try {
      const result = await operation();
      if (mounted.current && accountUid.current === uid) await refresh();
      return result;
    } catch (failure) {
      if (mounted.current && accountUid.current === uid) setError(errorMessage(failure));
      throw failure;
    } finally {
      activeMutations.current -= 1;
      if (mounted.current) setMutationBusy(activeMutations.current > 0);
    }
  }, [refresh, uid]);

  const saveDraft = useCallback((input: CatalogDraftInput, id?: string) =>
    mutate(() => saveCatalogDraft(db, requireUid(), input, id)), [mutate, requireUid]);
  const deleteDraft = useCallback((draft: CatalogDraft) =>
    mutate(() => deleteCatalogDraft(db, requireUid(), draft)), [mutate, requireUid]);
  const submitDraft = useCallback((draft: CatalogDraft) =>
    mutate(() => submitCatalogDraft(db, requireUid(), draft)), [mutate, requireUid]);
  const approve = useCallback((submission: CatalogSubmission) => mutate(async () => {
    if (!isFounder) throw new Error('Solo el fundador puede aprobar publicaciones.');
    await approveCatalogSubmission(db, submission, requireUid());
  }), [mutate, isFounder, requireUid]);
  const reject = useCallback((submission: CatalogSubmission, reason: string) => mutate(async () => {
    if (!isFounder) throw new Error('Solo el fundador puede revisar publicaciones.');
    await rejectCatalogSubmission(db, submission, requireUid(), reason);
  }), [mutate, isFounder, requireUid]);
  const withdraw = useCallback((resource: CatalogResource) =>
    mutate(() => withdrawCatalogResource(db, resource, requireUid())), [mutate, requireUid]);
  const saveSkill = useCallback((resource: CatalogResource, payload: CatalogPayload) =>
    mutate(() => saveCatalogSkill(db, requireUid(), resource, payload)), [mutate, requireUid]);
  const fetchPayload = useCallback((resourceId: string) => fetchCatalogPayload(db, resourceId), []);
  const fetchResource = useCallback((resourceId: string) => fetchCatalogResource(db, resourceId), []);
  const resolveLegacyShare = useCallback(async (promptId: string) =>
    (await fetchPublishedResourceForSource(db, { promptId }))[0] ?? null, []);
  const resolveLegacyCollection = useCallback((folderId: string) =>
    fetchPublishedResourceForSource(db, { folderId }), []);

  return {
    resources, loading, error, drafts, submissions, myResources, pending, savedSkills, loadingPrivate, mutationBusy,
    isFounder, identity, refresh, saveDraft, deleteDraft, submitDraft, approve, reject, withdraw, saveSkill,
    fetchPayload, fetchResource, resolveLegacyShare, resolveLegacyCollection,
  };
}
