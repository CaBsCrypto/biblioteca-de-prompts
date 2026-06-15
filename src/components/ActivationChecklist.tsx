import { ArrowRight, Check, FolderOpen, GitFork, Globe, Play, Sparkles } from "lucide-react";
import type { ActivationChecklistState, ActivationStepId } from "../utils/activationChecklist";

interface ActivationChecklistProps {
  state: ActivationChecklistState;
  onAction: (stepId: ActivationStepId) => void;
}

const stepIcons: Record<ActivationStepId, typeof Sparkles> = {
  seed: Sparkles,
  use: Play,
  remix: GitFork,
  folder: FolderOpen,
  share: Globe
};

export default function ActivationChecklist({ state, onAction }: ActivationChecklistProps) {
  if (state.isComplete) return null;

  const progressPercent = Math.round((state.completedCount / state.totalCount) * 100);

  return (
    <section className="surface-card onboarding-surface rounded-2xl md:rounded-3xl border border-indigo-500/20 bg-[#1e293b]/80 p-4 md:p-5 shadow-xl space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-full">
              Primeros pasos
            </span>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {state.completedCount}/{state.totalCount} completado
            </span>
          </div>
          <h3 className="text-sm md:text-base font-extrabold text-white mt-2 leading-tight">
            Activa tu red personal de prompts
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Guarda prompts, usalos en tu flujo diario, remixea recursos de otros creadores y publica tu primera version para la comunidad.
          </p>
        </div>

        <div className="w-full md:w-40">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
            <span>Progreso</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {state.steps.map((step) => {
          const Icon = stepIcons[step.id];
          return (
            <div
              key={step.id}
              className={`surface-nested-card rounded-2xl border p-3 flex flex-col gap-3 min-h-[150px] ${
                step.completed
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-slate-950/35 border-slate-800/90"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    step.completed
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-indigo-500/10 text-indigo-300"
                  }`}
                >
                  {step.completed ? <Check size={15} className="stroke-[3]" /> : <Icon size={15} />}
                </div>
                {step.completed && (
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Listo
                  </span>
                )}
              </div>

              <div className="space-y-1 min-w-0">
                <h4 className="text-xs font-extrabold text-white leading-snug">{step.title}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">{step.description}</p>
              </div>

              {!step.completed && (
                <button
                  type="button"
                  onClick={() => onAction(step.id)}
                  className="clear-secondary-action mt-auto px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>{step.ctaLabel}</span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
