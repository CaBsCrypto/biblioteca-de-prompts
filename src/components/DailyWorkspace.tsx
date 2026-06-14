import { Eye, GitFork, History, Pencil, Play, Share2, Star } from "lucide-react";
import type { Prompt } from "../types";
import type { DailyWorkspaceState } from "../utils/dailyLoop";

interface DailyWorkspaceProps {
  state: DailyWorkspaceState;
  onEdit: (prompt: Prompt) => void;
  onUse: (prompt: Prompt) => void;
  onViewSocial: (prompt: Prompt) => void;
  onSaveSocial: (prompt: Prompt) => void;
  onOpenSocialFavorites: () => void;
}

interface QuickSection {
  id: string;
  title: string;
  description: string;
  prompts: Prompt[];
  icon: "history" | "star" | "fork" | "share";
  mode: "library" | "social";
}

function SectionIcon({ icon }: { icon: QuickSection["icon"] }) {
  if (icon === "star") return <Star size={14} fill="currentColor" className="text-amber-300" />;
  if (icon === "fork") return <GitFork size={14} className="text-pink-300" />;
  if (icon === "share") return <Share2 size={14} className="text-emerald-300" />;
  return <History size={14} className="text-indigo-300" />;
}

export default function DailyWorkspace({
  state,
  onEdit,
  onUse,
  onViewSocial,
  onSaveSocial,
  onOpenSocialFavorites
}: DailyWorkspaceProps) {
  if (!state.hasAny) return null;

  const allSections: QuickSection[] = [
    {
      id: "recent",
      title: "Continuar trabajando",
      description: "Prompts usados, copiados o editados recientemente.",
      prompts: state.recentPrompts,
      icon: "history",
      mode: "library"
    },
    {
      id: "favorites",
      title: "Favoritos propios",
      description: "Tus herramientas personales para repetir rapido.",
      prompts: state.favoritePrompts,
      icon: "star",
      mode: "library"
    },
    {
      id: "remixes",
      title: "Remixes recientes",
      description: "Copias privadas creadas desde la comunidad.",
      prompts: state.recentRemixes,
      icon: "fork",
      mode: "library"
    },
    {
      id: "publish",
      title: "Listos para publicar",
      description: "Prompts privados con potencial para sumar al feed social.",
      prompts: state.publishCandidates,
      icon: "share",
      mode: "library"
    },
    {
      id: "social",
      title: "Favoritos sociales",
      description: "Referencias publicas listas para convertir en remix.",
      prompts: state.socialFavoritePrompts,
      icon: "star",
      mode: "social"
    }
  ];
  const sections = allSections.filter((section) => section.prompts.length > 0);

  return (
    <section className="rounded-2xl md:rounded-3xl border border-slate-800/85 bg-[#1e293b]/60 p-4 md:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <History size={15} className="text-indigo-300" />
            Accesos rapidos
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Vuelve a lo ultimo, abre favoritos o transforma referencias sociales en remixes.
          </p>
        </div>
        {state.socialFavoritePrompts.length > 0 && (
          <button
            type="button"
            onClick={onOpenSocialFavorites}
            className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Star size={12} />
            Ver favoritos sociales
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {sections.map((section) => (
          <div key={section.id} className="rounded-2xl border border-slate-800 bg-slate-950/25 p-3.5 space-y-2.5">
            <div className="flex items-start gap-2">
              <SectionIcon icon={section.icon} />
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-100">{section.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{section.description}</p>
              </div>
            </div>

            <div className="space-y-2">
              {section.prompts.map((prompt) => (
                <article key={`${section.id}-${prompt.id}`} className="rounded-xl border border-slate-800/80 bg-[#1e293b]/70 p-3 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-white line-clamp-1">{prompt.title}</p>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{prompt.category}</p>
                    </div>
                    {prompt.isShared && (
                      <span className="text-[9px] uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-black shrink-0">
                        Publico
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {section.mode === "social" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onSaveSocial(prompt)}
                          className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <GitFork size={11} />
                          Remix
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewSocial(prompt)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={11} />
                          Ver
                        </button>
                      </>
                    ) : (
                      <>
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
                          onClick={() => onEdit(prompt)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil size={11} />
                          Editar
                        </button>
                      </>
                    )}
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
