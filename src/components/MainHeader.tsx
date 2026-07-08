import React from "react";
import type { User } from "firebase/auth";
import type { UserProfile } from "../types";
import type { AppSection } from "../typesCommunity";
import { Moon, Sun, BookOpen, UserCheck, ShieldCheck, LogOut, Zap } from "lucide-react";

interface MainHeaderProps {
  uiThemeMode: "dark" | "clear";
  setUiThemeMode: React.Dispatch<React.SetStateAction<"dark" | "clear">>;
  user: User | null;
  currentUserProfile: UserProfile | null;
  authLoading: boolean;
  isFounder: boolean;
  handleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  handleOpenProfileModal: () => void;
  setShowJoinClassModal: (show: boolean) => void;
  handleSectionChange: (section: AppSection) => void;
  buildProfileHandle: (user: User) => string;
}

export default function MainHeader({
  uiThemeMode,
  setUiThemeMode,
  user,
  currentUserProfile,
  authLoading,
  isFounder,
  handleSignIn,
  handleSignOut,
  handleOpenProfileModal,
  setShowJoinClassModal,
  handleSectionChange,
  buildProfileHandle
}: MainHeaderProps) {
  return (
    <header id="main-app-header" className="bg-[#1e293b]/75 border-b border-[#334155]/60 backdrop-blur-md px-3 py-2.5 sm:px-4 sm:py-3.5 md:px-12 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="app-logo-mark w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#4f46e5] to-[#ec4899] text-white flex items-center justify-center shadow-lg shadow-indigo-600/10 shrink-0">
          <Zap size={18} fill="currentColor" className="text-yellow-300 animate-pulse" />
        </div>
        <div className="min-w-0">
          <h1 className="font-extrabold text-white text-sm sm:text-md leading-tight font-sans tracking-tight flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-gradient-brand bg-gradient-to-r from-[#818cf8] to-[#ec4899] bg-clip-text text-transparent truncate">Biblioteca de Prompts</span>
            <span className="hidden sm:inline bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest leading-none shrink-0">
              Creadores IA
            </span>
          </h1>
          <p className="text-[10px] text-slate-400 font-sans hidden md:block">
            Red social + radar para guardar, remixear y compartir prompts
          </p>
        </div>
      </div>

      {/* Right Header Navigation - Auth State panel */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setUiThemeMode((current) => current === "clear" ? "dark" : "clear")}
          className="header-quiet-button inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/65 px-2.5 py-2.5 sm:px-3 text-xs font-black text-slate-200 shadow-lg shadow-slate-950/10 transition-all hover:border-cyan-400/40 hover:text-cyan-200 active:scale-[0.98] cursor-pointer"
          title={uiThemeMode === "clear" ? "Volver al modo oscuro" : "Activar modo claro"}
          aria-label={uiThemeMode === "clear" ? "Volver al modo oscuro" : "Activar modo claro"}
        >
          {uiThemeMode === "clear" ? <Moon size={14} /> : <Sun size={14} />}
          <span className="hidden sm:inline">{uiThemeMode === "clear" ? "Oscuro" : "Claro"}</span>
        </button>
        {user ? (
          <div className="header-account-panel flex items-center gap-1 sm:gap-2 bg-slate-900/60 p-1.5 sm:pr-2.5 md:pr-4 rounded-2xl border border-slate-800">
            {(currentUserProfile?.photoURL || user.photoURL) ? (
              <img
                src={currentUserProfile?.photoURL || user.photoURL || ""}
                referrerPolicy="no-referrer"
                alt={currentUserProfile?.displayName || user.displayName || "Usuario"}
                className="w-8 h-8 rounded-xl object-cover hover:rotate-6 transition-transform"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-650 to-pink-500 text-white font-bold rounded-xl flex items-center justify-center text-xs">
                {(currentUserProfile?.displayName || user.displayName)?.charAt(0) || "U"}
              </div>
            )}
            <div className="hidden lg:block text-left max-w-36">
              <p className="text-[10px] font-extrabold text-slate-200 leading-tight">
                {currentUserProfile?.displayName || user.displayName}
              </p>
              <p className="text-[8px] text-slate-400 leading-none">
                @{currentUserProfile?.handle || buildProfileHandle(user)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowJoinClassModal(true)}
              className="p-2 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-amber-500/15 hover:text-amber-300 rounded-lg border border-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Ingresar codigo de clase"
              aria-label="Ingresar codigo de clase"
            >
              <BookOpen size={12} />
              <span className="hidden md:inline">Clase</span>
            </button>
            <button
              type="button"
              id="btn-edit-profile"
              onClick={handleOpenProfileModal}
              className="p-2 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-indigo-500/15 hover:text-indigo-300 rounded-lg border border-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Editar perfil publico"
              aria-label="Editar perfil publico"
            >
              <UserCheck size={12} />
              <span className="hidden md:inline">Perfil</span>
            </button>
            {isFounder && (
              <button
                id="btn-founder-admin"
                type="button"
                onClick={() => handleSectionChange("admin")}
                className="p-2 sm:px-2.5 sm:py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg border border-indigo-400/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-lg shadow-indigo-800/10"
                title="Abrir panel admin"
                aria-label="Abrir panel admin"
              >
                <ShieldCheck size={12} />
                <span className="hidden md:inline">Admin</span>
              </button>
            )}
            <button
              id="btn-logout"
              onClick={handleSignOut}
              className="p-2 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-red-500/15 hover:text-red-400 rounded-lg border border-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Cerrar Sesión"
              aria-label="Cerrar sesion"
            >
              <LogOut size={12} />
              <span className="hidden md:inline">Cerrar</span>
            </button>
          </div>
        ) : (
          !authLoading && (
            <button
              id="btn-google-login"
              onClick={handleSignIn}
              className="ui-button-primary px-3 sm:px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
              aria-label="Crear mi biblioteca con Google"
            >
              <svg className="w-4 h-4 mr-0.5" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.62-.18-1.18-.46-1.59-.81z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              <span className="hidden min-[390px]:inline">Conectar Google</span>
              <span className="min-[390px]:hidden">Google</span>
            </button>
          )
        )}
      </div>
    </header>
  );
}
