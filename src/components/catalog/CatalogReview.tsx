import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { CheckCircle2, ExternalLink, ShieldCheck, XCircle } from 'lucide-react';
import { CatalogSubmission } from '../../typesCatalog';
import { buildSkillRepositoryUrl, validateCatalogDraft, verifySkillRepository } from '../../utils/catalog';
import { CatalogController, CatalogEmpty, CatalogNotification, CatalogSamples, safeCatalogUrl } from './CatalogWorkspace';

interface Props { catalog: CatalogController; user: User | null; onNotify: CatalogNotification }

export default function CatalogReview({ catalog, user, onNotify }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [checkedVersion, setCheckedVersion] = useState('');
  const [reviewChecks, setReviewChecks] = useState({ content: false, example: false, conditions: false });
  const selected = catalog.pending.find(item => item.id === selectedId) || catalog.pending[0];
  useEffect(() => { setRejectionReason(''); setError(''); setCheckedVersion(''); setReviewChecks({ content: false, example: false, conditions: false }); }, [selected?.id]);
  const validation = useMemo(() => selected ? validateCatalogDraft(selected, true) : [], [selected]);
  const busy = working || catalog.mutationBusy;
  function select(submission: CatalogSubmission) { setSelectedId(submission.id); setRejectionReason(''); setError(''); setCheckedVersion(''); setReviewChecks({ content: false, example: false, conditions: false }); }
  async function verify() {
    if (!selected) return;
    setWorking(true); setError('');
    try { await verifySkillRepository(selected.content); setCheckedVersion(selected.id); onNotify('Repositorio público y contenido de SKILL.md verificados.', 'success'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos verificar el repositorio.'); }
    finally { setWorking(false); }
  }
  async function decide(action: 'approve' | 'reject') {
    if (!selected) return;
    if (action === 'reject' && !rejectionReason.trim()) { setError('Indica un motivo para que el autor pueda corregir su recurso.'); return; }
    setWorking(true); setError('');
    try {
      if (action === 'approve') {
        await catalog.approve(selected);
      } else await catalog.reject(selected, rejectionReason);
      setSelectedId(''); setCheckedVersion(''); setRejectionReason(''); setReviewChecks({ content: false, example: false, conditions: false });
      onNotify(action === 'approve' ? 'Recurso aprobado y publicado en el catálogo.' : 'Revisión enviada al autor con el motivo.', 'success');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos completar la revisión.'); }
    finally { setWorking(false); }
  }
  if (!user || !catalog.isFounder) return <CatalogEmpty title="Revisión de publicaciones">La cola de revisión está disponible para el fundador de Biblioteca.</CatalogEmpty>;
  const requiresRepositoryCheck = selected?.kind === 'skill' && selected?.content.source === 'github';
  const approvalReady = Object.values(reviewChecks).every(Boolean) && !validation.length && (!requiresRepositoryCheck || checkedVersion === selected?.id);
  return <>
    <div className="catalog-page-heading"><p className="catalog-eyebrow">Control de publicación</p><h1>Revisar recursos</h1><p>Comprueba el contenido, su ejemplo y las condiciones de uso antes de hacerlos públicos.</p></div>
    {catalog.loadingPrivate && <p className="catalog-loading" role="status">Cargando postulaciones…</p>}
    {!selected ? <CatalogEmpty title="La cola está al día">Las nuevas postulaciones aparecerán aquí. Ningún borrador se publica automáticamente.</CatalogEmpty> : <div className="catalog-review-layout"><aside className="catalog-draft-sidebar"><h2>Pendientes · {catalog.pending.length}</h2><div className="catalog-draft-list">{catalog.pending.map(submission => <button key={submission.id} className={selected.id === submission.id ? 'is-active' : ''} disabled={busy} onClick={() => select(submission)}><span>{submission.kind === 'skill' ? 'Skill' : 'Prompt'}</span><strong>{submission.metadata.title}</strong><small>Por {submission.metadata.authorName}</small></button>)}</div></aside>
      <article className="catalog-review-content" key={selected.id}><span className={`catalog-kind catalog-kind-${selected.kind}`}>{selected.kind === 'skill' ? 'Skill' : 'Prompt'}</span><h2>{selected.metadata.title}</h2><p className="catalog-muted">Postulada por {selected.metadata.authorName}{selected.metadata.authorHandle && ` · @${selected.metadata.authorHandle.replace(/^@/, '')}`}</p><p className="catalog-muted">Cuenta Firebase: <code className="catalog-commit">{selected.ownerUid}</code></p><p>{selected.metadata.summary}</p><h3>Resultado esperado</h3><p>{selected.metadata.outcome}</p><div className="catalog-tags">{selected.metadata.compatibility.map(tool => <span key={tool}>{tool}</span>)}</div><CatalogSamples input={selected.metadata.exampleInput} output={selected.metadata.exampleOutput} /><h3>Contenido enviado</h3><pre className="catalog-review-code" tabIndex={0}>{selected.content.text}</pre><h3>Requisitos</h3><p className="catalog-preserve">{selected.metadata.requirements}</p><h3>Instrucciones de uso</h3><p className="catalog-preserve">{selected.metadata.usage}</p><h3>Condiciones de uso</h3><p className="catalog-preserve">{selected.metadata.license}</p><div className="catalog-actions">{safeCatalogUrl(selected.metadata.imageUrl) && <a className="catalog-link" href={safeCatalogUrl(selected.metadata.imageUrl)} target="_blank" rel="noopener noreferrer">Ver imagen del resultado <ExternalLink size={15} /></a>}{safeCatalogUrl(selected.metadata.demoUrl) && <a className="catalog-link" href={safeCatalogUrl(selected.metadata.demoUrl)} target="_blank" rel="noopener noreferrer">Ver demo <ExternalLink size={15} /></a>}</div>
        {requiresRepositoryCheck && <section className="catalog-repository-review"><h3>Paquete de la skill</h3><p>{selected.content.repositoryUrl}</p><p>Carpeta: <code>{selected.content.repositoryPath}</code></p><p>Commit: <code className="catalog-commit">{selected.content.repositoryCommit}</code></p><div className="catalog-actions"><button className="catalog-button" disabled={busy} onClick={() => void verify()}><ShieldCheck size={17} />{checkedVersion === selected.id ? 'Repositorio verificado' : 'Verificar repositorio y contenido'}</button>{!validation.length && <a className="catalog-link" href={safeCatalogUrl(buildSkillRepositoryUrl(selected.content))} target="_blank" rel="noopener noreferrer">Examinar carpeta completa <ExternalLink size={15} /></a>}</div></section>}
        {validation.length > 0 && <div className="catalog-error" role="alert"><strong>Esta versión necesita correcciones</strong><ul>{validation.map((issue, index) => <li key={index}>{issue}</li>)}</ul></div>}
        <fieldset className="catalog-review-checks"><legend>Revisión del contenido</legend><label><input type="checkbox" checked={reviewChecks.content} onChange={event => setReviewChecks(previous => ({ ...previous, content: event.target.checked }))} /> Revisé el texto y los archivos complementarios, si los hay.</label><label><input type="checkbox" checked={reviewChecks.example} onChange={event => setReviewChecks(previous => ({ ...previous, example: event.target.checked }))} /> La entrada y el resultado muestran lo que el recurso propone.</label><label><input type="checkbox" checked={reviewChecks.conditions} onChange={event => setReviewChecks(previous => ({ ...previous, conditions: event.target.checked }))} /> Los requisitos y las condiciones permiten su publicación gratuita.</label></fieldset>
        <p className="catalog-review-note">La aprobación publica esta versión exacta. No certifica su ejecución en todos los modelos.</p>
        <label className="catalog-field"><span>Motivo si necesita cambios (privado para el autor)</span><textarea rows={3} maxLength={2000} value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} placeholder="Qué necesita corregir antes de publicarse…" /></label>{error && <p className="catalog-error" role="alert">{error}</p>}<div className="catalog-actions"><button className="catalog-button catalog-primary" disabled={busy || !approvalReady} onClick={() => void decide('approve')}><CheckCircle2 size={17} />{busy ? 'Procesando…' : 'Aprobar y publicar'}</button><button className="catalog-button" disabled={busy || !rejectionReason.trim()} onClick={() => void decide('reject')}><XCircle size={17} />Solicitar cambios</button></div>
      </article>
    </div>}
  </>;
}
