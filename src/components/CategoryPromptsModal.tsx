import React, { useState } from "react";
import {
  X,
  Copy,
  Play,
  Search,
  Shield,
  Wrench,
  CheckCircle2,
  Youtube,
  Target,
  Cpu,
  HelpCircle,
  Bot,
  Wand2,
  FileText,
  ChevronRight,
  Lightbulb,
  BookOpen,
} from "lucide-react";
import type { Prompt } from "../types";
import type { User } from "firebase/auth";

interface CategoryPromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  prompts: Prompt[];
  onCopyFilledPrompt: (prompt: Prompt) => void;
  onUsePrompt: (prompt: Prompt, context: string) => void;
  user: User | null;
}

type CategoryMeta = {
  icon: React.ReactNode;
  accentColor: string;
  bgGlow: string;
  borderColor: string;
  gradientHeader: string;
  description: string;
  tips: string[];
  isPrimary?: boolean;
};

const getCategoryMeta = (cat: string): CategoryMeta => {
  switch (cat) {
    case "Refactorización":
      return {
        icon: <Wrench size={20} />,
        accentColor: "#a5b4fc",
        bgGlow: "rgba(99,102,241,0.15)",
        borderColor: "rgba(99,102,241,0.4)",
        gradientHeader:
          "linear-gradient(135deg, #312e81 0%, #1e1b4b 50%, #080d18 100%)",
        description:
          "Optimización continua del código para mejorar la legibilidad, mantenibilidad y rendimiento sin alterar el comportamiento externo del software.",
        tips: [
          "Ejecuta auditorías semanales de complejidad en controladores y middlewares.",
          "Reduce la complejidad ciclomática segmentando funciones largas en helpers puros.",
          "Re-arquitectura código legacy a estándares modernos con prompts especializados.",
        ],
        isPrimary: true,
      };
    case "Seguridad":
      return {
        icon: <Shield size={20} />,
        accentColor: "#fda4af",
        bgGlow: "rgba(244,63,94,0.15)",
        borderColor: "rgba(244,63,94,0.4)",
        gradientHeader:
          "linear-gradient(135deg, #4c0519 0%, #881337 50%, #080d18 100%)",
        description:
          "Auditorías de código estricto y escaneo de vulnerabilidades para proteger tus desarrollos contra ataques y fugas de información.",
        tips: [
          "Verifica que todos los inputs estén sanitizados para evitar inyecciones SQL/NoSQL/OS.",
          "Escanea archivos de configuración buscando API keys y credenciales hardcodeadas.",
          "Valida el control de acceso (IDOR) y las cabeceras HTTP mediante middlewares como Helmet.",
        ],
        isPrimary: true,
      };
    case "Buenas Prácticas":
      return {
        icon: <CheckCircle2 size={20} />,
        accentColor: "#6ee7b7",
        bgGlow: "rgba(16,185,129,0.15)",
        borderColor: "rgba(16,185,129,0.4)",
        gradientHeader:
          "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #080d18 100%)",
        description:
          "Principios de diseño limpio, arquitectura acoplada flexible y estándares recomendados por la industria (Clean Code, SOLID, DRY, KISS).",
        tips: [
          "Mantén tus métodos apegados a los principios SOLID y DRY (Don't Repeat Yourself).",
          "Aplica KISS para evitar la sobreingeniería en lógicas de negocio cotidianas.",
          "Enriquece tu codebase con auto-documentación nativa (JSDoc o Docstrings).",
        ],
        isPrimary: true,
      };
    case "YouTube":
      return {
        icon: <Youtube size={20} />,
        accentColor: "#f87171",
        bgGlow: "rgba(248,113,113,0.12)",
        borderColor: "rgba(248,113,113,0.3)",
        gradientHeader:
          "linear-gradient(135deg, #450a0a 0%, #991b1b 50%, #080d18 100%)",
        description:
          "Estrategias de guionización, títulos de alto gancho, descripciones SEO y llamadas a la acción para creadores de contenido de tecnología e IA.",
        tips: [
          "Usa ganchos emocionales en los primeros 15 segundos de tus guiones.",
          "Genera múltiples variantes de títulos para pruebas A/B de CTR.",
          "Adapta el tono al arquetipo de tu audiencia meta en YouTube.",
        ],
      };
    case "Marketing":
      return {
        icon: <Target size={20} />,
        accentColor: "#fbbf24",
        bgGlow: "rgba(251,191,36,0.12)",
        borderColor: "rgba(251,191,36,0.3)",
        gradientHeader:
          "linear-gradient(135deg, #451a03 0%, #92400e 50%, #080d18 100%)",
        description:
          "Copys publicitarios persuasivos, embudos de conversión, estrategias de crecimiento y optimización de campañas.",
        tips: [
          "Aplica la fórmula AIDA (Atención, Interés, Deseo, Acción) en tus copys.",
          "Segmenta el copy según el nivel de conciencia del cliente potencial.",
          "Valida que la propuesta de valor sea clara y libre de tecnicismos.",
        ],
      };
    case "Programación":
      return {
        icon: <Cpu size={20} />,
        accentColor: "#60a5fa",
        bgGlow: "rgba(96,165,250,0.12)",
        borderColor: "rgba(96,165,250,0.3)",
        gradientHeader:
          "linear-gradient(135deg, #172554 0%, #1e3a8a 50%, #080d18 100%)",
        description:
          "Generación de código estructurado, scripting ágil, resolución de algoritmos complejos y configuración de entornos.",
        tips: [
          "Define claramente las tecnologías y versiones antes de generar código.",
          "Solicita pruebas unitarias para garantizar la cobertura del código generado.",
          "Divide tareas complejas en pasos lógicos guiados por el prompt.",
        ],
      };
    case "IA Agentes":
      return {
        icon: <Bot size={20} />,
        accentColor: "#c084fc",
        bgGlow: "rgba(192,132,252,0.12)",
        borderColor: "rgba(192,132,252,0.3)",
        gradientHeader:
          "linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #080d18 100%)",
        description:
          "Definición de prompts sistémicos, flujos multi-agente y sistemas autónomos para automatización inteligente.",
        tips: [
          "Define claramente el rol y las restricciones de cada agente en el sistema.",
          "Usa prompts de orquestación para coordinar flujos entre agentes.",
          "Valida los outputs intermedios entre cada paso del flujo agéntico.",
        ],
      };
    case "Asistente de Prompts":
      return {
        icon: <Wand2 size={20} />,
        accentColor: "#2dd4bf",
        bgGlow: "rgba(45,212,191,0.12)",
        borderColor: "rgba(45,212,191,0.3)",
        gradientHeader:
          "linear-gradient(135deg, #042f2e 0%, #0f766e 50%, #080d18 100%)",
        description:
          "Estructuración de instrucciones semánticas efectivas para maximizar la calidad de las respuestas del modelo.",
        tips: [
          "Especifica siempre el formato de salida esperado (JSON, Markdown, lista, etc.).",
          "Incluye ejemplos (few-shot) para guiar el comportamiento del modelo.",
          "Itera y refina el prompt hasta lograr el output ideal.",
        ],
      };
    default:
      return {
        icon: <HelpCircle size={20} />,
        accentColor: "#94a3b8",
        bgGlow: "rgba(148,163,184,0.1)",
        borderColor: "rgba(148,163,184,0.25)",
        gradientHeader:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #080d18 100%)",
        description:
          "Prompts generales y herramientas auxiliares multipropósito para tu flujo de trabajo diario.",
        tips: [
          "Filtra por etiquetas (tags) para refinar tu búsqueda dentro de esta categoría.",
          "Crea remixes privados de tus prompts favoritos para adaptarlos a tu negocio.",
        ],
      };
  }
};

