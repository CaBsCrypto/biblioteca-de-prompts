import { BarChart3, BookOpen, Edit3, Megaphone, Newspaper, Rocket, Share2, Sparkles } from "lucide-react";
import type { Prompt, UserEvent } from "../types";
import type { Briefing } from "../typesCommunity";

interface CreatorGrowthPanelProps {
  briefings: Briefing[];
  publicPrompts: Prompt[];
  publishCandidates: Prompt[];
  userEvents: UserEvent[];
  onOpenBriefing: (briefing: Briefing) => void;
  onEditPrompt: (prompt: Prompt) => void;
  onOpenNews: () => void;
  onOpenCommunity: () => void;
}

function briefingScore(briefing: Briefing) {
  const stats = briefing.stats || {};
  return (stats.ideaSaves || 0) * 8
    + (stats.promptCreates || 0) * 10
    + (stats.forumPosts || 0) * 7
    + (stats.linkCopies || 0) * 4
    + (stats.opens || 0);
}

function promptLikes(prompt: Prompt) {
  return prompt.likesCount || prompt.likedBy?.length || 0;
}

export default function CreatorGrowthPanel({
  briefings,
  publicPrompts,
  publishCandidates,
  userEvents,
  onOpenBriefing,
  onEditPrompt,
  onOpenNews,
  onOpenCommunity
}: CreatorGrowthPanelProps) {
  const topBriefings = [...briefings].sort((a, b) => briefingScore(b) - briefingScore(a)).slice(0, 3);
  const topPrompts = [...publicPrompts].sort((a, b) => promptLikes(b) - promptLikes(a)).slice(0, 3);
  const briefingEvents = userEvents.filter((event) => event.type.startsWith("briefing_"));
  const totalBriefingActions = topBriefings.reduce((sum, briefing) => {
    const stats = briefing.stats || {};
    return sum + (stats.ideaSaves || 0) + (stats.promptCreates || 0) + (stats.forumPosts || 0);
  }, 0);

  if (!briefings.length && !publicPrompts.length && !publishCandidates.length) {
    return (
      <section className="rounded-2xl md:rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
              <Rocket size={12} />
              Creator growth
            </p>
            <h3 className="mt-3 text-lg font-black text-white">Publica tu primer recurso para empezar a medir crecimiento.</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Crea un briefing desde Noticias o publica un prompt. Despues veras que recursos generan guardados, remixes y conversaciones.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2">
            <button
              type="button"
              onClick={onOpenNews}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-black text-slate-950 transition-all hover:bg-cyan-400 cursor-pointer"
            >
              <Newspaper size={13} />
              Crear briefing
            </button>
            <button
              type="button"
              onClick={onOpenCommunity}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-xs font-black text-slate-200 transition-all hover:border-pink-500/30 hover:text-pink-200 cursor-pointer"
            >
              <Sparkles size={13} />
              Ver comunidad
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl md:rounded-3xl border border-cyan-500/20 bg-slate-900/55 p-4 md:p-5 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
            <BarChart3 size={12} />
            Creator growth
          </p>
          <h3 className="mt-3 text-lg font-black text-white">Que publicar mas, que mejorar y que compartir.</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Senales simples para decidir el siguiente contenido: briefings que convierten, prompts publicos y recursos listos para publicar.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:w-80">
          <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-3">
            <p className="text-lg font-black text-white">{briefings.length}</p>
            <p className="text-[10px] font-bold uppercase text-slate-500">Briefings</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-3">
            <p className="text-lg font-black text-white">{publicPrompts.length}</p>
            <p className="text-[10px] font-bold uppercase text-slate-500">Publicos</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-3">
            <p className="text-lg font-black text-white">{totalBriefingActions || briefingEvents.length}</p>
            <p className="text-[10px] font-bold uppercase text-slate-500">Acciones</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-cyan-300" />
            <div>
              <p className="text-xs font-black text-white">Briefings que convierten</p>
              <p className="text-[10px] text-slate-500">Prioriza los que generan guardados y prompts.</p>
            </div>
          </div>
          {topBriefings.length ? topBriefings.map((briefing) => (
            <article key={briefing.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <p className="line-clamp-2 text-xs font-extrabold text-white">{briefing.title}</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                <span className="rounded-lg bg-slate-950/60 px-2 py-1 text-[10px] font-bold text-amber-300">{briefing.stats?.ideaSaves || 0} ideas</span>
                <span className="rounded-lg bg-slate-950/60 px-2 py-1 text-[10px] font-bold text-pink-300">{briefing.stats?.promptCreates || 0} prompts</span>
                <span className="rounded-lg bg-slate-950/60 px-2 py-1 text-[10px] font-bold text-indigo-300">{briefing.stats?.forumPosts || 0} posts</span>
              </div>
              <button
                type="button"
                onClick={() => onOpenBriefing(briefing)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1.5 text-[10px] font-black text-cyan-300 cursor-pointer"
              >
                <BookOpen size={11} />
                Abrir
              </button>
            </article>
          )) : (
            <p className="rounded-xl border border-dashed border-slate-800 p-3 text-xs leading-relaxed text-slate-500">
              Aun no hay briefings tuyos. Crea uno desde Noticias para empezar a medir.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <Megaphone size={14} className="text-emerald-300" />
            <div>
              <p className="text-xs font-black text-white">Prompts publicados</p>
              <p className="text-[10px] text-slate-500">Recursos que ya pueden traer likes y remixes.</p>
            </div>
          </div>
          {topPrompts.length ? topPrompts.map((prompt) => (
            <article key={prompt.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <p className="line-clamp-1 text-xs font-extrabold text-white">{prompt.title}</p>
              <p className="mt-1 text-[10px] text-slate-500">{prompt.category}</p>
              <p className="mt-2 text-[10px] font-bold text-emerald-300">{promptLikes(prompt)} likes</p>
            </article>
          )) : (
            <p className="rounded-xl border border-dashed border-slate-800 p-3 text-xs leading-relaxed text-slate-500">
              Todavia no publicaste prompts. Activa Hacer publico en tus mejores recursos.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <Share2 size={14} className="text-pink-300" />
            <div>
              <p className="text-xs font-black text-white">Siguiente publicacion</p>
              <p className="text-[10px] text-slate-500">Privados con potencial para sumar al feed.</p>
            </div>
          </div>
          {publishCandidates.slice(0, 3).map((prompt) => (
            <article key={prompt.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <p className="line-clamp-1 text-xs font-extrabold text-white">{prompt.title}</p>
              <p className="mt-1 text-[10px] text-slate-500">{prompt.forkedFromPromptId || prompt.forkedFrom ? "Remix privado" : "Favorito privado"}</p>
              <button
                type="button"
                onClick={() => onEditPrompt(prompt)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-pink-500/25 bg-pink-500/10 px-2.5 py-1.5 text-[10px] font-black text-pink-300 cursor-pointer"
              >
                <Edit3 size={11} />
                Preparar
              </button>
            </article>
          ))}
          {!publishCandidates.length && (
            <button
              type="button"
              onClick={onOpenNews}
              className="w-full rounded-xl border border-dashed border-slate-800 p-3 text-left text-xs leading-relaxed text-slate-500 hover:border-cyan-500/30 hover:text-cyan-200 cursor-pointer"
            >
              Guarda una idea desde Noticias o remixea un prompt para crear tu proximo candidato.
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
