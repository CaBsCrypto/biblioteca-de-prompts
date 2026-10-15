import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Check, ChevronDown, Code2, Copy, Download, ExternalLink, Link, Maximize2, Minimize2, Search, Settings2, Sparkles, X } from 'lucide-react';
import type { CatalogContentResult, CatalogSearchResult, PublicCatalogResource } from '../contracts';
import { EMPTY_WIDGET_STATE, captureWidgetRestoration, createWidgetPresentationReconciler, extractPromptVariables, fillPromptVariables, persistWidgetState, resolveCurrentSelection, safeWidgetLink, type LibraryBridge, type WidgetState } from './bridge';

interface Props { bridge: LibraryBridge }

export default function LibraryWidget({ bridge }: Props) {
  const [restoration] = useState(captureWidgetRestoration);
  const [state, setState] = useState<WidgetState>(restoration.state);
  const stateRef = useRef(state); stateRef.current = state;
  const reconciler = useRef<ReturnType<typeof createWidgetPresentationReconciler>>(null);
  if (!reconciler.current) reconciler.current = createWidgetPresentationReconciler(restoration.source);
  const [result, setResult] = useState<CatalogSearchResult>({ resources: [], total: 0 });
  const resultRef = useRef(result); resultRef.current = result;
  const [resource, setResource] = useState<PublicCatalogResource | null>(null);
  const resourceRef = useRef(resource); resourceRef.current = resource;
  const [payload, setPayload] = useState<CatalogContentResult | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedAction, setCopiedAction] = useState('');
  const [manualCopy, setManualCopy] = useState<{ text: string; label: string } | null>(null);
  const [missingVariables, setMissingVariables] = useState<string[]>([]);
  const [mode, setMode] = useState(bridge.displayMode());
  const [layout, setLayout] = useState(bridge.layoutContext());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const [hostSelectionRevision, setHostSelectionRevision] = useState(0);
  const root = useRef<HTMLElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const preparedText = useRef<HTMLPreElement>(null);
  const manualText = useRef<HTMLPreElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const reopenButton = useRef<HTMLButtonElement>(null);
  const previousCollapsed = useRef(state.collapsed);
  const variableInputs = useRef(new Map<string, HTMLTextAreaElement>());
  const initialized = useRef(false);
  const hasInitialCatalog = useRef(false);
  const catalogNeedsRefresh = useRef(false);
  const catalogPosition = useRef(0);
  const openerId = useRef('');
  const requestNumber = useRef(0);
  const selectionRequest = useRef(0);
  const operation = useRef(0);
  const busyRef = useRef(false);
  const autoContentKey = useRef('');

  useEffect(() => { persistWidgetState(state); }, [state]);
  useEffect(() => {
    if (previousCollapsed.current === state.collapsed || busy) return;
    previousCollapsed.current = state.collapsed;
    const frame = requestAnimationFrame(() => {
      if (state.collapsed) reopenButton.current?.focus({ preventScroll: true });
      else if (!resource) searchInput.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [state.collapsed, busy]);
  useEffect(() => {
    if (!resource || state.collapsed) return;
    if (root.current) root.current.scrollTop = 0;
    const frame = requestAnimationFrame(() => detailHeading.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [resource?.id, state.collapsed]);

  useEffect(() => {
    const updateContext = () => { setMode(bridge.displayMode()); setLayout(bridge.layoutContext()); };
    const unsubscribe = bridge.subscribe(event => {
      if (event.type === 'context') { updateContext(); return; }
      if (event.type === 'error') { setIssue(event.message); setLoading(false); return; }
      if (event.type !== 'data') return;
      const presentation = reconciler.current!(stateRef.current, event);
      if (!presentation) return;
      requestNumber.current += 1; selectionRequest.current += 1; operation.current += 1;
      busyRef.current = false; setBusy(false);
      const selected = presentation.data.resource || null;
      // A ficha response is not a catalog result. Keep the catalog and its count independently.
      if (!selected) { setResult(presentation.data); hasInitialCatalog.current = true; catalogNeedsRefresh.current = false; }
      else catalogNeedsRefresh.current = true;
      stateRef.current = presentation.state;
      setState(presentation.state); setResource(selected); resourceRef.current = selected;
      setPayload(null); setCopiedAction(''); setManualCopy(null); setMissingVariables([]);
      setLoading(false); setIssue(''); setNotice(''); autoContentKey.current = '';
      setHostSelectionRevision(previous => previous + 1);
    });
    bridge.app.addEventListener('hostcontextchanged', updateContext);
    void bridge.connect().then(() => { setReady(bridge.isConnected()); updateContext(); });
    return () => { unsubscribe(); bridge.app.removeEventListener('hostcontextchanged', updateContext); };
  }, [bridge]);

  async function search(next: WidgetState, append = false) {
    const request = ++requestNumber.current;
    const cursor = append ? resultRef.current.nextCursor : undefined;
    setLoading(true); setIssue(''); setNotice(''); setManualCopy(null);
    if (!append) setResult({ resources: [], total: 0 });
    try {
      const data = await bridge.call<CatalogSearchResult>('search_resources', {
        query: next.query, kind: next.kind, category: next.category, compatibility: next.compatibility,
        author: next.author, ...(cursor ? { cursor } : {}), limit: 20,
      });
      if (request !== requestNumber.current) return;
      setResult(previous => append ? { ...data, resources: [...previous.resources, ...data.resources] } : data);
      hasInitialCatalog.current = true; catalogNeedsRefresh.current = false;
    } catch (error) { if (request === requestNumber.current) setIssue(message(error)); }
    finally { if (request === requestNumber.current) setLoading(false); }
  }

  useEffect(() => {
    if (!ready || initialized.current) return;
    initialized.current = true;
    const current = stateRef.current;
    if (restoration.restorePresentation || !hasInitialCatalog.current || current.query || current.category || current.compatibility || current.author || current.kind !== 'all') void search(current);
    if (current.selectedId && !resourceRef.current) void openResource(current.selectedId, false, false);
  }, [ready]);

  useEffect(() => {
    if (!ready || !resource || busyRef.current) return;
    const key = resource.id + ':' + resource.submissionId;
    if (autoContentKey.current === key) return;
    autoContentKey.current = key;
    const selected = resource;
    void action(async isCurrent => { await freshContent(selected, isCurrent); });
  }, [ready, resource?.id, resource?.submissionId, hostSelectionRevision]);

  function beginOperation() {
    if (busyRef.current) return null;
    busyRef.current = true;
    const token = ++operation.current;
    setBusy(true); setIssue(''); setNotice(''); setManualCopy(null); setCopiedAction('');
    return token;
  }

  function finishOperation(token: number) {
    if (operation.current !== token) return;
    busyRef.current = false; setBusy(false);
  }

  async function action(run: (isCurrent: () => boolean) => Promise<void>) {
    const token = beginOperation(); if (token === null) return;
    const selection = selectionRequest.current;
    const isCurrent = () => token === operation.current && selection === selectionRequest.current;
    try { await run(isCurrent); }
    catch (error) { if (isCurrent()) setIssue(message(error)); }
    finally { finishOperation(token); }
  }

  async function freshContent(selected: PublicCatalogResource, isCurrent: () => boolean): Promise<CatalogContentResult> {
    const data = await resolveCurrentSelection(bridge.call<CatalogContentResult>('get_resource_content', {
      id: selected.id, expectedSubmissionId: selected.submissionId,
    }), isCurrent);
    if (resourceRef.current?.id === selected.id && resourceRef.current.submissionId === selected.submissionId) setPayload(data);
    return data;
  }

  async function openResource(id: string, focus = true, reveal = true) {
    const token = beginOperation(); if (token === null) return;
    if (!resourceRef.current) { catalogPosition.current = root.current?.scrollTop || 0; openerId.current = focus ? id : ''; }
    const selection = ++selectionRequest.current;
    const isCurrent = () => operation.current === token && selectionRequest.current === selection;
    setCopiedAction(''); setPayload(null); setMissingVariables([]);
    try {
      const data = await resolveCurrentSelection(bridge.call<{ resource: PublicCatalogResource }>('get_resource', { id }), isCurrent);
      resourceRef.current = data.resource; setResource(data.resource);
      setState(previous => ({ ...previous, collapsed: reveal ? false : previous.collapsed, selectedId: data.resource.id, values: previous.selectedId === id ? previous.values : {} }));
      autoContentKey.current = data.resource.id + ':' + data.resource.submissionId;
      void bridge.selectResource(data.resource).catch(() => undefined);
      await freshContent(data.resource, isCurrent);
    } catch (error) { if (isCurrent()) setIssue(message(error)); }
    finally { finishOperation(token); }
  }

  function back() {
    if (busyRef.current) return;
    selectionRequest.current += 1; operation.current += 1;
    setResource(null); resourceRef.current = null; setPayload(null); setIssue(''); setNotice('');
    setCopiedAction(''); setManualCopy(null); setMissingVariables([]);
    // Keep the private preparation identity and values so opening this resource again restores them.
    void bridge.selectResource(null).catch(() => undefined);
    if (!hasInitialCatalog.current || catalogNeedsRefresh.current) void search(stateRef.current);
    requestAnimationFrame(() => {
      if (root.current) root.current.scrollTop = catalogPosition.current;
      const opener = root.current?.querySelector<HTMLButtonElement>(`[data-open-id="${openerId.current}"]`);
      if (opener) opener.focus({ preventScroll: true }); else searchInput.current?.focus({ preventScroll: true });
    });
  }

  async function reduce(isCurrent: () => boolean = () => true) {
    if (!isCurrent()) return;
    setState(previous => ({ ...previous, collapsed: true }));
    if (mode !== 'inline' && bridge.availableDisplayModes().includes('inline')) {
      try { const response = await bridge.requestDisplayMode('inline'); if (isCurrent()) setMode(response.mode); }
      catch { /* The compact strip still works when a host declines the presentation request. */ }
    }
  }

  async function expandCatalog() {
    await action(async isCurrent => {
      setState(previous => ({ ...previous, collapsed: false, catalogExpanded: true }));
      if (mode !== 'fullscreen' && bridge.availableDisplayModes().includes('fullscreen')) {
        try { const response = await bridge.requestDisplayMode('fullscreen'); if (isCurrent()) setMode(response.mode); }
        catch { /* Show all results in the widget when fullscreen is unavailable. */ }
      }
    });
  }

  async function compactCatalog() {
    await action(async isCurrent => {
      setState(previous => ({ ...previous, catalogExpanded: false }));
      if (mode !== 'inline' && bridge.availableDisplayModes().includes('inline')) {
        try { const response = await bridge.requestDisplayMode('inline'); if (isCurrent()) setMode(response.mode); }
        catch { /* A host can retain fullscreen; its own controls can return to the conversation. */ }
      }
      if (root.current) root.current.scrollTop = 0;
    });
  }

  function selectManualText(text: string, label: string, isCurrent: () => boolean) {
    setManualCopy({ text, label }); setCopiedAction('');
    setNotice('La copia automática está bloqueada. Mantén pulsado el texto y elige Copiar; en ordenador usa Ctrl+C o ⌘+C.');
    requestAnimationFrame(() => {
      if (!isCurrent()) return;
      const element = manualText.current; const selection = document.getSelection();
      if (!element || !selection) return;
      element.focus({ preventScroll: true }); element.scrollIntoView({ block: 'nearest' });
      const range = document.createRange(); range.selectNodeContents(element);
      selection.removeAllRanges(); selection.addRange(range);
    });
  }

  async function copy(selected: PublicCatalogResource, kind: 'original' | 'prepared' | 'link') {
    const values = { ...stateRef.current.values };
    const key = selected.id + ':' + kind;
    await action(async isCurrent => {
      const data = await freshContent(selected, isCurrent);
      const text = kind === 'link' ? data.resource.canonicalUrl : kind === 'prepared' && data.resource.kind === 'prompt'
        ? fillPromptVariables(data.content.text, values) : data.content.text;
      const success = await copyReviewedText(text, root.current, isCurrent);
      if (!isCurrent()) return;
      if (success) { setCopiedAction(key); setNotice(kind === 'link' ? 'Enlace copiado.' : 'Contenido copiado.'); }
      else selectManualText(text, kind === 'link' ? 'Enlace de la ficha' : kind === 'original' ? 'Contenido original' : 'Texto preparado', isCurrent);
    });
  }

  async function useInChat() {
    const selected = resourceRef.current; if (!selected) return;
    const values = { ...stateRef.current.values };
    const autoReduce = stateRef.current.autoReduce;
    setMissingVariables([]);
    await action(async isCurrent => {
      const data = await freshContent(selected, isCurrent);
      if (data.resource.kind === 'prompt') {
        const missing = extractPromptVariables(data.content.text).filter(variable => !values[variable]?.trim());
        if (missing.length) {
          setMissingVariables(missing);
          requestAnimationFrame(() => { if (isCurrent()) variableInputs.current.get(missing[0])?.focus(); });
          throw new Error('Rellena los campos señalados antes de usar el prompt en este chat.');
        }
      }
      await bridge.useResource(data, values, isCurrent);
      if (!isCurrent()) return;
      setNotice('Recurso enviado a este chat.'); if (autoReduce) await reduce(isCurrent);
    });
  }

  function applyFilters(next: WidgetState) {
    if (busyRef.current) return;
    setState(next); setCopiedAction(''); void search(next);
  }

  const categories = useMemo(() => [...new Set(result.resources.map(item => item.metadata.category))].sort(), [result.resources]);
  const tools = useMemo(() => [...new Set(result.resources.flatMap(item => item.metadata.compatibility))].sort(), [result.resources]);
  const authors = useMemo(() => [...new Set(result.resources.map(item => item.metadata.authorHandle).filter(Boolean))].sort(), [result.resources]);
  const matchingResources = state.kind === 'all' ? result.resources : result.resources.filter(item => item.kind === state.kind);
  const expanded = state.catalogExpanded;
  const visibleResources = expanded ? matchingResources : matchingResources.slice(0, state.initialCount);
  const variables = payload && resource?.kind === 'prompt' ? extractPromptVariables(payload.content.text) : [];
  const preview = payload ? resource?.kind === 'prompt' ? fillPromptVariables(payload.content.text, state.values) : payload.content.text : '';
  const metadata = resource?.metadata;
  const style = {
    '--library-safe-top': `${layout.safeAreaInsets.top}px`, '--library-safe-right': `${layout.safeAreaInsets.right}px`,
    '--library-safe-bottom': `${layout.safeAreaInsets.bottom}px`, '--library-safe-left': `${layout.safeAreaInsets.left}px`,
    ...(layout.maxHeight ? { '--library-host-max-height': `${layout.maxHeight}px` } : {}),
  } as React.CSSProperties;

  const feedback = <>
    {issue && <div className="library-feedback library-error" role="alert"><p>{issue}</p>{resource && <button onClick={() => void openResource(resource.id, false)} disabled={busy}>Actualizar ficha</button>}</div>}
    {notice && <p className="library-feedback library-notice" role="status">{notice}</p>}
    {manualCopy && <section className="library-manual-copy" aria-label="Copia manual"><h3>{manualCopy.label}</h3><pre ref={manualText} tabIndex={0}>{manualCopy.text}</pre></section>}
  </>;
  const copyLabel = (selected: PublicCatalogResource, kind: 'original' | 'prepared' | 'link', label: string) => <>
    {copiedAction === selected.id + ':' + kind ? <Check size={15} aria-hidden="true" /> : kind === 'link' ? <Link size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
    {copiedAction === selected.id + ':' + kind ? 'Copiado' : label}
  </>;

  return <main ref={root} style={style} className={`library-widget library-mode-${mode} library-view-${state.view} library-text-${state.textSize}${resource ? ' library-has-detail' : ''}${state.collapsed ? ' library-is-collapsed' : ''}${expanded ? ' library-is-expanded' : ''}`} onKeyDown={event => {
    if (event.key !== 'Escape' || busyRef.current) return;
    if (settingsOpen) { setSettingsOpen(false); settingsButton.current?.focus(); event.preventDefault(); }
    else if (state.collapsed) { setState(previous => ({ ...previous, collapsed: false })); event.preventDefault(); }
    else if (resource) { back(); event.preventDefault(); }
  }}>
    {state.collapsed ? <section className="library-collapsed" aria-label="Biblioteca reducida">
      <BookOpen size={18} aria-hidden="true" /><div><span>Biblioteca</span><strong>{resource?.metadata.title || 'Prompts y skills'}</strong></div>
      <button className="library-button" ref={reopenButton} disabled={busy} onClick={() => setState(previous => ({ ...previous, collapsed: false }))}>Reabrir</button>
      <button className="library-icon" aria-label="Cerrar Biblioteca" disabled={!ready || busy} onClick={() => void action(async () => { persistWidgetState(stateRef.current); await bridge.close(); })}><X size={18} /></button>
      <span className="library-sr-only" role="status">{notice}</span>
    </section> : <>
    <header className="library-header">
      <div className="library-brand"><BookOpen size={20} aria-hidden="true" /><h1>Biblioteca</h1></div>
      <div className="library-host-actions">
        <button ref={settingsButton} className="library-icon" aria-label="Ajustes de Biblioteca" title="Ajustes" aria-expanded={settingsOpen} aria-controls="library-settings" disabled={busy} onClick={() => setSettingsOpen(previous => !previous)}><Settings2 size={18} /></button>
        {resource && bridge.availableDisplayModes().includes(mode === 'fullscreen' ? 'inline' : 'fullscreen') && <button className="library-icon" aria-label={mode === 'fullscreen' ? 'Volver a vista compacta' : 'Ampliar Biblioteca'} title={mode === 'fullscreen' ? 'Vista compacta' : 'Ampliar'} disabled={busy || !ready} onClick={() => void action(async isCurrent => { const response = await bridge.requestDisplayMode(mode === 'fullscreen' ? 'inline' : 'fullscreen'); if (isCurrent()) setMode(response.mode); })}>{mode === 'fullscreen' ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>}
        <button className="library-icon" aria-label="Reducir Biblioteca" title="Reducir Biblioteca" disabled={busy} onClick={() => void action(isCurrent => reduce(isCurrent))}><Minimize2 size={18} /></button>
        <button className="library-icon" aria-label="Cerrar Biblioteca" title="Cerrar Biblioteca" disabled={!ready || busy} onClick={() => void action(async () => { persistWidgetState(stateRef.current); await bridge.close(); })}><X size={18} /></button>
      </div>
    </header>
    {settingsOpen && <section id="library-settings" className="library-settings" aria-label="Ajustes de Biblioteca">
      <h2>A tu manera</h2><p>Estas preferencias se recuerdan al reabrir Biblioteca.</p>
      <fieldset disabled={busy}><legend className="library-sr-only">Presentación y uso</legend>
        <label>Vista<select value={state.view} onChange={event => setState(previous => ({ ...previous, view: event.target.value as WidgetState['view'] }))}><option value="cards">Cartas</option><option value="list">Lista compacta</option></select></label>
        <label>Recursos al abrir<select value={state.initialCount} onChange={event => setState(previous => ({ ...previous, initialCount: Number(event.target.value) as WidgetState['initialCount'] }))}>{[2, 4, 6].map(count => <option key={count} value={count}>{count} recursos</option>)}</select></label>
        <label>Tamaño del texto<select value={state.textSize} onChange={event => setState(previous => ({ ...previous, textSize: event.target.value as WidgetState['textSize'] }))}><option value="normal">Normal</option><option value="large">Grande</option></select></label>
        <label className="library-setting-check"><input type="checkbox" checked={state.autoReduce} onChange={event => setState(previous => ({ ...previous, autoReduce: event.target.checked }))} />Reducir después de usar en el chat</label>
      </fieldset>
      <button className="library-button" disabled={busy} onClick={() => { setSettingsOpen(false); settingsButton.current?.focus(); }}>Listo</button>
    </section>}
    {!resource ? <section className="library-catalog" aria-label="Catálogo de recursos">
      {feedback}
      <form className="library-search" onSubmit={event => { event.preventDefault(); if (!busyRef.current) void search(stateRef.current); }}>
        <label className="library-sr-only" htmlFor="library-search">Buscar por tarea o recurso</label><Search size={18} aria-hidden="true" />
        <input id="library-search" ref={searchInput} value={state.query} disabled={busy} placeholder="¿Qué quieres conseguir?" maxLength={500} onChange={event => setState(previous => ({ ...previous, query: event.target.value }))} />
        <button type="submit" disabled={!ready || loading || busy}>Buscar</button>
      </form>
      <div className="library-catalog-controls"><div className="library-tabs" role="tablist" aria-label="Tipo de recurso">
        {(['all', 'prompt', 'skill'] as const).map(kind => <button key={kind} role="tab" id={`library-tab-${kind}`} aria-controls="library-resources" aria-selected={state.kind === kind} tabIndex={state.kind === kind ? 0 : -1} className={state.kind === kind ? 'is-selected' : ''} disabled={!ready || busy} onClick={() => applyFilters({ ...stateRef.current, kind })} onKeyDown={event => {
          const kinds: WidgetState['kind'][] = ['all', 'prompt', 'skill']; const index = kinds.indexOf(kind);
          const next = event.key === 'ArrowRight' ? kinds[(index + 1) % kinds.length] : event.key === 'ArrowLeft' ? kinds[(index + kinds.length - 1) % kinds.length] : event.key === 'Home' ? kinds[0] : event.key === 'End' ? kinds[2] : undefined;
          if (!next || busyRef.current) return; event.preventDefault(); applyFilters({ ...stateRef.current, kind: next }); document.getElementById(`library-tab-${next}`)?.focus();
        }}>{kind === 'all' ? 'Todo' : kind === 'prompt' ? 'Prompts' : 'Skills'}</button>)}
      </div><button className="library-filter-toggle" aria-expanded={filtersOpen} aria-controls="library-filters" disabled={busy} onClick={() => setFiltersOpen(previous => !previous)}>Filtros <ChevronDown size={15} /></button></div>
      {filtersOpen && <div className="library-filters" id="library-filters">
        <label>Tarea<select disabled={busy} value={state.category} onChange={event => applyFilters({ ...stateRef.current, category: event.target.value })}><option value="">Todas las tareas</option>{[...new Set([...categories, state.category].filter(Boolean))].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Herramienta<select disabled={busy} value={state.compatibility} onChange={event => applyFilters({ ...stateRef.current, compatibility: event.target.value })}><option value="">Todas las herramientas</option>{[...new Set([...tools, state.compatibility].filter(Boolean))].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Autor<input disabled={busy} value={state.author} list="library-authors" placeholder="Handle del creador" maxLength={128} onChange={event => setState(previous => ({ ...previous, author: event.target.value }))} onBlur={() => { if (!busyRef.current) void search(stateRef.current); }} /><datalist id="library-authors">{authors.map(value => <option key={value} value={value} />)}</datalist></label>
        <button className="library-text-button" disabled={busy} onClick={() => applyFilters({ ...stateRef.current, query: '', category: '', compatibility: '', author: '' })}>Limpiar filtros</button>
      </div>}
      <div id="library-resources" role="tabpanel" aria-labelledby={`library-tab-${state.kind}`} aria-busy={loading}>
        {loading && <p className="library-loading" role="status">{ready ? 'Buscando recursos…' : 'Conectando Biblioteca…'}</p>}
        {!loading && <p className="library-results-label">{result.total} {result.total === 1 ? 'recurso disponible' : 'recursos disponibles'}</p>}
        {!loading && !matchingResources.length && !issue && <div className="library-empty"><h2>{state.query || state.category || state.compatibility || state.author ? 'No encontramos esa capacidad' : `Aún no hay ${state.kind === 'skill' ? 'skills' : state.kind === 'prompt' ? 'prompts' : 'recursos'} disponibles`}</h2><p>{state.query || state.category || state.compatibility || state.author ? 'Prueba otra tarea o quita un filtro.' : 'Aquí aparecerán los recursos revisados y publicados.'}</p>{state.query || state.category || state.compatibility || state.author ? <button className="library-button" onClick={() => applyFilters({ ...stateRef.current, query: '', category: '', compatibility: '', author: '' })}>Quitar filtros</button> : null}</div>}
        <ul className="library-resource-list">{visibleResources.map(item => <li key={item.id}><article className={`library-resource library-resource-${item.kind}`} aria-labelledby={`library-title-${item.id}`}>
          <span className="library-resource-type">{item.kind === 'prompt' ? <Sparkles size={14} aria-hidden="true" /> : <Code2 size={14} aria-hidden="true" />}{item.kind === 'prompt' ? 'Prompt' : 'Skill'}</span>
          <h2 id={`library-title-${item.id}`}>{item.metadata.title}</h2><p className="library-card-summary" id={`library-summary-${item.id}`}>{item.metadata.summary}</p>
          <button className="library-card-open" data-open-id={item.id} disabled={busy || !ready} aria-label={`Abrir ficha: ${item.metadata.title}`} aria-describedby={`library-summary-${item.id}`} onClick={() => void openResource(item.id)} />
          <div className="library-card-actions"><button className="library-button" data-open-id={item.id} disabled={busy || !ready} aria-label={`Ver y preparar: ${item.metadata.title}`} onClick={() => void openResource(item.id)}>Ver y preparar</button><button className="library-button library-copy-quick" disabled={busy || !ready} aria-label={`Copiar original: ${item.metadata.title}`} onClick={() => void copy(item, 'original')}>{copyLabel(item, 'original', 'Copiar')}</button></div>
        </article></li>)}</ul>
        {!loading && result.total > 0 && !expanded && <button className="library-button library-view-all" disabled={busy || !ready} onClick={() => void expandCatalog()}>Ver todos ({result.total}) <Maximize2 size={15} aria-hidden="true" /></button>}
        {expanded && result.nextCursor && <button className="library-button library-more" disabled={loading || busy} onClick={() => void search(stateRef.current, true)}>Ver más recursos</button>}
        {expanded && <button className="library-button library-view-brief" disabled={busy || !ready} onClick={() => void compactCatalog()}><Minimize2 size={15} aria-hidden="true" /> Vista breve</button>}
      </div>
    </section> : metadata && <article className="library-detail" aria-labelledby="library-detail-title">
      <div className="library-detail-nav"><button className="library-back" disabled={busy} onClick={back}><ArrowLeft size={16} aria-hidden="true" /> Catálogo</button><button className="library-icon" disabled={busy} onClick={back} aria-label="Cerrar ficha" title="Cerrar ficha"><X size={18} /></button></div>
      {feedback}
      <div className="library-detail-intro"><div className="library-detail-type">{resource.kind === 'prompt' ? <Sparkles size={15} aria-hidden="true" /> : <Code2 size={15} aria-hidden="true" />}{resource.kind === 'prompt' ? 'Prompt' : 'Skill'}<span>{metadata.category}</span></div>
      <h2 className="library-detail-title" id="library-detail-title" ref={detailHeading} tabIndex={-1}>{metadata.title}</h2><p className="library-detail-summary">{metadata.summary}</p><p className="library-byline">Por <strong>{metadata.authorName}</strong>{metadata.authorHandle && ` (@${metadata.authorHandle.replace(/^@/, '')})`}</p></div>
      <div className="library-detail-grid"><section className="library-deliverable" aria-labelledby="library-deliverable-title"><h3 id="library-deliverable-title">{resource.kind === 'skill' ? 'SKILL.md' : 'Prepara el prompt'}</h3>
        <div className="library-deliverable-actions"><button className="library-button library-primary" disabled={busy || !ready} onClick={() => void useInChat()}>{busy ? 'Preparando…' : 'Usar en este chat'}</button><div className="library-copy-actions"><button className="library-button" disabled={busy || !ready} onClick={() => void copy(resource, 'original')}>{copyLabel(resource, 'original', resource.kind === 'skill' ? 'Copiar SKILL.md' : 'Copiar original')}</button>{resource.kind === 'prompt' && <button className="library-button" disabled={busy || !ready || !payload} onClick={() => void copy(resource, 'prepared')}>{copyLabel(resource, 'prepared', 'Copiar preparado')}</button>}</div></div>
        {!payload ? <p className="library-loading" role="status">{busy ? 'Obteniendo el contenido revisado…' : 'Actualiza la ficha para obtener su contenido revisado.'}</p> : <>
          {variables.length > 0 && <fieldset className="library-variables" disabled={busy}><legend>Completa los campos</legend>{variables.map(variable => <label key={variable}>{variable}<textarea ref={element => { if (element) variableInputs.current.set(variable, element); else variableInputs.current.delete(variable); }} rows={2} value={state.values[variable] || ''} maxLength={10000} placeholder={`Valor para ${variable}`} aria-invalid={missingVariables.includes(variable)} aria-describedby={missingVariables.includes(variable) ? `library-missing-${variable}` : undefined} onChange={event => { if (busyRef.current) return; setCopiedAction(''); setMissingVariables(previous => previous.filter(key => key !== variable)); setState(previous => ({ ...previous, values: { ...previous.values, [variable]: event.target.value } })); }} />{missingVariables.includes(variable) && <span className="library-field-error" id={`library-missing-${variable}`}>Completa este campo.</span>}</label>)}</fieldset>}
          <details className="library-content"><summary>{resource.kind === 'prompt' ? 'Vista previa' : 'Contenido del archivo'}</summary><pre ref={preparedText} tabIndex={0}>{preview}</pre></details>
          {payload.content.source === 'github' && <p className="library-version">Commit: {payload.content.repositoryCommit}</p>}
        </>}
        <div className="library-secondary-actions">{resource.kind === 'skill' && <button className="library-button" disabled={busy || !ready} onClick={() => void action(async isCurrent => { const data = await freshContent(resource, isCurrent); if (data.content.source === 'github') { if (!data.repositoryFolderUrl) throw new Error('La carpeta de esta versión no está disponible.'); await bridge.openLink(data.repositoryFolderUrl); } else { await bridge.downloadSkill(data.content.text, data.resource); if (isCurrent()) setNotice('Descarga de SKILL.md solicitada.'); } })}>{payload?.content.source === 'github' ? <ExternalLink size={15} /> : <Download size={15} />}{payload?.content.source === 'github' ? 'Abrir carpeta revisada' : 'Descargar SKILL.md'}</button>}<button className="library-text-button" disabled={busy || !ready} onClick={() => void copy(resource, 'link')}>{copyLabel(resource, 'link', 'Copiar enlace')}</button></div>
      </section><div className="library-detail-reading">
        <section className="library-detail-section"><h3>Qué consigues</h3><p>{metadata.outcome}</p></section>
        <details className="library-detail-section library-example"><summary>Ejemplo del creador</summary><div className="library-samples"><div><h4>Entrada</h4><pre tabIndex={0}>{metadata.exampleInput}</pre></div><div><h4>Resultado</h4><pre tabIndex={0}>{metadata.exampleOutput}</pre></div></div>
          <div className="library-links">{safeWidgetLink(metadata.imageUrl) && <button disabled={busy} onClick={() => void action(() => bridge.openLink(metadata.imageUrl))}>Ver imagen <ExternalLink size={14} /></button>}{safeWidgetLink(metadata.demoUrl) && <button disabled={busy} onClick={() => void action(() => bridge.openLink(metadata.demoUrl))}>Ver demo <ExternalLink size={14} /></button>}</div>
        </details>
        <section className="library-detail-section"><h3>{resource.kind === 'skill' ? 'Instalación y uso' : 'Cómo usarlo'}</h3><p className="library-preserve">{metadata.usage}</p></section>
        <dl className="library-details"><div><dt>Compatible con</dt><dd>{metadata.compatibility.join(', ')}</dd></div><div><dt>Requisitos</dt><dd>{metadata.requirements}</dd></div><div><dt>Condiciones de uso</dt><dd>{metadata.license}</dd></div><div><dt>Versión aprobada</dt><dd className="library-version">{resource.submissionId}</dd></div></dl>
        <p className="library-review-note">Muestra del creador. Revisa el contenido antes de usarlo; la publicación no certifica su ejecución en todos los modelos.</p>
        <button className="library-text-button library-web-link" disabled={busy} onClick={() => void action(() => bridge.openLink(resource.canonicalUrl))}>Abrir ficha en la web <ExternalLink size={14} /></button>
      </div></div>
    </article>}
    </>}
  </main>;
}

async function copyReviewedText(text: string, container: HTMLElement | null, isCurrent: () => boolean): Promise<boolean> {
  if (!isCurrent()) return false;
  if (navigator.clipboard?.writeText) { try { await navigator.clipboard.writeText(text); return isCurrent(); } catch { /* Sandboxed hosts can deny clipboard access. */ } }
  if (!isCurrent() || !container?.isConnected) return false;
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const input = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active : null;
  const inputSelection = input && input.selectionStart !== null && input.selectionEnd !== null ? { start: input.selectionStart, end: input.selectionEnd, direction: input.selectionDirection } : null;
  const selection = document.getSelection();
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : [];
  const scrollTop = container.scrollTop; const scrollLeft = container.scrollLeft;
  const textarea = document.createElement('textarea');
  textarea.value = text; textarea.readOnly = true; textarea.tabIndex = -1; textarea.setAttribute('aria-label', 'Texto temporal para copiar');
  textarea.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;pointer-events:none;font-size:16px;';
  try { container.appendChild(textarea); textarea.focus({ preventScroll: true }); textarea.select(); textarea.setSelectionRange(0, text.length); return document.execCommand('copy') === true && isCurrent(); }
  catch { return false; }
  finally {
    textarea.remove(); if (active?.isConnected) active.focus({ preventScroll: true });
    if (selection) { selection.removeAllRanges(); for (const range of ranges) if (range.startContainer.isConnected && range.endContainer.isConnected) selection.addRange(range); }
    if (input?.isConnected && inputSelection) input.setSelectionRange(inputSelection.start, inputSelection.end, inputSelection.direction || undefined);
    container.scrollTop = scrollTop; container.scrollLeft = scrollLeft;
  }
}

function message(error: unknown): string { return error instanceof Error ? error.message : 'No pudimos completar la acción. Vuelve a intentarlo.'; }
