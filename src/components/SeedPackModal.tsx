import { BookOpen, Bot, CheckCircle2, Clapperboard, Layers, X } from "lucide-react";
import type { Prompt } from "../types";

type SeedPrompt = Omit<Prompt, "id" | "userId" | "createdAt" | "updatedAt">;

interface SeedPack {
  id: string;
  title: string;
  description: string;
  icon: typeof BookOpen;
  accent: string;
  prompts: SeedPrompt[];
}

interface SeedPackModalProps {
  defaultPrompts: SeedPrompt[];
  existingTitles: Set<string>;
  loading: boolean;
  onClose: () => void;
  onSeedPack: (prompts: SeedPrompt[]) => void;
}

const normalizeTitle = (title: string) => title.trim().toLocaleLowerCase("es");

function promptMatches(prompt: SeedPrompt, terms: string[]) {
  const searchable = [
    prompt.title,
    prompt.description,
    prompt.category,
    ...(prompt.tags || [])
  ].join(" ").toLocaleLowerCase("es");

  return terms.some((term) => searchable.includes(term));
}

function uniqueByTitle(prompts: SeedPrompt[]) {
  const seen = new Set<string>();
  return prompts.filter((prompt) => {
    const key = normalizeTitle(prompt.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSeedPacks(defaultPrompts: SeedPrompt[]): SeedPack[] {
  const creatorEssentials = uniqueByTitle([
    ...defaultPrompts.filter((prompt) => promptMatches(prompt, ["youtube", "shorts", "reels", "linkedin", "newsletter"])),
    ...defaultPrompts.filter((prompt) => promptMatches(prompt, ["asistente de prompts", "auditor", "mejorador", "variables"]))
  ]).slice(0, 12);

  const socialContent = uniqueByTitle(defaultPrompts.filter((prompt) =>
    promptMatches(prompt, ["youtube", "shorts", "reels", "carrusel", "linkedin", "newsletter", "titulo", "miniatura", "ctr"])
  )).slice(0, 18);

  const agentsAutomation = uniqueByTitle(defaultPrompts.filter((prompt) =>
    promptMatches(prompt, ["agente", "research", "automatizacion", "asistente", "variables", "auditor"])
  )).slice(0, 14);

  return [
    {
      id: "creator",
      title: "Starter recomendado",
      description: "Un pack pequeno para empezar sin saturarte. Ideal para probar la biblioteca hoy.",
      icon: CheckCircle2,
      accent: "emerald",
      prompts: creatorEssentials.length ? creatorEssentials : defaultPrompts.slice(0, 12)
    },
    {
      id: "content",
      title: "Creacion de contenido",
      description: "YouTube, Shorts/Reels, newsletter, miniaturas y piezas para redes.",
      icon: Clapperboard,
      accent: "pink",
      prompts: socialContent.length ? socialContent : defaultPrompts.slice(0, 18)
    },
    {
      id: "agents",
      title: "Agentes y automatizacion",
      description: "Prompts para asistentes, research, flujos automatizados y mejora de prompts.",
      icon: Bot,
      accent: "cyan",
      prompts: agentsAutomation.length ? agentsAutomation : defaultPrompts.slice(0, 14)
    },
    {
      id: "all",
      title: "Pack completo",
      description: "Carga todo el pack fundador. Mejor si ya sabes que quieres explorar todo.",
      icon: Layers,
      accent: "indigo",
      prompts: defaultPrompts
    }
  ];
}

function accentClasses(accent: string) {
  if (accent === "emerald") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  if (accent === "pink") return "border-pink-500/25 bg-pink-500/10 text-pink-300";
  if (accent === "cyan") return "border-cyan-500/25 bg-cyan-500/10 text-cyan-300";
  return "border-indigo-500/25 bg-indigo-500/10 text-indigo-300";
}

export default function SeedPackModal({
  defaultPrompts,
  existingTitles,
  loading,
  onClose,
  onSeedPack
}: SeedPackModalProps) {
  const packs = buildSeedPacks(defaultPrompts);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/70 p-3 pt-4 backdrop-blur-md sm:items-center sm:p-4">
      <div className="ui-modal-panel surface-card w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700/80 bg-[#1e293b] shadow-2xl sm:rounded-3xl">
        <div className="ui-modal-header flex items-start justify-between gap-4 border-b border-slate-800 px-4 py-4 sm:px-6">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              <BookOpen size={12} />
              Onboarding flexible
            </p>
            <h2 className="mt-3 text-xl font-black text-white">Elige con que prompts quieres empezar</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
              No necesitas cargar los 80 prompts. Empieza con un pack pequeno y despues suma mas desde este mismo selector.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-action-secondary rounded-xl border border-slate-800 bg-slate-950/50 p-2 text-slate-400 transition-colors hover:text-white"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid max-h-[72vh] grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-6">
          {packs.map((pack) => {
            const newPromptsCount = pack.prompts.filter((prompt) => !existingTitles.has(normalizeTitle(prompt.title))).length;
            const Icon = pack.icon;
            return (
              <article key={pack.id} className="surface-nested-card mobile-tight-card flex min-h-[210px] flex-col rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className={`rounded-2xl border p-2.5 ${accentClasses(pack.accent)}`}>
                    <Icon size={18} />
                  </div>
                  <span className="ui-chip rounded-full border border-slate-800 bg-slate-950/45 px-2.5 py-1 text-[10px] font-black text-slate-400">
                    {pack.prompts.length} prompts
                  </span>
                </div>

                <div className="mt-4 min-w-0">
                  <h3 className="text-base font-black text-white">{pack.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{pack.description}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {pack.prompts.slice(0, 4).map((prompt) => (
                    <span key={prompt.title} className="ui-chip rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-[10px] font-bold text-slate-400">
                      {prompt.category}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={loading || newPromptsCount === 0}
                  onClick={() => onSeedPack(pack.prompts)}
                  className="clear-secondary-action mt-auto flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-black text-slate-200 transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {newPromptsCount === 0 ? "Ya guardado" : `Agregar ${newPromptsCount}`}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
