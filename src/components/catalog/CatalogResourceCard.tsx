import React, { useEffect, useRef, useState } from 'react';
import { Check, Code2, Copy, Sparkles } from 'lucide-react';
import type { CatalogKind, CatalogMetadata } from '../../typesCatalog';
import { copyText, selectCopyText } from '../../utils/clipboard';

interface Props {
  resourceKey: string;
  kind: CatalogKind;
  metadata: CatalogMetadata;
  saved?: boolean;
  onOpen?: () => void;
  onAuthor?: () => void;
  loadCopyContent: () => Promise<string>;
  children?: React.ReactNode;
}

/** Metadata stays compact; a deliverable is requested only after an explicit copy. */
export default function CatalogResourceCard({ resourceKey, kind, metadata, saved, onOpen, onAuthor, loadCopyContent, children }: Props) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [manualText, setManualText] = useState<string | null>(null);
  const busyRef = useRef(false);
  const requestRef = useRef(0);
  const manualRef = useRef<HTMLTextAreaElement>(null);
  const titleId = React.useId();

  useEffect(() => {
    requestRef.current += 1;
    busyRef.current = false;
    setBusy(false); setCopied(false); setError(''); setManualText(null);
    return () => { requestRef.current += 1; };
  }, [resourceKey]);
  useEffect(() => { if (manualText !== null) selectCopyText(manualRef.current); }, [manualText]);

  async function copy() {
    if (busyRef.current) return;
    busyRef.current = true;
    const request = ++requestRef.current;
    setBusy(true); setCopied(false); setError(''); setManualText(null);
    try {
      const text = await loadCopyContent();
      if (request !== requestRef.current) return;
      const confirmed = await copyText(text);
      if (request !== requestRef.current) return;
      if (confirmed) setCopied(true);
      else setManualText(text);
    } catch (cause) {
      if (request === requestRef.current) setError(cause instanceof Error ? cause.message : 'No pudimos obtener el contenido. Vuelve a intentarlo.');
    } finally {
      if (request === requestRef.current) { busyRef.current = false; setBusy(false); }
    }
  }

  return <article className={`catalog-card catalog-card-${kind}`} aria-labelledby={titleId} aria-busy={busy}>
    <div className="catalog-card-top"><span className={`catalog-kind catalog-kind-${kind}`}>{kind === 'skill' ? <Code2 size={14} aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}{kind === 'skill' ? 'Skill' : 'Prompt'}</span><span className="catalog-category">{metadata.category}</span></div>
    <h2 id={titleId} className="catalog-card-heading">{metadata.title}</h2>
    <p className="catalog-card-summary">{metadata.summary}</p>
    <div className="catalog-card-byline">{onAuthor ? <button className="catalog-author" disabled={busy} onClick={onAuthor} aria-label={`Ver recursos de ${metadata.authorName || 'este creador'}`}>Por {metadata.authorName || 'Creador'}</button> : <span>Por {metadata.authorName || 'Creador'}</span>}{saved && <span className="catalog-saved-version">Versión guardada</span>}</div>
    <div className="catalog-card-actions">{onOpen && <button className="catalog-button" disabled={busy} onClick={onOpen}>Ver y preparar</button>}<button className="catalog-button catalog-copy-quick" disabled={busy} onClick={() => void copy()} aria-label={`${copied ? 'Copiado' : 'Copiar'} ${metadata.title}`}>{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{busy ? 'Obteniendo…' : copied ? 'Copiado' : 'Copiar'}</button>{children}</div>
    <div className="catalog-action-status" role="status" aria-live="polite">{copied && 'Contenido copiado.'}</div>
    {error && <div className="catalog-error" role="alert">{error}</div>}
    {manualText !== null && <div className="catalog-copy-fallback"><label><span>El navegador bloqueó la copia. El texto está seleccionado; pulsa Ctrl+C o ⌘C, o usa Copiar en tu dispositivo.</span><textarea ref={manualRef} readOnly rows={4} value={manualText} aria-label={`Contenido de ${metadata.title} para copiar manualmente`} onFocus={event => event.currentTarget.select()} /></label><button className="catalog-link" onClick={() => setManualText(null)}>Cerrar texto para copiar</button></div>}
  </article>;
}
