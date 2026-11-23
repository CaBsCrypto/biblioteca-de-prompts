import { useEffect, useId, useRef, useState } from 'react';
import { Copy, QrCode } from 'lucide-react';
import { copyText, selectCopyText } from '../../utils/clipboard';
import { extractPromptVariables, fillPromptVariables } from '../../utils/promptPreparation';
import {
  DRAFT_TEXT_LIMIT, DRAFT_TITLE_LIMIT, encryptGuestDraft, isValidGuestDraft, transferFragment,
  type CreateDraftTransfer,
} from './draftHandoffCrypto';
import { GuestTransferUnavailableError } from './guestTransferApi';
import './guest-prompt.css';

const templates = [
  { title: 'Explicar código', promptText: 'Explica este código en {{lenguaje}} a una persona que está aprendiendo. Describe qué hace, qué datos recibe y qué devuelve. Añade un ejemplo breve de uso.\n\nCódigo:\n{{código}}' },
  { title: 'Resumir un texto', promptText: 'Resume el siguiente texto para {{audiencia}}. Destaca la idea principal y tres detalles clave. Distingue lo que dice el texto de lo que no se puede concluir.\n\nTexto:\n{{texto}}' },
  { title: 'Explorar ideas', promptText: 'Propón cinco ideas para resolver {{problema}}. Ten en cuenta {{restricciones}}. Indica qué necesitaría cada idea y cómo probarla en pequeño.' },
] as const;

type TransferLink = { url: string; expiresAt: number };

type Props = {
  claimOrigin: string;
  publishTransfer: (payload: CreateDraftTransfer) => Promise<{ expiresAt: number }>;
};

function TransferQr({ url }: { url: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    void import('qrcode').then(async qr => {
      if (!canvas.current || disposed) return;
      await qr.toCanvas(canvas.current, url, { errorCorrectionLevel: 'M', margin: 4, width: 208 });
      if (!disposed) setReady(true);
    }).catch(() => { /* The same transfer is available through its link. */ });
    return () => { disposed = true; };
  }, [url]);

  return <canvas ref={canvas} hidden={!ready} className="guest-transfer-qr" role="img" aria-label="Código QR para recuperar este borrador en otro dispositivo" />;
}

