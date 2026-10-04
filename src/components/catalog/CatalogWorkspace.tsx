import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Code2, Search, SlidersHorizontal, Sparkles, Users, X } from 'lucide-react';
import { Prompt } from '../../types';
import { CatalogFilters, CatalogIdentity, CatalogKind, CatalogResource } from '../../typesCatalog';
import { useCatalog } from '../../hooks/useCatalog';
import { buildSkillRepositoryUrl, downloadSkill, filterCatalogResources } from '../../utils/catalog';
import CatalogDetail from './CatalogDetail';
import CatalogEditor from './CatalogEditor';
import CatalogReview from './CatalogReview';
import '../../catalog.css';

export type CatalogController = ReturnType<typeof useCatalog>;
export type CatalogNotification = (message: string, type: 'success' | 'info') => void;

interface Props {
  mode: 'explore' | 'creators' | 'publish' | 'review' | 'library';
  browseKind: CatalogKind | 'all';
  onBrowseKind: (kind: CatalogKind | 'all') => void;
  catalog: CatalogController;
  user: User | null;
  identity: CatalogIdentity;
  ownPrompts: Prompt[];
  onSignIn: () => void;
  onOpenResource: (resource: CatalogResource) => void;
  onUsePrompt: (prompt: Prompt) => void;
  onSavePrompt: (prompt: Prompt) => void | Promise<void>;
  onNotify: CatalogNotification;
  selectedResourceId?: string | null;
  selectedResourceKind?: CatalogKind | null;
  legacyShareId?: string;
  legacyCollectionId?: string;
  initialAuthorUid?: string;
  onCloseResource: () => void;
}

const initialFilters: Omit<CatalogFilters, 'kind'> = { query: '', category: '', compatibility: '', author: '' };
const PAGE_SIZE = 12;

