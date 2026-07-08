import React, { useState } from "react";
import {
  ArrowRight,
  Newspaper,
  BookOpen,
  Sparkles,
  Shield,
  Wrench,
  CheckCircle2,
  Youtube,
  Target,
  Cpu,
  HelpCircle,
  Bot,
  Wand2,
  ChevronRight,
  Zap,
  Lock,
  Code2,
  Star,
} from "lucide-react";
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

const DEV_SUITES = [
  {
    name: "Refactorización",
    emoji: "⚙️",
    headline: "Suite de Refactorización",
    tagline: "Optimiza. Modulariza. Escala.",
    description:
      "Auditorías de complejidad ciclomática, modularización de funciones largas y re-arquitectura de código legacy a estándares modernos.",
    icon: Wrench,
    accentFrom: "#6366f1",
    accentTo: "#4f46e5",
    bgGlow: "rgba(99,102,241,0.12)",
    borderColor: "rgba(99,102,241,0.35)",
    hoverBorder: "rgba(99,102,241,0.65)",
    textColor: "#a5b4fc",
    badgeLabel: "¡Nuevo!",
  },
  {
    name: "Seguridad",
    emoji: "🔐",
    headline: "Suite de Seguridad",
    tagline: "Detecta. Bloquea. Endurece.",
    description:
      "Escaneo de inyecciones SQL/NoSQL, detección de secrets hardcodeados, auditorías CORS/CSP y validación de control de acceso (IDOR).",
    icon: Shield,
    accentFrom: "#f43f5e",
    accentTo: "#be123c",
    bgGlow: "rgba(244,63,94,0.12)",
    borderColor: "rgba(244,63,94,0.35)",
    hoverBorder: "rgba(244,63,94,0.65)",
    textColor: "#fda4af",
    badgeLabel: "¡Nuevo!",
  },
  {
    name: "Buenas Prácticas",
    emoji: "✅",
    headline: "Clean Code & Patrones",
    tagline: "SOLID. DRY. KISS.",
    description:
      "Principios de diseño limpio, patrones creacionales (Factory, Singleton), arquitectura en capas y auto-documentación con JSDoc o Docstrings.",
    icon: CheckCircle2,
    accentFrom: "#10b981",
    accentTo: "#059669",
    bgGlow: "rgba(16,185,129,0.12)",
    borderColor: "rgba(16,185,129,0.35)",
    hoverBorder: "rgba(16,185,129,0.65)",
    textColor: "#6ee7b7",
    badgeLabel: "¡Nuevo!",
  },
];

