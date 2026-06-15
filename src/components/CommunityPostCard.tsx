import { Edit3, ExternalLink, Heart, Link, Trash2, Users } from "lucide-react";
import type { User } from "firebase/auth";
import type { Key } from "react";
import type { CommunityPost } from "../typesCommunity";

const TYPE_LABELS = {
  idea: "Idea",
  question: "Pregunta",
  team: "Equipo",
  showcase: "Galeria"
};

const TYPE_STYLES = {
  idea: "border-indigo-500/25 bg-indigo-500/10 text-indigo-300",
  question: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  team: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  showcase: "border-pink-500/25 bg-pink-500/10 text-pink-300"
};

interface CommunityPostCardProps {
  key?: Key;
  post: CommunityPost;
  currentUser: User | null;
  onAuthorClick?: (author: { name: string; uid: string; avatar?: string; handle?: string }) => void;
  onLike: (post: CommunityPost) => void;
  onEdit: (post: CommunityPost) => void;
  onDelete: (post: CommunityPost) => void;
}

export default function CommunityPostCard({ post, currentUser, onAuthorClick, onLike, onEdit, onDelete }: CommunityPostCardProps) {
  const isOwner = currentUser?.uid === post.authorUid;
  const isLiked = Boolean(currentUser && post.likedBy.includes(currentUser.uid));
  const openAuthor = () => {
    onAuthorClick?.({
      name: post.authorName,
      uid: post.authorUid,
      avatar: post.authorAvatar,
      handle: post.authorHandle
    });
  };

  return (
    <article className="surface-card community-post-surface mobile-tight-card overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/55 shadow-xl shadow-slate-950/20">
      {post.imageUrl && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-slate-950">
          <img
            src={post.imageUrl}
            alt={post.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={openAuthor}
            disabled={!onAuthorClick}
            className={`flex min-w-0 items-center gap-2 rounded-xl text-left transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
              onAuthorClick ? "cursor-pointer hover:bg-slate-950/35" : "cursor-default"
            }`}
            title="Ver perfil del creador"
          >
            {post.authorAvatar ? (
              <img
                src={post.authorAvatar}
                alt={post.authorName}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-xs font-black text-indigo-300">
                {post.authorName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-slate-200">{post.authorName}</p>
              <p className="truncate text-[10px] font-bold text-slate-500">
                {post.authorHandle ? `@${post.authorHandle}` : "miembro de la comunidad"}
              </p>
            </div>
          </button>

          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${TYPE_STYLES[post.type]}`}>
            {TYPE_LABELS[post.type]}
          </span>
        </div>

        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-black leading-tight text-white">{post.title}</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{post.body}</p>
        </div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <span key={tag} className="rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1 text-[10px] font-bold text-slate-400">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {post.linkUrl && (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs font-bold text-indigo-300 transition-colors hover:border-indigo-500/40 hover:text-indigo-200"
          >
            <Link size={13} />
            <span className="truncate">Abrir recurso vinculado</span>
            <ExternalLink size={12} />
          </a>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
          <button
            type="button"
            onClick={() => onLike(post)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition-all cursor-pointer ${
              isLiked
                ? "border-pink-500/40 bg-pink-500/15 text-pink-300"
                : "ui-action-secondary border-slate-800 bg-slate-950/50 text-slate-400 hover:text-pink-300"
            }`}
          >
            <Heart size={13} fill={isLiked ? "currentColor" : "none"} />
            <span>{post.likesCount}</span>
          </button>

          {post.type === "team" && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-300">
              <Users size={13} />
              Buscando equipo
            </span>
          )}

          {onAuthorClick && (
            <button
              type="button"
              onClick={openAuthor}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-[11px] font-bold text-indigo-300 transition-colors hover:bg-indigo-500/15 cursor-pointer"
            >
              Ver creador
            </button>
          )}

          {isOwner && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onEdit(post)}
                className="rounded-xl border border-slate-800 bg-slate-950/50 p-2 text-slate-400 transition-colors hover:text-indigo-300 cursor-pointer"
                title="Editar publicacion"
              >
                <Edit3 size={14} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(post)}
                className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-300 transition-colors hover:bg-red-500/20 cursor-pointer"
                title="Eliminar publicacion"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
