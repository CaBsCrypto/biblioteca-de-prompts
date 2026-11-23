import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Copy } from 'lucide-react';
import { useAuthProfile } from '../../hooks/useAuthProfile';
import { copyText } from '../../utils/clipboard';
import './billing.css';

interface Access {
  tier: 'free' | 'pro';
  canRead: boolean;
  canMutate: boolean;
  betaExpiresAt?: string;
  proExpiresAt?: string;
}
interface BillingStatus {
  access: Access;
  sandbox: boolean;
  checkoutReady: boolean;
  codeRedemptionAvailable: boolean;
  codeIssuanceAvailable: boolean;
  isFounder: boolean;
  subscription?: { status: string | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean };
}
interface IssuedCode {
  id: string;
  durationDays: number;
  createdAt: string;
  redeemBy: string;
  redeemed: boolean;
  revoked: boolean;
  grantExpiresAt?: string;
}
const afterSignOut = () => {};
const noop = () => {};
const dateLabel = (value: string) => new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Santiago',
}).format(new Date(value));

export default function BillingPage() {
  const { user, authLoading, signingIn, signInError, handleSignIn } = useAuthProfile({
    onAfterSignOut: afterSignOut, onNotification: noop,
  });
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [issued, setIssued] = useState<{ code: string; durationDays: number; redeemBy: string } | null>(null);
  const [durationDays, setDurationDays] = useState(30);
  const accountRef = useRef(user?.uid);
  accountRef.current = user?.uid;
  const actionRef = useRef(false);
  const monthlyRequest = useRef(crypto.randomUUID());
  const prepaidRequest = useRef(crypto.randomUUID());
  const issueRequest = useRef(crypto.randomUUID());
  const shownUid = useRef<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [codes, setCodes] = useState<IssuedCode[]>([]);
  const [codeRevision, setCodeRevision] = useState(0);

  useEffect(() => {
    shownUid.current = null;
    setStatus(null); setIssued(null); setCode(''); setError(''); setCopied(false);
    if (!user) return;
    const uid = user.uid;
    const controller = new AbortController();
    setLoading(true);
    void user.getIdToken().then(async token => {
      if (controller.signal.aborted || accountRef.current !== uid) return;
      const response = await fetch('/api/billing/status', { signal: controller.signal, headers: { Authorization: 'Bearer ' + token } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'No pudimos consultar tu acceso.');
      if (!controller.signal.aborted && accountRef.current === uid) {
        shownUid.current = uid;
        setStatus(body as BillingStatus);
      }
    }).catch(cause => {
      if (!controller.signal.aborted && accountRef.current === uid) setError(cause instanceof Error ? cause.message : 'No pudimos consultar tu acceso.');
    }).finally(() => { if (!controller.signal.aborted && accountRef.current === uid) setLoading(false); });
    return () => controller.abort();
  }, [user, revision]);

  useEffect(() => {
    setCodes([]);
    if (!user || !status?.isFounder || user.uid !== shownUid.current) return;
    const uid = user.uid;
    const controller = new AbortController();
    void user.getIdToken().then(async token => {
      const response = await fetch('/api/billing/founder/codes', { signal: controller.signal, headers: { Authorization: 'Bearer ' + token } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'No pudimos consultar los códigos.');
      if (!controller.signal.aborted && accountRef.current === uid) setCodes(body.codes as IssuedCode[]);
    }).catch(cause => {
      if (!controller.signal.aborted && accountRef.current === uid) setError(cause instanceof Error ? cause.message : 'No pudimos consultar los códigos.');
    });
    return () => controller.abort();
  }, [user, status?.isFounder, codeRevision]);

  async function action<T>(path: string, body: object, onSuccess: (data: T) => void) {
    if (!user || actionRef.current) return;
    const uid = user.uid;
    actionRef.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      const token = await user.getIdToken();
      if (accountRef.current !== uid) return;
      const response = await fetch('/api/billing/' + path, { method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No pudimos completar la operación.');
      if (accountRef.current === uid) onSuccess(data as T);
    } catch (cause) {
      if (accountRef.current === uid) setError(cause instanceof Error ? cause.message : 'No pudimos completar la operación.');
    } finally { actionRef.current = false; setBusy(false); }
  }

  const current = user?.uid === shownUid.current ? status : null;
  const canCheckout = Boolean(current?.checkoutReady && current.access.canRead && !busy);
  const accessDate = current?.access.tier === 'pro' ? current.access.proExpiresAt : current?.access.betaExpiresAt;

  return <div className="billing-page">
    <header className="billing-header">
      <a className="billing-brand" href="/"><BookOpen size={21} aria-hidden="true" />Biblioteca</a>
      <a href="/?section=mi-biblioteca">Mi Biblioteca</a>
    </header>
    <main className="billing-content">
      <h1>Tu acceso a Biblioteca</h1>
      <p className="billing-intro">Guarda tus prompts en la web y accede a ellos desde ChatGPT con tu cuenta conectada.</p>
      {!user ? <section className="billing-account">
        <p>Entra con Google para consultar tu acceso o canjear un código de acceso Pro.</p>
        <button className="billing-button billing-primary" disabled={authLoading || signingIn} onClick={() => void handleSignIn()}>
          {authLoading ? 'Comprobando tu sesión…' : signingIn ? 'Abriendo Google…' : 'Entrar con Google'}
        </button>
        {signInError && <p role="alert" className="billing-error">{signInError}</p>}
      </section> : <section className="billing-account">
        <p>Cuenta conectada <strong>{user.email || user.displayName}</strong></p>
        {loading && <p role="status">Consultando tu acceso…</p>}
        {current && <>
          <h2>{current.access.canRead ? current.access.tier === 'pro' ? 'Pro activo' : current.access.canMutate ? 'Prueba Gratis activa' : 'Tu prueba terminó' : 'Acceso por invitación'}</h2>
          {current.access.canRead ? <p>{accessDate ? `Acceso de escritura hasta el ${dateLabel(accessDate)}.` : 'Tu biblioteca permanece disponible para consulta.'} {current.access.canMutate ? '' : 'Puedes leer y exportar tus prompts guardados.'}</p>
            : <p>Esta beta requiere una invitación del fundador antes de activar el acceso.</p>}
          <button type="button" className="billing-text-button" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Actualizar estado</button>
          {current.subscription?.status && <button type="button" className="billing-button" disabled={busy || !current.checkoutReady}
            onClick={() => void action<{ url: string }>('portal', {}, data => { window.location.assign(data.url); })}>Gestionar suscripción de prueba</button>}
        </>}
      </section>}

      <p className="billing-test-note">Pagos en modo de prueba. Las opciones se habilitan cuando el entorno de pruebas está configurado.</p>
      <div className="billing-offers">
        <section className="billing-offer">
          <h2>Gratis</h2><p className="billing-price">US$0</p>
          <p>Hasta 3 prompts privados, con hasta 2.500 caracteres por prompt, durante tu acceso de prueba de 48 horas.</p>
        </section>
        <section className="billing-offer billing-pro">
          <h2>Pro</h2><p className="billing-price">US$2,99 <span>al mes</span></p>
          <p>Prompts privados sin límite de cantidad y hasta 10.000 caracteres por prompt.</p>
          <button type="button" className="billing-button billing-primary" disabled={!canCheckout} onClick={() => void action<{ checkoutUrl: string }>('checkout',
            { requestId: monthlyRequest.current, offer: 'monthly-card' }, data => { window.location.assign(data.checkoutUrl); })}>
            {busy ? 'Preparando…' : 'Pro mensual con tarjeta'}
          </button>
          <p className="billing-muted">Renovación automática. Puedes gestionar la cancelación desde tu cuenta.</p>
          <button type="button" className="billing-button" disabled={!canCheckout} onClick={() => void action<{ checkoutUrl: string }>('checkout',
            { requestId: prepaidRequest.current, offer: 'crypto-30-days' }, data => { window.location.assign(data.checkoutUrl); })}>Cripto por 30 días</button>
          <p className="billing-muted">Pago único de US$2,99. USDC compatible, según país y red. El total con impuestos se muestra antes de confirmar.</p>
        </section>
      </div>

      {user && current?.access.canRead && <section className="billing-code">
        <h2>¿Tienes un código de acceso?</h2>
        <form onSubmit={event => {
          event.preventDefault();
          void action<{ expiresAt: string }>('redeem', { code: code.trim() }, data => {
            setCode(''); setNotice(`Código canjeado. Acceso Pro hasta el ${dateLabel(data.expiresAt)}.`); setRevision(value => value + 1);
          });
        }}>
          <label htmlFor="billing-code">Código</label>
          <div className="billing-code-row">
            <input id="billing-code" value={code} maxLength={47} autoComplete="off" spellCheck={false} disabled={busy} onChange={event => setCode(event.target.value)} />
            <button className="billing-button" disabled={busy || !code.trim()}>Canjear código</button>
          </div>
        </form>
      </section>}

      {user && current?.isFounder && <section className="billing-code">
        <h2>Códigos del fundador</h2>
        <p>Un canje por código. Cada código concede acceso gratuito durante el periodo elegido, desde el momento de canjearlo.</p>
        <label htmlFor="billing-code-days">Días de acceso Pro</label>
        <input id="billing-code-days" type="number" min={1} max={365} value={durationDays} disabled={busy}
          onChange={event => { setDurationDays(Number(event.target.value)); issueRequest.current = crypto.randomUUID(); }} />
        <button type="button" className="billing-button" disabled={busy || !current.codeIssuanceAvailable || durationDays < 1 || durationDays > 365}
          onClick={() => void action<{ code: string; durationDays: number; redeemBy: string }>('founder/codes', { requestId: issueRequest.current, durationDays, redeemWithinDays: 7 }, data => {
            setIssued(data); setCopied(false); issueRequest.current = crypto.randomUUID(); setCodeRevision(value => value + 1);
          })}>Crear código de un solo uso</button>
        {issued && <div className="billing-issued">
          <p>Se puede canjear hasta el {dateLabel(issued.redeemBy)}.</p>
          <output>{issued.code}</output>
          <button type="button" className="billing-button" onClick={() => void copyText(issued.code).then(ok => {
            setCopied(ok); if (!ok) setError('Selecciona el código y cópialo manualmente.');
          })}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copiado' : 'Copiar código'}</button>
        </div>}
        {codes.length > 0 && <ul className="billing-code-list" aria-label="Últimos códigos emitidos">
          {codes.map(item => <li key={item.id}>
            <div>
              <strong>{item.durationDays} días Pro</strong>
              <span>{item.revoked ? 'Revocado' : item.redeemed ? 'Canjeado' : new Date(item.redeemBy).getTime() <= Date.now() ? 'Vencido' : 'Pendiente de canje'}</span>
              <small>Emitido el {dateLabel(item.createdAt)}. {item.grantExpiresAt ? `Acceso hasta el ${dateLabel(item.grantExpiresAt)}.` : `Canje hasta el ${dateLabel(item.redeemBy)}.`}</small>
            </div>
            {!item.revoked && <button type="button" className="billing-button" disabled={busy} onClick={() => void action('founder/codes/revoke', { id: item.id }, () => {
              setCodeRevision(value => value + 1); setNotice('Código revocado.');
            })}>Revocar código</button>}
          </li>)}
        </ul>}
      </section>}
      {notice && <p className="billing-notice" role="status">{notice}</p>}
      {error && <p className="billing-error" role="alert">{error}</p>}
    </main>
  </div>;
}
