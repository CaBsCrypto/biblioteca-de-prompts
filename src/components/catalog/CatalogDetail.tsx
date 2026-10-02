import React, { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { ArrowRight, Check, Copy, Download, ExternalLink, Library, Play, X } from 'lucide-react';
import { Prompt } from '../../types';
import { CatalogPayload, CatalogResource } from '../../typesCatalog';
import { buildSkillRepositoryUrl, downloadSkill, toCatalogPrompt } from '../../utils/catalog';
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
}

export default function CatalogDetail({ resource, loading, error, catalog, user, onClose, onSignIn, onUsePrompt, onSavePrompt, onNotify }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [payload, setPayload] = useState<CatalogPayload | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const keyListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); }
      if (event.key !== 'Tab') return;
      const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),summary,[tabindex="0"]') || []).filter(element => element.getClientRects().length > 0);
      if (!elements?.length) { event.preventDefault(); return; }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyListener);
    return () => { document.removeEventListener('keydown', keyListener); document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus(); };
  }, []);
  useEffect(() => {
    let active = true;
    setPayload(null); setContentError(''); setCopied(false);
    if (!resource) return;
    setContentLoading(true);
    catalog.fetchPayload(resource.id).then(value => {
      if (!active) return;
      if (!value) setContentError('El contenido de esta publicación no está disponible.');
      else if (value.resourceId !== resource.id || value.submissionId !== resource.submissionId || value.kind !== resource.kind) setContentError('Esta publicación tiene una versión nueva. Cierra la ficha y vuelve a abrirla para obtener el contenido actualizado.');
      else setPayload(value);
    }).catch(() => { if (active) setContentError('No pudimos obtener el contenido. Cierra la ficha y vuelve a intentarlo.'); }).finally(() => { if (active) setContentLoading(false); });
    return () => { active = false; };
  }, [resource?.id, resource?.kind, resource?.submissionId, catalog.fetchPayload]);

  async function copyText() {
    if (!payload) return;
    try { await navigator.clipboard.writeText(payload.content.text); setCopied(true); onNotify('Contenido copiado.', 'success'); }
    catch { onNotify('No pudimos copiar. Selecciona el texto del recurso para copiarlo manualmente.', 'info'); }
  }
  async function save() {
    if (!payload || !resource) return;
    if (!user) { onSignIn(); return; }
    setSaving(true);
    try {
      if (resource.kind === 'skill') { await catalog.saveSkill(resource, payload); onNotify('Skill guardada en Mi Biblioteca.', 'success'); }
      else { const prompt = toCatalogPrompt(resource, payload); onClose(); await onSavePrompt(prompt); }
    } catch (cause) { onNotify(cause instanceof Error ? cause.message : 'No pudimos guardar el recurso.', 'info'); }
    finally { setSaving(false); }
  }
  function fillPrompt() {
    if (!resource || !payload) return;
    try { const prompt = toCatalogPrompt(resource, payload); onClose(); onUsePrompt(prompt); }
    catch (cause) { onNotify(cause instanceof Error ? cause.message : 'No pudimos abrir este prompt.', 'info'); }
  }
  async function share() {
    if (!resource) return;
    try { await navigator.clipboard.writeText(`${window.location.origin}${catalogResourcePath(resource.kind, resource.id)}`); onNotify('Enlace a la ficha copiado.', 'success'); }
    catch { onNotify('No pudimos copiar el enlace. Puedes compartir la dirección de esta página.', 'info'); }
  }
  const metadata = resource?.metadata;
  const imageUrl = metadata && safeCatalogUrl(metadata.imageUrl);
  const demoUrl = metadata && safeCatalogUrl(metadata.demoUrl);
  const repoUrl = payload?.content.source === 'github' && safeCatalogUrl(buildSkillRepositoryUrl(payload.content));

  return <div className="catalog-dialog-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} className="catalog-dialog" role="dialog" aria-modal="true" aria-labelledby="catalog-detail-title" tabIndex={-1}>
      <div className="catalog-dialog-top"><button className="catalog-link" onClick={onClose}>← Volver al catálogo</button><button className="catalog-icon-button" aria-label="Cerrar ficha" onClick={onClose}><X size={21} /></button></div>
      {loading ? <div className="catalog-loading" role="status"><h1 id="catalog-detail-title">Cargando recurso…</h1></div> : error || !resource || !metadata ? <div className="catalog-empty"><h1 id="catalog-detail-title">Recurso no disponible</h1><p>{error || 'Este recurso no está disponible.'}</p></div> : <>
        <header className="catalog-detail-heading"><span className={`catalog-kind catalog-kind-${resource.kind}`}>{resource.kind === 'skill' ? 'Skill' : 'Prompt'}</span><span className="catalog-category">{metadata.category}</span><h1 id="catalog-detail-title">{metadata.title}</h1><p>{metadata.summary}</p><div className="catalog-detail-byline"><span className="catalog-avatar">{(metadata.authorName || 'B').slice(0, 1).toUpperCase()}</span><span>Por <strong>{metadata.authorName}</strong>{metadata.authorHandle && ` · @${metadata.authorHandle.replace(/^@/, '')}`}</span><span className="catalog-free">Gratuito</span></div></header>
        <div className="catalog-detail-layout"><div className="catalog-detail-main"><section><h2>Lo que puedes conseguir</h2><p>{metadata.outcome}</p></section><CatalogSamples input={metadata.exampleInput} output={metadata.exampleOutput} />{imageUrl && <figure className="catalog-result-image"><img src={imageUrl} alt={`Muestra del resultado de ${metadata.title}`} loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true; }} /></figure>}{demoUrl && <a className="catalog-link" href={demoUrl} target="_blank" rel="noopener noreferrer">Ver demo del creador <ExternalLink size={15} /></a>}<section><h2>Cómo usarlo</h2><p className="catalog-preserve">{metadata.usage}</p></section><details className="catalog-content"><summary>Ver {resource.kind === 'skill' ? 'SKILL.md' : 'texto del prompt'}</summary>{contentLoading ? <p role="status">Cargando contenido…</p> : payload ? <pre tabIndex={0}>{payload.content.text}</pre> : <p>{contentError}</p>}</details><p className="catalog-review-note">Ejemplo aportado por el creador. Publicar un recurso no certifica su ejecución en todos los modelos. Revisa el contenido antes de utilizarlo.</p></div>
          <aside className="catalog-get-panel"><h2>Llévatelo a tu biblioteca</h2><p>{resource.kind === 'skill' ? 'Descarga el archivo y sigue las instrucciones del creador para instalarlo en tu herramienta.' : 'Copia el prompt o rellena sus variables antes de utilizarlo.'}</p>{contentLoading && <p role="status">Preparando contenido…</p>}{contentError && <p className="catalog-error" role="alert">{contentError}</p>}<div className="catalog-get-actions">{resource.kind === 'prompt' ? <><button className="catalog-button catalog-primary" disabled={!payload} onClick={copyText}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Copiado' : 'Copiar prompt'}</button><button className="catalog-button" disabled={!payload} onClick={fillPrompt}><Play size={16} /> Rellenar variables</button></> : <><button className="catalog-button catalog-primary" disabled={!payload} onClick={() => { if (!payload) return; try { downloadSkill(payload.content); onNotify('Descarga de SKILL.md preparada.', 'success'); } catch { onNotify('No pudimos descargar. Puedes copiar el texto de SKILL.md.', 'info'); } }}><Download size={17} /> Descargar SKILL.md</button>{repoUrl && <a className="catalog-button" href={repoUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Abrir carpeta completa</a>}</>}<button className="catalog-button" disabled={!payload || saving} onClick={save}><Library size={16} />{saving ? 'Guardando…' : resource.kind === 'prompt' ? 'Guardar remix privado' : 'Guardar skill'}</button><button className="catalog-link" onClick={share}>Compartir ficha <ArrowRight size={15} /></button></div><hr /><dl><dt>Compatible con</dt><dd><div className="catalog-tags">{metadata.compatibility.map(tool => <span key={tool}>{tool}</span>)}</div></dd><dt>Requisitos</dt><dd className="catalog-preserve">{metadata.requirements}</dd><dt>Condiciones de uso</dt><dd className="catalog-preserve">{metadata.license}</dd>{payload?.content.source === 'github' && <><dt>Versión del repositorio</dt><dd><code className="catalog-commit">{payload.content.repositoryCommit}</code></dd></>}</dl>{resource.kind === 'prompt' && <p className="catalog-muted">Tu remix conservará la atribución del recurso original.</p>}</aside>
        </div>
      </>}
    </div>
  </div>;
}
