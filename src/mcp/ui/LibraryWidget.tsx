import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Check, ChevronDown, Code2, Copy, Download, ExternalLink, Maximize2, Minimize2, Search, Sparkles, X } from 'lucide-react';
import type { CatalogContentResult, CatalogSearchResult, PublicCatalogResource } from '../contracts';
import { EMPTY_WIDGET_STATE, captureWidgetRestoration, createWidgetPresentationReconciler, extractPromptVariables, fillPromptVariables, persistWidgetState, resolveCurrentSelection, safeWidgetLink, type LibraryBridge, type WidgetState } from './bridge';

interface Props { bridge: LibraryBridge }

export default function LibraryWidget({ bridge }: Props) {
  const [restoration] = useState(captureWidgetRestoration);
  const [state, setState] = useState<WidgetState>(restoration.state);
  const presentationReconciler = useRef<ReturnType<typeof createWidgetPresentationReconciler>>(null);
  if (!presentationReconciler.current) presentationReconciler.current = createWidgetPresentationReconciler(restoration.source);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [result, setResult] = useState<CatalogSearchResult>({ resources: [], total: 0 });
  const [resource, setResource] = useState<PublicCatalogResource | null>(null);
  const [payload, setPayload] = useState<CatalogContentResult | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'inline' | 'fullscreen' | 'pip'>('inline');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const initialized = useRef(false);
  const hasInitialData = useRef(false);
  const requestNumber = useRef(0);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const selectionRequest = useRef(0);

  useEffect(() => { persistWidgetState(state); }, [state]);
  useEffect(() => {
    const unsubscribe = bridge.subscribe(event => {
      if (event.type === 'error') { setIssue(event.message); setLoading(false); }
      if (event.type !== 'data') return;
      hasInitialData.current = true;
      const presentation = presentationReconciler.current!(stateRef.current, event);
      if (!presentation) return;
      // A new explicit presentation supersedes any older in-flight catalog or restored-ficha request.
      requestNumber.current += 1;
      selectionRequest.current += 1;
      setResult(presentation.data); setLoading(false); setIssue('');
      setState(presentation.state);
      setBusy(false); setPayload(null); setCopied(false); setNotice('');
      setResource(presentation.data.resource || null);
    });
    const updateDisplay = () => { setMode(bridge.displayMode()); };
    bridge.app.addEventListener('hostcontextchanged', updateDisplay);
    void bridge.connect().then(() => { setReady(bridge.isConnected()); updateDisplay(); });
    return () => { unsubscribe(); bridge.app.removeEventListener('hostcontextchanged', updateDisplay); };
  }, [bridge]);

  async function search(next: WidgetState, append = false) {
    const request = ++requestNumber.current;
    setLoading(true); setIssue(''); setNotice('');
    if (!append) setResult({ resources: [], total: 0 });
    try {
      const data = await bridge.call<CatalogSearchResult>('search_resources', {
        query: next.query, kind: next.kind, category: next.category, compatibility: next.compatibility,
        author: next.author, ...(append && result.nextCursor ? { cursor: result.nextCursor } : {}), limit: 20,
      });
      if (request !== requestNumber.current) return;
      setResult(previous => append ? { ...data, resources: [...previous.resources, ...data.resources] } : data);
    } catch (error) { if (request === requestNumber.current) setIssue(message(error)); }
    finally { if (request === requestNumber.current) setLoading(false); }
  }

  useEffect(() => {
    if (!ready || initialized.current) return;
    initialized.current = true;
    const current = stateRef.current;
    if (restoration.restorePresentation || !hasInitialData.current || current.query || current.category || current.compatibility || current.author || current.kind !== 'all') void search(current);
    if (current.selectedId && !resource) void openResource(current.selectedId, false);
  }, [ready]);

  async function openResource(id: string, clearValues = true) {
    const request = ++selectionRequest.current;
    setBusy(true); setIssue(''); setNotice(''); setCopied(false); setPayload(null);
    try {
      const data = await bridge.call<{ resource: PublicCatalogResource }>('get_resource', { id });
      if (request !== selectionRequest.current) return;
      setResource(data.resource);
      setState(previous => ({ ...previous, selectedId: data.resource.id, values: clearValues && previous.selectedId !== id ? {} : previous.values }));
      void bridge.selectResource(data.resource).catch(() => undefined);
      requestAnimationFrame(() => detailHeading.current?.focus());
    } catch (error) {
      if (request === selectionRequest.current) {
        setIssue(message(error)); setResource(null); setState(previous => ({ ...previous, selectedId: '', values: {} }));
      }
    } finally { if (request === selectionRequest.current) setBusy(false); }
  }

  function back() {
    selectionRequest.current += 1;
    setResource(null); setPayload(null); setIssue(''); setNotice(''); setCopied(false); setBusy(false);
    setState(previous => ({ ...previous, selectedId: '', values: {} }));
    void bridge.selectResource(null).catch(() => undefined);
    requestAnimationFrame(() => searchInput.current?.focus());
  }

  async function freshContent(): Promise<CatalogContentResult> {
    if (!resource) throw new Error('Abre una ficha antes de obtener su contenido.');
    const request = selectionRequest.current;
    const selectedId = resource.id;
    const data = await resolveCurrentSelection(bridge.call<CatalogContentResult>('get_resource_content', {
      id: selectedId, expectedSubmissionId: resource.submissionId,
    }), () => request === selectionRequest.current && stateRef.current.selectedId === selectedId);
    setPayload(data); setCopied(false);
    return data;
  }

  async function action(run: (isCurrent: () => boolean) => Promise<void>) {
    const request = selectionRequest.current;
    const isCurrent = () => request === selectionRequest.current;
    setBusy(true); setIssue(''); setNotice('');
    try { await run(isCurrent); } catch (error) { if (isCurrent()) setIssue(message(error)); }
    finally { if (isCurrent()) setBusy(false); }
  }

  async function copy() {
    await action(async isCurrent => {
      const data = await freshContent();
      const text = data.resource.kind === 'prompt' ? fillPromptVariables(data.content.text, state.values) : data.content.text;
      try { await navigator.clipboard.writeText(text); }
      catch { throw new Error('Esta vista no permite copiar automáticamente. Selecciona el texto del recurso para copiarlo.'); }
      if (isCurrent()) { setCopied(true); setNotice('Contenido copiado.'); }
    });
  }

  async function useInChat() {
    await action(async isCurrent => {
      const data = await freshContent();
      if (data.resource.kind === 'prompt') {
        const missing = extractPromptVariables(data.content.text).filter(variable => !state.values[variable]?.trim());
        if (missing.length) throw new Error('Rellena las variables del prompt antes de usarlo en la conversación.');
      }
      await bridge.useResource(data, state.values, isCurrent);
      if (isCurrent()) setNotice('Recurso enviado a la conversación.');
    });
  }

  function applyFilters(next: WidgetState) { setState(next); void search(next); }
  const categories = useMemo(() => [...new Set(result.resources.map(item => item.metadata.category))].sort(), [result.resources]);
  const tools = useMemo(() => [...new Set(result.resources.flatMap(item => item.metadata.compatibility))].sort(), [result.resources]);
  const authors = useMemo(() => [...new Set(result.resources.map(item => item.metadata.authorHandle).filter(Boolean))].sort(), [result.resources]);
  const variables = payload && resource?.kind === 'prompt' ? extractPromptVariables(payload.content.text) : [];
  const visibleResources = state.kind === 'all' ? result.resources : result.resources.filter(item => item.kind === state.kind);
  const preview = payload ? resource?.kind === 'prompt' ? fillPromptVariables(payload.content.text, state.values) : payload.content.text : '';
  const availableModes = bridge.availableDisplayModes();
  const metadata = resource?.metadata;

  return <main className={`library-widget library-mode-${mode}`}>
    <header className="library-header">
      <div className="library-brand"><BookOpen size={23} aria-hidden="true" /><div><h1>Biblioteca</h1><p>Capacidades para esta conversación</p></div></div>
      <div className="library-host-actions">
        {availableModes.includes(mode === 'fullscreen' ? 'inline' : 'fullscreen') && <button className="library-icon" aria-label={mode === 'fullscreen' ? 'Volver a vista compacta' : 'Ampliar Biblioteca'} title={mode === 'fullscreen' ? 'Vista compacta' : 'Ampliar'} onClick={() => void action(async () => { const result = await bridge.requestDisplayMode(mode === 'fullscreen' ? 'inline' : 'fullscreen'); setMode(result.mode); })}>{mode === 'fullscreen' ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>}
        {availableModes.includes('pip') && mode !== 'pip' && <button className="library-icon" aria-label="Minimizar Biblioteca" title="Minimizar" onClick={() => void action(async () => { const result = await bridge.requestDisplayMode('pip'); setMode(result.mode); })}><Minimize2 size={17} /></button>}
        <button className="library-icon" aria-label="Cerrar Biblioteca" title="Cerrar" disabled={!ready} onClick={() => void action(async () => { persistWidgetState(state); await bridge.close(); })}><X size={18} /></button>
      </div>
    </header>

    {issue && <div className="library-feedback library-error" role="alert"><p>{issue}</p>{resource && <button onClick={() => void openResource(resource.id, false)} disabled={busy}>Actualizar ficha</button>}</div>}
    {notice && <p className="library-feedback library-notice" role="status">{notice}</p>}

    {!resource ? <section className="library-catalog" aria-label="Catálogo de recursos">
      <div className="library-tabs" role="tablist" aria-label="Tipo de recurso">
        {(['all', 'prompt', 'skill'] as const).map(kind => <button key={kind} role="tab" id={`library-tab-${kind}`} aria-controls="library-resources" aria-selected={state.kind === kind} tabIndex={state.kind === kind ? 0 : -1} className={state.kind === kind ? 'is-selected' : ''} disabled={!ready || busy} onClick={() => applyFilters({ ...state, kind })} onKeyDown={event => {
          const kinds: WidgetState['kind'][] = ['all', 'prompt', 'skill'];
          const index = kinds.indexOf(kind);
          const next = event.key === 'ArrowRight' ? kinds[(index + 1) % kinds.length] : event.key === 'ArrowLeft' ? kinds[(index + kinds.length - 1) % kinds.length] : event.key === 'Home' ? kinds[0] : event.key === 'End' ? kinds[2] : undefined;
          if (!next) return; event.preventDefault(); applyFilters({ ...state, kind: next }); document.getElementById(`library-tab-${next}`)?.focus();
        }}>{kind === 'all' ? <BookOpen size={15} /> : kind === 'prompt' ? <Sparkles size={15} /> : <Code2 size={15} />}{kind === 'all' ? 'Todo' : kind === 'prompt' ? 'Prompts' : 'Skills'}</button>)}
      </div>
      <form className="library-search" onSubmit={event => { event.preventDefault(); void search(state); }}>
        <label className="library-sr-only" htmlFor="library-search">Buscar por tarea o recurso</label><Search size={19} aria-hidden="true" />
        <input id="library-search" ref={searchInput} value={state.query} placeholder="¿Qué quieres conseguir?" maxLength={500} onChange={event => setState(previous => ({ ...previous, query: event.target.value }))} />
        <button type="submit" disabled={!ready || loading}>Buscar</button>
      </form>
      <button className="library-filter-toggle" aria-expanded={filtersOpen} aria-controls="library-filters" onClick={() => setFiltersOpen(previous => !previous)}>Filtrar por tarea, herramienta o autor <ChevronDown size={15} /></button>
      {filtersOpen && <div className="library-filters" id="library-filters">
        <label>Tarea<select value={state.category} onChange={event => applyFilters({ ...state, category: event.target.value })}><option value="">Todas las tareas</option>{[...new Set([...categories, state.category].filter(Boolean))].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Herramienta<select value={state.compatibility} onChange={event => applyFilters({ ...state, compatibility: event.target.value })}><option value="">Todas las herramientas</option>{[...new Set([...tools, state.compatibility].filter(Boolean))].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Autor<input value={state.author} list="library-authors" placeholder="Handle del creador" maxLength={128} onChange={event => setState(previous => ({ ...previous, author: event.target.value }))} onBlur={() => { if (state.author !== stateRef.current.author) return; void search(state); }} /><datalist id="library-authors">{authors.map(value => <option key={value} value={value} />)}</datalist></label>
        <button className="library-text-button" onClick={() => applyFilters({ ...EMPTY_WIDGET_STATE, kind: state.kind, values: {} })}>Limpiar filtros</button>
      </div>}
      <div id="library-resources" role="tabpanel" aria-labelledby={`library-tab-${state.kind}`} aria-busy={loading}>
        {loading && <p className="library-loading" role="status">{ready ? 'Buscando recursos…' : 'Conectando Biblioteca…'}</p>}
        {(!loading || result.resources.length > 0) && <p className="library-results-label">{result.total} {result.total === 1 ? 'recurso disponible' : 'recursos disponibles'}</p>}
        {!loading && !visibleResources.length && !issue && <div className="library-empty"><BookOpen size={32} aria-hidden="true" /><h2>{state.query || state.category || state.compatibility || state.author ? 'No encontramos esa capacidad' : `Aún no hay ${state.kind === 'skill' ? 'skills' : state.kind === 'prompt' ? 'prompts' : 'recursos'} disponibles`}</h2><p>{state.query || state.category || state.compatibility || state.author ? 'Prueba otra tarea o quita un filtro.' : 'Aquí aparecerán los recursos cuando tengan una versión revisada y publicada.'}</p>{state.query || state.category || state.compatibility || state.author ? <button className="library-button" onClick={() => applyFilters({ ...EMPTY_WIDGET_STATE, kind: state.kind, values: {} })}>Ver todos</button> : null}</div>}
        <ul className="library-resource-list">{visibleResources.map(item => <li key={item.id}><button className={`library-resource library-resource-${item.kind}`} disabled={busy} onClick={() => void openResource(item.id)}>
          <span className="library-resource-type">{item.kind === 'prompt' ? <Sparkles size={15} /> : <Code2 size={15} />}{item.kind === 'prompt' ? 'Prompt' : 'Skill'}<span>{item.metadata.category}</span></span>
          <h2>{item.metadata.title}</h2><p>{item.metadata.summary}</p><span className="library-resource-author">{item.metadata.authorName}{item.metadata.compatibility.length > 0 && <span>{item.metadata.compatibility.slice(0, 3).join(', ')}</span>}</span>
        </button></li>)}</ul>
        {result.nextCursor && <button className="library-button library-more" disabled={loading} onClick={() => void search(state, true)}>Ver más recursos</button>}
      </div>
    </section> : metadata && <article className="library-detail">
      <button className="library-back" disabled={busy} onClick={back}><ArrowLeft size={16} /> Volver al catálogo</button>
      <div className="library-detail-type">{resource.kind === 'prompt' ? <Sparkles size={16} /> : <Code2 size={16} />}{resource.kind === 'prompt' ? 'Prompt' : 'Skill'}<span>{metadata.category}</span></div>
      <h2 className="library-detail-title" ref={detailHeading} tabIndex={-1}>{metadata.title}</h2><p className="library-detail-summary">{metadata.summary}</p><p className="library-byline">Por <strong>{metadata.authorName}</strong>{metadata.authorHandle && ` (@${metadata.authorHandle.replace(/^@/, '')})`}</p>
      <section className="library-detail-section"><h3>Lo que puedes conseguir</h3><p>{metadata.outcome}</p></section>
      <section className="library-detail-section"><h3>Ejemplo del creador</h3><div className="library-samples"><div><h4>Entrada</h4><pre tabIndex={0}>{metadata.exampleInput}</pre></div><div><h4>Resultado</h4><pre tabIndex={0}>{metadata.exampleOutput}</pre></div></div>
        <div className="library-links">{safeWidgetLink(metadata.imageUrl) && <button onClick={() => void action(() => bridge.openLink(metadata.imageUrl))}>Ver imagen del resultado <ExternalLink size={14} /></button>}{safeWidgetLink(metadata.demoUrl) && <button onClick={() => void action(() => bridge.openLink(metadata.demoUrl))}>Ver demo <ExternalLink size={14} /></button>}</div>
      </section>
      <section className="library-detail-section"><h3>{resource.kind === 'skill' ? 'Instalación y uso' : 'Cómo usarlo'}</h3><p className="library-preserve">{metadata.usage}</p></section>
      <dl className="library-details"><div><dt>Compatible con</dt><dd>{metadata.compatibility.join(', ')}</dd></div><div><dt>Requisitos</dt><dd>{metadata.requirements}</dd></div><div><dt>Condiciones de uso</dt><dd>{metadata.license}</dd></div><div><dt>Versión aprobada</dt><dd className="library-version">{resource.submissionId}</dd></div></dl>
      <section className="library-deliverable"><h3>{resource.kind === 'skill' ? 'SKILL.md' : 'Prepara el prompt'}</h3>{!payload ? <><p>{resource.kind === 'prompt' ? 'Obtén el texto revisado para leerlo y rellenar sus variables.' : 'Obtén el archivo revisado antes de descargarlo o usarlo en el chat.'}</p><button className="library-button" disabled={busy || !ready} onClick={() => void action(async () => { await freshContent(); })}>{busy ? 'Obteniendo…' : 'Obtener contenido'}</button></> : <>
        {variables.length > 0 && <fieldset className="library-variables"><legend>Variables del prompt</legend>{variables.map(variable => <label key={variable}>{variable}<textarea rows={2} value={state.values[variable] || ''} maxLength={10000} placeholder={`Valor para ${variable}`} onChange={event => { setCopied(false); setState(previous => ({ ...previous, values: { ...previous.values, [variable]: event.target.value } })); }} /></label>)}</fieldset>}
        <details className="library-content" open><summary>{resource.kind === 'prompt' ? 'Texto preparado' : 'Contenido del archivo'}</summary><pre tabIndex={0}>{preview}</pre></details>
        {payload.content.source === 'github' && <p className="library-version">Commit: {payload.content.repositoryCommit}</p>}
      </>}
      <div className="library-deliverable-actions"><button className="library-button library-primary" disabled={busy || !ready} onClick={() => void useInChat()}>{busy ? 'Preparando…' : 'Usar en esta conversación'}</button><button className="library-button" disabled={busy || !ready} onClick={() => void copy()}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copiado' : resource.kind === 'prompt' ? 'Copiar prompt' : 'Copiar SKILL.md'}</button>
        {resource.kind === 'skill' && (payload?.content.source === 'github' ? <button className="library-button" disabled={busy} onClick={() => void action(async () => { const data = await freshContent(); if (!data.repositoryFolderUrl) throw new Error('La carpeta de esta versión no está disponible.'); await bridge.openLink(data.repositoryFolderUrl); })}><ExternalLink size={15} /> Abrir carpeta revisada</button> : <button className="library-button" disabled={busy || !ready} onClick={() => void action(async isCurrent => { const data = await freshContent(); if (data.content.source === 'github') { if (!data.repositoryFolderUrl) throw new Error('La carpeta de esta versión no está disponible.'); await bridge.openLink(data.repositoryFolderUrl); } else { await bridge.downloadSkill(data.content.text); if (isCurrent()) setNotice('Descarga de SKILL.md solicitada.'); } })}><Download size={15} /> Descargar SKILL.md</button>)}
      </div></section>
      <p className="library-review-note">Muestra aportada por el creador. Revisa el contenido antes de usarlo; la publicación no certifica su ejecución en todos los modelos.</p>
      <button className="library-web-link" onClick={() => void action(() => bridge.openLink(resource.canonicalUrl))}>Abrir ficha en la web <ExternalLink size={14} /></button>
    </article>}
  </main>;
}

function message(error: unknown): string { return error instanceof Error ? error.message : 'No pudimos completar la acción. Vuelve a intentarlo.'; }
