import { BookOpen, Compass, GitFork, Newspaper, Play, Rocket, Share2, Sparkles } from "lucide-react";
import type { Prompt } from "../types";

interface DailyMissionPanelProps {
  savedIdeasCount: number;
  publicBriefingsCount: number;
  publicPromptsCount: number;
  publishCandidates: Prompt[];
  recentPrompts: Prompt[];
  recentRemixes: Prompt[];
  socialFavoritePromptsCount: number;
  onOpenNews: () => void;
  onOpenCommunity: () => void;
  onEditPrompt: (prompt: Prompt) => void;
  onUsePrompt: (prompt: Prompt) => void;
}

export default function DailyMissionPanel({
  savedIdeasCount,
  publicBriefingsCount,
  publicPromptsCount,
  publishCandidates,
  recentPrompts,
  recentRemixes,
  socialFavoritePromptsCount,
  onOpenNews,
  onOpenCommunity,
  onEditPrompt,
  onUsePrompt
}: DailyMissionPanelProps) {
  const nextPromptToUse = recentPrompts[0] || recentRemixes[0] || null;
  const nextPromptToPublish = publishCandidates[0] || null;

  const discoveryDone = savedIdeasCount > 0 || publicBriefingsCount > 0;
  const workDone = recentPrompts.length > 0 || recentRemixes.length > 0 || socialFavoritePromptsCount > 0;
  const publishDone = publicPromptsCount > 0;
  const completedCount = [discoveryDone, workDone, publishDone].filter(Boolean).length;

  return (
    <section className="rounded-2xl md:rounded-3xl border border-violet-500/20 bg-violet-500/5 p-4 md:p-5 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-300">
            <Rocket size={12} />
            Mision de hoy
          </p>
          <h3 className="mt-3 text-lg font-black text-white">Convierte una senal en recurso publicable.</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
            Un loop diario simple: encuentra una tendencia, usala o remixea un prompt, y deja algo listo para compartir en tu hub.
          </p>
        </div>
        <span className="w-fit rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1 text-[10px] font-black text-slate-400">
          {completedCount}/3 completado
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-950/35 p-3.5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-300">
              <Newspaper size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white">1. Detecta una senal</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                {discoveryDone
                  ? "Ya tienes ideas o briefings para transformar."
                  : "Empieza en Noticias y guarda una idea accionable."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenNews}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-300 transition-all hover:bg-cyan-500/15 cursor-pointer"
          >
            <Compass size={13} />
            Abrir radar
          </button>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-950/35 p-3.5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-pink-500/20 bg-pink-500/10 p-2 text-pink-300">
              <GitFork size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white">2. Usa o remixea</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                {workDone
                  ? "Ya hay actividad reciente para continuar."
                  : "Guarda un prompt publico como copia privada editable."}
              </p>
            </div>
          </div>
          {nextPromptToUse ? (
            <button
              type="button"
              onClick={() => onUsePrompt(nextPromptToUse)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-xs font-black text-indigo-300 transition-all hover:bg-indigo-500/15 cursor-pointer"
            >
              <Play size={12} fill="currentColor" />
              Continuar prompt
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenCommunity}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-pink-500/25 bg-pink-500/10 px-3 py-2 text-xs font-black text-pink-300 transition-all hover:bg-pink-500/15 cursor-pointer"
            >
              <Sparkles size={13} />
              Explorar prompts
            </button>
          )}
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-950/35 p-3.5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-300">
              <Share2 size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white">3. Publica una version</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                {publishDone
                  ? "Ya tienes recursos publicos alimentando tu hub."
                  : "Prepara un remix o favorito privado para publicarlo manualmente."}
              </p>
            </div>
          </div>
          {nextPromptToPublish ? (
            <button
              type="button"
              onClick={() => onEditPrompt(nextPromptToPublish)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-300 transition-all hover:bg-emerald-500/15 cursor-pointer"
            >
              <BookOpen size={13} />
              Preparar publicacion
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenCommunity}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-300 transition-all hover:bg-emerald-500/15 cursor-pointer"
            >
              <GitFork size={13} />
              Buscar base para publicar
            </button>
          )}
        </article>
      </div>
    </section>
  );
}
