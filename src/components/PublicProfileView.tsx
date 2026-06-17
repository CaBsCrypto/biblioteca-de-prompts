import { ArrowLeft, BookOpen, Copy, ExternalLink, FolderOpen, GitFork, Globe, Heart, Image, Layers3, MessageSquare, Newspaper, Share2, Sparkles, Tags, TrendingUp, Trophy, UserCheck, UserPlus, Users } from "lucide-react";
import type { User } from "firebase/auth";
import type { ConnectionStatus, Folder, Prompt } from "../types";
import type { Briefing, CommunityPost, HackathonOpportunity } from "../typesCommunity";
import PromptCard from "./PromptCard";

export type PublicProfileTab = "prompts" | "colecciones" | "remixes";

interface PublicProfileViewProps {
  author: { name: string; uid: string; avatar?: string; handle?: string };
  prompts: Prompt[];
  allCommunityPrompts: Prompt[];
  folders: Folder[];
  briefings: Briefing[];
  posts: CommunityPost[];
  hackathons: HackathonOpportunity[];
  activeTab: PublicProfileTab;
  currentUser: User | null;
  followedCreatorUids: string[];
  connectionStatus?: ConnectionStatus;
  socialFavoritePromptIds: Set<string>;
  onTabChange: (tab: PublicProfileTab) => void;
  onBack: () => void;
  onCopyProfileLink: () => void;
  onOpenBriefing: (briefing: Briefing) => void;
  onToggleFollow: (creatorUid: string) => void;
  onSendConnectionRequest: (target: { uid: string; name: string; avatar?: string; handle?: string }) => void;
  onAcceptConnection: (targetUid: string) => void;
  onRemoveConnection: (targetUid: string) => void;
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
  briefings,
  posts,
  hackathons,
  activeTab,
  currentUser,
  followedCreatorUids,
  connectionStatus,
  socialFavoritePromptIds,
  onTabChange,
  onBack,
  onCopyProfileLink,
  onOpenBriefing,
  onToggleFollow,
  onSendConnectionRequest,
  onAcceptConnection,
  onRemoveConnection,
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
  const forumPosts = posts.filter((post) => post.authorUid === author.uid && post.type !== "showcase");
  const showcasePosts = posts.filter((post) => post.authorUid === author.uid && post.type === "showcase");
  const publicBriefings = briefings.filter((briefing) => briefing.authorUid === author.uid && briefing.isPublished);
  const creatorHackathons = hackathons.filter((hackathon) => hackathon.authorUid === author.uid);
  const remixPrompts = prompts.filter((prompt) => Boolean(prompt.forkedFromPromptId || prompt.forkedFrom));
  const originalPrompts = prompts.filter((prompt) => !prompt.forkedFromPromptId && !prompt.forkedFrom);
  const visiblePrompts = activeTab === "remixes" ? remixPrompts : originalPrompts;
  const likesCount = prompts.reduce((sum, prompt) => sum + (prompt.likesCount || prompt.likedBy?.length || 0), 0);
  const isFollowing = followedCreatorUids.includes(author.uid);
  const displayHandle = author.handle || prompts.find((prompt) => prompt.authorHandle)?.authorHandle || "";
  const canConnectWithAuthor = currentUser?.uid !== author.uid;
  const connectionLabel =
    connectionStatus === "connected"
      ? "Conectados"
      : connectionStatus === "pending_sent"
        ? "Solicitud enviada"
        : connectionStatus === "pending_received"
          ? "Aceptar conexion"
          : "Conectar";
  const handleConnectionAction = () => {
    if (connectionStatus === "pending_received") {
      onAcceptConnection(author.uid);
      return;
    }
    if (connectionStatus === "connected" || connectionStatus === "pending_sent") {
      onRemoveConnection(author.uid);
      return;
    }
    onSendConnectionRequest({
      uid: author.uid,
      name: author.name,
      avatar: author.avatar,
      handle: displayHandle
    });
  };
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
  const categorySections = topCategories.map(([category, count]) => ({
    category,
    count,
    prompts: prompts
      .filter((prompt) => prompt.category === category)
      .sort((a, b) => {
        const likeDiff = (b.likesCount || b.likedBy?.length || 0) - (a.likesCount || a.likedBy?.length || 0);
        if (likeDiff !== 0) return likeDiff;
        return (b.updatedAt?.seconds || b.createdAt?.seconds || 0) - (a.updatedAt?.seconds || a.createdAt?.seconds || 0);
      })
      .slice(0, 3)
  }));
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
  const starterPrompts = popularPrompts.length > 0 ? popularPrompts : prompts.slice(0, 3);
  const publicActivityCount = publicBriefings.length + forumPosts.length + showcasePosts.length + creatorHackathons.length;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-250">
      <section className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-slate-900/95 via-indigo-950/35 to-slate-900/95 p-5 md:p-7 shadow-2xl">
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
                {connectionStatus && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Users size={11} />
                    {connectionStatus === "connected" ? "Conectado" : connectionStatus === "pending_received" ? "Solicitud recibida" : "Solicitud enviada"}
                  </span>
                )}
                {publicActivityCount > 0 && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <TrendingUp size={11} />
                    Hub activo
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-2xl md:text-4xl font-black text-white leading-tight">{author.name}</h2>
              <p className="mt-1 text-xs md:text-sm text-slate-400 font-mono">
                {displayHandle ? `@${displayHandle}` : "Creador de la comunidad"}
              </p>
              <p className="mt-3 text-xs text-slate-400 max-w-2xl leading-relaxed font-sans">
                Hub publico para descubrir prompts, briefings, trabajos y oportunidades. Guarda un recurso como remix privado, adaptalo a tu flujo y publica tu version solo cuando este lista.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2 shrink-0 min-w-[220px]">
            <button
              type="button"
              onClick={() => onToggleFollow(author.uid)}
              className={`px-5 py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer border shadow-lg ${
                isFollowing
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 shadow-emerald-900/10"
                  : "bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-95 text-white border-indigo-500/40 shadow-indigo-900/20"
              }`}
            >
              {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
              <span>{isFollowing ? "Siguiendo" : "Seguir creador"}</span>
            </button>
            {canConnectWithAuthor && (
              <button
                type="button"
                onClick={handleConnectionAction}
                className={`px-5 py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer border shadow-lg ${
                  connectionStatus === "connected"
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                    : connectionStatus === "pending_received"
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                      : connectionStatus === "pending_sent"
                        ? "bg-slate-950/60 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800"
                        : "bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20"
                }`}
              >
                {connectionStatus === "connected" ? <UserCheck size={14} /> : <UserPlus size={14} />}
                <span>{connectionLabel}</span>
              </button>
            )}
            {highlightedPrompt && (
              <button
                type="button"
                onClick={() => onFork(highlightedPrompt)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
              >
                <GitFork size={14} />
                <span>Guardar recurso</span>
              </button>
            )}
            <button
              type="button"
              onClick={onCopyProfileLink}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border bg-slate-950/60 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800"
            >
              <Share2 size={14} />
              <span>Copiar hub</span>
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

        <div className="relative z-10 mt-4 rounded-2xl border border-slate-800 bg-slate-950/35 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <p className="text-xs leading-relaxed text-slate-400">
            Comparte este hub para que otros exploren recursos, sigan al creador y guarden una copia editable sin tocar el original.
          </p>
          <button
            type="button"
            onClick={onCopyProfileLink}
            className="px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border bg-slate-900 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800 shrink-0"
          >
            <Share2 size={13} />
            Copiar enlace
          </button>
        </div>
      </section>

      {(publicBriefings.length > 0 || forumPosts.length > 0 || showcasePosts.length > 0 || creatorHackathons.length > 0) && (
        <section className="rounded-2xl md:rounded-3xl border border-cyan-500/20 bg-slate-900/55 p-4 md:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <TrendingUp size={15} className="text-cyan-300" />
                Actividad publica
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Briefings, conversaciones, trabajos y oportunidades que muestran como construye este creador.
              </p>
            </div>
            <button
              type="button"
              onClick={onCopyProfileLink}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border bg-cyan-500/10 text-cyan-300 border-cyan-500/25 hover:bg-cyan-500/20 shrink-0"
            >
              <Share2 size={13} />
              Copiar hub
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-3">
              <p className="text-lg font-black text-cyan-300 font-mono">{publicBriefings.length}</p>
              <p className="text-[10px] font-bold uppercase text-slate-500">briefings</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-3">
              <p className="text-lg font-black text-indigo-300 font-mono">{forumPosts.length}</p>
              <p className="text-[10px] font-bold uppercase text-slate-500">foro</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-3">
              <p className="text-lg font-black text-pink-300 font-mono">{showcasePosts.length}</p>
              <p className="text-[10px] font-bold uppercase text-slate-500">galeria</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-3">
              <p className="text-lg font-black text-emerald-300 font-mono">{creatorHackathons.length}</p>
              <p className="text-[10px] font-bold uppercase text-slate-500">hackathons</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {publicBriefings.slice(0, 2).map((briefing) => (
              <article key={`profile-briefing-${briefing.id}`} className="rounded-2xl border border-cyan-500/15 bg-slate-950/30 p-4">
                <div className="flex items-start gap-3">
                  <Newspaper size={16} className="mt-0.5 shrink-0 text-cyan-300" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Briefing</p>
                    <h4 className="mt-1 line-clamp-2 text-sm font-black text-white">{briefing.title}</h4>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{briefing.intro}</p>
                    <button
                      type="button"
                      onClick={() => onOpenBriefing(briefing)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1.5 text-[10px] font-black text-cyan-300 cursor-pointer"
                    >
                      <BookOpen size={11} />
                      Abrir briefing
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {forumPosts.slice(0, 2).map((post) => (
              <article key={`profile-post-${post.id}`} className="rounded-2xl border border-indigo-500/15 bg-slate-950/30 p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare size={16} className="mt-0.5 shrink-0 text-indigo-300" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-300">{post.type === "team" ? "Equipo" : post.type === "question" ? "Pregunta" : "Foro"}</p>
                    <h4 className="mt-1 line-clamp-2 text-sm font-black text-white">{post.title}</h4>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{post.body}</p>
                    {post.linkUrl && (
                      <a href={post.linkUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1.5 text-[10px] font-black text-indigo-300">
                        <ExternalLink size={11} />
                        Abrir recurso
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}

            {showcasePosts.slice(0, 2).map((post) => (
              <article key={`profile-showcase-${post.id}`} className="overflow-hidden rounded-2xl border border-pink-500/15 bg-slate-950/30">
                {post.imageUrl && (
                  <div className="aspect-[16/9] overflow-hidden bg-slate-950">
                    <img src={post.imageUrl} alt={post.title} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-pink-300">
                    <Image size={12} />
                    Galeria
                  </p>
                  <h4 className="mt-1 line-clamp-2 text-sm font-black text-white">{post.title}</h4>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{post.body}</p>
                </div>
              </article>
            ))}

            {creatorHackathons.slice(0, 2).map((hackathon) => (
              <article key={`profile-hackathon-${hackathon.id}`} className="rounded-2xl border border-emerald-500/15 bg-slate-950/30 p-4">
                <div className="flex items-start gap-3">
                  <Trophy size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Hackathon</p>
                    <h4 className="mt-1 line-clamp-2 text-sm font-black text-white">{hackathon.title}</h4>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{hackathon.description}</p>
                    <a href={hackathon.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-black text-emerald-300">
                      <ExternalLink size={11} />
                      Ver oportunidad
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!currentUser && prompts.length > 0 && (
        <section className="rounded-2xl md:rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <GitFork size={15} className="text-emerald-300" />
              Guarda sin tocar el original
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">
              Cuando pulses guardar, la app crea una copia privada en tu biblioteca. Puedes editarla, usarla y decidir despues si publicas tu version como remix.
            </p>
          </div>
          {highlightedPrompt && (
            <button
              type="button"
              onClick={() => onFork(highlightedPrompt)}
              className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <GitFork size={13} />
              Guardar recurso
            </button>
          )}
        </section>
      )}

      {starterPrompts.length > 0 && (
        <section className="rounded-2xl md:rounded-3xl border border-slate-800/85 bg-[#1e293b]/55 p-4 md:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <BookOpen size={15} className="text-emerald-300" />
                Mejores recursos para empezar
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Una ruta corta para probar el estilo de este creador antes de explorar todo su catalogo.
              </p>
            </div>
            {highlightedPrompt && (
              <button
                type="button"
                onClick={() => onViewDetails(highlightedPrompt)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Globe size={12} />
                Ver recurso principal
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {starterPrompts.map((prompt, index) => (
              <article key={`starter-${prompt.id}`} className="rounded-2xl border border-slate-800/80 bg-slate-950/25 p-4 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] uppercase tracking-wider text-emerald-300 font-black">Paso {index + 1}</span>
                  <span className="text-[9px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg font-bold truncate">
                    {prompt.category}
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-white mt-3 line-clamp-2">{prompt.title}</h4>
                <p className="text-[11px] text-slate-400 mt-2 line-clamp-3 leading-relaxed">{prompt.description || "Recurso publico listo para adaptar."}</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => onViewDetails(prompt)}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-[10px] font-bold cursor-pointer"
                  >
                    Ver
                  </button>
                  <button
                    type="button"
                    onClick={() => onFork(prompt)}
                    className="px-2.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 rounded-xl text-[10px] font-bold cursor-pointer"
                  >
                    Guardar remix
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

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
                    {category} - {count}
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
                    #{tag} - {count}
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

      {categorySections.length > 0 && (
        <section className="rounded-2xl md:rounded-3xl border border-slate-800/85 bg-[#1e293b]/55 p-4 md:p-5 space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Tags size={15} className="text-indigo-300" />
              Explorar por categoria
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Entra por el tema que mas te sirve y guarda una base editable para tu proyecto.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {categorySections.map(({ category, count, prompts: categoryPrompts }) => (
              <article key={`category-section-${category}`} className="rounded-2xl border border-slate-800 bg-slate-950/25 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-100 line-clamp-1">{category}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{count} recurso{count === 1 ? "" : "s"} publicado{count === 1 ? "" : "s"}</p>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2 py-0.5">
                    {categoryPrompts.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {categoryPrompts.map((prompt) => (
                    <div key={`category-prompt-${prompt.id}`} className="rounded-xl border border-slate-800/80 bg-[#1e293b]/70 p-3">
                      <p className="text-[11px] font-extrabold text-white line-clamp-1">{prompt.title}</p>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{prompt.description || "Prompt publico listo para adaptar."}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
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
                          Guardar remix
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

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
