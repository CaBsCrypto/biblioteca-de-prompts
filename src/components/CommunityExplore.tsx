import { Eye, GitFork, Heart, Play, Sparkles } from "lucide-react";
import type { Prompt } from "../types";
import type { ExploreSection } from "../utils/dailyLoop";

interface CommunityExploreProps {
  sections: ExploreSection[];
  onView: (prompt: Prompt) => void;
  onUse: (prompt: Prompt) => void;
  onSave: (prompt: Prompt) => void;
}

function likesCount(prompt: Prompt) {
  return prompt.likesCount || prompt.likedBy?.length || 0;
}

export default function CommunityExplore({ sections, onView, onUse, onSave }: CommunityExploreProps) {
  if (sections.length === 0) return null;

  return (
    <section className="rounded-2xl md:rounded-3xl border border-slate-800/85 bg-[#1e293b]/55 p-4 md:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Sparkles size={15} className="text-pink-300" />
            Explorar prompts
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-sans">
            Atajos para descubrir, guardar como remix y usar prompts publicos sin perderte en el feed.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {sections.map((section) => (
          <div key={section.id} className="rounded-2xl border border-slate-800 bg-slate-950/25 p-3.5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-100">{section.title}</p>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{section.description}</p>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2 py-0.5">
                {section.prompts.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {section.prompts.map((prompt) => (
                <article key={`${section.id}-${prompt.id}`} className="rounded-xl border border-slate-800/80 bg-[#1e293b]/70 p-3 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] uppercase tracking-wider text-indigo-300 font-black truncate">
                      {prompt.category}
                    </span>
                    <span className="text-[10px] text-rose-300 flex items-center gap-1 font-mono">
                      <Heart size={10} fill={likesCount(prompt) > 0 ? "currentColor" : "none"} />
                      {likesCount(prompt)}
                    </span>
                  </div>
                  <h4 className="text-xs font-extrabold text-white mt-2 line-clamp-2">{prompt.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {prompt.description || "Prompt publico listo para adaptar."}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <button
                      type="button"
                      onClick={() => onSave(prompt)}
                      className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <GitFork size={11} />
                      Remix
                    </button>
                    <button
                      type="button"
                      onClick={() => onUse(prompt)}
                      className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Play size={10} fill="currentColor" />
                      Usar
                    </button>
                    <button
                      type="button"
                      onClick={() => onView(prompt)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={11} />
                      Ver
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
