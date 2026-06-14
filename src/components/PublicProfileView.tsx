import { ArrowLeft, Copy, FolderOpen, GitFork, Globe, Heart, Layers3, Share2, Sparkles, Tags, TrendingUp, UserCheck, UserPlus } from "lucide-react";
import type { User } from "firebase/auth";
import type { Folder, Prompt } from "../types";
import PromptCard from "./PromptCard";

export type PublicProfileTab = "prompts" | "colecciones" | "remixes";

interface PublicProfileViewProps {
  author: { name: string; uid: string; avatar?: string; handle?: string };
  prompts: Prompt[];
  allCommunityPrompts: Prompt[];
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
  allCommunityPrompts,
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
  const remixPrompts = prompts.filter((prompt) => Boolean(prompt.forkedFromPromptId || prompt.forkedFrom));
  const originalPrompts = prompts.filter((prompt) => !prompt.forkedFromPromptId && !prompt.forkedFrom);
  const visiblePrompts = activeTab === "remixes" ? remixPrompts : originalPrompts;
  const likesCount = prompts.reduce((sum, prompt) => sum + (prompt.likesCount || prompt.likedBy?.length || 0), 0);
  const isFollowing = followedCreatorUids.includes(author.uid);
  const displayHandle = author.handle || prompts.find((prompt) => prompt.authorHandle)?.authorHandle || "";
  const sourceIds = new Set(prompts.map((prompt) => prompt.forkedFromPromptId || prompt.id));
  const knownRemixCount = allCommunityPrompts.filter((prompt) =>
    prompt.userId !== author.uid && sourceIds.has(prompt.forkedFromPromptId || "")
  ).length;
  const popularPrompts = [...prompts]
    .sort((a, b) => {
      const likeDiff = (b.likesCount || b.likedBy?.length || 0) - (a.likesCount || a.likedBy?.length || 0);
      if (likeDiff !== 0) return likeDiff;
      return (b.updatedAt?.seconds || b.createdAt?.seconds || 0) - (a.updatedAt?.seconds || a.createdAt?.seconds || 0);
    })
    .slice(0, 3);
  const remixedSources = prompts
    .map((prompt) => ({
      prompt,
      remixes: allCommunityPrompts.filter((candidate) => candidate.forkedFromPromptId === (prompt.forkedFromPromptId || prompt.id)).length
    }))
    .filter((item) => item.remixes > 0)
    .sort((a, b) => b.remixes - a.remixes)
    .slice(0, 3);
  const getKnownRemixCount = (prompt: Prompt) => {
    const sourceId = prompt.forkedFromPromptId || prompt.id;
    return allCommunityPrompts.filter((candidate) => (
      candidate.id !== prompt.id &&
      (
        candidate.forkedFromPromptId === sourceId ||
        candidate.forkedFromPromptId === prompt.id ||
        (!candidate.forkedFromPromptId && candidate.forkedFrom === prompt.title)
      )
    )).length;
  };
  const categoryCounts = prompts.reduce((map, prompt) => {
    map.set(prompt.category, (map.get(prompt.category) || 0) + 1);
    return map;
  }, new Map<Prompt["category"], number>());
  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const topTags = Array.from(
    prompts
      .flatMap((prompt) => prompt.tags || [])
      .reduce((map, tag) => {
        const cleanTag = tag.trim();
        if (cleanTag) map.set(cleanTag, (map.get(cleanTag) || 0) + 1);
        return map;
      }, new Map<string, number>())
      .entries()
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const highlightedPrompt = popularPrompts[0] || prompts[0] || null;

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
                Hub publico con prompts originales, colecciones y remixes publicados. Guarda cualquier recurso como remix editable para adaptarlo a tu propio flujo.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2 shrink-0">
            {prompts.length > 0 && (
              <button
                type="button"
                onClick={() => onFork(prompts[0])}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
              >
                <GitFork size={14} />
                <span>Guardar un prompt</span>
              </button>
            )}
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
            <p className="text-2xl font-black text-amber-300 font-mono">{remixPrompts.length + knownRemixCount}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold">remixes</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
        <div className="rounded-2xl md:rounded-3xl border border-slate-800/85 bg-[#1e293b]/55 p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Sparkles size={15} className="text-pink-300" />
                Recursos destacados
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Lo mas fuerte de este creador para guardar, probar o remixear.</p>
            </div>
            {highlightedPrompt && (
              <button
                type="button"
                onClick={() => onFork(highlightedPrompt)}
                className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <GitFork size={12} />
                Guardar destacado
              </button>
            )}
          </div>

          {popularPrompts.length === 0 ? (
            <p className="text-xs text-slate-500 rounded-2xl border border-dashed border-slate-800 p-5 text-center">
              Cuando publique prompts, sus recursos destacados apareceran aqui.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {popularPrompts.map((prompt) => {
                const promptLikes = prompt.likesCount || prompt.likedBy?.length || 0;
                return (
                  <article key={`featured-${prompt.id}`} className="rounded-2xl border border-slate-800/80 bg-slate-950/25 p-3.5 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] uppercase tracking-wider text-indigo-300 font-black truncate">{prompt.category}</span>
                      <span className="text-[10px] text-pink-300 flex items-center gap-1 font-mono">
                        <Heart size={10} fill={promptLikes > 0 ? "currentColor" : "none"} />
                        {promptLikes}
                      </span>
                    </div>
                    <h4 className="text-xs font-extrabold text-white mt-2 line-clamp-2">{prompt.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">{prompt.description || "Prompt publico listo para adaptar."}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <button
                        type="button"
                        onClick={() => onViewDetails(prompt)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => onFork(prompt)}
                        className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        Remix
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl md:rounded-3xl border border-slate-800/85 bg-[#1e293b]/55 p-4 md:p-5 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Layers3 size={15} className="text-emerald-300" />
            Mapa del creador
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-950/35 border border-slate-800 p-3">
              <p className="text-lg font-black text-indigo-300 font-mono">{topCategories.length}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">categorias</p>
            </div>
            <div className="rounded-xl bg-slate-950/35 border border-slate-800 p-3">
              <p className="text-lg font-black text-emerald-300 font-mono">{knownRemixCount}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">remixes conocidos</p>
            </div>
          </div>
          {topCategories.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-black flex items-center gap-1.5">
                <TrendingUp size={11} />
                Temas principales
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topCategories.map(([category, count]) => (
                  <span key={category} className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg">
                    {category} · {count}
                  </span>
                ))}
              </div>
            </div>
          )}
          {topTags.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-black flex items-center gap-1.5">
                <Tags size={11} />
                Tags frecuentes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topTags.map(([tag, count]) => (
                  <span key={tag} className="text-[10px] text-slate-300 bg-slate-800 border border-slate-700/70 px-2 py-0.5 rounded-lg">
                    #{tag} · {count}
                  </span>
                ))}
              </div>
            </div>
          )}
          {remixedSources.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-black flex items-center gap-1.5">
                <GitFork size={11} />
                Mas remixeados
              </p>
              <div className="space-y-1.5">
                {remixedSources.map(({ prompt, remixes }) => (
                  <button
                    key={`remixed-source-${prompt.id}`}
                    type="button"
                    onClick={() => onViewDetails(prompt)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/25 p-2.5 text-left hover:border-indigo-500/30 hover:bg-slate-900/60 transition-all cursor-pointer"
                  >
                    <p className="text-[11px] font-bold text-slate-200 line-clamp-1">{prompt.title}</p>
                    <p className="text-[10px] text-emerald-300 mt-0.5">{remixes} remixes conocidos</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="flex items-center gap-1.5 rounded-2xl bg-slate-950/55 p-1 border border-slate-800 w-fit max-w-full overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => onTabChange("prompts")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "prompts" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Globe size={13} />
          <span>Prompts</span>
          <span className="text-[10px] bg-slate-950/45 px-1.5 py-0.5 rounded-md font-mono">{originalPrompts.length}</span>
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
        <button
          type="button"
          onClick={() => onTabChange("remixes")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "remixes" ? "bg-pink-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <GitFork size={13} />
          <span>Remixes publicados</span>
          <span className="text-[10px] bg-slate-950/45 px-1.5 py-0.5 rounded-md font-mono">{remixPrompts.length}</span>
        </button>
      </div>

      {activeTab === "prompts" || activeTab === "remixes" ? (
        visiblePrompts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/35 p-12 text-center">
            <p className="text-sm font-bold text-white">
              {activeTab === "remixes" ? "Este creador aun no publico remixes." : "Este creador aun no tiene prompts originales publicos."}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === "remixes" ? "Cuando comparta adaptaciones, apareceran aqui." : "Cuando publique recursos originales, apareceran aqui."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visiblePrompts.map((prompt) => (
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
                knownRemixCount={getKnownRemixCount(prompt)}
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = publicLink;
                      }}
                      className="text-emerald-300 hover:text-emerald-200 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <FolderOpen size={11} />
                      Explorar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(publicLink);
                        onNotification("Enlace de coleccion copiado.", "success");
                      }}
                      className="text-indigo-300 hover:text-indigo-200 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy size={11} />
                      Copiar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
