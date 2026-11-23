import {lazy, StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import './biblioteca-shell.css';
import {AppStoreProvider} from './store/appStore';
import {publicSitePage} from './router/publicSiteRoutes';

const App = lazy(() => import('./App'));
const ChatGptLanding = lazy(() => import('./components/chatgpt/ChatGptLanding'));
const ChatGptConsentPage = lazy(() => import('./components/chatgpt/ChatGptConsentPage'));
const GuestComposerPage = lazy(() => import('./features/guestPrompt/GuestPromptPages').then(
  ({GuestComposerPage}) => ({default: GuestComposerPage}),
));
const GuestClaimPage = lazy(() => import('./features/guestPrompt/GuestPromptPages').then(
  ({GuestClaimPage}) => ({default: GuestClaimPage}),
));
const BillingPage = lazy(() => import('./features/billing/BillingPage'));

function BibliotecaRoot() {
  switch (publicSitePage(window.location.pathname)) {
    case 'chatgpt': return <ChatGptLanding />;
    case 'chatgpt-consent': return <ChatGptConsentPage />;
    case 'guest-create': return <GuestComposerPage />;
    case 'guest-receive': return <GuestClaimPage />;
    case 'billing': return <BillingPage />;
    default: return <AppStoreProvider><App /></AppStoreProvider>;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<p className="p-6 text-slate-700" role="status">Cargando Biblioteca…</p>}>
      <BibliotecaRoot />
    </Suspense>
  </StrictMode>,
);
