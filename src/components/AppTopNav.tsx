import { BookOpen, FolderOpen, Users, Plus, ShieldCheck, ChevronDown, Sparkles, Code2 } from 'lucide-react';
import type { AppSection } from '../typesCommunity';

interface AppTopNavProps {
  currentSection: AppSection;
  promptsCount: number;
  libraryCount: number;
  postsCount: number;
  hackathonsCount: number;
  showcasesCount: number;
  newsCount?: number;
  showAdmin?: boolean;
  showGuidedMode?: boolean;
  onSectionChange: (section: AppSection) => void;
  onGuidedModeClick?: () => void;
}

const MAIN = [
  { id: 'explorar', label: 'Explorar', icon: BookOpen },
  { id: 'prompts', label: 'Prompts', icon: Sparkles },
  { id: 'skills', label: 'Skills', icon: Code2 },
  { id: 'creadores', label: 'Creadores', icon: Users },
  { id: 'mi-biblioteca', label: 'Mi Biblioteca', icon: FolderOpen },
  { id: 'publicar', label: 'Publicar', icon: Plus },
] as const;
const SECONDARY: { id: AppSection; label: string }[] = [
  { id: 'noticias', label: 'Noticias' }, { id: 'foro', label: 'Foro' },
  { id: 'hackathons', label: 'Hackathons' }, { id: 'galeria', label: 'Galería' },
  { id: 'progreso', label: 'Mi progreso' },
];

export default function AppTopNav({ currentSection, showAdmin, onSectionChange, showGuidedMode, onGuidedModeClick }: AppTopNavProps) {
  const active = currentSection === 'inicio' ? 'explorar' : currentSection;
  return (
    <nav className="biblioteca-nav" aria-label="Navegación principal">
      <div className="biblioteca-nav-inner">
        <div className="biblioteca-nav-main">
          {MAIN.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => onSectionChange(id)} aria-current={active === id ? 'page' : undefined}>
              <Icon size={17} aria-hidden="true" /><span>{label}</span>
            </button>
          ))}
          {showAdmin && <button type="button" onClick={() => onSectionChange('revisiones')} aria-current={active === 'revisiones' ? 'page' : undefined}><ShieldCheck size={17} aria-hidden="true" /><span>Revisiones</span></button>}
        </div>
        <details className="biblioteca-more">
          <summary>Más <ChevronDown size={15} aria-hidden="true" /></summary>
          <div className="biblioteca-more-menu">
            {SECONDARY.map(item => <button type="button" key={item.id} onClick={event => { onSectionChange(item.id); event.currentTarget.closest('details')?.removeAttribute('open'); }}>{item.label}</button>)}
            {showAdmin && <button type="button" onClick={() => onSectionChange('admin')}>Administración</button>}
            {showGuidedMode && <button type="button" onClick={onGuidedModeClick}>Guía de biblioteca</button>}
          </div>
        </details>
      </div>
    </nav>
  );
}