export default function CategoryPromptsModal({
  isOpen,
  onClose,
  category,
  prompts,
  onCopyFilledPrompt,
  onUsePrompt,
  user,
}: CategoryPromptsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const meta = getCategoryMeta(category);

  const categoryPrompts = prompts.filter(
    (p) => p.category.toLowerCase() === category.toLowerCase()
  );

  const filteredPrompts = categoryPrompts.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6"
      style={{ background: "rgba(2,6,15,0.88)", backdropFilter: "blur(12px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
        style={{
          background: "#0a0f1e",
          borderColor: meta.borderColor,
          maxHeight: "90vh",
          boxShadow: `0 0 80px ${meta.bgGlow}`,
        }}
      >
        {/* ── Header ── */}
        <div
          className="relative flex-shrink-0 overflow-hidden px-6 py-6"
          style={{ background: meta.gradientHeader }}
        >
          {/* Decorative glow */}
          <div
            className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl opacity-30"
            style={{ background: meta.accentColor }}
          />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-2">
              {/* Icon + category pill */}
              <div className="flex items-center gap-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl border"
                  style={{
                    background: "rgba(0,0,0,0.35)",
                    borderColor: "rgba(255,255,255,0.12)",
                    color: meta.accentColor,
                  }}
                >
                  {meta.icon}
                </div>
                <span
                  className="rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest"
                  style={{
                    background: "rgba(0,0,0,0.35)",
                    borderColor: "rgba(255,255,255,0.12)",
                    color: meta.accentColor,
                  }}
                >
                  {meta.isPrimary ? `Suite · ${category}` : category}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-xl font-black text-white md:text-2xl">
                {category === "Refactorización" && "Suite de Refactorización"}
                {category === "Seguridad" && "Suite de Seguridad"}
                {category === "Buenas Prácticas" && "Clean Code & Patrones"}
                {!["Refactorización", "Seguridad", "Buenas Prácticas"].includes(
                  category
                ) && `Categoría: ${category}`}
              </h2>

              {/* Description */}
              <p className="max-w-xl text-xs leading-relaxed text-white/65">
                {meta.description}
              </p>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="flex-shrink-0 cursor-pointer rounded-xl border p-2 text-white/60 transition-all hover:text-white active:scale-95"
              style={{
                background: "rgba(0,0,0,0.3)",
                borderColor: "rgba(255,255,255,0.1)",
              }}
              aria-label="Cerrar"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar (pautas) — hidden on mobile */}
          <aside
            className="hidden w-64 flex-shrink-0 flex-col gap-5 overflow-y-auto border-r p-5 md:flex"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <Lightbulb size={12} style={{ color: meta.accentColor }} />
                <p
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: meta.accentColor }}
                >
                  Pautas de Uso
                </p>
              </div>
              <ul className="space-y-3">
                {meta.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2">
                    <ChevronRight
                      size={12}
                      className="mt-0.5 flex-shrink-0"
                      style={{ color: meta.accentColor }}
                    />
                    <span className="text-[11px] leading-relaxed text-slate-400">
                      {tip}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="rounded-2xl border p-4 text-[10px] leading-relaxed text-slate-500"
              style={{
                background: meta.bgGlow,
                borderColor: meta.borderColor,
              }}
            >
              <BookOpen
                size={14}
                className="mb-2"
                style={{ color: meta.accentColor }}
              />
              <span className="font-bold text-slate-300">Tip:</span> Haz clic en{" "}
              <strong className="text-white">Usar</strong> para cargar el
              rellenador de variables interactivo con este prompt.
            </div>
          </aside>

          {/* Prompt list */}
          <div className="flex flex-1 flex-col overflow-hidden p-5">
            {/* Search */}
            <div className="relative mb-4 flex-shrink-0">
              <Search
                size={13}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Buscar en ${category}...`}
                className="w-full rounded-xl border py-2.5 pl-9 pr-4 text-xs text-white placeholder-slate-500 outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.08)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = meta.borderColor)
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")
                }
              />
            </div>

            {/* Count badge */}
            <div className="mb-3 flex-shrink-0">
              <span
                className="rounded-full border px-2.5 py-1 text-[10px] font-bold"
                style={{
                  background: meta.bgGlow,
                  borderColor: meta.borderColor,
                  color: meta.accentColor,
                }}
              >
                {filteredPrompts.length}{" "}
                {filteredPrompts.length === 1 ? "prompt" : "prompts"}
              </span>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredPrompts.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                  <FileText size={32} className="text-slate-700" />
                  <p className="text-xs font-bold text-slate-500">
                    No hay prompts que coincidan con tu búsqueda.
                  </p>
                </div>
              ) : (
                filteredPrompts.map((prompt) => {
                  const isExpanded = expandedId === prompt.id;
                  return (
                    <div
                      key={prompt.id}
                      className="group rounded-2xl border transition-all duration-200"
                      style={{
                        background: isExpanded
                          ? meta.bgGlow
                          : "rgba(255,255,255,0.02)",
                        borderColor: isExpanded
                          ? meta.borderColor
                          : "rgba(255,255,255,0.06)",
                      }}
                    >
                      {/* Header row */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : prompt.id)
                        }
                        className="flex w-full cursor-pointer items-start justify-between gap-3 p-4 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <h4
                            className="truncate text-sm font-extrabold text-white leading-tight transition-colors"
                            style={
                              isExpanded ? { color: meta.accentColor } : {}
                            }
                          >
                            {prompt.title}
                          </h4>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
                            {prompt.description}
                          </p>
                        </div>
                        <ChevronRight
                          size={14}
                          className={`flex-shrink-0 mt-0.5 text-slate-500 transition-transform duration-200 ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                          style={isExpanded ? { color: meta.accentColor } : {}}
                        />
                      </button>

                      {/* Expanded view */}
                      {isExpanded && (
                        <div
                          className="border-t px-4 pb-4 pt-3 space-y-3"
                          style={{ borderColor: "rgba(255,255,255,0.06)" }}
                        >
                          {/* Tags */}
                          {prompt.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {prompt.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border px-2 py-0.5 text-[9px] font-bold text-slate-400"
                                  style={{
                                    background: "rgba(255,255,255,0.04)",
                                    borderColor: "rgba(255,255,255,0.1)",
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Preview del prompt text */}
                          {prompt.promptText && (
                            <div
                              className="rounded-xl border p-3"
                              style={{
                                background: "rgba(0,0,0,0.35)",
                                borderColor: "rgba(255,255,255,0.06)",
                              }}
                            >
                              <p className="line-clamp-4 text-[11px] leading-relaxed text-slate-400 font-mono">
                                {prompt.promptText.substring(0, 300)}
                                {prompt.promptText.length > 300 ? "…" : ""}
                              </p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => onCopyFilledPrompt(prompt)}
                              className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold text-slate-300 transition-all hover:text-white active:scale-95"
                              style={{
                                background: "rgba(255,255,255,0.04)",
                                borderColor: "rgba(255,255,255,0.1)",
                              }}
                            >
                              <Copy size={12} />
                              Copiar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onUsePrompt(prompt, "category_hub");
                              }}
                              className="flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold text-white transition-all hover:opacity-90 active:scale-95"
                              style={{
                                background: `linear-gradient(135deg, ${meta.accentColor}33, ${meta.accentColor}15)`,
                                border: `1px solid ${meta.borderColor}`,
                                color: meta.accentColor,
                              }}
                            >
                              <Play size={10} fill="currentColor" />
                              Usar prompt
                            </button>
                            <span className="ml-auto text-[10px] text-slate-600">
                              {prompt.authorName || "Biblioteca"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
