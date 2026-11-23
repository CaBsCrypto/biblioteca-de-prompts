import type { LibraryOverview } from '../services/libraryClient';

const date = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });
const SOURCE_LABEL = { web: 'Web', chatgpt: 'ChatGPT', qr: 'QR' };

export function LibraryPilotStatus({ access, promptCount }: { access: LibraryOverview['access']; promptCount: number }) {
  const expiresAt = access.tier === 'pro' ? access.proExpiresAt : access.betaExpiresAt;
  return <section className="library-plan-status" aria-label="Acceso a tu biblioteca">
    <div>
      <strong>{access.tier === 'pro' ? 'Pro' : 'Gratis'}</strong>
      <span>{access.promptLimit === null ? `${promptCount} prompts guardados` : `${promptCount} de ${access.promptLimit} prompts guardados`}</span>
      {access.canMutate && expiresAt && <span>Acceso activo hasta el {date.format(new Date(expiresAt))}</span>}
      {!access.canMutate && <span>Tu ventana de prueba terminó. Tus guardados siguen disponibles.</span>}
    </div>
    <a className="library-plan-link" href="/checkout">{access.tier === 'pro' ? 'Gestionar acceso' : 'Canjear código'}</a>
  </section>;
}

export function LibraryActivityPanel({ items, onRefresh }: { items: LibraryOverview['activity']; onRefresh: () => void }) {
  return <section className="catalog-workspace library-activity-panel" aria-labelledby="library-activity-heading">
    <div className="catalog-results-heading">
      <h2 id="library-activity-heading">Actividad reciente</h2>
      <button type="button" className="catalog-button" onClick={onRefresh}>Actualizar</button>
    </div>
    {items.length ? <ul className="library-activity-list">{items.map(item => (
      <li key={item.id}>
        <strong>{item.title}</strong>
        <span>{item.action === 'saved' ? 'Guardado' : 'Usado'} en {SOURCE_LABEL[item.source]} · <time dateTime={item.at}>{date.format(new Date(item.at))}</time></span>
      </li>
    ))}</ul> : <p>Los recursos que guardes o uses aparecerán aquí.</p>}
  </section>;
}
