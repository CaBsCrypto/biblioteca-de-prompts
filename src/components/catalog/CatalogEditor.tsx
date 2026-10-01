import React, { useState } from 'react';
import { CheckCircle2, Clock3, FileUp, Plus, Save, Send, Trash2 } from 'lucide-react';
import { Prompt } from '../../types';
import { CatalogDraft, CatalogDraftInput, CatalogIdentity, CatalogKind, CatalogMetadata, CatalogResource } from '../../typesCatalog';
import { emptyCatalogDraft, MAX_PROMPT_LENGTH, MAX_SKILL_LENGTH, parseSkillMarkdown, validateCatalogDraft } from '../../utils/catalog';
import { CatalogController, CatalogNotification } from './CatalogWorkspace';

interface Props { catalog: CatalogController; identity: CatalogIdentity; ownPrompts: Prompt[]; onNotify: CatalogNotification; onOpenResource: (resource: CatalogResource) => void }
const fieldLabels: Partial<Record<keyof CatalogMetadata, string>> = { title: 'Título', summary: 'Problema que resuelve', outcome: 'Resultado que puedes conseguir', category: 'Tarea o categoría', requirements: 'Requisitos', usage: 'Instrucciones de uso', license: 'Condiciones de uso o licencia', exampleInput: 'Ejemplo de entrada', exampleOutput: 'Resultado de muestra', imageUrl: 'Imagen del resultado (URL opcional)', demoUrl: 'Demo (URL opcional)' };
const multilineFields = new Set(['outcome', 'requirements', 'usage', 'license', 'exampleInput', 'exampleOutput']);
const requiredFields = new Set(['title', 'summary', 'outcome', 'category', 'requirements', 'usage', 'license', 'exampleInput', 'exampleOutput']);
const statusText = { pending: 'Pendiente de revisión', approved: 'Aprobada', rejected: 'Necesita cambios' };

