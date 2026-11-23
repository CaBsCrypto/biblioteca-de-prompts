import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, RefreshCw, UserRound } from 'lucide-react';
import type { CatalogContent } from '../../typesCatalog';
import type { PersonalLibraryAccess, PersonalLibraryProfile } from '../../services/server/personalLibrary';
import type { LibraryActivity } from '../../services/server/libraryActivity';
import { copyText, selectCopyText } from '../../utils/clipboard';
import { DRAFT_TITLE_LIMIT, isValidGuestDraft } from '../../features/guestPrompt/draftHandoffCrypto';
import type { LibraryBridge } from './bridge';
import './promptViews.css';

type LibraryTab = 'prompts' | 'skills' | 'activity';
type PromptSummary = { id: string; title: string };
type PersonalPrompt = PromptSummary & { promptText: string };
type SkillSummary = { id: string; title: string; summary: string; submissionId: string; authorName?: string; license?: string };
type PersonalSkill = SkillSummary & { content: CatalogContent };
type AccountPayload = { accountKey: string };
type PersonalPage = AccountPayload & { prompts: PromptSummary[]; nextCursor?: string; profile?: PersonalLibraryProfile; access?: PersonalLibraryAccess; count?: number };
type Selection = { kind: 'prompt'; item: PersonalPrompt } | { kind: 'skill'; item: PersonalSkill };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'No pudimos completar la acción. Intenta de nuevo.';
}

const tabLabels: Record<LibraryTab, string> = { prompts: 'Prompts', skills: 'Skills', activity: 'Actividad reciente' };
const tabs = Object.keys(tabLabels) as LibraryTab[];

