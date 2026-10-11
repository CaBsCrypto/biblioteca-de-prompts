import React, { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { Check, Copy, Download, ExternalLink, Library, Play, RefreshCw, X } from 'lucide-react';
import { Prompt } from '../../types';
import { CatalogPayload, CatalogResource } from '../../typesCatalog';
import { buildSkillRepositoryUrl, downloadSkill, toCatalogPrompt } from '../../utils/catalog';
import { CatalogDeliveryError, fetchCurrentCatalogDelivery } from '../../utils/catalogDelivery';
import { copyText, selectCopyText } from '../../utils/clipboard';
import { extractPromptVariables, fillPromptVariables } from '../../utils/promptPreparation';
import { catalogResourcePath } from '../../router/useAppRouter';
import { CatalogController, CatalogNotification, CatalogSamples, safeCatalogUrl } from './CatalogWorkspace';

interface Props {
  resource: CatalogResource | null;
  loading: boolean;
  error: string;
  catalog: CatalogController;
  user: User | null;
  onClose: () => void;
  onSignIn: () => void;
  onUsePrompt: (prompt: Prompt) => void;
  onSavePrompt: (prompt: Prompt) => void | Promise<void>;
  onNotify: CatalogNotification;
  onReloadResource?: () => void;
}

type DetailAction = 'original' | 'prepared' | 'link' | 'save' | 'download' | 'repository';

export default function CatalogDetail({ resource, loading, error, catalog, user, onClose, onSignIn, onSavePrompt, onNotify, onReloadResource }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const selectionKey = resource ? `${resource.id}:${resource.kind}:${resource.submissionId}` : '';
  const selectionRef = useRef(selectionKey);
  selectionRef.current = selectionKey;
  const accountRef = useRef(user?.uid);
  accountRef.current = user?.uid;
  const mountedRef = useRef(true);
  const epochRef = useRef(0);
  const busyRef = useRef(false);
  const variableInputs = useRef(new Map<string, HTMLTextAreaElement>());
  const pendingVariableFocus = useRef('');
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const [payload, setPayload] = useState<CatalogPayload | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState('');
  const [busyAction, setBusyAction] = useState<DetailAction | null>(null);
  const [copiedAction, setCopiedAction] = useState<DetailAction | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [missingVariables, setMissingVariables] = useState<string[]>([]);
  const [fallback, setFallback] = useState<{ text: string; label: string } | null>(null);
  const [verifiedRepositoryUrl, setVerifiedRepositoryUrl] = useState('');

  useEffect(() => {
    mountedRef.current = true;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const keyListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); }
      if (event.key !== 'Tab') return;
      const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),summary,[tabindex="0"]') || []).filter(element => element.getClientRects().length > 0);
      if (!elements.length) { event.preventDefault(); return; }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!dialogRef.current?.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyListener);
    return () => {
      mountedRef.current = false;
      epochRef.current += 1;
      document.removeEventListener('keydown', keyListener);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    const epoch = ++epochRef.current;
    let active = true;
    busyRef.current = false;
    pendingVariableFocus.current = '';
    setPayload(null); setContentError(''); setCopiedAction(null); setBusyAction(null);
    setValues({}); setPreparing(false); setMissingVariables([]); setFallback(null); setVerifiedRepositoryUrl(''); setActionMessage('');
    if (!resource) { setContentLoading(false); return; }
    dialogRef.current?.focus();
    setContentLoading(true);
    fetchCurrentCatalogDelivery(resource, catalog).then(result => {
      if (active && mountedRef.current && epochRef.current === epoch && selectionRef.current === selectionKey) setPayload(result.payload);
    }).catch(cause => {
      if (active && mountedRef.current && epochRef.current === epoch) setContentError(cause instanceof Error ? cause.message : 'No pudimos obtener el contenido. Vuelve a intentarlo.');
    }).finally(() => {
      if (active && mountedRef.current && epochRef.current === epoch) setContentLoading(false);
    });
    return () => { active = false; };
  }, [selectionKey, user?.uid, catalog.fetchPayload, catalog.fetchResource]);

  useEffect(() => { if (fallback) selectCopyText(fallbackRef.current); }, [fallback]);
  useEffect(() => {
    if (!busyAction && preparing && pendingVariableFocus.current) {
      variableInputs.current.get(pendingVariableFocus.current)?.focus();
      pendingVariableFocus.current = '';
    }
  }, [busyAction, preparing]);

  async function runAction(action: DetailAction) {
    if (!resource || busyRef.current) return;
    if (action === 'save' && !user) { onSignIn(); return; }
    const selected = resource;
    const snapshot = { ...values };
    const key = selectionKey;
    const account = user?.uid;
    const epoch = epochRef.current;
    const active = () => mountedRef.current && selectionRef.current === key && epochRef.current === epoch;
    busyRef.current = true;
    setBusyAction(action); setCopiedAction(null); setFallback(null); setVerifiedRepositoryUrl(''); setActionMessage('');
    try {
      const current = await fetchCurrentCatalogDelivery(selected, catalog);
      if (!active()) return;
      setPayload(current.payload);
      if (action === 'save') {
        if (accountRef.current !== account) return;
        if (selected.kind === 'skill') {
          await catalog.saveSkill(current.resource, current.payload);
          if (active() && accountRef.current === account) {
            setActionMessage('Skill guardada en Mi Biblioteca.');
            onNotify('Skill guardada en Mi Biblioteca.', 'success');
          }
        } else {
          await onSavePrompt(toCatalogPrompt(current.resource, current.payload));
          // The callback opens the private editor after the write; do not navigate back over it.
        }
        return;
      }
      if (action === 'download') {
        downloadSkill(current.payload.content);
        setActionMessage('Descarga de SKILL.md preparada.');
        onNotify('Descarga de SKILL.md preparada.', 'success');
        return;
      }
      if (action === 'repository') {
        const url = safeCatalogUrl(buildSkillRepositoryUrl(current.payload.content));
        if (!url) throw new Error('Esta skill no tiene una carpeta de repositorio válida.');
        setVerifiedRepositoryUrl(url);
        window.open(url, '_blank', 'noopener,noreferrer');
        setActionMessage('Carpeta revisada verificada. Si no se abrió, utiliza el enlace siguiente.');
        return;
      }
      let text = current.payload.content.text;
      let label = selected.kind === 'skill' ? 'SKILL.md' : 'Prompt original';
      if (action === 'prepared') {
        const missing = extractPromptVariables(text).filter(name => !snapshot[name]?.trim());
        if (missing.length) {
          pendingVariableFocus.current = missing[0];
          setPreparing(true); setMissingVariables(missing);
          setActionMessage('Completa los campos señalados antes de copiar el prompt preparado.');
          return;
        }
        text = fillPromptVariables(text, snapshot);
        label = 'Prompt preparado';
      } else if (action === 'link') {
        text = `${window.location.origin}${catalogResourcePath(current.resource.kind, current.resource.id)}`;
        label = 'Enlace de la ficha';
      }
      const copied = await copyText(text);
      if (!active()) return;
      if (copied) {
        setCopiedAction(action); setActionMessage(`${label} copiado.`);
        onNotify(`${label} copiado.`, 'success');
      } else {
        setFallback({ text, label });
        setActionMessage('El navegador bloqueó la copia. El texto está seleccionado: pulsa Ctrl+C o ⌘C para copiarlo.');
      }
    } catch (cause) {
      if (!active()) return;
      const message = cause instanceof Error ? cause.message : 'No pudimos completar esta acción. Vuelve a intentarlo.';
      if (cause instanceof CatalogDeliveryError) { setPayload(null); setContentError(message); }
      setActionMessage(message); onNotify(message, 'info');
    } finally {
      if (active()) { busyRef.current = false; setBusyAction(null); }
    }
  }

  const metadata = resource?.metadata;
  const imageUrl = metadata && safeCatalogUrl(metadata.imageUrl);
  const demoUrl = metadata && safeCatalogUrl(metadata.demoUrl);
  const repoUrl = payload?.content.source === 'github' && safeCatalogUrl(buildSkillRepositoryUrl(payload.content));
  const variables = resource?.kind === 'prompt' && payload ? extractPromptVariables(payload.content.text) : [];
  const preview = payload ? fillPromptVariables(payload.content.text, values) : '';
  const busy = Boolean(busyAction);
  const disabled = busy || !payload || contentLoading || Boolean(contentError);
  const reload = () => { if (onReloadResource) onReloadResource(); else { void catalog.refresh(); onClose(); } };

  return <div className="catalog-dialog-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} className="catalog-dialog" role="dialog" aria-modal="true" aria-labelledby="catalog-detail-title" tabIndex={-1}>
      <div className="catalog-dialog-top"><button className="catalog-link" onClick={onClose}>← Volver al catálogo</button><button className="catalog-icon-button" aria-label="Cerrar ficha" onClick={onClose}><X size={21} aria-hidden="true" /></button></div>
      {loading ? <div className="catalog-loading" role="status"><h1 id="catalog-detail-title">Cargando recurso…</h1></div> : error || !resource || !metadata ? <div className="catalog-empty"><h1 id="catalog-detail-title">Recurso no disponible</h1><p>{error || 'Este recurso no está disponible.'}</p><button className="catalog-button" onClick={reload}><RefreshCw size={16} aria-hidden="true" /> Reintentar</button></div> : <>
        <header className="catalog-detail-heading">
          <span className={`catalog-kind catalog-kind-${resource.kind}`}>{resource.kind === 'skill' ? 'Skill' : 'Prompt'}</span><span className="catalog-category">{metadata.category}</span>
          <h1 id="catalog-detail-title">{metadata.title}</h1><p>{metadata.summary}</p>
          <div className="catalog-detail-byline"><span className="catalog-avatar" aria-hidden="true">{(metadata.authorName || 'B').slice(0, 1).toUpperCase()}</span><span>Por <strong>{metadata.authorName}</strong>{metadata.authorHandle && ` · @${metadata.authorHandle.replace(/^@/, '')}`}</span><span className="catalog-free">Gratuito</span></div>
        </header>
        <div className="catalog-detail-layout">
          <div className="catalog-detail-main">
            {preparing && resource.kind === 'prompt' && payload && <section className="catalog-preparation" aria-labelledby="catalog-preparation-title">
              <h2 id="catalog-preparation-title">Prepara tu prompt</h2><p>{variables.length ? 'Completa las variables y copia el resultado para usarlo en tu herramienta.' : 'Este prompt está listo para copiar; no tiene variables.'}</p>
              {variables.length > 0 && <fieldset className="catalog-variable-fields" disabled={busy}><legend className="catalog-sr-only">Variables del prompt</legend>{variables.map((name, index) => <label className="catalog-variable" key={name} htmlFor={`catalog-variable-${index}`}><span>{name.replace(/_/g, ' ')}</span><textarea id={`catalog-variable-${index}`} ref={element => { if (element) variableInputs.current.set(name, element); else variableInputs.current.delete(name); }} rows={2} value={values[name] || ''} maxLength={10000} placeholder={`Valor para {{${name}}}`} aria-invalid={missingVariables.includes(name)} aria-describedby={missingVariables.includes(name) ? `catalog-variable-error-${index}` : undefined} onChange={event => {
                if (busyRef.current) return;
                setValues(previous => ({ ...previous, [name]: event.target.value }));
                setMissingVariables(previous => previous.filter(value => value !== name));
                setCopiedAction(null); setActionMessage(''); setFallback(null);
              }} />{missingVariables.includes(name) && <span className="catalog-field-error" id={`catalog-variable-error-${index}`}>Completa este campo.</span>}</label>)}</fieldset>}
              <div className="catalog-preview"><h3>Vista previa</h3><pre tabIndex={0}>{preview}</pre></div>
            </section>}
            <section><h2>Lo que puedes conseguir</h2><p>{metadata.outcome}</p></section>
            <CatalogSamples input={metadata.exampleInput} output={metadata.exampleOutput} />
            {imageUrl && <figure className="catalog-result-image"><img src={imageUrl} alt={`Muestra del resultado de ${metadata.title}`} loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true; }} /></figure>}
            {demoUrl && <a className="catalog-link" href={demoUrl} target="_blank" rel="noopener noreferrer">Ver demo del creador <ExternalLink size={15} aria-hidden="true" /></a>}
            <section><h2>{resource.kind === 'skill' ? 'Instalación y uso' : 'Cómo usarlo'}</h2><p className="catalog-preserve">{metadata.usage}</p></section>
            <details className="catalog-content"><summary>Ver {resource.kind === 'skill' ? 'SKILL.md' : 'prompt original'}</summary>{contentLoading ? <p role="status">Cargando contenido…</p> : payload ? <pre tabIndex={0}>{payload.content.text}</pre> : <p>{contentError}</p>}</details>
            <p className="catalog-review-note">Ejemplo aportado por el creador. Los resultados pueden variar según el modelo y el contexto.</p>
          </div>
          <aside className="catalog-get-panel" aria-label="Preparar y obtener el recurso">
            <h2>{resource.kind === 'skill' ? 'Obtén esta skill' : 'Prepara y copia'}</h2><p>{resource.kind === 'skill' ? 'Sigue las instrucciones del creador para utilizarla en tu herramienta.' : 'Copia la plantilla original o completa sus variables aquí.'}</p>
            {contentLoading && <p role="status">Preparando contenido…</p>}
            {contentError && <div className="catalog-error" role="alert"><p>{contentError}</p><button className="catalog-button" disabled={busy} onClick={reload}><RefreshCw size={16} aria-hidden="true" /> Actualizar ficha</button></div>}
            <div className="catalog-get-actions">
              {resource.kind === 'prompt' ? <>
                <button className={`catalog-button ${preparing ? '' : 'catalog-primary'}`} disabled={disabled} onClick={() => void runAction('original')}>{copiedAction === 'original' ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}{busyAction === 'original' ? 'Copiando…' : copiedAction === 'original' ? 'Original copiado' : 'Copiar original'}</button>
                {preparing ? <button className="catalog-button catalog-primary" disabled={disabled} onClick={() => void runAction('prepared')}>{copiedAction === 'prepared' ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}{busyAction === 'prepared' ? 'Copiando…' : copiedAction === 'prepared' ? 'Preparado copiado' : 'Copiar preparado'}</button> : <button className="catalog-button" disabled={disabled} onClick={() => { if (busyRef.current) return; pendingVariableFocus.current = variables[0] || ''; setPreparing(true); setActionMessage(''); }}><Play size={16} aria-hidden="true" /> Preparar prompt</button>}
              </> : <>
                <button className="catalog-button catalog-primary" disabled={disabled} onClick={() => void runAction('original')}>{copiedAction === 'original' ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}{busyAction === 'original' ? 'Copiando…' : copiedAction === 'original' ? 'SKILL.md copiado' : 'Copiar SKILL.md'}</button>
                <button className="catalog-button" disabled={disabled} onClick={() => void runAction('download')}><Download size={17} aria-hidden="true" />{busyAction === 'download' ? 'Preparando…' : 'Descargar SKILL.md'}</button>
                {repoUrl && <button className="catalog-button" disabled={disabled} onClick={() => void runAction('repository')}><ExternalLink size={16} aria-hidden="true" />{busyAction === 'repository' ? 'Verificando carpeta…' : 'Abrir carpeta revisada'}</button>}
              </>}
              <button className="catalog-button" disabled={disabled} onClick={() => void runAction('save')}><Library size={16} aria-hidden="true" />{busyAction === 'save' ? 'Guardando…' : resource.kind === 'prompt' ? 'Guardar remix privado' : 'Guardar skill'}</button>
              <button className="catalog-button catalog-secondary-action" disabled={disabled} onClick={() => void runAction('link')}>{copiedAction === 'link' ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{busyAction === 'link' ? 'Copiando…' : copiedAction === 'link' ? 'Enlace copiado' : 'Copiar enlace'}</button>
            </div>
            {actionMessage && <p className="catalog-action-status" role="status" aria-live="polite">{actionMessage}</p>}
            {verifiedRepositoryUrl && <a className="catalog-link" href={verifiedRepositoryUrl} target="_blank" rel="noopener noreferrer">Abrir enlace verificado <ExternalLink size={15} aria-hidden="true" /></a>}
            {fallback && <div className="catalog-copy-fallback"><label htmlFor="catalog-manual-copy">{fallback.label}: copia manual</label><textarea id="catalog-manual-copy" ref={fallbackRef} rows={4} readOnly value={fallback.text} onFocus={event => selectCopyText(event.currentTarget)} /><p>Texto seleccionado. Pulsa Ctrl+C o ⌘C.</p></div>}
            <hr /><dl><dt>Compatible con</dt><dd><div className="catalog-tags">{metadata.compatibility.map(tool => <span key={tool}>{tool}</span>)}</div></dd><dt>Requisitos</dt><dd className="catalog-preserve">{metadata.requirements || 'Sin requisitos adicionales.'}</dd><dt>Condiciones de uso</dt><dd className="catalog-preserve">{metadata.license}</dd><dt>Versión aprobada</dt><dd><code className="catalog-commit">{resource.submissionId}</code></dd>{payload?.content.source === 'github' && <><dt>Commit del repositorio</dt><dd><code className="catalog-commit">{payload.content.repositoryCommit}</code></dd></>}</dl>
            {resource.kind === 'prompt' && <p className="catalog-muted">El remix es privado y conserva la plantilla original y su atribución.</p>}
          </aside>
        </div>
      </>}
    </div>
  </div>;
}
