import { useEffect, useState, type FormEvent } from "react";
import { Image, Link, MessageSquare, Send, X } from "lucide-react";
import type { CommunityPost, CommunityPostType } from "../typesCommunity";
import type { CommunityPostInput } from "../hooks/useCommunityPosts";

const POST_TYPES: Array<{ id: CommunityPostType; label: string; helper: string }> = [
  { id: "idea", label: "Idea", helper: "Comparte una tesis, recurso o aprendizaje." },
  { id: "question", label: "Pregunta", helper: "Pide ayuda o feedback a la comunidad." },
  { id: "team", label: "Equipo", helper: "Busca cofounders o companeros de hackathon." },
  { id: "showcase", label: "Galeria", helper: "Muestra un trabajo creado con prompts." }
];

interface CreatePostModalProps {
  isOpen: boolean;
  initialType?: CommunityPostType;
  initialDraft?: Partial<CommunityPostInput> | null;
  editingPost?: CommunityPost | null;
  onClose: () => void;
  onSave: (input: CommunityPostInput, editingPost?: CommunityPost | null) => Promise<boolean>;
}

export default function CreatePostModal({ isOpen, initialType = "idea", initialDraft, editingPost, onClose, onSave }: CreatePostModalProps) {
  const [type, setType] = useState<CommunityPostType>(initialType);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setType(editingPost?.type || initialDraft?.type || initialType);
    setTitle(editingPost?.title || initialDraft?.title || "");
    setBody(editingPost?.body || initialDraft?.body || "");
    setTags(editingPost?.tags?.join(", ") || initialDraft?.tags?.join(", ") || "");
    setImageUrl(editingPost?.imageUrl || initialDraft?.imageUrl || "");
    setLinkUrl(editingPost?.linkUrl || initialDraft?.linkUrl || "");
  }, [editingPost, initialDraft, initialType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const ok = await onSave({
      type,
      title,
      body,
      tags: tags.split(","),
      imageUrl,
      linkUrl
    }, editingPost);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 p-3 pt-4 sm:items-center sm:p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl max-h-[96vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-5 py-4 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-pink-400">Comunidad</p>
            <h2 className="text-lg font-black text-white">{editingPost ? "Editar publicacion" : "Crear publicacion"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-slate-400 hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
            {POST_TYPES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setType(item.id)}
                className={`rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                  type === item.id
                    ? "border-indigo-500 bg-indigo-500/15 text-white"
                    : "border-slate-800 bg-slate-950/45 text-slate-400 hover:text-slate-100"
                }`}
              >
                <span className="block text-xs font-black">{item.label}</span>
                <span className="mt-1 block text-[10px] leading-snug text-slate-500">{item.helper}</span>
              </button>
            ))}
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-black text-slate-300">Titulo</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={140}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
              placeholder="Ej: Busco equipo para hackathon de IA educativa"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-black text-slate-300">Contenido</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={4000}
              rows={7}
              className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm leading-relaxed text-white outline-none focus:border-indigo-500"
              placeholder="Cuenta el objetivo, contexto, lo que buscas o lo que construiste."
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-300">
                <Image size={13} />
                Imagen por URL
              </span>
              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                maxLength={1000}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                placeholder="https://..."
              />
            </label>

            <label className="block space-y-2">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-300">
                <Link size={13} />
                Link externo
              </span>
              <input
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                maxLength={1000}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                placeholder="Demo, repo, Notion, formulario..."
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-black text-slate-300">Tags separados por coma</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              maxLength={240}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
              placeholder="hackathon, agentes, video, 3d"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-slate-800 p-4 sm:p-5 sm:flex sm:flex-row sm:justify-end shrink-0">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-black text-slate-300 hover:text-white cursor-pointer">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white transition-all hover:bg-indigo-500 disabled:opacity-60 cursor-pointer">
            <Send size={14} />
            {saving ? "Guardando..." : editingPost ? "Guardar cambios" : "Publicar"}
          </button>
        </div>
      </form>
    </div>
  );
}