export function PersonalLibraryWidget({ bridge, onBack }: { bridge: LibraryBridge; onBack?: () => void }) {
  const id = useId();
  const [prompts, setPrompts] = useState<PromptSummary[]>([]);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [activity, setActivity] = useState<LibraryActivity[]>([]);
  const [profile, setProfile] = useState<PersonalLibraryProfile>();
  const [access, setAccess] = useState<PersonalLibraryAccess>();
  const [count, setCount] = useState<number>();
  const [cursor, setCursor] = useState<string>();
  const [tab, setTab] = useState<LibraryTab>('prompts');
  const [selected, setSelected] = useState<Selection>();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [promptText, setPromptText] = useState('');
  const [issue, setIssue] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [manualCopy, setManualCopy] = useState<string>();
  const manualField = useRef<HTMLTextAreaElement>(null);
  const tabButtons = useRef(new Map<LibraryTab, HTMLButtonElement>());
  const accountKey = useRef<string | undefined>(undefined);
  const draftAccount = useRef<string | undefined>(undefined);
  const requestId = useRef('');
  const working = useRef(false);
  const revision = useRef(0);

  function clearPrivate() {
    setPrompts([]); setSkills([]); setActivity([]); setCursor(undefined); setSelected(undefined);
    setProfile(undefined); setAccess(undefined); setCount(undefined); setManualCopy(undefined);
    accountKey.current = undefined;
  }

  function clearDraft() {
    setTitle(''); setPromptText(''); setCreating(false); requestId.current = ''; draftAccount.current = undefined;
  }

  async function perform(work: (current: () => boolean) => Promise<void>) {
    if (working.current) return;
    working.current = true;
    const request = ++revision.current;
    const current = () => request === revision.current;
    setBusy(true); setIssue(''); setNotice(''); setManualCopy(undefined);
    try {
      await bridge.connect();
      if (current()) await work(current);
    } catch (error) {
      if (current()) { clearPrivate(); setIssue(errorMessage(error)); }
    } finally {
      if (current()) { working.current = false; setBusy(false); }
    }
  }

  function requireCurrentAccount(data: AccountPayload) {
    if (data.accountKey && data.accountKey === accountKey.current) return;
    clearDraft();
    clearPrivate();
    throw new Error('La cuenta conectada cambió. Pulsa Actualizar para abrir su biblioteca.');
  }

  async function loadSnapshot(current: () => boolean) {
    const [page, saved, recent] = await Promise.all([
      bridge.callPrivate<PersonalPage>('list_my_prompts', {}),
      bridge.callPrivate<AccountPayload & { skills: SkillSummary[] }>('list_my_skills', {}),
      bridge.callPrivate<AccountPayload & { activity: LibraryActivity[] }>('list_my_activity', {}),
    ]);
    if (!current()) return;
    if (!page.accountKey || page.accountKey !== saved.accountKey || page.accountKey !== recent.accountKey) {
      clearDraft();
      throw new Error('La cuenta conectada cambió. Pulsa Actualizar para abrir su biblioteca.');
    }
    if (draftAccount.current && draftAccount.current !== page.accountKey) clearDraft();
    accountKey.current = page.accountKey;
    setPrompts(page.prompts); setCursor(page.nextCursor); setSkills(saved.skills); setActivity(recent.activity);
    setProfile(page.profile); setAccess(page.access); setCount(page.count);
  }

  async function loadMore(current: () => boolean) {
    if (!cursor) return;
    const data = await bridge.callPrivate<PersonalPage>('list_my_prompts', { cursor });
    if (!current()) return;
    requireCurrentAccount(data);
    setPrompts(previous => [...previous, ...data.prompts.filter(prompt => !previous.some(item => item.id === prompt.id))]);
    setCursor(data.nextCursor);
  }

  useEffect(() => {
    const visibility = () => {
      revision.current += 1; working.current = false; setBusy(false); clearPrivate();
      clearDraft(); setIssue(''); setNotice('');
      if (document.visibilityState === 'visible') void perform(loadSnapshot);
    };
    document.addEventListener('visibilitychange', visibility);
    void perform(loadSnapshot);
    return () => { revision.current += 1; working.current = false; document.removeEventListener('visibilitychange', visibility); };
  }, [bridge]);

  useEffect(() => { if (manualCopy) selectCopyText(manualField.current); }, [manualCopy]);

  function open(kind: 'prompt' | 'skill', itemId: string) {
    return perform(async current => {
      if (kind === 'prompt') {
        const item = await bridge.callPrivate<PersonalPrompt & AccountPayload>('get_my_prompt', { id: itemId });
        if (!current()) return;
        requireCurrentAccount(item); setSelected({ kind, item });
      } else {
        const item = await bridge.callPrivate<PersonalSkill & AccountPayload>('get_my_skill', { id: itemId });
        if (!current()) return;
        requireCurrentAccount(item); setSelected({ kind, item });
      }
    });
  }

  function useSelected(selection: Selection, copying = false) {
    return perform(async current => {
      const item = await bridge.callPrivate<(PersonalPrompt | PersonalSkill) & AccountPayload>(
        selection.kind === 'prompt' ? 'get_my_prompt' : 'get_my_skill', { id: selection.item.id },
      );
      if (!current()) return;
      requireCurrentAccount(item);
      const text = 'promptText' in item ? item.promptText : item.content.text;
      if (copying) {
        if (await copyText(text)) { if (current()) setNotice('Contenido copiado.'); }
        else { if (current()) setManualCopy(text); return; }
      } else {
        await bridge.sendPersonalPrompt(text);
        if (current()) setNotice('Recurso enviado a la conversación.');
      }
      if (!current()) return;
      try {
        const response = await bridge.callPrivate<AccountPayload>('record_my_activity', {
          kind: selection.kind, resourceId: selection.item.id, requestId: crypto.randomUUID(),
        });
        if (!current()) return;
        requireCurrentAccount(response);
        const recent = await bridge.callPrivate<AccountPayload & { activity: LibraryActivity[] }>('list_my_activity', {});
        if (current()) { requireCurrentAccount(recent); setActivity(recent.activity); }
      } catch {
        if (current()) setNotice((copying ? 'Contenido copiado.' : 'Recurso enviado a la conversación.') + ' No se pudo actualizar la actividad.');
      }
    });
  }

  function save() {
    const draft = { title, promptText };
    if (!isValidGuestDraft(draft)) return;
    requestId.current ||= crypto.randomUUID();
    const requested = requestId.current;
    return perform(async current => {
      const response = await bridge.callPrivate<AccountPayload>('save_my_prompt', { draft, requestId: requested, expectedAccountKey: draftAccount.current });
      if (!current()) return;
      requireCurrentAccount(response);
      clearDraft();
      await loadSnapshot(current);
      if (current()) setNotice('Prompt guardado en Mi Biblioteca.');
    });
  }

  const characterLimit = access?.promptCharacterLimit ?? 10_000;
  const canCreate = Boolean(profile && (!access || (access.canMutate && (access.promptLimit === null || count === undefined || count < access.promptLimit))));
  const expiresAt = access?.tier === 'pro' ? access.proExpiresAt : access?.betaExpiresAt;

  return <main className="library-widget library-mode-inline library-extra">
    <header className="library-header">
      <div className="library-brand"><BookOpen size={20} aria-hidden="true" /><h1>Mi Biblioteca</h1></div>
      {profile && <div className="library-account"><UserRound size={18} aria-hidden="true" /><div><span>Cuenta conectada</span>
        {profile.displayName && <strong dir="auto">{profile.displayName}</strong>}{profile.maskedEmail && <bdi>{profile.maskedEmail}</bdi>}
      </div></div>}
    </header>
    <section className="library-personal" aria-busy={busy}>
      <div className="library-personal-toolbar">
        {onBack && <button type="button" className="library-text-button" onClick={onBack}><ArrowLeft size={15} aria-hidden="true" /> Catálogo público</button>}
        <button type="button" className="library-button" disabled={busy} onClick={() => void perform(loadSnapshot)}><RefreshCw size={15} aria-hidden="true" /> Actualizar</button>
      </div>
      {access && <div className="library-account-status" aria-label="Estado de tu biblioteca">
        <span>{access.tier === 'pro' ? 'Cuenta Pro' : 'Cuenta gratuita'}</span>
        {count !== undefined && <span>{count}{access.promptLimit === null ? '' : ` de ${access.promptLimit}`} prompts guardados</span>}
        <span>Hasta {characterLimit.toLocaleString('es')} caracteres por prompt</span>
        {expiresAt && <span>Acceso hasta {new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(expiresAt))}</span>}
        {!access.canMutate && <p>El guardado está pausado para esta cuenta. Tus recursos siguen disponibles.</p>}
        {access.canMutate && !canCreate && <p>Alcanzaste el límite de prompts guardados de tu cuenta.</p>}
      </div>}
      {issue && <p className="library-feedback library-error" role="alert">{issue}</p>}
      {notice && <p className="library-feedback library-notice" role="status">{notice}</p>}
      {manualCopy && <label className="library-personal-form">Copia manual<textarea ref={manualField} readOnly value={manualCopy} rows={5} /></label>}
      <div className="library-personal-tabs" role="tablist" aria-label="Recursos de Mi Biblioteca">{tabs.map(value => <button key={value} ref={button => { if (button) tabButtons.current.set(value, button); else tabButtons.current.delete(value); }}
        type="button" role="tab" id={`${id}-${value}-tab`} aria-controls={`${id}-panel`} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1}
        disabled={busy} onClick={() => { setTab(value); setCreating(false); setSelected(undefined); setManualCopy(undefined); }} onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(value) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
          setTab(tabs[next]); setCreating(false); setSelected(undefined); setManualCopy(undefined); tabButtons.current.get(tabs[next])?.focus();
        }}>{tabLabels[value]}</button>)}</div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}-tab`}>
        {creating && profile ? <form className="library-personal-form" onSubmit={event => { event.preventDefault(); void save(); }}>
          <label>Título<input required value={title} maxLength={DRAFT_TITLE_LIMIT} disabled={busy} onChange={event => { setTitle(event.target.value); requestId.current = ''; }} /></label>
          <label>Prompt<textarea required value={promptText} maxLength={characterLimit} disabled={busy} onChange={event => { setPromptText(event.target.value); requestId.current = ''; }} /></label>
          <p className="library-notice">{promptText.length.toLocaleString('es')} de {characterLimit.toLocaleString('es')} caracteres</p>
          <div className="library-personal-actions"><button className="library-button" disabled={busy || !canCreate || promptText.length > characterLimit || !isValidGuestDraft({ title, promptText })}>Guardar en Mi Biblioteca</button>
            <button type="button" className="library-button" disabled={busy} onClick={clearDraft}>Cancelar</button></div>
        </form> : selected ? <>
          <h2>{selected.item.title}</h2>
          {selected.kind === 'skill' && <><p>{selected.item.summary}</p><p className="library-version">Versión guardada: {selected.item.submissionId}</p>
            {selected.item.authorName && <p>Por {selected.item.authorName}</p>}{selected.item.license && <p>{selected.item.license}</p>}</>}
          <pre className="library-personal-text">{selected.kind === 'prompt' ? selected.item.promptText : selected.item.content.text}</pre>
          <div className="library-personal-actions"><button className="library-button" disabled={busy} onClick={() => void useSelected(selected)}>Usar en el chat</button>
            <button className="library-button" disabled={busy} onClick={() => void useSelected(selected, true)}>{selected.kind === 'skill' ? 'Copiar SKILL.md' : 'Copiar prompt'}</button>
            <button className="library-button" disabled={busy} onClick={() => { setSelected(undefined); setNotice(''); setManualCopy(undefined); }}>Volver a {tabLabels[tab].toLowerCase()}</button></div>
        </> : tab === 'prompts' ? <>
          <div className="library-personal-actions"><button className="library-button" disabled={busy || !canCreate} onClick={() => { draftAccount.current = accountKey.current; setCreating(true); }}>Crear prompt</button></div>
          {busy && prompts.length === 0 ? <p role="status">Cargando tus prompts…</p> : !issue && prompts.length === 0 ? <p>Todavía no tienes prompts guardados.</p> : null}
          <ul className="library-personal-list">{prompts.map(prompt => <li key={prompt.id}><button className="library-button" disabled={busy} onClick={() => void open('prompt', prompt.id)}>{prompt.title}</button></li>)}</ul>
          {cursor && <button className="library-button" disabled={busy} onClick={() => void perform(loadMore)}>Ver más prompts</button>}
        </> : tab === 'skills' ? <>
          {!busy && !issue && skills.length === 0 && <p>Guarda una skill desde su ficha del catálogo para encontrarla aquí.</p>}
          <ul className="library-personal-list">{skills.map(skill => <li key={skill.id}><button className="library-button" disabled={busy} onClick={() => void open('skill', skill.id)}><strong>{skill.title}</strong><span>{skill.summary}</span></button></li>)}</ul>
          {skills.length === 50 && <p className="library-notice">Se muestran tus 50 skills guardadas más recientes.</p>}
        </> : <>
          {!busy && !issue && activity.length === 0 && <p>Cuando guardes o uses un recurso, su actividad aparecerá aquí.</p>}
          <ol className="library-activity-list">{activity.map(event => <li key={event.id}><div><strong>{event.title}</strong><span>{event.action === 'saved' ? 'Guardado' : 'Usado'} · {event.kind === 'skill' ? 'Skill' : 'Prompt'} · {event.source === 'chatgpt' ? 'ChatGPT' : event.source === 'qr' ? 'QR' : 'Web'}</span></div>
            <time dateTime={event.at}>{new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.at))}</time></li>)}</ol>
        </>}
      </div>
    </section>
  </main>;
}
