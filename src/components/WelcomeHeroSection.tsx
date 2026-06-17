import React from "react";
import { ArrowRight, Newspaper, GitFork, BookOpen, Sparkles, StickyNote, Share2, TrendingUp, Search, Plus, Play, Copy } from "lucide-react";
import type { User } from "firebase/auth";
import type { Prompt, CategoryFilter } from "../types";
import type { Briefing, HackathonOpportunity } from "../typesCommunity";

interface WelcomeHeroSectionProps {
  user: User | null;
  authLoading: boolean;
  handleSignIn: () => void;
  handleSectionChange: (section: any) => void;
  setShowJoinClassModal: (show: boolean) => void;
  visibleCommunityCatalogPromptsCount: number;
  forumPostsCount: number;
  hackathons: HackathonOpportunity[];
  showcasePostsCount: number;
  loadingPublicBriefings: boolean;
  publicBriefings: Briefing[];
  openPublicBriefing: (briefing: Briefing) => void;
  publicShowcaseSearch: string;
  setPublicShowcaseSearch: (search: string) => void;
  publicShowcaseCategory: CategoryFilter;
  setPublicShowcaseCategory: (cat: CategoryFilter) => void;
  filteredShowcasePrompts: Prompt[];
  handleCopyFilledPrompt: (prompt: Prompt) => void;
  handleUsePrompt: (prompt: Prompt, context: string) => void;
  PUBLIC_SHOWCASE_CATEGORIES: CategoryFilter[];
}

