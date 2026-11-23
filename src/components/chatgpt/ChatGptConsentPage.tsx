import { useEffect, useState } from 'react';
import { getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, type User } from 'firebase/auth';
import { BookOpen } from 'lucide-react';
import { auth } from '../../firebase';

const scopeText = {
  'library:read': 'Consultar los prompts guardados en tu biblioteca personal.',
  'library:write': 'Guardar prompts en tu biblioteca cuando lo confirmes en Biblioteca.',
} as const;
type Scope = keyof typeof scopeText;
const interactionIdPattern = /^[A-Za-z0-9_-]{21,128}$/;

function interactionPath() {
  const id = new URLSearchParams(window.location.search).get('interaction');
  return id && interactionIdPattern.test(id) ? `/api/biblioteca-oauth/interaction/${id}` : null;
}

export default function ChatGptConsentPage() {
  const [path] = useState(interactionPath);
  const [scopes, setScopes] = useState<Scope[] | null>(null);
  const [account, setAccount] = useState<User | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(!path);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setAccount(user && !user.isAnonymous ? user : null);
      setLoadingAccount(false);
    });
    void getRedirectResult(auth).catch(() => setError('No se pudo completar el acceso a Google. Puedes intentarlo de nuevo.'));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!path) return;
    const request = new AbortController();
    void fetch(path, { headers: { Accept: 'application/json' }, signal: request.signal }).then(async response => {
      if (!response.ok) throw new Error('interaction_unavailable');
      const data = await response.json() as { scopes?: unknown };
      if (!Array.isArray(data.scopes)) throw new Error('invalid_scopes');
      const allowedScopes = data.scopes.filter((scope): scope is Scope => typeof scope === 'string' && Object.hasOwn(scopeText, scope));
      if (!allowedScopes.length) throw new Error('invalid_scopes');
      setScopes(allowedScopes);
    }).catch(() => { if (!request.signal.aborted) setExpired(true); });
    return () => request.abort();
  }, [path]);

  async function signIn() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    setError('');
    setPending(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (cause) {
      if (typeof cause === 'object' && cause && 'code' in cause && cause.code === 'auth/popup-blocked') {
        try { await signInWithRedirect(auth, provider); return; } catch { /* Offer another attempt. */ }
      }
      setError('No se pudo completar el acceso a Google. Puedes intentarlo de nuevo.');
    } finally {
      setPending(false);
    }
  }

  async function resolve(allow: boolean) {
    if (!path || pending || (allow && !account)) return;
    setError('');
    setPending(true);
    try {
      const token = allow ? await account?.getIdToken() : undefined;
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ allow }),
      });
      if (response.status === 404) { setExpired(true); return; }
      if (response.status === 401) { setError('Vuelve a elegir tu cuenta de Google antes de conectar.'); return; }
      if (!response.ok) throw new Error('resolve_failed');
      const data = await response.json() as { nextLocation?: string };
      if (typeof data.nextLocation !== 'string' || !data.nextLocation.startsWith('/api/biblioteca-oauth/')) {
        throw new Error('invalid_next_location');
      }
      window.location.assign(data.nextLocation);
    } catch {
      setError('No pudimos completar la conexión. Vuelve a intentarlo.');
    } finally {
      setPending(false);
    }
  }

  return <main className="min-h-screen bg-slate-50 px-5 py-16 text-slate-900">
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-5 flex items-center gap-3 font-semibold"><span className="rounded-xl bg-blue-600 p-2 text-white"><BookOpen size={21} aria-hidden="true" /></span>Biblioteca</div>
      <h1 className="text-2xl font-semibold tracking-tight">Conecta tu biblioteca con ChatGPT</h1>
      {expired ? <p className="mt-4 text-slate-600" role="status">Esta solicitud ya no está disponible. Vuelve a ChatGPT y abre Biblioteca para iniciar otra.</p>
        : !scopes || loadingAccount ? <p className="mt-4 text-slate-600" role="status">Comprobando la solicitud…</p>
        : <>
          <p className="mt-4 text-slate-600">Al conectar tu cuenta, Biblioteca en ChatGPT tendrá estos permisos:</p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {scopes.map(scope => <li key={scope}>{scopeText[scope]}</li>)}
          </ul>
          {account && <p className="mt-5 break-words text-slate-700">Cuenta de Biblioteca: <strong>{account.email || account.displayName || 'Google'}</strong></p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-60" disabled={pending} onClick={() => void (account ? resolve(true) : signIn())}>{account ? 'Conectar con ChatGPT' : 'Entrar con Google'}</button>
            {account && <button type="button" className="rounded-lg border border-slate-300 px-4 py-3 font-semibold" disabled={pending} onClick={() => void signIn()}>Cambiar cuenta</button>}
            <button type="button" className="rounded-lg px-4 py-3 font-semibold text-slate-700" disabled={pending} onClick={() => void resolve(false)}>Cancelar</button>
          </div>
        </>}
      {error && <p className="mt-4 text-sm font-medium text-rose-800" role="alert">{error}</p>}
    </div>
  </main>;
}