export function GuestPromptEditor({ claimOrigin, publishTransfer }: Props) {
  const id = useId();
  const [title, setTitle] = useState('');
  const [promptText, setPromptText] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<TransferLink | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [manualCopy, setManualCopy] = useState<{ text: string; label: string } | null>(null);
  const prepared = useRef<Awaited<ReturnType<typeof encryptGuestDraft>> | null>(null);
  const publishing = useRef(false);
  const manualField = useRef<HTMLTextAreaElement>(null);
  const variables = extractPromptVariables(promptText);
  const preview = fillPromptVariables(promptText, values);

  useEffect(() => { if (manualCopy) selectCopyText(manualField.current); }, [manualCopy]);

  useEffect(() => {
    if (!link) return;
    const timer = globalThis.setTimeout(() => {
      setLink(null);
      setManualCopy(null);
      setMessage('El enlace venció. Puedes generar otro desde el borrador.');
      prepared.current = null;
    }, Math.max(0, link.expiresAt - Date.now()));
    return () => globalThis.clearTimeout(timer);
  }, [link]);

  function resetTransfer() {
    prepared.current = null;
    setLink(null);
    setMessage('');
    setError('');
    setManualCopy(null);
  }

  function applyTemplate(template: typeof templates[number]) {
    const next = promptText.trim() ? `${promptText}\n\n${template.promptText}` : template.promptText;
    if (next.length > DRAFT_TEXT_LIMIT) {
      setError('Acorta el texto antes de añadir otra plantilla.');
      return;
    }
    resetTransfer();
    if (!title.trim()) setTitle(template.title);
    setPromptText(next);
  }

  async function copyWithFallback(text: string, label: string, confirmation: string) {
    setMessage('');
    setManualCopy(null);
    if (await copyText(text)) setMessage(confirmation);
    else setManualCopy({ text, label });
  }

  async function sendToDevice() {
    if (publishing.current || !isValidGuestDraft({ title, promptText })) return;
    publishing.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    setManualCopy(null);
    try {
      const transfer = prepared.current ?? await encryptGuestDraft({ title, promptText });
      prepared.current = transfer;
      const { expiresAt } = await publishTransfer(transfer.request);
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        prepared.current = null;
        throw new Error('El enlace venció. Genera uno nuevo.');
      }
      const url = new URL('/recibir', claimOrigin);
      url.hash = transferFragment(transfer.secret);
      setLink({ url: url.href, expiresAt });
      setMessage('Enlace listo para abrir en tu dispositivo.');
    } catch (failure) {
      if (failure instanceof GuestTransferUnavailableError) prepared.current = null;
      setError(failure instanceof Error ? failure.message : 'No se pudo generar el enlace. Vuelve a intentarlo.');
    } finally {
      publishing.current = false;
      setBusy(false);
    }
  }

  return <form className="guest-editor" onSubmit={event => { event.preventDefault(); void sendToDevice(); }}>
    <div className="guest-editor-grid">
      <section className="guest-panel guest-draft-panel" aria-labelledby={`${id}-draft`}>
        <h2 id={`${id}-draft`}>Borrador</h2>
        <fieldset className="guest-templates" disabled={busy}>
          <legend>Añadir una plantilla</legend>
          <div className="guest-template-list">{templates.map(template => <button type="button" className="guest-chip" key={template.title} onClick={() => applyTemplate(template)}>{template.title}</button>)}</div>
        </fieldset>
        <label htmlFor={`${id}-title`}>Título</label>
        <input id={`${id}-title`} placeholder="Por ejemplo, explicar una función" value={title} maxLength={DRAFT_TITLE_LIMIT} disabled={busy} autoComplete="off" onChange={event => { resetTransfer(); setTitle(event.target.value); }} />
        <label htmlFor={`${id}-prompt`}>Prompt</label>
        <textarea id={`${id}-prompt`} rows={8} placeholder="Describe la tarea y el resultado que necesitas…" value={promptText} maxLength={DRAFT_TEXT_LIMIT} autoComplete="off" disabled={busy} onChange={event => { resetTransfer(); setPromptText(event.target.value); }} />
        <p className="guest-muted">Usa <code>{'{{variable}}'}</code> para marcar algo que quieras rellenar después.</p>
      </section>

      <section className="guest-panel guest-preview-panel" aria-labelledby={`${id}-preview`}>
        <h2 id={`${id}-preview`}>Vista previa</h2>
        {variables.length > 0 && <fieldset className="guest-variables">
          <legend>Valores de ejemplo</legend>
          <div className="guest-variable-list">{variables.map((variable, index) => <div key={variable}>
            <label htmlFor={`${id}-value-${index}`}>{variable}</label>
            <input id={`${id}-value-${index}`} autoComplete="off" value={Object.hasOwn(values, variable) ? values[variable] : ''} onChange={event => setValues(previous => ({ ...previous, [variable]: event.target.value }))} />
          </div>)}</div>
        </fieldset>}
        {preview.trim() ? <pre className="guest-preview-text">{preview}</pre> : <p className="guest-preview-text guest-empty-preview">Escribe un prompt para ver cómo quedará.</p>}
        <div className="guest-actions">
          <button type="button" className="guest-button" disabled={!preview.trim()} onClick={() => void copyWithFallback(preview, 'Prompt preparado', 'Prompt copiado.')}><Copy size={16} aria-hidden="true" /> Copiar prompt</button>
          <button type="submit" className="guest-button guest-primary" disabled={busy || Boolean(link) || !isValidGuestDraft({ title, promptText })}><QrCode size={16} aria-hidden="true" /> {busy ? 'Generando enlace…' : 'Enviar a mi dispositivo'}</button>
        </div>
        {variables.length > 0 && <p className="guest-muted">El enlace conserva la plantilla. Los valores de ejemplo solo se aplican al copiar.</p>}
      </section>
    </div>

    {error && <p className="guest-feedback guest-error" role="alert">{error}</p>}
    {link && <section className="guest-panel guest-transfer" aria-labelledby={`${id}-transfer`}>
      <TransferQr key={link.url} url={link.url} />
      <div>
        <h2 id={`${id}-transfer`}>Abre el borrador en tu dispositivo</h2>
        <p>Escanea el QR o abre el enlace en un dispositivo de confianza. Vence a las {new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(link.expiresAt)}. Quien tenga el enlace puede reclamar el borrador.</p>
        <button type="button" className="guest-button" onClick={() => void copyWithFallback(link.url, 'Enlace del borrador', 'Enlace copiado.')}><Copy size={16} aria-hidden="true" /> Copiar enlace</button>
      </div>
    </section>}
    {manualCopy && <label className="guest-panel guest-manual-copy">{manualCopy.label}<span className="guest-muted">El navegador no pudo copiarlo. Copia el texto seleccionado.</span><textarea ref={manualField} rows={2} value={manualCopy.text} readOnly /></label>}
    {message && <p className="guest-feedback" role="status">{message}</p>}
  </form>;
}
