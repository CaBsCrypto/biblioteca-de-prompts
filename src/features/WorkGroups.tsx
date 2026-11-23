import { useEffect, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import type { GroupAction, GroupDetail, GroupReply, GroupSummary } from '../services/server/workGroups';
import { copyText } from '../utils/clipboard';

type Reply = GroupReply & { message?: string };
type PromptOption = { id: string; title: string; userId?: string };

async function request(user: User, input: GroupAction): Promise<Reply> {
  const response = await fetch('/api/work-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await user.getIdToken() },
    body: JSON.stringify(input),
  });
  const result: Reply = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.message || 'No pudimos acceder a tus grupos.'), { status: response.status });
  return result;
}

export function WorkGroups({ user, prompts, canShare = true }: { user: User; prompts: PromptOption[]; canShare?: boolean }) {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [detail, setDetail] = useState<GroupDetail>();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [invite, setInvite] = useState('');
  const [promptId, setPromptId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    request(user, { action: 'list' }).then(result => {
      if (active) setGroups(result.groups || []);
    }).catch(() => {
      if (active) setError('No pudimos cargar tus grupos. Puedes volver a intentar.');
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => { active = false; };
  }, [user]);

  async function run(input: GroupAction) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await request(user, input);
      if (input.action === 'create' || input.action === 'join' || input.action === 'list' || input.action === 'leave' || input.action === 'close') {
        const updated = input.action === 'list' ? result : await request(user, { action: 'list' });
        setGroups(updated.groups || []);
      }
      if (input.action === 'leave' || input.action === 'close') {
        setDetail(undefined);
        setInvite('');
      }
      if (input.action === 'create') setName('');
      if (input.action === 'join') setJoinCode('');
      if (input.action === 'invite' || input.action === 'revoke') {
        setInvite(result.code || '');
        if (input.action === 'revoke') setNotice('Invitación anulada.');
      }
      const id = result.group?.id || ('groupId' in input ? input.groupId : undefined);
      if (id && ['open', 'create', 'join', 'share', 'unshare', 'remove'].includes(input.action)) {
        const current = input.action === 'open' ? result : await request(user, { action: 'open', groupId: id });
        if (current.group && current.members && current.prompts) {
          setDetail({ group: current.group, members: current.members, prompts: current.prompts });
        }
        if (detail?.group.id !== id) {
          setInvite('');
          setPromptId('');
        }
        if (input.action === 'share') {
          setPromptId('');
          setNotice('Copia compartida.');
        }
      }
    } catch (error) {
      if (input.action === 'open' && error instanceof Error && 'status' in error && error.status === 404) {
        setGroups(current => current.filter(group => group.id !== input.groupId));
        if (detail?.group.id === input.groupId) {
          setDetail(undefined);
          setInvite('');
        }
      }
      setError(error instanceof Error ? error.message : 'Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent, action: GroupAction) {
    event.preventDefault();
    void run(action);
  }

  async function copy(value: string, message: string) {
    setError('');
    try {
      if (!await copyText(value)) throw new Error('copy_failed');
      setNotice(message);
    } catch {
      setError('No pudimos copiar. Selecciona el texto y cópialo manualmente.');
    }
  }

  const current = detail?.group.id;
  const owner = detail?.group.ownerId === user.uid;
  const mine = prompts.filter(prompt => prompt.userId === user.uid);
  const buttonClass = 'rounded-lg border border-current/20 px-3 py-2 text-sm disabled:opacity-50';
  const inputClass = 'min-w-0 flex-1 rounded-lg border border-current/20 bg-transparent px-3 py-2';
  return <section className="max-w-3xl space-y-5">
    <header><h2 className="text-xl font-semibold">Grupos de trabajo</h2><p>Elige qué prompts compartir con las personas de tu equipo.</p></header>
    {error && <p role="alert">{error}</p>}
    <p role="status">{busy ? 'Actualizando grupos…' : notice}</p>
    {!canShare && <p>Crear grupos, unirte y compartir copias está disponible con Pro.</p>}
    <fieldset disabled={busy} className="space-y-4">
      {canShare && <><form className="flex flex-wrap gap-2" onSubmit={event => submit(event, { action: 'create', name })}>
        <input className={inputClass} aria-label="Nombre del grupo" placeholder="Nombre del grupo" value={name} maxLength={80} onChange={event => setName(event.target.value)} required />
        <button className={buttonClass}>Crear grupo</button>
      </form>
      <form className="flex flex-wrap gap-2" onSubmit={event => submit(event, { action: 'join', code: joinCode.trim() })}>
        <input className={inputClass} aria-label="Código de invitación" placeholder="Código de invitación" autoComplete="off" value={joinCode} maxLength={64} onChange={event => setJoinCode(event.target.value)} required />
        <button className={buttonClass}>Unirme al grupo</button>
      </form></>}
      {groups.length ? <ul className="flex flex-wrap gap-2">{groups.map(group => <li key={group.id}>
        <button className={buttonClass} aria-pressed={current === group.id} onClick={() => void run({ action: 'open', groupId: group.id })}>{group.name}</button>
      </li>)}</ul> : !busy && <p>Todavía no tienes grupos.</p>}
      {error && <button className={buttonClass} onClick={() => void run({ action: 'list' })}>Recargar grupos</button>}
      {detail && current && <article className="space-y-4 rounded-xl border border-current/20 p-4">
        <h3 className="text-lg font-semibold">{detail.group.name}</h3>
        {owner && <div className="flex flex-wrap gap-2">
          {canShare && <button className={buttonClass} onClick={() => void run({ action: 'invite', groupId: current })}>Generar código</button>}
          <button className={buttonClass} onClick={() => void run({ action: 'revoke', groupId: current })}>Anular código</button>
          {invite && <>
            <input className={inputClass} aria-label="Código para compartir" readOnly value={invite} />
            <button className={buttonClass} onClick={() => void copy(invite, 'Código copiado.')}>Copiar código</button>
          </>}
          <p className="w-full text-sm">Cada código sirve una vez, caduca en 24 horas y reemplaza al anterior.</p>
        </div>}
        <h4 className="font-semibold">Miembros</h4>
        <ul className="space-y-2">{detail.members.map(member => <li key={member.id} className="flex flex-wrap items-center gap-2">
          {member.name}{member.id === detail.group.ownerId && ' (administración)'}
          {owner && member.id !== user.uid && <button className={buttonClass} onClick={() => {
            if (window.confirm('¿Retirar a esta persona y sus copias compartidas?')) void run({ action: 'remove', groupId: current, memberId: member.id });
          }}>Retirar a {member.name}</button>}
        </li>)}</ul>
        <h4 className="font-semibold">Prompts compartidos</h4>
        <p className="text-sm">El grupo recibe una copia del texto. Vuelve a compartir el prompt para actualizarla.</p>
        {canShare && mine.length > 0 && <form className="flex flex-wrap gap-2" onSubmit={event => submit(event, { action: 'share', groupId: current, promptId })}>
          <select className={inputClass} aria-label="Prompt para compartir" value={promptId} onChange={event => setPromptId(event.target.value)} required>
            <option value="">Selecciona un prompt</option>
            {mine.map(prompt => <option key={prompt.id} value={prompt.id}>{prompt.title}</option>)}
          </select>
          <button className={buttonClass}>Compartir copia</button>
        </form>}
        {!detail.prompts.length && <p>El grupo aún no tiene prompts compartidos.</p>}
        <ul className="space-y-3">{detail.prompts.map(prompt => <li key={prompt.id} className="space-y-2 rounded-lg border border-current/20 p-3">
          <details><summary>{prompt.title} · {prompt.authorName}</summary><pre className="whitespace-pre-wrap break-words py-2">{prompt.promptText}</pre></details>
          <button className={buttonClass} onClick={() => void copy(prompt.promptText, 'Prompt copiado.')}>Copiar prompt</button>
          {(owner || prompt.authorId === user.uid) && <button className={buttonClass} onClick={() => void run({ action: 'unshare', groupId: current, promptId: prompt.id })}>Retirar copia</button>}
        </li>)}</ul>
        <button className={buttonClass} onClick={() => {
          const message = owner ? '¿Cerrar el grupo y retirar todas sus copias compartidas?' : '¿Salir del grupo y retirar tus copias compartidas?';
          if (window.confirm(message)) void run({ action: owner ? 'close' : 'leave', groupId: current });
        }}>{owner ? 'Cerrar grupo' : 'Salir del grupo'}</button>
      </article>}
    </fieldset>
  </section>;
}
