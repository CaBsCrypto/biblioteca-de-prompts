import { useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { Image, Plus, Search } from "lucide-react";
import type { CommunityPost } from "../typesCommunity";
import type { CommunityPostInput } from "../hooks/useCommunityPosts";
import CommunityPostCard from "./CommunityPostCard";
import CreatePostModal from "./CreatePostModal";

interface ShowcaseSectionProps {
  posts: CommunityPost[];
  loading: boolean;
  currentUser: User | null;
  onSignIn: () => void;
  onSave: (input: CommunityPostInput, editingPost?: CommunityPost | null) => Promise<boolean>;
  onDelete: (post: CommunityPost) => void;
  onLike: (post: CommunityPost) => void;
  onAuthorClick: (author: { name: string; uid: string; avatar?: string; handle?: string }) => void;
}

export default function ShowcaseSection({ posts, loading, currentUser, onSignIn, onSave, onDelete, onLike, onAuthorClick }: ShowcaseSectionProps) {
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);

  const showcases = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return posts
      .filter((post) => post.type === "showcase")
      .filter((post) => {
        if (!needle) return true;
        return [post.title, post.body, post.authorName, post.authorHandle || "", ...post.tags]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
  }, [posts, search]);

  const openCreate = () => {
    if (!currentUser) {
      onSignIn();
      return;
    }
    setEditingPost(null);
    setShowCreateModal(true);
  };

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/55 p-5 shadow-2xl md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-pink-500/20 bg-pink-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-pink-300">
              <Image size={12} />
              Galeria
            </span>
            <h2 className="text-2xl font-black leading-tight text-white md:text-4xl">
              Muestra lo que creaste con tus prompts.
            </h2>
            <p className="text-sm leading-relaxed text-slate-400">
              Comparte imagenes por URL, demos o piezas finales. La galeria funciona como portfolio vivo de la comunidad.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-xs font-black text-white transition-all hover:bg-pink-500 cursor-pointer"
          >
            <Plus size={14} />
            Subir por URL
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
        <Search size={14} className="text-slate-500" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-200 outline-none placeholder:text-slate-600"
          placeholder="Buscar trabajos por tema, autor o tag"
        />
      </label>

      {loading ? (
        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/40 py-16 text-center text-sm font-bold text-slate-400">
          Cargando galeria...
        </div>
      ) : showcases.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center">
          <p className="text-sm font-black text-slate-200">La galeria esta lista para las primeras piezas.</p>
          <p className="mt-2 text-xs text-slate-500">Empieza con una imagen alojada en Drive, Behance, GitHub, Vercel o cualquier URL publica.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {showcases.map((post) => (
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
            />
          ))}
        </div>
      )}

      <CreatePostModal
        isOpen={showCreateModal}
        initialType="showcase"
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
