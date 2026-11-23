import { useEffect, useRef, type MouseEvent } from 'react';
import { BookOpen, FolderOpen, Users, Plus, ShieldCheck, ChevronDown, Sparkles, Code2 } from 'lucide-react';
import { serializeLocation } from '../router/useAppRouter';
import type { AppSection } from '../typesCommunity';
import './AppTopNav.css';

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
  onJoinClassClick?: () => void;
}

const MAIN = [
  { id: 'explorar', label: 'Explorar', icon: BookOpen },
  { id: 'prompts', label: 'Prompts', icon: Sparkles },
  { id: 'skills', label: 'Skills', icon: Code2 },
  { id: 'mi-biblioteca', label: 'Mi Biblioteca', icon: FolderOpen },
] as const;
const SECONDARY: { id: AppSection; label: string }[] = [
  { id: 'creadores', label: 'Creadores' }, { id: 'publicar', label: 'Publicar' },
  { id: 'noticias', label: 'Noticias' }, { id: 'foro', label: 'Foro' },
  { id: 'hackathons', label: 'Hackathons' }, { id: 'galeria', label: 'Galería' },
  { id: 'progreso', label: 'Mi progreso' },
];

export default function AppTopNav({ currentSection, showAdmin, onSectionChange, showGuidedMode, onGuidedModeClick, onJoinClassClick }: AppTopNavProps) {
  const active = currentSection === 'inicio' ? 'explorar' : currentSection;
  const more = useRef<HTMLDetailsElement>(null);
  const moreSummary = useRef<HTMLElement>(null);
  const secondary = showAdmin ? [...SECONDARY,
    { id: 'revisiones' as const, label: 'Revisiones' },
    { id: 'admin' as const, label: 'Administración' },
  ] : SECONDARY;
  const currentSecondary = secondary.find(item => item.id === active);

  function closeMore(returnFocus = false) {
    if (!more.current?.open) return;
    more.current.open = false;
    if (returnFocus) moreSummary.current?.focus();
  }

  function navigate(event: MouseEvent<HTMLAnchorElement>, section: AppSection, fromMenu = false) {
    // Keep the normal link behavior for a new tab, copying the address, or modified clicks.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    closeMore(fromMenu);
    onSectionChange(section);
  }

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !more.current?.contains(event.target)) closeMore();
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);

  useEffect(() => { closeMore(); }, [currentSection]);

  return (
    <nav className="biblioteca-nav app-section-nav" aria-label="Navegación principal">
      <div className="app-section-nav__inner">
        <ul className="app-section-nav__main">
          {MAIN.map(({ id, label, icon: Icon }) => (
            <li key={id} className={id === 'explorar' ? 'app-section-nav__home' : undefined}>
              <a className="app-section-nav__link" href={serializeLocation({ section: id })} onClick={event => navigate(event, id)} aria-current={active === id ? 'page' : undefined}>
                <Icon size={18} aria-hidden="true" /><span>{label}</span>
              </a>
            </li>
          ))}
        </ul>
        <details ref={more} className="app-section-nav__more" data-secondary-current={Boolean(currentSecondary)} data-home-current={active === 'explorar'}
          onKeyDown={event => { if (event.key === 'Escape' && more.current?.open) { event.preventDefault(); event.stopPropagation(); closeMore(true); } }}
          onBlur={event => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) closeMore(); }}>
          <summary ref={moreSummary} aria-label={currentSecondary ? `Más secciones. Sección actual: ${currentSecondary.label}` : 'Más secciones'}>
            <span>Más</span><ChevronDown size={16} aria-hidden="true" />
          </summary>
          <div className="app-section-nav__menu">
            <p className="app-section-nav__menu-heading">Más en Biblioteca</p>
            <ul>
              <li className="app-section-nav__home-in-menu"><a href={serializeLocation({ section: 'explorar' })} aria-current={active === 'explorar' ? 'page' : undefined} onClick={event => navigate(event, 'explorar', true)}><BookOpen size={17} aria-hidden="true" />Explorar todo</a></li>
              {secondary.map(item => <li key={item.id}>
                <a href={serializeLocation({ section: item.id })} aria-current={active === item.id ? 'page' : undefined} onClick={event => navigate(event, item.id, true)}>
                  {item.id === 'creadores' && <Users size={17} aria-hidden="true" />}
                  {item.id === 'publicar' && <Plus size={17} aria-hidden="true" />}
                  {(item.id === 'revisiones' || item.id === 'admin') && <ShieldCheck size={17} aria-hidden="true" />}
                  {item.label}
                </a>
              </li>)}
              {onJoinClassClick && <li><button type="button" onClick={() => { closeMore(true); onJoinClassClick(); }}>Ingresar código de clase</button></li>}
              {showGuidedMode && onGuidedModeClick && <li className="app-section-nav__guide"><button type="button" onClick={() => { closeMore(true); onGuidedModeClick(); }}>Guía de biblioteca</button></li>}
            </ul>
          </div>
        </details>
      </div>
    </nav>
  );
}
