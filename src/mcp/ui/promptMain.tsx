import { createRoot } from 'react-dom/client';
import { PromptViews } from './promptViews';

const mount = document.getElementById('biblioteca-prompts');
if (!mount) throw new Error('No se encontró el panel de prompts.');
createRoot(mount).render(<PromptViews view={mount.dataset.bibliotecaExtra === 'personal' ? 'personal' : 'guest'}
  claimOrigin={mount.dataset.claimOrigin ?? 'https://biblioteca.browns.studio'} />);
