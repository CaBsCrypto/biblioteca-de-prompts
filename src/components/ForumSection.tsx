import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { ClipboardCheck, Lightbulb, MessageSquare, Plus, Search, Users, X, Hash } from "lucide-react";
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
  onAuthorClick: (author: { name: string; uid: string; avatar?: string; handle?: string }) => void;
  onNotification: (message: string, type?: "success" | "info") => void;
  initialDraft?: CommunityPostInput | null;
  onDraftConsumed?: () => void;
}

export default function ForumSection({ posts, loading, currentUser, onSignIn, onSave, onDelete, onLike, onAuthorClick, onNotification, initialDraft, onDraftConsumed }: ForumSectionProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | CommunityPostType>("all");
  const [initialPostType, setInitialPostType] = useState<CommunityPostType>("idea");
  const [modalDraft, setModalDraft] = useState<CommunityPostInput | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchInput, setTagSearchInput] = useState("");

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => {
      if (p.tags) {
        p.tags.forEach((t) => set.add(t));
      }
    });
    return Array.from(set);
  }, [posts]);

  const tagSuggestions = useMemo(() => {
    if (!tagSearchInput) return availableTags.filter(t => !selectedTags.includes(t));
    const clean = tagSearchInput.toLowerCase().replace("#", "");
    return availableTags.filter(
      (t) => t.toLowerCase().includes(clean) && !selectedTags.includes(t)
    );
  }, [availableTags, tagSearchInput, selectedTags]);

  const forumPosts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return posts
      .filter((post) => post.type !== "showcase")
      .filter((post) => filter === "all" || post.type === filter)
      .filter((post) => {
        if (selectedTags.length > 0) {
          const postTags = post.tags || [];
          if (!selectedTags.every(st => postTags.includes(st))) return false;
        }
        if (!needle) return true;
        return [post.title, post.body, post.authorName, post.authorHandle || "", ...(post.tags || [])]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
  }, [filter, posts, search, selectedTags]);

  const openCreate = (type: CommunityPostType = "idea") => {
    if (!currentUser) {
      onSignIn();
      return;
    }
    setModalDraft(null);
    setEditingPost(null);
    setInitialPostType(type);
    setFilter(type);
    setShowCreateModal(true);
  };

  useEffect(() => {
    if (!initialDraft) return;
    if (!currentUser) {
      return;
    }
    setEditingPost(null);
    setModalDraft(initialDraft);
    setInitialPostType(initialDraft.type);
    setFilter(initialDraft.type);
    setShowCreateModal(true);
    onDraftConsumed?.();
  }, [currentUser, initialDraft, onDraftConsumed]);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <div className="surface-card rounded-2xl sm:rounded-3xl border border-slate-800/80 bg-slate-900/55 p-4 sm:p-5 shadow-2xl md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-300">
              <MessageSquare size={12} />
              Foro creativo
            </span>
            <h2 className="text-2xl font-black leading-tight text-white md:text-4xl">
              Conversaciones para construir con prompts.
            </h2>
            <p className="text-sm leading-relaxed text-slate-400">
              Publica aprendizajes, pide feedback, responde hilos y encuentra companeros para hackathons, canales, agentes y productos.
            </p>
          </div>

          <div className="grid grid-cols-1 min-[430px]:grid-cols-2 gap-2 lg:flex lg:flex-wrap">
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

      <div className="surface-card flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-xl px-3 py-2 text-xs font-black transition-all cursor-pointer ${
                filter === item.id
                  ? "bg-indigo-600 text-white"
                  : "ui-action-secondary bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="relative flex flex-col sm:flex-row gap-2 items-center flex-1 max-w-xl w-full">
          <div className="flex min-w-0 items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 w-full">
            <Search size={14} className="text-slate-500 shrink-0" />
            
            {/* Selected Tags in Omnibar */}
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-md"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => setSelectedTags((prev) => prev.filter((t) => t !== tag))}
                  className="hover:text-red-400 p-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            
            <input
              value={search}
              onChange={(event) => {
                const val = event.target.value;
                setSearch(val);
                if (val.includes("#")) {
                  const parts = val.split("#");
                  setTagSearchInput(parts[parts.length - 1]);
                  setIsTagDropdownOpen(true);
                } else {
                  setIsTagDropdownOpen(false);
                }
              }}
              onFocus={() => {
                if (search.includes("#")) {
                  setIsTagDropdownOpen(true);
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-200 outline-none placeholder:text-slate-600"
              placeholder="Buscar o escribe #tag..."
            />
          </div>

          {/* Floating Tag Dropdown */}
          {isTagDropdownOpen && tagSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-[#0f172a]/95 backdrop-blur-md p-1.5 shadow-2xl z-20 space-y-0.5 scrollbar-thin">
              <p className="text-[10px] text-slate-550 font-bold uppercase tracking-wider px-2 py-1">
                Etiquetas del foro
              </p>
              {tagSuggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSelectedTags((prev) => [...prev, tag]);
                    const idx = search.lastIndexOf("#");
                    if (idx !== -1) {
                      setSearch(search.substring(0, idx).trim());
                    }
                    setIsTagDropdownOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Hash size={11} className="text-slate-500" />
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="surface-card rounded-3xl border border-slate-800/70 bg-slate-900/40 py-16 text-center text-sm font-bold text-slate-400">
          Cargando conversaciones...
        </div>
      ) : forumPosts.length === 0 ? (
        <div className="surface-card rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-5 sm:p-10 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
            <MessageSquare size={18} />
          </div>
          <p className="mt-4 text-sm font-black text-slate-200">Todavia no hay publicaciones en esta vista.</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
            Empieza con algo pequeno: una pregunta, una idea que te gustaria validar o una busqueda de equipo para hackathon.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-2 min-[430px]:grid-cols-3">
            <button
              type="button"
              onClick={() => openCreate("question")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-2.5 text-xs font-black text-indigo-300 transition-all hover:bg-indigo-500/15 cursor-pointer"
            >
              <ClipboardCheck size={13} />
              Pedir feedback
            </button>
            <button
              type="button"
              onClick={() => openCreate("idea")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs font-black text-amber-300 transition-all hover:bg-amber-500/15 cursor-pointer"
            >
              <Lightbulb size={13} />
              Compartir idea
            </button>
            <button
              type="button"
              onClick={() => openCreate("team")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs font-black text-emerald-300 transition-all hover:bg-emerald-500/15 cursor-pointer"
            >
              <Users size={13} />
              Buscar equipo
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {forumPosts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onAuthorClick={onAuthorClick}
              onLike={onLike}
              onEdit={(targetPost) => {
                setEditingPost(targetPost);
                setShowCreateModal(true);
              }}
              onDelete={onDelete}
              onSignIn={onSignIn}
              onNotification={onNotification}
            />
          ))}
        </div>
      )}

      <CreatePostModal
        isOpen={showCreateModal}
        initialType={initialPostType}
        initialDraft={modalDraft}
        editingPost={editingPost}
        onClose={() => {
          setShowCreateModal(false);
          setEditingPost(null);
          setModalDraft(null);
        }}
        onSave={onSave}
      />
    </section>
  );
}
