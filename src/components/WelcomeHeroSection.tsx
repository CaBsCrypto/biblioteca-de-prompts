import React, { useState } from "react";
import { ArrowRight, Newspaper, GitFork, BookOpen, Sparkles, StickyNote, Share2, TrendingUp, Search, Plus, Play, Copy, Shield, Wrench, CheckCircle2, Youtube, Target, Cpu, HelpCircle, Bot, Wand2 } from "lucide-react";
import type { User } from "firebase/auth";
import type { Prompt, CategoryFilter } from "../types";
import type { Briefing, HackathonOpportunity } from "../typesCommunity";
import CategoryPromptsModal from "./CategoryPromptsModal";

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
  const [selectedCategoryHub, setSelectedCategoryHub] = useState<string | null>(null);

  if (user || authLoading) return null;

  // Visual card configurations for the landing page
  const hubSections = [
    {
      name: "Refactorización",
      title: "Suite de Refactorización",
      description: "Optimización ciclomática, modularización y re-arquitectura.",
      icon: <Wrench size={22} />,
      colorClass: "from-indigo-500/20 to-indigo-950/40 text-indigo-300 border-indigo-500/30 hover:border-indigo-400 hover:shadow-indigo-500/10",
      badge: "¡Nuevo!",
      badgeColor: "bg-pink-500/10 text-pink-400 border-pink-500/20 animate-pulse",
      count: filteredShowcasePrompts.filter(p => p.category === "Refactorización").length
    },
    {
      name: "Seguridad",
      title: "Suite de Seguridad",
      description: "Inyecciones (SQL/NoSQL), fuga de secrets y auditorías CORS/CSP.",
      icon: <Shield size={22} />,
      colorClass: "from-rose-500/20 to-rose-950/40 text-rose-300 border-rose-500/30 hover:border-rose-400 hover:shadow-rose-500/10",
      badge: "¡Nuevo!",
      badgeColor: "bg-pink-500/10 text-pink-400 border-pink-500/20 animate-pulse",
      count: filteredShowcasePrompts.filter(p => p.category === "Seguridad").length
    },
    {
      name: "Buenas Prácticas",
      title: "Clean Code & Patrones",
      description: "Principios SOLID, DRY, KISS, patrones creacionales y JSDoc.",
      icon: <CheckCircle2 size={22} />,
      colorClass: "from-emerald-500/20 to-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:border-emerald-400 hover:shadow-emerald-500/10",
      badge: "¡Nuevo!",
      badgeColor: "bg-pink-500/10 text-pink-400 border-pink-500/20 animate-pulse",
      count: filteredShowcasePrompts.filter(p => p.category === "Buenas Prácticas").length
    },
    {
      name: "YouTube",
      title: "YouTube & Contenido",
      description: "Ganchos virales, guionización tecnológica y optimización SEO.",
      icon: <Youtube size={22} />,
      colorClass: "from-red-500/10 to-red-950/30 text-red-400 border-red-500/20 hover:border-red-450",
      count: filteredShowcasePrompts.filter(p => p.category === "YouTube").length
    },
    {
      name: "Marketing",
      title: "Estrategias de Copy",
      description: "Embudos AIDA, conversión SaaS y optimización de copys.",
      icon: <Target size={22} />,
      colorClass: "from-amber-500/10 to-amber-950/30 text-amber-400 border-amber-500/20 hover:border-amber-450",
      count: filteredShowcasePrompts.filter(p => p.category === "Marketing").length
    },
    {
      name: "Programación",
      title: "Lógica & Algoritmos",
      description: "Generación de código estructurado, scripting y APIs.",
      icon: <Cpu size={22} />,
      colorClass: "from-blue-500/10 to-blue-950/30 text-blue-400 border-blue-500/20 hover:border-blue-450",
      count: filteredShowcasePrompts.filter(p => p.category === "Programación").length
    },
    {
      name: "IA Agentes",
      title: "Sistemas Autónomos",
      description: "Definición de prompts sistémicos y flujos multi-agente.",
      icon: <Bot size={22} />,
      colorClass: "from-purple-500/10 to-purple-950/30 text-purple-400 border-purple-500/20 hover:border-purple-450",
      count: filteredShowcasePrompts.filter(p => p.category === "IA Agentes").length
    },
    {
      name: "Asistente de Prompts",
      title: "Generadores Meta",
      description: "Estructuración de instrucciones semánticas efectivas.",
      icon: <Wand2 size={22} />,
      colorClass: "from-teal-500/10 to-teal-950/30 text-teal-400 border-teal-500/20 hover:border-teal-450",
      count: filteredShowcasePrompts.filter(p => p.category === "Asistente de Prompts").length
    },
    {
      name: "General",
      title: "Plantillas Auxiliares",
      description: "Prompts multipropósito y utilidades generales del dev.",
      icon: <HelpCircle size={22} />,
      colorClass: "from-slate-500/10 to-slate-950/30 text-slate-400 border-slate-700/50 hover:border-slate-500",
      count: filteredShowcasePrompts.filter(p => p.category === "General").length
    }
  ];

  return (
    <div className="space-y-12 max-w-5xl mx-auto px-4 py-8 font-sans">
      
      {/* Nuevo Welcome Hero Styling Premium */}
      <div id="welcome-callout" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-slate-800 p-8 md:p-12 shadow-2xl text-center space-y-6">
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-4 max-w-3xl mx-auto relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-[10px] font-black text-indigo-300 uppercase tracking-widest">
            <Sparkles size={11} className="animate-spin-slow" />
            <span>Biblioteca de Prompts del Creador</span>
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-slate-350 bg-clip-text">
            Guarda, optimiza y reutiliza tus mejores instrucciones de IA
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Una plataforma interactiva para catalogar tus plantillas, rellenar variables en vivo y auditar el estado continuo de tus proyectos con prompts avanzados de desarrollo y seguridad.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4.5 pt-4 relative z-10">
          <button
            id="btn-callout-login"
            onClick={handleSignIn}
            className="w-full sm:w-auto px-7 py-3.5 bg-indigo-600 hover:bg-indigo-555 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-indigo-650/15 cursor-pointer"
          >
            <span>Crear mi Biblioteca</span>
            <ArrowRight size={14} />
          </button>
          
          <button
            type="button"
            onClick={() => handleSectionChange("noticias")}
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Newspaper size={14} />
            <span>Explorar Radar</span>
          </button>

          <button
            type="button"
            onClick={() => setShowJoinClassModal(true)}
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <BookOpen size={14} />
            <span>Código de clase</span>
          </button>
        </div>

        {/* Métrica básica */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-slate-800/85 relative z-10 max-w-4xl mx-auto">
          {[
            { label: "Prompts Públicos", value: visibleCommunityCatalogPromptsCount },
            { label: "Publicaciones", value: forumPostsCount },
            { label: "Radar de Ideas", value: hackathons.length },
            { label: "Despliegues", value: showcasePostsCount }
          ].map((metric) => (
            <div key={metric.label} className="rounded-xl border border-slate-800/80 bg-slate-950/25 p-3.5">
              <p className="text-2xl font-black text-white">{metric.value}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">{metric.label}</p>
            </div>
          ))}
        </div>

      </div>

      {/* SECCIÓN PRINCIPAL: SUITES / SECCIONES DE PROMPTS SEPARADOS */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-xl md:text-2xl font-black text-white">Explorar por Secciones de Prompts</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Selecciona una suite para abrir el visualizador interactivo, leer las pautas de validación y copiar o ejecutar las instrucciones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {hubSections.map((section) => (
            <button
              key={section.name}
              onClick={() => setSelectedCategoryHub(section.name)}
              className={`p-6 rounded-2xl border bg-gradient-to-br ${section.colorClass} text-left flex flex-col justify-between gap-4 transition-all duration-300 hover:scale-[1.02] shadow-md hover:shadow-xl cursor-pointer group relative overflow-hidden min-h-[160px]`}
            >
              {/* Sparkle background element on hover */}
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 group-hover:scale-125 transition-transform duration-350 pointer-events-none">
                {section.icon}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="p-2 rounded-xl bg-black/25 text-white/90 border border-white/5 shadow-inner">
                    {section.icon}
                  </span>
                  
                  {section.badge && (
                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border tracking-wider ${section.badgeColor}`}>
                      {section.badge}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                    {section.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-normal font-medium">
                    {section.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-500 font-bold">
                <span>{section.count} {section.count === 1 ? 'prompt semilla' : 'prompts semillas'}</span>
                <span className="flex items-center gap-1 group-hover:text-white transition-colors">
                  <span>Abrir suite</span>
                  <ArrowRight size={10} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Briefings Públicos del Radar */}
      <div className="border-t border-slate-800/80 pt-10 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-black text-cyan-300 uppercase tracking-wider">
              Radar de Briefings
            </span>
            <h3 className="text-lg font-extrabold text-white mt-2">Últimas tendencias compiladas</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Informes breves y listado de fuentes curadas sobre tecnologías emergentes en IA.
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => handleSectionChange("noticias")}
            className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/25 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer w-fit"
          >
            <Newspaper size={13} />
            <span>Ver Todo el Radar</span>
          </button>
        </div>

        {loadingPublicBriefings ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/35 p-6 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto"></div>
            <p className="text-xs text-slate-400 mt-3">Sincronizando briefings...</p>
          </div>
        ) : publicBriefings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cyan-500/20 bg-cyan-500/5 p-6 text-center text-slate-400">
            <p className="text-xs font-bold">Aún no hay briefings publicados en el radar de la comunidad.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {publicBriefings.slice(0, 3).map((briefing) => (
              <article key={briefing.id} className="rounded-2xl border border-slate-800 bg-[#1e293b]/15 p-4 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-black text-cyan-300">
                      {briefing.items.length} fuentes
                    </span>
                    <span className="rounded-full border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[9px] font-bold text-slate-400">
                      {briefing.language.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="min-w-0">
                    <h4 className="line-clamp-2 text-xs font-extrabold leading-snug text-white">{briefing.title}</h4>
                    <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-slate-400">{briefing.intro}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800/80 mt-auto">
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div className="rounded-lg bg-slate-950/40 p-1.5">
                      <p className="text-[11px] font-black text-white">{briefing.stats?.ideaSaves || 0}</p>
                      <p className="text-[8px] font-bold uppercase text-slate-500">Ideas</p>
                    </div>
                    <div className="rounded-lg bg-slate-950/40 p-1.5">
                      <p className="text-[11px] font-black text-white">{briefing.stats?.promptCreates || 0}</p>
                      <p className="text-[8px] font-bold uppercase text-slate-500">Prompts</p>
                    </div>
                    <div className="rounded-lg bg-slate-950/40 p-1.5">
                      <p className="text-[11px] font-black text-white">{briefing.stats?.forumPosts || 0}</p>
                      <p className="text-[8px] font-bold uppercase text-slate-500">Posts</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openPublicBriefing(briefing)}
                    className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs font-bold transition-all cursor-pointer"
                  >
                    <BookOpen size={12} />
                    <span>Revisar Briefing</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Category Prompts Popup Overlay */}
      {selectedCategoryHub && (
        <CategoryPromptsModal
          isOpen={true}
          onClose={() => setSelectedCategoryHub(null)}
          category={selectedCategoryHub}
          prompts={filteredShowcasePrompts}
          onCopyFilledPrompt={handleCopyFilledPrompt}
          onUsePrompt={handleUsePrompt}
          user={user}
        />
      )}

    </div>
  );
}
