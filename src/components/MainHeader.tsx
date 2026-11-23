import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { User } from "firebase/auth";
import type { UserProfile } from "../types";
import type { AppSection } from "../typesCommunity";
import { BookOpen, ChevronDown, LogOut, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import "./MainHeader.css";

interface MainHeaderProps {
  uiThemeMode: "dark" | "clear";
  setUiThemeMode: Dispatch<SetStateAction<"dark" | "clear">>;
  user: User | null;
  currentUserProfile: UserProfile | null;
  authLoading: boolean;
  signingIn: boolean;
  isFounder: boolean;
  handleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  handleOpenProfileModal: () => void;
  setShowJoinClassModal: (show: boolean) => void;
  handleSectionChange: (section: AppSection) => void;
}

export default function MainHeader({
  uiThemeMode, setUiThemeMode, user, currentUserProfile, authLoading, signingIn, isFounder,
  handleSignIn, handleSignOut, handleOpenProfileModal, setShowJoinClassModal, handleSectionChange,
}: MainHeaderProps) {
  const account = useRef<HTMLDetailsElement>(null);
  const accountTrigger = useRef<HTMLElement>(null);
  const name = currentUserProfile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Mi cuenta";
  const themeLabel = uiThemeMode === "clear" ? "Activar modo oscuro" : "Activar modo claro";

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (account.current?.open && !account.current.contains(event.target as Node)) account.current.open = false;
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  function accountAction(action: () => void) {
    if (account.current) account.current.open = false;
    accountTrigger.current?.focus();
    action();
  }

  return (
    <header id="main-app-header" className="biblioteca-header relative z-30">
      <div className="biblioteca-header-inner">
        <a href="/" className="biblioteca-brand-link" onClick={event => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
          event.preventDefault();
          handleSectionChange("explorar");
        }}>
          <span className="app-logo-mark"><BookOpen size={20} aria-hidden="true" /></span>
          <span>Biblioteca</span>
        </a>

        <div className="biblioteca-header-actions">
          <button type="button" className="biblioteca-theme-toggle" title={themeLabel} aria-label={themeLabel}
            onClick={() => setUiThemeMode(current => current === "clear" ? "dark" : "clear")}>
            {uiThemeMode === "clear" ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}
          </button>
          {user ? (
            <details key={user.uid} className="biblioteca-account" ref={account} onKeyDown={event => {
              if (event.key === "Escape" && account.current?.open) {
                event.preventDefault();
                event.stopPropagation();
                account.current.open = false;
                accountTrigger.current?.focus();
              }
            }} onBlur={event => {
              if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
            }}>
              <summary ref={accountTrigger} aria-label={`Cuenta de ${name}`}>
                <span className="biblioteca-account-avatar" aria-hidden="true">{[...name][0]?.toUpperCase()}</span>
                <bdi className="biblioteca-account-name">{name}</bdi>
                <ChevronDown size={15} aria-hidden="true" />
              </summary>
              <div className="biblioteca-account-panel">
                <div className="biblioteca-account-identity">
                  <bdi>{name}</bdi>
                  {user.email && <bdi className="biblioteca-account-email">{user.email}</bdi>}
                </div>
                <button id="btn-edit-profile" type="button" onClick={() => accountAction(handleOpenProfileModal)}><UserRound size={16} aria-hidden="true" /> Editar perfil</button>
                <button type="button" onClick={() => accountAction(() => setShowJoinClassModal(true))}><BookOpen size={16} aria-hidden="true" /> Ingresar código de clase</button>
                {isFounder && <button id="btn-founder-admin" type="button" onClick={() => accountAction(() => handleSectionChange("admin"))}><ShieldCheck size={16} aria-hidden="true" /> Administración</button>}
                <button id="btn-logout" type="button" onClick={() => accountAction(() => void handleSignOut())}><LogOut size={16} aria-hidden="true" /> Cerrar sesión</button>
              </div>
            </details>
          ) : !authLoading && (
            <button id="btn-google-login" type="button" disabled={signingIn} className="biblioteca-google-login"
              onClick={() => void handleSignIn()}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18a11 11 0 0 0 0 9.86z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
              </svg>
              {signingIn ? "Abriendo Google…" : "Entrar con Google"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
