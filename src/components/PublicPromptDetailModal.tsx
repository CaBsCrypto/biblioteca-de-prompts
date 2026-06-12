import { Copy, EyeOff, Flag, GitFork, Globe, Heart, Play, Sparkles, Star, StickyNote, UserPlus, X } from "lucide-react";
import type { User } from "firebase/auth";
import type { Prompt } from "../types";
import CommentsSection from "./CommentsSection";

interface PublicPromptDetailModalProps {
  prompt: Prompt;
  currentUser: User | null;
  isSocialFavorite: boolean;
  onClose: () => void;
  onCopy: (prompt: Prompt) => void;
  onUse: (prompt: Prompt) => void;
  onSaveToLibrary: (prompt: Prompt) => void;
  onToggleFavorite: (prompt: Prompt) => void;
  onLikeToggle: (prompt: Prompt) => void;
  onHidePrompt: (prompt: Prompt) => void;
  onReportPrompt: (prompt: Prompt) => void;
  onAuthorClick?: (author: { name: string; uid: string; avatar?: string }) => void;
  onNotification?: (message: string, type: "success" | "info") => void;
}

export default function PublicPromptDetailModal({
  prompt,
  currentUser,
  isSocialFavorite,
  onClose,
  onCopy,
  onUse,
  onSaveToLibrary,
  onToggleFavorite,
  onLikeToggle,
  onHidePrompt,
  onReportPrompt,
  onAuthorClick,
  onNotification
}: PublicPromptDetailModalProps) {
  const hasVariables = Boolean(prompt.suggestedVariables?.length);
  const isFounderPackPrompt = prompt.userId === "founder-pack" || prompt.id.startsWith("founder-pack-");
  const isLiked = currentUser ? prompt.likedBy?.includes(currentUser.uid) : false;
  const likesCount = prompt.likesCount || prompt.likedBy?.length || 0;
  const forkSourceTitle = prompt.forkedFromTitle || prompt.forkedFrom;
  const forkSourceAuthor = prompt.forkedFromAuthorName || "";

  return (
    <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-[#1e293b] rounded-2xl sm:rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-700/80 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-250">
        <div className="flex items-start justify-between gap-4 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-700/60 bg-slate-900/40 shrink-0">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded font-bold flex items-center gap-1.5">
                <Globe size={11} />
                Post social
              </span>
              <span className="text-[10px] uppercase tracking-widest bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-0.5 rounded font-bold">
                {prompt.category}
              </span>
              {isFounderPackPrompt && (
                <span className="text-[10px] uppercase tracking-widest bg-pink-500/10 text-pink-300 border border-pink-500/20 px-2.5 py-0.5 rounded font-bold">
                  Pack Fundador
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white leading-tight">{prompt.title}</h2>
            {prompt.authorName && (
              <button
                type="button"
                onClick={() => {
                  onAuthorClick?.({ name: prompt.authorName!, uid: prompt.userId, avatar: prompt.authorAvatar });
                  onClose();
                }}
                className="text-xs text-slate-400 hover:text-indigo-300 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <UserPlus size={13} />
                <span>
                  Publicado por <strong className="text-slate-200">@{prompt.authorHandle || prompt.authorName}</strong>
                </span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white font-bold transition-all cursor-pointer shrink-0"
            title="Cerrar detalle"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
            <section className="space-y-5 min-w-0">
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/35 p-4 space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-300">Objetivo del prompt</h3>
                <p className="text-sm text-slate-300 leading-relaxed font-sans">
                  {prompt.description || "El creador no agrego un objetivo detallado para este prompt."}
                </p>
              </div>

              {forkSourceTitle && (
                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 text-xs text-indigo-200 flex items-start gap-2.5">
                  <GitFork size={14} className="mt-0.5 text-indigo-300 shrink-0" />
                  <div className="leading-relaxed">
                    Basado en <span className="font-bold text-indigo-100">{forkSourceTitle}</span>
                    {forkSourceAuthor ? <> por <span className="font-bold text-indigo-100">{forkSourceAuthor}</span></> : ""}.
                  </div>
                </div>
              )}

              {prompt.notas && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <StickyNote size={13} />
                    Como usarlo
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">{prompt.notas}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">Prompt completo</label>
                <pre className="w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-xs font-mono text-slate-100 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[360px] overflow-y-auto">
                  {prompt.promptText}
                </pre>
              </div>

              {hasVariables && (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">Variables disponibles</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {prompt.suggestedVariables?.map((variable, index) => (
                      <div
                        key={`${variable.name}-${index}`}
                        className="p-3 rounded-xl bg-slate-900/55 border border-slate-800 text-xs font-sans"
                      >
                        <span className="font-extrabold text-pink-400 font-mono">{"{{" + variable.name + "}}"}</span>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{variable.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isFounderPackPrompt && (
                <CommentsSection
                  promptId={prompt.id}
                  currentUser={currentUser}
                  promptOwnerId={prompt.userId}
                  onNotification={onNotification}
                />
              )}
            </section>

            <aside className="space-y-3">
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/45 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-slate-950/50 border border-slate-800 p-3">
                    <p className="text-lg font-black text-pink-300 font-mono">{likesCount}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">likes</p>
                  </div>
                  <div className="rounded-xl bg-slate-950/50 border border-slate-800 p-3">
                    <p className="text-lg font-black text-indigo-300 font-mono">{prompt.tags?.length || 0}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">tags</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSaveToLibrary(prompt)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/15 cursor-pointer"
                >
                  <GitFork size={14} />
                  <span>Guardar como remix editable</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onCopy(prompt)}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Copy size={13} />
                    <span>Copiar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUse(prompt)}
                    className="px-3 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold text-xs rounded-xl border border-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Usar</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(prompt)}
                    className={`px-3 py-2.5 font-bold text-xs rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSocialFavorite
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/35"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                    }`}
                  >
                    <Star size={13} fill={isSocialFavorite ? "currentColor" : "none"} />
                    <span>{isSocialFavorite ? "Favorito" : "Favorito"}</span>
                  </button>

                  {!isFounderPackPrompt && (
                    <button
                      type="button"
                      onClick={() => onLikeToggle(prompt)}
                      className={`px-3 py-2.5 font-bold text-xs rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isLiked
                          ? "bg-rose-500/15 text-rose-300 border-rose-500/35"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                      }`}
                    >
                      <Heart size={13} fill={isLiked ? "currentColor" : "none"} />
                      <span>Like</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onHidePrompt(prompt)}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <EyeOff size={13} />
                    <span>Ocultar</span>
                  </button>

                  {!isFounderPackPrompt && prompt.userId !== currentUser?.uid && (
                    <button
                      type="button"
                      onClick={() => onReportPrompt(prompt)}
                      className="px-3 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Flag size={13} />
                      <span>Reportar</span>
                    </button>
                  )}
                </div>
              </div>

              {prompt.tags && prompt.tags.length > 0 && (
                <div className="rounded-2xl border border-slate-700/70 bg-slate-900/35 p-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {prompt.tags.map((tag) => (
                      <span key={tag} className="text-[10px] text-slate-300 bg-slate-800 border border-slate-700/70 px-2 py-0.5 rounded-lg">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {hasVariables && (
                <div className="rounded-2xl border border-pink-500/20 bg-pink-500/5 p-4 text-xs text-pink-200 flex items-start gap-2">
                  <Sparkles size={14} className="mt-0.5 shrink-0" />
                  <span>Este prompt tiene variables editables para adaptarlo rapido a tu proyecto.</span>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
