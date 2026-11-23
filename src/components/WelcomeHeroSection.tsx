import type { MouseEvent } from "react";
import { ArrowRight, BookMarked } from "lucide-react";
import type { User } from "firebase/auth";
import "./welcome-hero.css";

interface WelcomeHeroSectionProps {
  user: User | null;
  authLoading: boolean;
  onExplorePrompts?: () => void;
  onExploreSkills?: () => void;
  onSignIn?: () => void;
}

function navigateFromLink(event: MouseEvent<HTMLAnchorElement>, navigate?: () => void) {
  if (!navigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate();
}

export default function WelcomeHeroSection({
  user,
  authLoading,
  onExplorePrompts,
  onExploreSkills,
  onSignIn,
}: WelcomeHeroSectionProps) {
  if (user || authLoading) return null;

  return (
    <section className="welcome-hero" aria-labelledby="welcome-hero-title">
      <div className="welcome-hero-content">
        <h1 id="welcome-hero-title">Encuentra un prompt para tu próxima tarea.</h1>
        <p>Explora los recursos, revisa un ejemplo y prepara el texto que usarás en tu asistente de IA.</p>
      </div>
      <div className="welcome-hero-start">
        <div className="welcome-hero-actions">
          <a className="welcome-hero-primary" href="/prompts" onClick={event => navigateFromLink(event, onExplorePrompts)}>
            Explorar prompts <ArrowRight size={17} aria-hidden="true" />
          </a>
          {onSignIn && <button id="btn-hero-signup" type="button" className="welcome-hero-secondary" onClick={onSignIn}>
            <BookMarked size={17} aria-hidden="true" /> Crear mi Biblioteca
          </button>}
        </div>
        <p className="welcome-hero-note">Explora y copia sin cuenta.{onSignIn && " Con Google puedes guardar tus recursos."}</p>
        <a className="welcome-hero-skills" href="/skills" onClick={event => navigateFromLink(event, onExploreSkills)}>
          ¿Buscas instrucciones para tu agente? Ver skills <ArrowRight size={14} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
