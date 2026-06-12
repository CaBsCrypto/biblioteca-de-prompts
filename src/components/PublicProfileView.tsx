import { ArrowLeft, Copy, FolderOpen, Globe, Heart, Share2, UserCheck, UserPlus } from "lucide-react";
import type { User } from "firebase/auth";
import type { Folder, Prompt } from "../types";
import PromptCard from "./PromptCard";

export type PublicProfileTab = "publicados" | "colecciones";

interface PublicProfileViewProps {
  author: { name: string; uid: string; avatar?: string; handle?: string };
  prompts: Prompt[];
  folders: Folder[];
  activeTab: PublicProfileTab;
  currentUser: User | null;
  followedCreatorUids: string[];
  socialFavoritePromptIds: Set<string>;
  onTabChange: (tab: PublicProfileTab) => void;
  onBack: () => void;
  onCopyProfileLink: () => void;
  onToggleFollow: (creatorUid: string) => void;
  onUsePrompt: (prompt: Prompt) => void;
  onCopyFilled: (prompt: Prompt) => void;
  onFork: (prompt: Prompt) => void;
  onLikeToggle: (prompt: Prompt) => void;
  onViewDetails: (prompt: Prompt) => void;
  onSocialFavoriteToggle: (prompt: Prompt) => void;
  onHidePrompt: (prompt: Prompt) => void;
  onReportPrompt: (prompt: Prompt) => void;
  onNotification: (message: string, type: "success" | "info") => void;
}

export default function PublicProfileView({
  author,
  prompts,
  folders,
  activeTab,
  currentUser,
  followedCreatorUids,
  socialFavoritePromptIds,
  onTabChange,
  onBack,
  onCopyProfileLink,
  onToggleFollow,
  onUsePrompt,
  onCopyFilled,
  onFork,
  onLikeToggle,
  onViewDetails,
  onSocialFavoriteToggle,
  onHidePrompt,
  onReportPrompt,
  onNotification
}: PublicProfileViewProps) {
  const publicFolders = folders.filter((folder) => folder.userId === author.uid && folder.isShared);
  const likesCount = prompts.reduce((sum, prompt) => sum + (prompt.likesCount || prompt.likedBy?.length || 0), 0);
  const remixableCount = prompts.filter((prompt) => prompt.userId !== currentUser?.uid).length;
  const isFollowing = followedCreatorUids.includes(author.uid);
  const displayHandle = author.handle || prompts.find((prompt) => prompt.authorHandle)?.authorHandle || "";

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-250">
      <section className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-slate-900/95 via-indigo-950/35 to-slate-900/95 p-5 md:p-7 shadow-2xl">
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-pink-500/10 blur-[70px] pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-3 bg-slate-950/60 hover:bg-slate-800 text-indigo-300 hover:text-white rounded-2xl border border-slate-700/80 transition-all cursor-pointer shrink-0"
              title="Volver a comunidad"
            >
              <ArrowLeft size={16} />
            </button>

            {author.avatar ? (
              <img
                src={author.avatar}
                alt={author.name}
                referrerPolicy="no-referrer"
                className="h-16 w-16 md:h-20 md:w-20 rounded-3xl border-2 border-indigo-500/40 object-cover shadow-xl shrink-0"
              />
            ) : (
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-3xl flex items-center justify-center bg-indigo-500/10 text-2xl font-black text-indigo-300 font-mono border-2 border-indigo-500/25 shadow-xl shrink-0">
                {author.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-pink-300 bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 rounded-full">
                  Perfil publico
                </span>
                {isFollowing && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <UserCheck size={11} />
                    Siguiendo
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-2xl md:text-4xl font-black text-white leading-tight">{author.name}</h2>
              <p className="mt-1 text-xs md:text-sm text-slate-400 font-mono">
                {displayHandle ? `@${displayHandle}` : "Creador de la comunidad"}
              </p>
              <p className="mt-3 text-xs text-slate-400 max-w-2xl leading-relaxed font-sans">
                Prompts publicados, colecciones compartidas y recursos que puedes guardar como remix editable en tu propia biblioteca.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleFollow(author.uid)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                isFollowing
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500"
              }`}
            >
              {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
              <span>{isFollowing ? "Siguiendo" : "Seguir creador"}</span>
            </button>
            <button
              type="button"
              onClick={onCopyProfileLink}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border bg-slate-950/60 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800"
            >
              <Share2 size={14} />
              <span>Copiar perfil</span>
            </button>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="rounded-2xl bg-slate-950/45 border border-slate-800 p-4">
            <p className="text-2xl font-black text-indigo-300 font-mono">{prompts.length}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold">publicados</p>
          </div>
          <div className="rounded-2xl bg-slate-950/45 border border-slate-800 p-4">
            <p className="text-2xl font-black text-pink-300 font-mono">{likesCount}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold">likes</p>
          </div>
          <div className="rounded-2xl bg-slate-950/45 border border-slate-800 p-4">
            <p className="text-2xl font-black text-emerald-300 font-mono">{publicFolders.length}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold">colecciones</p>
          </div>
          <div className="rounded-2xl bg-slate-950/45 border border-slate-800 p-4">
            <p className="text-2xl font-black text-amber-300 font-mono">{remixableCount}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold">remixeables</p>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-1.5 rounded-2xl bg-slate-950/55 p-1 border border-slate-800 w-fit">
        <button
          type="button"
          onClick={() => onTabChange("publicados")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "publicados" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Globe size={13} />
          <span>Publicados</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange("colecciones")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "colecciones" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <FolderOpen size={13} />
          <span>Colecciones</span>
        </button>
      </div>

      {activeTab === "publicados" ? (
        prompts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/35 p-12 text-center">
            <p className="text-sm font-bold text-white">Este creador aun no tiene prompts publicos.</p>
            <p className="text-xs text-slate-500 mt-1">Cuando publique, sus posts apareceran aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {prompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                folders={[]}
                onFavoriteToggle={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
                onUse={onUsePrompt}
                onCopyFilled={onCopyFilled}
                onNotification={onNotification}
                isCommunityView={true}
                currentUser={currentUser}
                onFork={onFork}
                onLikeToggle={onLikeToggle}
                onAuthorClick={() => {}}
                onViewDetails={onViewDetails}
                onSocialFavoriteToggle={onSocialFavoriteToggle}
                onHidePrompt={onHidePrompt}
                onReportPrompt={onReportPrompt}
                isSocialFavorite={socialFavoritePromptIds.has(prompt.id)}
              />
            ))}
          </div>
        )
      ) : publicFolders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/35 p-12 text-center">
          <p className="text-sm font-bold text-white">Este creador aun no tiene colecciones publicas.</p>
          <p className="text-xs text-slate-500 mt-1">Las carpetas compartidas apareceran aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {publicFolders.map((folder) => {
            const count = prompts.filter((prompt) => prompt.folderId === folder.id).length;
            const publicLink = `${window.location.origin}${window.location.pathname}?collection=${folder.id}`;
            return (
              <div key={folder.id} className="rounded-2xl border border-slate-700/70 bg-slate-900/45 p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase">
                      Coleccion publica
                    </span>
                    <h3 className="text-lg font-black text-white mt-3 line-clamp-2">{folder.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-3">
                      {folder.description || "Coleccion compartida por este creador."}
                    </p>
                  </div>
                  <FolderOpen size={18} className="text-emerald-300 shrink-0 mt-1" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{count} prompts visibles</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(publicLink);
                      onNotification("Enlace de coleccion copiado.", "success");
                    }}
                    className="text-indigo-300 hover:text-indigo-200 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={11} />
                    Copiar enlace
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
