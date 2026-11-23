import { useEffect, useRef, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { ArrowRight, Check, Lock } from 'lucide-react';
import { auth, googleProvider } from '../../firebase';
import { useAuthProfile } from '../../hooks/useAuthProfile';
import { decryptGuestDraft, parseTransferSecret, transferFragment, type GuestDraft, type TransferSecret } from './draftHandoffCrypto';
import { claimGuestTransfer, previewGuestTransfer } from './guestTransferApi';

const pendingSignInStorage = 'biblioteca:prompt-transfer-sign-in';
const signInLimit = 15 * 60_000;
const libraryHref = '/?section=mi-biblioteca&tab=prompts';

type ClaimView = { uid: string } & (
  | { kind: 'loading' }
  | { kind: 'ready'; draft: GuestDraft }
  | { kind: 'saved' }
  | { kind: 'error'; message: string }
);

function initialSecret(): TransferSecret | null {
  if (window.location.hash) return parseTransferSecret(window.location.hash);
  try {
    const raw = sessionStorage.getItem(pendingSignInStorage);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return typeof data.retireAt === 'number' && data.retireAt > Date.now() && typeof data.fragment === 'string'
      ? parseTransferSecret(data.fragment) : null;
  } catch {
    return null;
  }
}

function clearSignInStorage() {
  try { sessionStorage.removeItem(pendingSignInStorage); } catch { /* Browser storage is optional. */ }
}

const afterSignOut = () => {};

export function GuestPromptClaim() {
  const [secret] = useState(initialSecret);
  const [view, setView] = useState<ClaimView | null>(null);
  const [retry, setRetry] = useState(0);
  const [claimBusy, setClaimBusy] = useState(false);
  const [signInBusy, setSignInBusy] = useState(false);
  const [actionError, setActionError] = useState<{ uid?: string; message: string } | null>(null);
  const takingAction = useRef(false);
  const transferring = useRef(false);
  const { user, authLoading } = useAuthProfile({
    onAfterSignOut: afterSignOut,
    onNotification: (_message, type) => {
      if (type === 'info') setActionError({ message: 'No pudimos iniciar sesión con Google. Inténtalo de nuevo en este dispositivo.' });
    },
  });

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
      clearSignInStorage();
    } else if (!secret) clearSignInStorage();
  }, [secret]);

  useEffect(() => {
    if (!user || !secret) return;
    clearSignInStorage();
    const controller = new AbortController();
    const uid = user.uid;
    const isCurrent = () => !controller.signal.aborted && auth.currentUser?.uid === uid;
    setView({ uid, kind: 'loading' });
    void user.getIdToken().then(async token => {
      if (!isCurrent()) return;
      const result = await previewGuestTransfer(secret.code, token, controller.signal);
      if (!isCurrent()) return;
      if ('promptId' in result) {
        setView({ uid, kind: 'saved' });
        return;
      }
      const draft = await decryptGuestDraft(result.envelope, secret).catch(() => {
        throw new Error('No pudimos leer el borrador. Abre el enlace completo o vuelve a escanear el QR.');
      });
      if (isCurrent()) setView({ uid, kind: 'ready', draft });
    }).catch(error => {
      if (isCurrent()) setView({ uid, kind: 'error', message: error instanceof Error ? error.message : 'No pudimos abrir el borrador.' });
    });
    return () => controller.abort();
  }, [retry, secret, user]);

  const visible = user?.uid === view?.uid ? view : null;

  async function startGoogleSignIn() {
    if (!secret || takingAction.current) return;
    takingAction.current = true;
    setActionError(null);
    setSignInBusy(true);
    try {
      if (!auth.emulatorConfig) {
        try {
          await signInWithPopup(auth, googleProvider);
          return;
        } catch (error) {
          if (!(error instanceof FirebaseError) || error.code !== 'auth/popup-blocked') throw error;
        }
      }

      try {
        sessionStorage.setItem(pendingSignInStorage, JSON.stringify({ fragment: transferFragment(secret), retireAt: Date.now() + signInLimit }));
      } catch {
        setActionError({ message: 'Este navegador no puede conservar el enlace durante el acceso. Inicia sesión en Biblioteca y vuelve a escanear el QR.' });
        return;
      }
      await signInWithRedirect(auth, googleProvider);
    } catch {
      setActionError({ message: 'No pudimos iniciar sesión con Google. Inténtalo de nuevo en este dispositivo.' });
    } finally {
      clearSignInStorage();
      takingAction.current = false;
      setSignInBusy(false);
    }
  }

  async function saveDraft() {
    if (!user || !secret || visible?.kind !== 'ready' || transferring.current || auth.currentUser?.uid !== user.uid) return;
    const uid = user.uid;
    transferring.current = true;
    setClaimBusy(true);
    setActionError(null);
    try {
      const token = await user.getIdToken();
      if (auth.currentUser?.uid !== uid) return;
      await claimGuestTransfer(secret.code, secret.key, token);
      if (auth.currentUser?.uid === uid) setView({ uid, kind: 'saved' });
    } catch (error) {
      if (auth.currentUser?.uid !== uid) return;
      setActionError({ uid, message: error instanceof Error ? error.message : 'No pudimos guardar el borrador. Vuelve a intentarlo.' });
    } finally {
      setClaimBusy(false);
      transferring.current = false;
    }
  }

  if (!secret) return <section className="guest-panel guest-claim"><h2>Abre el enlace completo</h2><p>Vuelve a escanear el QR o pega el enlace del borrador. Si ya venció, genera uno nuevo.</p><a href="/crear" className="guest-button">Ir al editor <ArrowRight size={16} aria-hidden="true" /></a></section>;

  return <section className="guest-panel guest-claim" aria-live="polite">
    {authLoading ? <p role="status">Comprobando tu sesión…</p>
      : !user ? <>
        <h2><Lock size={20} aria-hidden="true" /> Continúa en tu cuenta</h2>
        <p>Entra con Google para revisar el borrador antes de guardarlo en tu biblioteca privada.</p>
        <button type="button" className="guest-button guest-primary" disabled={signInBusy} onClick={() => void startGoogleSignIn()}>{signInBusy ? 'Abriendo Google…' : 'Continuar con Google'}</button>
        {actionError && !actionError.uid && <p role="alert" className="guest-error">{actionError.message} <a href={libraryHref}>Ir a Mi Biblioteca</a></p>}
      </> : !visible || visible.kind === 'loading' ? <p role="status">Cargando la vista previa…</p>
      : visible.kind === 'saved' ? <>
        <h2><Check size={20} aria-hidden="true" /> Guardado en Mi Biblioteca</h2>
        <p>Encontrarás el borrador en tu biblioteca privada.</p>
        <a href={libraryHref} className="guest-button guest-primary">Abrir Mi Biblioteca <ArrowRight size={16} aria-hidden="true" /></a>
      </> : visible.kind === 'error' ? <>
        <p role="alert" className="guest-error">{visible.message}</p>
        <button type="button" className="guest-button" onClick={() => setRetry(value => value + 1)}>Volver a intentar</button>
      </> : <>
        <p className="guest-muted">Guardarás este borrador en la cuenta de {user.email || user.displayName || 'Google que está conectada'}.</p>
        <h2>{visible.draft.title}</h2>
        <pre className="guest-preview-text">{visible.draft.promptText}</pre>
        <button type="button" className="guest-button guest-primary" disabled={claimBusy} onClick={() => void saveDraft()}>{claimBusy ? 'Guardando…' : 'Guardar en Mi Biblioteca'}</button>
        {actionError?.uid === user.uid && <p role="alert" className="guest-error">{actionError.message}</p>}
      </>}
  </section>;
}