const OTHER_CATEGORIES = [
  {
    name: "YouTube",
    icon: Youtube,
    color: "#f87171",
    bg: "rgba(248,113,113,0.08)",
    border: "rgba(248,113,113,0.2)",
    desc: "Guiones, hooks virales y SEO para creadores",
  },
  {
    name: "Marketing",
    icon: Target,
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.2)",
    desc: "Copy persuasivo, embudos AIDA y conversión",
  },
  {
    name: "Programación",
    icon: Cpu,
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.08)",
    border: "rgba(96,165,250,0.2)",
    desc: "Generación de código, algoritmos y APIs",
  },
  {
    name: "IA Agentes",
    icon: Bot,
    color: "#c084fc",
    bg: "rgba(192,132,252,0.08)",
    border: "rgba(192,132,252,0.2)",
    desc: "Sistemas autónomos y flujos multi-agente",
  },
  {
    name: "Asistente de Prompts",
    icon: Wand2,
    color: "#2dd4bf",
    bg: "rgba(45,212,191,0.08)",
    border: "rgba(45,212,191,0.2)",
    desc: "Estructuración de instrucciones semánticas",
  },
  {
    name: "General",
    icon: HelpCircle,
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.08)",
    border: "rgba(148,163,184,0.2)",
    desc: "Plantillas auxiliares multipropósito",
  },
];

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
  filteredShowcasePrompts,
  handleCopyFilledPrompt,
  handleUsePrompt,
}: WelcomeHeroSectionProps) {
  const [selectedCategoryHub, setSelectedCategoryHub] = useState<string | null>(null);

  if (user || authLoading) return null;

  const getCount = (cat: string) =>
    filteredShowcasePrompts.filter((p) => p.category === cat).length;

  return (
    <div
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      className="min-h-screen bg-[#080d18] text-white"
    >
      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-20 pb-16 text-center">
        {/* Background glows */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.18) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(244,63,94,0.10) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 20% 90%, rgba(16,185,129,0.10) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-3xl space-y-7">
          {/* Pill badge */}
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest"
            style={{
              background: "rgba(99,102,241,0.12)",
              borderColor: "rgba(99,102,241,0.3)",
              color: "#a5b4fc",
            }}
          >
            <Sparkles size={11} className="animate-pulse" />
            Biblioteca de Prompts del Creador
          </span>

          {/* Main headline */}
          <h1
            className="text-4xl font-black leading-[1.1] tracking-tight md:text-6xl"
            style={{
              background: "linear-gradient(135deg, #fff 30%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Tus mejores prompts,
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #6366f1, #f43f5e, #10b981)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              siempre listos.
            </span>
          </h1>

          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-400">
            Guarda, organiza y ejecuta tus plantillas de IA. Audita tus proyectos
            con suites especializadas de refactorización, seguridad y buenas
            prácticas — todo en un solo lugar.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              id="btn-hero-signup"
              onClick={handleSignIn}
              className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-extrabold text-white transition-all active:scale-[0.98] sm:w-auto"
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                boxShadow: "0 0 30px rgba(99,102,241,0.35)",
              }}
            >
              <Zap size={15} />
              Crear mi Biblioteca
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>

            <button
              type="button"
              onClick={() => handleSectionChange("noticias")}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border px-7 py-3.5 text-sm font-bold text-slate-300 transition-all hover:text-white active:scale-[0.98] sm:w-auto"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              <Newspaper size={14} />
              Radar de Tendencias
            </button>
          </div>

          {/* Metrics strip */}
          <div
            className="mx-auto mt-6 grid max-w-lg grid-cols-4 divide-x rounded-2xl border p-4"
            style={{
              background: "rgba(255,255,255,0.025)",
              borderColor: "rgba(255,255,255,0.08)",
              divideColor: "rgba(255,255,255,0.08)",
            }}
          >
            {[
              { label: "Prompts", value: visibleCommunityCatalogPromptsCount },
              { label: "Posts", value: forumPostsCount },
              { label: "Radares", value: hackathons.length },
              { label: "Proyectos", value: showcasePostsCount },
            ].map((m) => (
              <div key={m.label} className="px-2 text-center">
                <p className="text-xl font-black text-white">{m.value}</p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEV SUITES (protagonistas) ──────────────────────────── */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-5xl">
          {/* Section header */}
          <div className="mb-8 flex items-center gap-3">
            <div
              className="flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest"
              style={{
                background: "rgba(99,102,241,0.1)",
                borderColor: "rgba(99,102,241,0.25)",
                color: "#a5b4fc",
              }}
            >
              <Star size={10} fill="currentColor" />
              Suites de Desarrollo
            </div>
            <div
              className="h-px flex-1"
              style={{ background: "rgba(255,255,255,0.06)" }}
            />
          </div>

          {/* 3-column suite cards */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {DEV_SUITES.map((suite) => {
              const Icon = suite.icon;
              const count = getCount(suite.name);
              return (
                <button
                  key={suite.name}
                  onClick={() => setSelectedCategoryHub(suite.name)}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl border p-6 text-left transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: `radial-gradient(ellipse at top left, ${suite.bgGlow} 0%, rgba(8,13,24,0.95) 70%)`,
                    borderColor: suite.borderColor,
                    boxShadow: "none",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      suite.hoverBorder;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 40px ${suite.bgGlow}`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      suite.borderColor;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  }}
                >
                  {/* Glow accent top */}
                  <div
                    className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-20 blur-3xl transition-opacity duration-300 group-hover:opacity-35"
                    style={{
                      background: `radial-gradient(circle, ${suite.accentFrom}, transparent)`,
                    }}
                  />

                  {/* Badge */}
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                      style={{
                        background: `linear-gradient(135deg, ${suite.accentFrom}22, ${suite.accentTo}11)`,
                        borderColor: suite.borderColor,
                      }}
                    >
                      <Icon size={20} style={{ color: suite.textColor }} />
                    </div>
                    <span
                      className="animate-pulse rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                      style={{
                        background: "rgba(244,63,94,0.1)",
                        borderColor: "rgba(244,63,94,0.25)",
                        color: "#fda4af",
                      }}
                    >
                      {suite.badgeLabel}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <p
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: suite.textColor }}
                    >
                      {suite.tagline}
                    </p>
                    <h3 className="text-base font-black text-white leading-tight">
                      {suite.headline}
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-400">
                      {suite.description}
                    </p>
                  </div>

                  {/* Footer */}
                  <div
                    className="mt-5 flex items-center justify-between border-t pt-4 text-[10px] font-bold"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <span style={{ color: suite.textColor }}>
                      {count} {count === 1 ? "prompt" : "prompts"}
                    </span>
                    <span
                      className="flex items-center gap-1 text-slate-500 transition-colors group-hover:text-white"
                    >
                      Abrir suite
                      <ChevronRight size={11} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── OTRAS CATEGORÍAS ─────────────────────────────────────── */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center gap-3">
            <div
              className="flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <Code2 size={10} />
              Más Categorías
            </div>
            <div
              className="h-px flex-1"
              style={{ background: "rgba(255,255,255,0.06)" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {OTHER_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count = getCount(cat.name);
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategoryHub(cat.name)}
                  className="group cursor-pointer rounded-2xl border p-4 text-left transition-all duration-200 hover:scale-[1.03]"
                  style={{
                    background: cat.bg,
                    borderColor: cat.border,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      cat.color + "55";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      cat.border;
                  }}
                >
                  <Icon size={18} style={{ color: cat.color }} className="mb-3" />
                  <p
                    className="text-xs font-extrabold text-white leading-tight"
                  >
                    {cat.name}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500 leading-snug line-clamp-2">
                    {cat.desc}
                  </p>
                  <p
                    className="mt-2 text-[9px] font-bold"
                    style={{ color: cat.color }}
                  >
                    {count} prompts
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── RADAR DE BRIEFINGS ───────────────────────────────────── */}
      {(loadingPublicBriefings || publicBriefings.length > 0) && (
        <section
          className="px-4 pb-20"
        >
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                  style={{
                    background: "rgba(6,182,212,0.1)",
                    borderColor: "rgba(6,182,212,0.25)",
                    color: "#67e8f9",
                  }}
                >
                  <Zap size={10} />
                  Radar de Briefings
                </div>
                <p className="hidden text-xs text-slate-500 sm:block">
                  Últimas tendencias compiladas en IA
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSectionChange("noticias")}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[11px] font-bold transition-all hover:text-white"
                style={{
                  background: "rgba(6,182,212,0.06)",
                  borderColor: "rgba(6,182,212,0.2)",
                  color: "#67e8f9",
                }}
              >
                <Newspaper size={12} />
                Ver todo
              </button>
            </div>

            {loadingPublicBriefings ? (
              <div
                className="rounded-2xl border p-8 text-center"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              >
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                <p className="mt-3 text-xs text-slate-500">
                  Sincronizando briefings...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {publicBriefings.slice(0, 3).map((briefing) => (
                  <article
                    key={briefing.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border p-5 transition-all hover:border-cyan-500/30"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      borderColor: "rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className="rounded-full border px-2 py-0.5 text-[9px] font-black"
                          style={{
                            background: "rgba(6,182,212,0.1)",
                            borderColor: "rgba(6,182,212,0.2)",
                            color: "#67e8f9",
                          }}
                        >
                          {briefing.items.length} fuentes
                        </span>
                        <span
                          className="rounded-full border px-2 py-0.5 text-[9px] font-bold text-slate-400"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            borderColor: "rgba(255,255,255,0.08)",
                          }}
                        >
                          {briefing.language.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="line-clamp-2 text-xs font-extrabold leading-snug text-white">
                        {briefing.title}
                      </h4>
                      <p className="line-clamp-3 text-[11px] leading-relaxed text-slate-400">
                        {briefing.intro}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openPublicBriefing(briefing)}
                      className="mt-auto flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all"
                      style={{
                        background: "rgba(6,182,212,0.06)",
                        borderColor: "rgba(6,182,212,0.2)",
                        color: "#67e8f9",
                      }}
                    >
                      <BookOpen size={12} />
                      Revisar Briefing
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── FOOTER CTA ───────────────────────────────────────────── */}
      <section
        className="mx-4 mb-12 overflow-hidden rounded-3xl border p-10 text-center"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(99,102,241,0.14) 0%, rgba(8,13,24,0.95) 70%)",
          borderColor: "rgba(99,102,241,0.25)",
        }}
      >
        <Lock
          size={28}
          className="mx-auto mb-4 opacity-50"
          style={{ color: "#a5b4fc" }}
        />
        <h2 className="text-xl font-black text-white">
          ¿Listo para tu biblioteca privada?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-xs text-slate-400">
          Inicia sesión para guardar tus propios prompts, organizarlos en carpetas
          y ejecutarlos con el rellenador de variables interactivo.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            id="btn-footer-signup"
            onClick={handleSignIn}
            className="flex cursor-pointer items-center gap-2 rounded-2xl px-8 py-3 text-sm font-extrabold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              boxShadow: "0 0 24px rgba(99,102,241,0.3)",
            }}
          >
            Empezar gratis
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            onClick={() => setShowJoinClassModal(true)}
            className="flex cursor-pointer items-center gap-2 rounded-2xl border px-7 py-3 text-sm font-bold text-slate-300 transition-all hover:text-white"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            <BookOpen size={14} />
            Tengo un código de clase
          </button>
        </div>
      </section>

      {/* ── POPUP DE CATEGORÍA ───────────────────────────────────── */}
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
