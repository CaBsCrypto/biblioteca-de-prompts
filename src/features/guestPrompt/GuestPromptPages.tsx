import { lazy, Suspense, type ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import { GuestPromptEditor } from './GuestPromptEditor';
import { publishGuestTransfer } from './guestTransferApi';

const ClaimContent = lazy(() => import('./GuestPromptClaim').then(module => ({ default: module.GuestPromptClaim })));

function GuestShell({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return <div className="guest-page">
    <header className="guest-site-header">
      <a href="/" className="guest-brand"><span><BookOpen size={19} aria-hidden="true" /></span>Biblioteca</a>
    </header>
    <main className="guest-content">
      <div className="guest-page-heading">
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
      {children}
    </main>
  </div>;
}

export function GuestComposerPage() {
  return <GuestShell title="Crea un prompt" intro="Usa una plantilla o empieza desde cero. Tu borrador permanece en esta pestaña hasta que decidas copiarlo o enviarlo a otro dispositivo.">
    <GuestPromptEditor claimOrigin={window.location.origin} publishTransfer={publishGuestTransfer} />
  </GuestShell>;
}

export function GuestClaimPage() {
  return <GuestShell title="Recupera tu borrador">
    <Suspense fallback={<p className="guest-muted" role="status">Abriendo el borrador…</p>}><ClaimContent /></Suspense>
  </GuestShell>;
}
