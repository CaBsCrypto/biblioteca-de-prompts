import { ArrowLeft, Bookmark, Copy, ExternalLink, MessageSquare, Sparkles, UserPlus } from "lucide-react";
import type { Briefing, BriefingItem } from "../typesCommunity";

function formatBriefingDate(value: any) {
  const dateValue = typeof value?.toDate === "function" ? value.toDate() : value;
  const date = dateValue ? new Date(dateValue) : null;
  if (!date || Number.isNaN(date.getTime())) return "Reciente";
  return new Intl.DateTimeFormat("es", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

interface PublicBriefingViewProps {
  briefing: Briefing;
  loading?: boolean;
  onBack: () => void;
  onSignIn: () => void;
  onCopyLink: () => void;
  onSaveItem: (item: BriefingItem) => void;
  onCreatePrompt: (item: BriefingItem) => void;
  onCreateForumPost: (item: BriefingItem) => void;
}

export default function PublicBriefingView({
  briefing,
  loading,
  onBack,
  onSignIn,
  onCopyLink,
  onSaveItem,
  onCreatePrompt,
  onCreateForumPost
}: PublicBriefingViewProps) {
  const stats = briefing.stats || {};
  const savedAndCreatedCount = (stats.ideaSaves || 0) + (stats.promptCreates || 0) + (stats.forumPosts || 0);

  return (
    <main className="mx-auto flex-1 w-full max-w-6xl space-y-6 overflow-y-auto px-4 py-8 md:px-12 md:py-12">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs font-black text-slate-300 transition-colors hover:text-white cursor-pointer"
      >
        <ArrowLeft size={14} />
        Volver
      </button>

      <section className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900/60 shadow-2xl md:rounded-3xl">
        <div className="border-b border-slate-800 p-5 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
              Briefing publico
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1 text-[10px] font-black text-slate-400">
              {formatBriefingDate(briefing.createdAt)}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1 text-[10px] font-black text-slate-400">
              {briefing.items.length} fuentes
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="min-w-0 space-y-3">
              <h2 className="text-2xl font-black leading-tight text-white md:text-4xl">{briefing.title}</h2>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-400">{briefing.intro}</p>
              <p className="text-xs font-bold text-slate-500">
                Curado por <span className="text-cyan-300">{briefing.authorName}</span>
                {briefing.authorHandle ? ` @${briefing.authorHandle}` : ""}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2 lg:w-72 lg:grid-cols-1">
              <button
                type="button"
                onClick={() => briefing.items[0] && onSaveItem(briefing.items[0])}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-slate-950 transition-all hover:bg-amber-400 cursor-pointer"
              >
                <Bookmark size={14} fill="currentColor" />
                Guardar una idea
              </button>
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4f46e5] to-[#ec4899] px-4 py-2.5 text-xs font-black text-white transition-all hover:opacity-95 cursor-pointer"
              >
                <UserPlus size={14} />
                Crear mi biblioteca
              </button>
              <button
                type="button"
                onClick={onCopyLink}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-xs font-black text-slate-200 transition-all hover:border-cyan-500/30 hover:text-cyan-200 cursor-pointer min-[430px]:col-span-2 lg:col-span-1"
              >
                <Copy size={14} />
                Copiar link
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4">
            <p className="text-sm font-black text-cyan-100">Guarda ideas, conviertelas en prompts y publica tu version.</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Este briefing funciona como punto de partida: guarda una senal, abre un prompt editable o crea una conversacion para construir con otros.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Aperturas", value: stats.opens || 0 },
              { label: "Links copiados", value: stats.linkCopies || 0 },
              { label: "Acciones", value: savedAndCreatedCount },
              { label: "Posts", value: stats.forumPosts || 0 }
            ].map((metric) => (
              <div key={metric.label} className="rounded-xl border border-slate-800 bg-slate-950/35 p-3">
                <p className="text-lg font-black text-white">{metric.value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{metric.label}</p>
              </div>
            ))}
          </div>

          {briefing.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {briefing.tags.map((tag) => (
                <span key={tag} className="rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1 text-[10px] font-bold text-slate-400">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm font-bold text-slate-400">Cargando briefing...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 md:p-6">
            {briefing.items.map((item) => (
              <article key={`${item.url}-${item.title}`} className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[10px] font-black text-slate-400">
                        {item.source}
                      </span>
                      <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-cyan-300">
                        {item.language}
                      </span>
                    </div>
                    <h3 className="text-lg font-black leading-tight text-white">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-400">{item.summary}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-80 lg:grid-cols-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-200"
                    >
                      Leer
                      <ExternalLink size={12} />
                    </a>
                    <button
                      type="button"
                      onClick={() => onSaveItem(item)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-300 cursor-pointer"
                    >
                      <Bookmark size={12} />
                      Guardar idea
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreatePrompt(item)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-pink-500/25 bg-pink-500/10 px-3 py-2 text-xs font-black text-pink-300 cursor-pointer"
                    >
                      <Sparkles size={12} />
                      Prompt
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreateForumPost(item)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-xs font-black text-indigo-300 cursor-pointer"
                    >
                      <MessageSquare size={12} />
                      Foro
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