function timestampLabel(value: unknown): string {
  if (!value) return '';
  const candidate = value as { toDate?: () => Date; seconds?: number };
  const date = typeof candidate.toDate === 'function' ? candidate.toDate() : candidate.seconds ? new Date(candidate.seconds * 1000) : null;
  return date ? date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

export default function CatalogEditor({ catalog, identity, ownPrompts, onNotify, onOpenResource }: Props) {
  const [input, setInput] = useState<CatalogDraftInput>(() => emptyCatalogDraft(identity));
  const [draftId, setDraftId] = useState<string | undefined>();
  const [issues, setIssues] = useState<string[]>([]);
  const [working, setWorking] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [importedCredit, setImportedCredit] = useState('');
  const [tagText, setTagText] = useState('');
  const [toolText, setToolText] = useState('');
  const busy = working || catalog.mutationBusy;
  const currentPublication = catalog.myResources.find(resource => resource.id === draftId && resource.state === 'published');
  function setMetadata(key: keyof CatalogMetadata, value: string) { setInput(previous => ({ ...previous, metadata: { ...previous.metadata, [key]: value } })); setSavedNotice(''); }
  function reset(kind: CatalogKind = 'prompt') { setInput(emptyCatalogDraft(identity, kind)); setDraftId(undefined); setIssues([]); setSavedNotice(''); setTagText(''); setToolText(''); setImportedCredit(''); }
  function selectDraft(draft: CatalogDraft) { setInput({ kind: draft.kind, metadata: { ...draft.metadata }, content: { ...draft.content }, sourcePromptId: draft.sourcePromptId, sourceFolderId: draft.sourceFolderId }); setDraftId(draft.id); setIssues([]); setSavedNotice(''); setTagText(draft.metadata.tags.join(', ')); setToolText(draft.metadata.compatibility.join(', ')); setImportedCredit(''); }
  function importPrompt(promptId: string) {
    if (!promptId) { reset('prompt'); return; }
    const prompt = ownPrompts.find(item => item.id === promptId);
    if (!prompt) return;
    const fresh = emptyCatalogDraft(identity, 'prompt');
    setInput({ ...fresh, metadata: { ...fresh.metadata, title: prompt.title, summary: prompt.description || '', category: prompt.category, tags: [...prompt.tags], usage: prompt.forkedFromAuthorName ? 'Crédito del recurso original: ' + prompt.forkedFromAuthorName + (prompt.forkedFromAuthorHandle ? ' (@' + prompt.forkedFromAuthorHandle.replace(/^@/, '') + ')' : '') + (prompt.forkedFromTitle ? ' · ' + prompt.forkedFromTitle : '') + '.' : '' }, content: { ...fresh.content, text: prompt.promptText }, sourcePromptId: prompt.id, sourceFolderId: prompt.folderId || '' });
    setDraftId(undefined); setIssues([]); setSavedNotice(''); setTagText(prompt.tags.join(', ')); setToolText('');
    setImportedCredit(prompt.forkedFromAuthorName ? `Este prompt es un remix de ${prompt.forkedFromAuthorName}${prompt.forkedFromTitle ? `: «${prompt.forkedFromTitle}»` : ''}. Conserva ese crédito en las condiciones de uso.` : 'El prompt original permanece en tu biblioteca privada. Completa su muestra antes de postularlo.');
  }
  async function uploadSkill(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.name.toLowerCase() !== 'skill.md' || file.size > 200000) { setIssues(['Sube un archivo llamado SKILL.md de hasta 200 KB.']); return; }
    try {
      const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(await file.arrayBuffer());
      if (text.length > 50000) { setIssues(['SKILL.md debe tener hasta 50.000 caracteres. Usa el repositorio para los archivos complementarios.']); return; }
      let suggestion: { name: string; description: string } | null = null;
      try { suggestion = parseSkillMarkdown(text); } catch { /* Incomplete Markdown remains editable as a draft. */ }
      setInput(previous => ({ ...previous, content: { ...previous.content, text }, metadata: { ...previous.metadata, title: previous.metadata.title || suggestion?.name || '', summary: previous.metadata.summary || suggestion?.description || '' } }));
      setIssues([]); setSavedNotice('Archivo cargado. El texto se conserva tal como viene.');
    } catch { setIssues(['No pudimos leer este archivo. Puedes pegar su texto en el editor.']); }
  }
  async function save(postulate = false) {
    setIssues([]); setSavedNotice('');
    const validation = validateCatalogDraft(input, postulate);
    if (validation.length) { setIssues(validation); return; }
    setWorking(true);
    try {
      const saved = await catalog.saveDraft(input, draftId);
      setDraftId(saved.id);
      if (postulate) { await catalog.submitDraft(saved); setSavedNotice('Versión postulada. Tu borrador sigue disponible para futuros cambios.'); onNotify('Recurso enviado a revisión.', 'success'); }
      else { setSavedNotice('Borrador guardado. Solo tú puedes verlo.'); onNotify('Borrador guardado.', 'success'); }
    } catch (cause) { setIssues([cause instanceof Error ? cause.message : 'No pudimos guardar el recurso. Inténtalo de nuevo.']); }
    finally { setWorking(false); }
  }
  async function editPublication(resource: CatalogResource) {
    const draft = catalog.drafts.find(item => item.id === resource.id);
    if (draft) { selectDraft(draft); return; }
    setWorking(true);
    try {
      const approved = catalog.submissions.find(submission => submission.id === resource.submissionId && submission.status === 'approved');
      if (approved) {
        setInput({ kind: approved.kind, metadata: { ...approved.metadata }, content: { ...approved.content }, sourcePromptId: approved.sourcePromptId, sourceFolderId: approved.sourceFolderId }); setDraftId(resource.id); setTagText(approved.metadata.tags.join(', ')); setToolText(approved.metadata.compatibility.join(', ')); setIssues([]); setSavedNotice(resource.state === 'published' ? 'Editando una nueva versión. La actual sigue publicada.' : 'Borrador recuperado de la última versión aprobada. Postula de nuevo para volver a publicarlo.');
        return;
      }
      const payload = await catalog.fetchPayload(resource.id);
      if (!payload) throw new Error('No pudimos obtener la versión publicada.');
      if (payload.submissionId !== resource.submissionId || payload.kind !== resource.kind) throw new Error('La publicación cambió. Actualiza el catálogo y vuelve a abrir su nueva versión.');
      setInput({ kind: resource.kind, metadata: { ...resource.metadata }, content: { ...payload.content }, sourcePromptId: resource.sourcePromptId, sourceFolderId: resource.sourceFolderId }); setDraftId(resource.id); setTagText(resource.metadata.tags.join(', ')); setToolText(resource.metadata.compatibility.join(', ')); setIssues([]); setSavedNotice('Editando una nueva versión. La actual sigue publicada.');
    } catch (cause) { onNotify(cause instanceof Error ? cause.message : 'No pudimos abrir el recurso.', 'info'); }
    finally { setWorking(false); }
  }

  return <>
    <div className="catalog-page-heading"><p className="catalog-eyebrow">Tu conocimiento puede ayudar a alguien</p><h1>Publicar un recurso</h1><p>Cuenta qué hace, enseña un resultado y comparte las instrucciones para conseguirlo.</p></div>
    <div className="catalog-editor-layout"><aside className="catalog-draft-sidebar"><div className="catalog-sidebar-heading"><h2>Mis borradores</h2><button className="catalog-icon-button" disabled={busy} onClick={() => reset()} aria-label="Crear nuevo borrador"><Plus size={19} /></button></div>{catalog.loadingPrivate && <p role="status">Cargando borradores…</p>}{!catalog.drafts.length && <p className="catalog-muted">Tu primer recurso empieza aquí. Puedes guardar aunque aún falten campos.</p>}<div className="catalog-draft-list">{catalog.drafts.map(draft => <button key={draft.id} disabled={busy} className={draftId === draft.id ? 'is-active' : ''} onClick={() => selectDraft(draft)}><span>{draft.kind === 'skill' ? 'Skill' : 'Prompt'}</span><strong>{draft.metadata.title || 'Sin título'}</strong><small>Privado · {timestampLabel(draft.updatedAt)}</small></button>)}</div>{catalog.myResources.length > 0 && <><h2>Mis publicaciones</h2><div className="catalog-draft-list">{catalog.myResources.map(resource => <div key={resource.id} className="catalog-own-resource"><strong>{resource.metadata.title}</strong><span>{resource.state === 'published' ? 'Publicada' : 'Retirada'}</span><div className="catalog-actions"><button className="catalog-link" disabled={busy} onClick={() => void editPublication(resource)}>Nueva versión</button>{resource.state === 'published' && <><button className="catalog-link" onClick={() => onOpenResource(resource)}>Ver ficha</button><button className="catalog-link catalog-danger-text" disabled={busy} onClick={async () => { try { await catalog.withdraw(resource); onNotify('Publicación retirada del catálogo.', 'success'); } catch (cause) { onNotify(cause instanceof Error ? cause.message : 'No pudimos retirar la publicación.', 'info'); } }}>Retirar</button></>}</div></div>)}</div></>}</aside>
      <form className="catalog-editor" onSubmit={event => { event.preventDefault(); void save(); }}>
        <div className="catalog-editor-top"><div><h2>{draftId ? 'Editar borrador' : 'Nuevo borrador'}</h2><p>Los campos con * se completan antes de postular.</p></div><span className="catalog-private-label">Borrador privado</span></div>
        {currentPublication && <div className="catalog-info"><CheckCircle2 size={19} /><p>La versión aprobada sigue visible. Guardar o postular estos cambios no la modifica hasta recibir una nueva aprobación.</p></div>}
        <fieldset className="catalog-type-choice"><legend>Qué vas a compartir</legend>{(['prompt', 'skill'] as const).map(kind => <label key={kind} className={input.kind === kind ? 'is-active' : ''}><input type="radio" name="catalog-kind" value={kind} checked={input.kind === kind} disabled={!!draftId || busy} onChange={() => { setInput(previous => ({ ...previous, kind, sourcePromptId: kind === 'skill' ? '' : previous.sourcePromptId, sourceFolderId: kind === 'skill' ? '' : previous.sourceFolderId, content: { ...previous.content, source: 'inline', repositoryUrl: '', repositoryCommit: '', repositoryPath: '' } })); setIssues([]); }} /><strong>{kind === 'prompt' ? 'Prompt' : 'Skill'}</strong><span>{kind === 'prompt' ? 'Instrucciones para una tarea concreta' : 'Una capacidad lista para tu agente'}</span></label>)}</fieldset>
        {input.kind === 'prompt' && ownPrompts.length > 0 && <label className="catalog-field"><span>Partir de un prompt de Mi Biblioteca</span><select value={input.sourcePromptId} disabled={busy || !!draftId} onChange={event => importPrompt(event.target.value)}><option value="">Empezar desde cero</option>{ownPrompts.map(prompt => <option key={prompt.id} value={prompt.id}>{prompt.title}</option>)}</select></label>}{importedCredit && <p className="catalog-info">{importedCredit}</p>}
        <div className="catalog-fields-grid">{(['title', 'summary', 'outcome', 'category'] as const).map(key => <label className={`catalog-field ${key === 'summary' || key === 'outcome' ? 'catalog-field-full' : ''}`} key={key}><span>{fieldLabels[key]} *</span>{multilineFields.has(key) ? <textarea rows={3} value={input.metadata[key]} onChange={event => setMetadata(key, event.target.value)} maxLength={2000} /> : <input value={input.metadata[key]} onChange={event => setMetadata(key, event.target.value)} maxLength={key === 'summary' ? 1000 : key === 'title' ? 150 : 100} placeholder={key === 'category' ? 'Ej. Redacción, Programación, Investigación' : undefined} />}</label>)}<label className="catalog-field"><span>Herramientas compatibles *</span><input value={toolText} onChange={event => { setToolText(event.target.value); setInput(previous => ({ ...previous, metadata: { ...previous.metadata, compatibility: event.target.value.split(',').map(value => value.trim()).filter(Boolean) } })); }} placeholder="Claude, Codex, ChatGPT…" /><small>Separa cada herramienta con una coma.</small></label><label className="catalog-field"><span>Etiquetas</span><input value={tagText} onChange={event => { setTagText(event.target.value); setInput(previous => ({ ...previous, metadata: { ...previous.metadata, tags: event.target.value.split(',').map(value => value.trim()).filter(Boolean) } })); }} placeholder="Ej. SEO, resumen, accesibilidad" /><small>Separa cada etiqueta con una coma.</small></label></div>
        <section className="catalog-form-section"><h3>{input.kind === 'skill' ? 'Archivo de la skill' : 'Contenido del prompt'} *</h3><p>{input.kind === 'skill' ? 'Sube o pega SKILL.md completo, incluyendo su frontmatter YAML. El contenido se conserva y se entrega como texto.' : 'Incluye las variables entre dobles llaves: {{tema}}, {{audiencia}}…'}</p>{input.kind === 'skill' && <><label className="catalog-upload"><FileUp size={18} /> Cargar SKILL.md<input type="file" accept=".md,text/markdown,text/plain" onChange={uploadSkill} disabled={busy} /></label><label className="catalog-field"><span>Cómo se distribuye</span><select value={input.content.source} onChange={event => setInput(previous => ({ ...previous, content: { ...previous.content, source: event.target.value as 'inline' | 'github', ...(event.target.value === 'inline' ? { repositoryUrl: '', repositoryCommit: '', repositoryPath: '' } : {}) } }))}><option value="inline">Un único archivo SKILL.md</option><option value="github">Carpeta con scripts o referencias en GitHub</option></select></label></>}<label className="catalog-field"><span className="catalog-sr-only">{input.kind === 'skill' ? 'Texto completo de SKILL.md' : 'Texto del prompt'}</span><textarea className="catalog-code-editor" rows={13} value={input.content.text} spellCheck={false} maxLength={input.kind === 'skill' ? MAX_SKILL_LENGTH : MAX_PROMPT_LENGTH} onChange={event => setInput(previous => ({ ...previous, content: { ...previous.content, text: event.target.value } }))} placeholder={input.kind === 'skill' ? '---\nname: mi-skill\ndescription: Qué hace esta skill y cuándo usarla.\n---\n\n# Instrucciones\n…' : 'Actúa como…'} /><small>{input.content.text.length.toLocaleString('es-CL')} / {(input.kind === 'skill' ? MAX_SKILL_LENGTH : MAX_PROMPT_LENGTH).toLocaleString('es-CL')} caracteres</small></label>{input.kind === 'skill' && input.content.source === 'github' && <div className="catalog-repository-fields"><p>La carpeta completa debe estar en un repositorio público. La revisión comprueba que SKILL.md coincide con el texto y la versión que postulas.</p><label className="catalog-field"><span>Repositorio público *</span><input type="url" value={input.content.repositoryUrl} placeholder="https://github.com/usuario/repositorio" onChange={event => setInput(previous => ({ ...previous, content: { ...previous.content, repositoryUrl: event.target.value } }))} /></label><div className="catalog-fields-grid"><label className="catalog-field"><span>Commit completo *</span><input value={input.content.repositoryCommit} placeholder="SHA de 40 caracteres" maxLength={40} onChange={event => setInput(previous => ({ ...previous, content: { ...previous.content, repositoryCommit: event.target.value } }))} /></label><label className="catalog-field"><span>Ruta de la carpeta *</span><input value={input.content.repositoryPath} placeholder="skills/mi-skill" onChange={event => setInput(previous => ({ ...previous, content: { ...previous.content, repositoryPath: event.target.value } }))} /><small>Sin SKILL.md al final; usa . para la raíz.</small></label></div></div>}</section>
        <section className="catalog-form-section"><h3>Una muestra que ayude a elegir</h3><p>Comparte una entrada realista y un resultado representativo del recurso.</p><div className="catalog-fields-grid">{(['exampleInput', 'exampleOutput'] as const).map(key => <label className="catalog-field" key={key}><span>{fieldLabels[key]} *</span><textarea rows={6} maxLength={10000} value={input.metadata[key]} onChange={event => setMetadata(key, event.target.value)} /></label>)}</div></section>
        <section className="catalog-form-section"><h3>Lo que alguien necesita para usarlo</h3>{(['requirements', 'usage', 'license'] as const).map(key => <label className="catalog-field" key={key}><span>{fieldLabels[key]}{requiredFields.has(key) ? ' *' : ''}</span><textarea rows={key === 'usage' ? 4 : 2} maxLength={key === 'license' ? 2000 : key === 'usage' ? 20000 : 10000} value={input.metadata[key]} onChange={event => setMetadata(key, event.target.value)} placeholder={key === 'requirements' ? 'Herramientas, cuentas o conocimientos necesarios. Si no hay, indícalo.' : key === 'license' ? 'Ej. CC BY 4.0, MIT, o condiciones que autorizas para este recurso.' : undefined} /></label>)}<div className="catalog-fields-grid">{(['imageUrl', 'demoUrl'] as const).map(key => <label className="catalog-field" key={key}><span>{fieldLabels[key]}</span><input type="url" value={input.metadata[key]} placeholder="https://…" onChange={event => setMetadata(key, event.target.value)} /></label>)}</div></section>
        <p className="catalog-muted">Se publicará con el nombre {identity.name || identity.handle || 'de tu perfil'}. Los recursos son gratuitos; declara condiciones de uso que permitan compartirlos.</p>
        {issues.length > 0 && <div className="catalog-error" role="alert"><strong>Revisa estos puntos</strong><ul>{issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul></div>}{savedNotice && <p className="catalog-success" role="status"><CheckCircle2 size={18} />{savedNotice}</p>}
        <div className="catalog-editor-footer"><button type="submit" className="catalog-button" disabled={busy}><Save size={17} />{busy ? 'Procesando…' : 'Guardar borrador'}</button><button type="button" className="catalog-button catalog-primary" disabled={busy} onClick={() => void save(true)}><Send size={17} />Postular para revisión</button>{draftId && <button type="button" className="catalog-link catalog-danger-text" disabled={busy} onClick={async () => { const draft = catalog.drafts.find(item => item.id === draftId); if (!draft) return; try { await catalog.deleteDraft(draft); reset(); onNotify('Borrador eliminado.', 'success'); } catch (cause) { onNotify(cause instanceof Error ? cause.message : 'No pudimos eliminar el borrador.', 'info'); } }}><Trash2 size={15} />Eliminar borrador</button>}</div>
      </form>
    </div>
    <section className="catalog-history"><h2>Mis postulaciones</h2><p>La revisión corresponde al contenido exacto que enviaste. Los cambios posteriores quedan en el borrador.</p>{catalog.submissions.length ? <div className="catalog-history-list">{catalog.submissions.map(submission => <article key={submission.id}><div><strong>{submission.metadata.title}</strong><span>{submission.kind === 'skill' ? 'Skill' : 'Prompt'} · {timestampLabel(submission.submittedAt)}</span></div><span className={`catalog-status catalog-status-${submission.status}`}>{submission.status === 'pending' ? <Clock3 size={14} /> : <CheckCircle2 size={14} />}{statusText[submission.status]}</span>{submission.rejectionReason && <p className="catalog-rejection"><strong>Motivo de revisión:</strong> {submission.rejectionReason}</p>}</article>)}</div> : <p className="catalog-muted">Todavía no has enviado recursos a revisión.</p>}</section>
  </>;
}
