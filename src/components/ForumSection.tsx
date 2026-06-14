import { useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { MessageSquare, Plus, Search, Users } from "lucide-react";
import type { CommunityPost, CommunityPostType } from "../typesCommunity";
import type { CommunityPostInput } from "../hooks/useCommunityPosts";
import CommunityPostCard from "./CommunityPostCard";
import CreatePostModal from "./CreatePostModal";

const FILTERS: Array<{ id: "all" | CommunityPostType; label: string }> = [
  { id: "all", label: "Todo" },
  { id: "idea", label: "Ideas" },
  { id: "question", label: "Preguntas" },
  { id: "team", label: "Buscar equipo" }
];

interface ForumSectionProps {
  posts: CommunityPost[];
  loading: boolean;
  currentUser: User | null;
  onSignIn: () => void;
  onSave: (input: CommunityPostInput, editingPost?: CommunityPost | null) => Promise<boolean>;
  onDelete: (post: CommunityPost) => void;
  onLike: (post: CommunityPost) => void;
}

export default function ForumSection({ posts, loading, currentUser, onSignIn, onSave, onDelete, onLike }: ForumSectionProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | CommunityPostType>("all");
  const [initialPostType, setInitialPostType] = useState<CommunityPostType>("idea");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);

  const forumPosts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return posts
      .filter((post) => post.type !== "showcase")
      .filter((post) => filter === "all" || post.type === filter)
      .filter((post) => {
        if (!needle) return true;
        return [post.title, post.body, post.authorName, post.authorHandle || "", ...post.tags]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
  }, [filter, posts, search]);

  const openCreate = (type: CommunityPostType = "idea") => {
    if (!currentUser) {
      onSignIn();
      return;
    }
    setEditingPost(null);
    setInitialPostType(type);
    setFilter(type);
    setShowCreateModal(true);
  };

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/55 p-5 shadow-2xl md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-300">
              <MessageSquare size={12} />
              Foro creativo
            </span>
            <h2 className="text-2xl font-black leading-tight text-white md:text-4xl">
              Ideas, preguntas y equipos para construir con prompts.
            </h2>
            <p className="text-sm leading-relaxed text-slate-400">
              Publica aprendizajes, pide feedback o encuentra companeros para hackathons, canales, agentes y productos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openCreate("team")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-black text-emerald-300 transition-all hover:bg-emerald-500/15 cursor-pointer"
            >
              <Users size={14} />
              Buscar equipo
            </button>
            <button
              type="button"
              onClick={() => openCreate("idea")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white transition-all hover:bg-indigo-500 cursor-pointer"
            >
              <Plus size={14} />
              Crear post
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-xl px-3 py-2 text-xs font-black transition-all cursor-pointer ${
                filter === item.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 sm:w-80">
          <Search size={14} className="text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-200 outline-none placeholder:text-slate-600"
            placeholder="Buscar por tema, autor o tag"
          />
        </label>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/40 py-16 text-center text-sm font-bold text-slate-400">
          Cargando conversaciones...
        </div>
      ) : forumPosts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center">
          <p className="text-sm font-black text-slate-200">Todavia no hay publicaciones en esta vista.</p>
          <p className="mt-2 text-xs text-slate-500">La primera buena pregunta suele desbloquear una comunidad completa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {forumPosts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onLike={onLike}
              onEdit={(targetPost) => {
                setEditingPost(targetPost);
                setShowCreateModal(true);
              }}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <CreatePostModal
        isOpen={showCreateModal}
        initialType={initialPostType}
        editingPost={editingPost}
        onClose={() => {
          setShowCreateModal(false);
          setEditingPost(null);
        }}
        onSave={onSave}
      />
    </section>
  );
}