export default function WelcomeHeroSection({
  user,
  authLoading,
  handleSignIn,
  handleSectionChange,
  setShowJoinClassModal,
  visibleCommunityCatalogPromptsCount,
  forumPostsCount,
  hackathons,
  showcasePostsCount,
  loadingPublicBriefings,
  publicBriefings,
  openPublicBriefing,
  publicShowcaseSearch,
  setPublicShowcaseSearch,
  publicShowcaseCategory,
  setPublicShowcaseCategory,
  filteredShowcasePrompts,
  handleCopyFilledPrompt,
  handleUsePrompt,
  PUBLIC_SHOWCASE_CATEGORIES
}: WelcomeHeroSectionProps) {
  if (user || authLoading) return null;

  return (
    <div id="welcome-callout" className="ui-card surface-card public-hero-surface bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-white rounded-2xl md:rounded-3xl p-5 md:p-12 shadow-2xl border border-slate-700/80 space-y-6 relative overflow-hidden max-w-5xl mx-auto">
      <div className="space-y-3 relative z-10 max-w-3xl">
        <span className="font-extrabold uppercase tracking-widest text-[9px] text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.12)]">
          Empieza por aquí
        </span>
        <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-tight">
          Crea tu biblioteca privada, guarda remixes y prueba el radar de oportunidades IA.
        </h2>
        <p className="ui-text-muted text-slate-350 text-sm leading-relaxed font-sans max-w-2xl">
          ¿Vas a enseñar Inteligencia Artificial en YouTube? Esta biblioteca te permite tener todas las plantillas de instrucciones organizadas en un solo lugar. Rellena variables en vivo para tus espectadores y optimiza cualquier prompt básico al instante mediante el Asistente IA de Gemini.
        </p>
        <p className="ui-text-muted text-slate-350 text-sm leading-relaxed font-sans max-w-2xl">
          Ruta beta recomendada: entra con Google, elige un pack pequeño, guarda un prompt público como remix privado y déjanos feedback en el Foro. Nada se publica sin tu permiso.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 pt-2 relative z-10 min-[430px]:grid-cols-2 md:flex md:flex-wrap">
        <button
          id="btn-callout-login"
          onClick={handleSignIn}
          className="ui-button-primary px-5 py-3 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer min-[430px]:col-span-2 md:col-span-1"
          aria-label="Crear mi biblioteca privada con Google"
        >
          <span>Crear mi biblioteca</span>
          <ArrowRight size={14} className="text-white" />
        </button>
        <button
          type="button"
          onClick={() => handleSectionChange("noticias")}
          className="px-5 py-3 bg-cyan-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-600/10 active:scale-[0.98] cursor-pointer min-h-11"
        >
          <Newspaper size={14} />
          <span>Explorar radar</span>
        </button>
        <button
          type="button"
          onClick={() => handleSectionChange("prompts")}
          className="ui-button-secondary px-5 py-3 border font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
        >
          <GitFork size={14} />
          <span>Remixear prompts</span>
        </button>
        <button
          type="button"
          onClick={() => setShowJoinClassModal(true)}
          className="px-5 py-3 bg-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-amber-400 transition-all shadow-lg shadow-amber-700/10 active:scale-[0.98] cursor-pointer min-h-11"
        >
          <BookOpen size={14} />
          <span>Tengo código de clase</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-5 border-t border-slate-700/60 relative z-10">
        {[
          { label: "Prompts públicos", value: visibleCommunityCatalogPromptsCount },
          { label: "Posts de comunidad", value: forumPostsCount },
          { label: "Hackathons", value: hackathons.length },
          { label: "Galería", value: showcasePostsCount }
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-950/35 p-3">
            <p className="text-xl font-black text-white">{metric.value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t border-slate-700/60 relative z-10 text-xs">
        <div className="space-y-1">
          <h4 className="font-extrabold text-cyan-300 flex items-center gap-1">
            <TrendingUp size={14} /> 1. Detecta señales
          </h4>
          <p className="text-slate-400 leading-relaxed font-sans">
            Lee tendencias IA, devtools, diseño y hackathons desde el radar.
          </p>
        </div>
        <div className="space-y-1">
          <h4 className="font-extrabold text-amber-300 flex items-center gap-1">
            <StickyNote size={14} /> 2. Guarda ideas
          </h4>
          <p className="text-slate-400 leading-relaxed font-sans">
            Conserva oportunidades para volver cuando quieras crear contenido.
          </p>
        </div>
        <div className="space-y-1">
          <h4 className="font-extrabold text-pink-400 flex items-center gap-1">
            <Sparkles size={14} /> 3. Usa y remixea
          </h4>
          <p className="text-slate-400 leading-relaxed font-sans">
            Guarda una copia editable y adáptala a tu proyecto.
          </p>
        </div>
        <div className="space-y-1">
          <h4 className="font-extrabold text-emerald-300 flex items-center gap-1">
            <Share2 size={14} /> 4. Publica tu versión
          </h4>
          <p className="text-slate-400 leading-relaxed font-sans">
            Comparte prompts, briefings o posts solo cuando decidas.
          </p>
        </div>
      </div>

      <div className="relative z-10 pt-6 border-t border-slate-700/60 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-full">
              Briefings para compartir
            </span>
            <h3 className="text-lg font-extrabold text-white mt-3">Empieza por un radar curado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Abre un briefing público, guarda una idea y conviértela en prompt o conversación para la comunidad.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSectionChange("noticias")}
            className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/25 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer w-fit"
          >
            <Newspaper size={13} />
            <span>Crear briefing</span>
          </button>
        </div>

        {loadingPublicBriefings ? (
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/35 p-6 text-center">
            <div className="w-7 h-7 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto"></div>
            <p className="text-xs text-slate-400 mt-3">Cargando briefings públicos...</p>
          </div>
        ) : publicBriefings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cyan-500/20 bg-cyan-500/5 p-5">
            <p className="text-sm font-black text-cyan-100">Todavía no hay briefings publicados.</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Ve a Noticias, filtra una categoría y pulsa Briefing público para crear el primer recurso compartible.
            </p>
            <button
              type="button"
              onClick={() => handleSectionChange("noticias")}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-black text-slate-950 transition-all hover:bg-cyan-400 cursor-pointer"
            >
              <Newspaper size={13} />
              Abrir Noticias
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {publicBriefings.slice(0, 3).map((briefing) => (
              <article key={briefing.id} className="rounded-2xl border border-cyan-500/15 bg-slate-950/35 p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-black text-cyan-300">
                    {briefing.items.length} fuentes
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                    {briefing.language.toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <h4 className="line-clamp-2 text-sm font-extrabold leading-tight text-white">{briefing.title}</h4>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-400">{briefing.intro}</p>
                  <p className="mt-2 text-[10px] font-bold text-slate-500">
                    por {briefing.authorName}{briefing.authorHandle ? ` @${briefing.authorHandle}` : ""}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-2 py-1.5">
                    <p className="text-xs font-black text-white">{briefing.stats?.ideaSaves || 0}</p>
                    <p className="text-[9px] font-bold uppercase text-slate-500">Ideas</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-2 py-1.5">
                    <p className="text-xs font-black text-white">{briefing.stats?.promptCreates || 0}</p>
                    <p className="text-[9px] font-bold uppercase text-slate-500">Prompts</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-2 py-1.5">
                    <p className="text-xs font-black text-white">{briefing.stats?.forumPosts || 0}</p>
                    <p className="text-[9px] font-bold uppercase text-slate-500">Posts</p>
                  </div>
                </div>
                {briefing.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {briefing.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="text-[10px] text-slate-300 bg-slate-800 border border-slate-700/70 px-2 py-0.5 rounded-lg">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => openPublicBriefing(briefing)}
                  className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-300 transition-all hover:bg-cyan-500/15 cursor-pointer"
                >
                  <BookOpen size={13} />
                  Abrir briefing
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 pt-6 border-t border-slate-700/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
              Red social de prompts y briefings
            </span>
            <h3 className="text-lg font-extrabold text-white mt-3">Explora recursos públicos y guarda tu versión privada</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Empieza por un prompt, una idea o un briefing. Guardar crea tu copia privada para adaptarla antes de publicar algo a la comunidad.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignIn}
            className="ui-button-secondary px-4 py-2 border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer w-fit"
            aria-label="Crear mi biblioteca con Google"
          >
            <Plus size={13} />
            <span>Crear mi biblioteca</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-start">
          <div className="relative">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={publicShowcaseSearch}
              onChange={(e) => setPublicShowcaseSearch(e.target.value)}
              placeholder="Buscar por título, autor, tag o texto..."
              className="w-full text-xs rounded-2xl border border-slate-700 bg-slate-950/45 pl-9.5 pr-4 py-3 focus:outline-none focus:border-indigo-455 transition-all font-sans text-white placeholder-slate-450"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {PUBLIC_SHOWCASE_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setPublicShowcaseCategory(category)}
                className={`px-3 py-2 text-[11px] font-bold rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  publicShowcaseCategory === category
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-900/55 text-slate-400 border-slate-700 hover:text-slate-200"
                }`}
              >
                {category === "Todas" ? "Todo" : category}
              </button>
            ))}
          </div>
        </div>

        {filteredShowcasePrompts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-750 p-8 text-center text-slate-400">
            <Search className="mx-auto text-slate-500 mb-2" size={24} />
            <p className="text-xs font-bold">No se encontraron prompts públicos que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredShowcasePrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="group relative rounded-2xl border border-slate-800 bg-[#1e293b]/45 hover:bg-[#1e293b]/70 transition-all duration-300 p-5 flex flex-col gap-4 shadow-md hover:shadow-xl hover:border-slate-700/80"
              >
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {prompt.category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      v{(prompt as any).version || "1.0"}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-white mt-2 leading-snug line-clamp-1 group-hover:text-indigo-300 transition-colors">
                    {prompt.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans line-clamp-2 mt-1.5">
                    {prompt.description}
                  </p>
                </div>

                <div className="mt-auto pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-500 truncate">
                    Por {prompt.authorName || "Creador"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyFilledPrompt(prompt)}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-750 text-[10px] font-extrabold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Copy size={12} />
                      <span>Copiar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUsePrompt(prompt, "public_showcase")}
                      className="ui-button-primary px-3 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Usar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