export function safeCatalogUrl(value: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function CatalogEmpty({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="catalog-empty"><BookOpen size={30} aria-hidden="true" /><h2>{title}</h2><p>{children}</p></div>;
}

export function CatalogSamples({ input, output }: { input: string; output: string }) {
  return <div className="catalog-samples"><section><h3>Ejemplo de entrada</h3><pre>{input}</pre></section><section><h3>Resultado de muestra</h3><pre>{output}</pre></section></div>;
}

function ResourceCard({ resource, onOpen, onAuthor }: { resource: CatalogResource; onOpen: () => void; onAuthor: () => void }) {
  const { metadata, kind } = resource;
  return <article className={`catalog-card catalog-card-${kind}`}>
    <div className="catalog-card-top"><span className={`catalog-kind catalog-kind-${kind}`}>{kind === 'skill' ? <Code2 size={14} /> : <Sparkles size={14} />}{kind === 'skill' ? 'Skill' : 'Prompt'}</span><span className="catalog-category">{metadata.category}</span></div>
    <button className="catalog-card-title" onClick={onOpen}><h2>{metadata.title}</h2></button>
    <p className="catalog-card-summary">{metadata.summary}</p>
    <button className="catalog-card-preview" onClick={onOpen} aria-label={`Ver resultado de ${metadata.title}`}><span>Así se ve el resultado</span><p>{metadata.exampleOutput}</p></button>
    <div className="catalog-card-compatible">{metadata.compatibility.slice(0, 3).map(tool => <span key={tool}>{tool}</span>)}{metadata.compatibility.length > 3 && <span>+{metadata.compatibility.length - 3}</span>}</div>
    <div className="catalog-card-bottom"><button className="catalog-author" onClick={onAuthor}><span className="catalog-avatar">{(metadata.authorName || 'B').slice(0, 1).toUpperCase()}</span><span>{metadata.authorName || 'Creador'}</span></button><button className="catalog-link" onClick={onOpen}>Ver recurso <ArrowRight size={15} /></button></div>
  </article>;
}

export default function CatalogWorkspace(props: Props) {
  const { mode, catalog, user, identity, ownPrompts, onNotify, onSignIn, onOpenResource } = props;
  const [filters, setFilters] = useState(initialFilters);
  const kind = props.browseKind;
  const sectionLabel = kind === 'prompt' ? 'Prompts' : kind === 'skill' ? 'Skills' : '';
  const [page, setPage] = useState(1);
  const [selectedResource, setSelectedResource] = useState<CatalogResource | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [creatorUid, setCreatorUid] = useState('');
  const collectionResources = useMemo(() => props.legacyCollectionId ? catalog.resources.filter(resource => resource.sourceFolderId === props.legacyCollectionId) : catalog.resources, [catalog.resources, props.legacyCollectionId]);
  const typedResources = useMemo(() => kind === 'all' ? collectionResources : collectionResources.filter(resource => resource.kind === kind), [collectionResources, kind]);
  const filtered = useMemo(() => filterCatalogResources(typedResources, { ...filters, kind }), [typedResources, filters, kind]);
  const creatorResources = useMemo(() => creatorUid ? catalog.resources.filter(resource => resource.ownerUid === creatorUid) : [], [catalog.resources, creatorUid]);
  const creators = useMemo(() => {
    const grouped = new Map<string, { uid: string; identity: CatalogIdentity; resources: CatalogResource[] }>();
    for (const resource of catalog.resources) {
      const previous = grouped.get(resource.ownerUid);
      if (previous) previous.resources.push(resource);
      else grouped.set(resource.ownerUid, { uid: resource.ownerUid, identity: { name: resource.metadata.authorName, handle: resource.metadata.authorHandle, avatar: resource.metadata.authorAvatar }, resources: [resource] });
    }
    return [...grouped.values()].sort((a, b) => b.resources.length - a.resources.length);
  }, [catalog.resources]);
  const categories = useMemo(() => [...new Set(typedResources.map(resource => resource.metadata.category))].filter(Boolean).sort(), [typedResources]);
  const tools = useMemo(() => [...new Set(typedResources.flatMap(resource => resource.metadata.compatibility))].sort(), [typedResources]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageResources = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filters, kind]);
  useEffect(() => { setCreatorUid(props.initialAuthorUid || ''); setFilters(previous => ({ ...previous, author: props.initialAuthorUid || '' })); }, [props.initialAuthorUid]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  useEffect(() => {
    const resourceId = props.selectedResourceId;
    const legacyId = props.legacyShareId;
    if (!resourceId && !legacyId) { setSelectedResource(null); setDetailError(''); return; }
    let active = true;
    setDetailLoading(true);
    setDetailError('');
    setSelectedResource(null);
    const request = resourceId ? catalog.fetchResource(resourceId) : catalog.resolveLegacyShare(legacyId!);
    request.then(resource => {
      if (!active) return;
      if (!resource || (props.selectedResourceKind && resource.kind !== props.selectedResourceKind) || resource.state !== 'published') setDetailError('Este recurso no está disponible. Puede haber sido retirado o aún no tener una versión aprobada.');
      else setSelectedResource(resource);
    }).catch(() => { if (active) setDetailError('No pudimos cargar este recurso. Vuelve a intentarlo en unos momentos.'); }).finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [props.selectedResourceId, props.selectedResourceKind, props.legacyShareId, catalog.fetchResource, catalog.resolveLegacyShare]);

  const openAuthor = (uid: string) => { setFilters(previous => ({ ...previous, author: uid })); setCreatorUid(uid); };

  return <div className="catalog-workspace">
    {mode !== 'explore' && catalog.error && <div className="catalog-error" role="alert">{catalog.error}<button onClick={() => void catalog.refresh()}>Reintentar</button></div>}
    {mode === 'explore' && <>
      <section className="catalog-explore-heading"><div><p className="catalog-eyebrow">La biblioteca de lo que puedes hacer</p>{sectionLabel ? <h1>{sectionLabel}</h1> : <h1>Encuentra una tarea.<br /><span>Llévate cómo resolverla.</span></h1>}<p>{kind === 'prompt' ? 'Instrucciones para una tarea concreta. Mira el ejemplo, rellena las variables y crea tu remix.' : kind === 'skill' ? 'Capacidades para tu agente: desde un SKILL.md hasta una carpeta con scripts y referencias. Revisa los requisitos y cómo instalarla.' : 'Prompts y skills de la comunidad, con ejemplos para elegir antes de usar.'}</p></div><div className="catalog-heading-note"><BookOpen size={22} /><span>Acceso gratuito<br /><strong>Recursos revisados, resultados visibles</strong></span></div></section>
      <section className="catalog-search-panel" aria-label="Buscar y filtrar recursos">
        <label className="catalog-search"><Search size={23} aria-hidden="true" /><input aria-label="Buscar por tarea, título o palabra clave" placeholder="¿Qué quieres conseguir? Busca una tarea, un recurso o una idea…" value={filters.query} onChange={event => setFilters(previous => ({ ...previous, query: event.target.value }))} /></label>
        <div className="catalog-filter-row"><div className="catalog-kind-filter" role="group" aria-label="Tipo de recurso">{([['all', 'Todo'], ['prompt', 'Prompts'], ['skill', 'Skills']] as const).map(([kind, label]) => <button key={kind} className={props.browseKind === kind ? 'is-active' : ''} aria-pressed={props.browseKind === kind} onClick={() => props.onBrowseKind(kind)}>{label}</button>)}</div><SlidersHorizontal className="catalog-filter-icon" size={16} aria-hidden="true" /><label><span className="catalog-sr-only">Tarea o categoría</span><select value={filters.category} onChange={event => setFilters(previous => ({ ...previous, category: event.target.value }))}><option value="">Todas las tareas</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label><label><span className="catalog-sr-only">Herramienta compatible</span><select value={filters.compatibility} onChange={event => setFilters(previous => ({ ...previous, compatibility: event.target.value }))}><option value="">Todas las herramientas</option>{tools.map(tool => <option key={tool}>{tool}</option>)}</select></label><label><span className="catalog-sr-only">Creador</span><select value={filters.author} onChange={event => setFilters(previous => ({ ...previous, author: event.target.value }))}><option value="">Todos los creadores</option>{creators.map(creator => <option key={creator.uid} value={creator.uid}>{creator.identity.name || creator.identity.handle}</option>)}</select></label></div>
      </section>
      <div className="catalog-results-heading"><h2>{props.legacyCollectionId ? 'Colección compartida' : sectionLabel ? `${sectionLabel} para pasar a la acción` : 'Recursos para pasar a la acción'}</h2><span aria-live="polite">{catalog.loading ? 'Cargando catálogo…' : `${filtered.length} ${filtered.length === 1 ? 'recurso' : 'recursos'}`}</span>{Object.values(filters).some(value => value && value !== 'all') && <button className="catalog-link" onClick={() => setFilters(initialFilters)}>Limpiar filtros <X size={14} /></button>}</div>
      {catalog.error && <div className="catalog-error" role="alert">{catalog.error}<button onClick={() => void catalog.refresh()}>Reintentar</button></div>}
      {catalog.loading && !catalog.resources.length ? <div className="catalog-loading" role="status">Preparando la biblioteca…</div> : filtered.length ? <><div className="catalog-grid">{pageResources.map(resource => <ResourceCard key={resource.id} resource={resource} onOpen={() => onOpenResource(resource)} onAuthor={() => openAuthor(resource.ownerUid)} />)}</div>{pageCount > 1 && <div className="catalog-pagination" aria-label="Paginación del catálogo"><button disabled={page === 1} onClick={() => setPage(value => value - 1)} aria-label="Página anterior"><ChevronLeft size={18} /></button><span>Página {page} de {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage(value => value + 1)} aria-label="Página siguiente"><ChevronRight size={18} /></button></div>}</> : <CatalogEmpty title={props.legacyCollectionId && !collectionResources.length ? 'Colección no disponible' : typedResources.length ? 'Todavía no hay coincidencias' : sectionLabel ? `Aún no hay ${sectionLabel.toLowerCase()} publicados` : 'La próxima capacidad puede ser la tuya'}>{props.legacyCollectionId && !collectionResources.length ? 'Esta colección no tiene recursos con una versión aprobada disponible.' : typedResources.length ? 'Prueba otra tarea o amplía tus filtros para encontrar un recurso.' : 'Estamos preparando el catálogo. En Publicar puedes aportar un prompt o una skill con una muestra de su resultado para revisión.'}</CatalogEmpty>}
      <p className="catalog-review-note">Las muestras las aportan sus creadores. La revisión comprueba el contenido y su formato; los resultados pueden variar según el modelo y el contexto.</p>
    </>}
    {mode === 'creators' && <>
      <div className="catalog-page-heading"><p className="catalog-eyebrow">Personas detrás de los recursos</p><h1>Creadores</h1><p>Descubre quién comparte las capacidades que estás buscando.</p></div>
      {creatorUid && <div className="catalog-results-heading"><h2>{creators.find(creator => creator.uid === creatorUid)?.identity.name || 'Recursos del creador'}</h2><button className="catalog-link" onClick={() => setCreatorUid('')}><ChevronLeft size={16} /> Todos los creadores</button></div>}
      {catalog.loading && !catalog.resources.length ? <p className="catalog-loading" role="status">Cargando creadores…</p> : creatorUid ? creatorResources.length ? <div className="catalog-grid">{creatorResources.map(resource => <ResourceCard key={resource.id} resource={resource} onOpen={() => onOpenResource(resource)} onAuthor={() => undefined} />)}</div> : <CatalogEmpty title="Creador no disponible">Este creador todavía no tiene recursos con una versión aprobada disponible.</CatalogEmpty> : creators.length ? <div className="catalog-creators">{creators.map(creator => <button key={creator.uid} className="catalog-creator-card" onClick={() => setCreatorUid(creator.uid)}><span className="catalog-avatar catalog-avatar-large">{(creator.identity.name || 'B').slice(0, 1).toUpperCase()}</span><h2>{creator.identity.name || 'Creador'}</h2>{creator.identity.handle && <p>@{creator.identity.handle.replace(/^@/, '')}</p>}<span>{creator.resources.length} recursos publicados</span><span className="catalog-link">Explorar sus recursos <ArrowRight size={16} /></span></button>)}</div> : <CatalogEmpty title="Conoce a los próximos creadores">Los perfiles aparecerán cuando sus primeros recursos sean aprobados.</CatalogEmpty>}
    </>}
    {mode === 'publish' && (user ? <CatalogEditor key={user.uid} catalog={catalog} identity={identity} ownPrompts={ownPrompts} onNotify={onNotify} onOpenResource={onOpenResource} /> : <div className="catalog-signin"><Users size={32} /><h1>Comparte lo que sabes hacer</h1><p>Publica un prompt o una skill con un ejemplo de su resultado. Podrás guardar borradores y recibir la revisión antes de aparecer en el catálogo.</p><button className="catalog-button catalog-primary" onClick={onSignIn}>Ingresar para crear un borrador <ArrowRight size={16} /></button></div>)}
    {mode === 'review' && <CatalogReview catalog={catalog} user={user} onNotify={onNotify} />}
    {mode === 'library' && <section className="catalog-saved"><div className="catalog-results-heading"><h2>Mis skills guardadas</h2><span>{catalog.savedSkills.length} recursos</span></div>{!user ? <button className="catalog-button" onClick={onSignIn}>Ingresar para ver tus skills</button> : catalog.savedSkills.length ? <div className="catalog-grid">{catalog.savedSkills.map(skill => <article className="catalog-card" key={skill.id}><span className="catalog-kind catalog-kind-skill"><Code2 size={14} /> Skill</span><h3>{skill.metadata.title}</h3><p>{skill.metadata.summary}</p><p className="catalog-muted">Por {skill.metadata.authorName} · Versión guardada</p><div className="catalog-actions"><button className="catalog-button" onClick={() => { try { downloadSkill(skill.content); } catch { onNotify('No pudimos descargar la skill.', 'info'); } }}>Descargar SKILL.md</button>{skill.content.source === 'github' && <a className="catalog-link" href={safeCatalogUrl(buildSkillRepositoryUrl(skill.content))} target="_blank" rel="noopener noreferrer">Abrir repositorio <ArrowRight size={15} /></a>}</div></article>)}</div> : <p className="catalog-muted">Guarda una skill desde su ficha para tener su versión a mano.</p>}</section>}
    {(detailLoading || detailError || selectedResource) && <CatalogDetail resource={selectedResource} loading={detailLoading} error={detailError} catalog={catalog} user={user} onClose={props.onCloseResource} onSignIn={onSignIn} onUsePrompt={props.onUsePrompt} onSavePrompt={props.onSavePrompt} onNotify={onNotify} />}
  </div>;
}
