import { useEffect, useState, type FormEvent } from "react";
import { Calendar, ExternalLink, Send, X } from "lucide-react";
import type { HackathonInput } from "../hooks/useHackathons";
import type { HackathonOpportunity, HackathonRole } from "../typesCommunity";

const ROLES: Array<{ id: HackathonRole; label: string }> = [
  { id: "diseno", label: "Diseno" },
  { id: "dev", label: "Dev" },
  { id: "ia", label: "IA" },
  { id: "3d", label: "3D" },
  { id: "marketing", label: "Marketing" },
  { id: "research", label: "Research" }
];

interface CreateHackathonModalProps {
  isOpen: boolean;
  editingHackathon?: HackathonOpportunity | null;
  onClose: () => void;
  onSave: (input: HackathonInput, editingHackathon?: HackathonOpportunity | null) => Promise<boolean>;
}

export default function CreateHackathonModal({ isOpen, editingHackathon, onClose, onSave }: CreateHackathonModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [deadline, setDeadline] = useState("");
  const [mode, setMode] = useState("online");
  const [tags, setTags] = useState("");
  const [rolesNeeded, setRolesNeeded] = useState<HackathonRole[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(editingHackathon?.title || "");
    setDescription(editingHackathon?.description || "");
    setUrl(editingHackathon?.url || "");
    setDeadline(editingHackathon?.deadline || "");
    setMode(editingHackathon?.mode || "online");
    setTags(editingHackathon?.tags?.join(", ") || "");
    setRolesNeeded(editingHackathon?.rolesNeeded || []);
  }, [editingHackathon, isOpen]);

  if (!isOpen) return null;

  const toggleRole = (role: HackathonRole) => {
    setRolesNeeded((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role]
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const ok = await onSave({
      title,
      description,
      url,
      deadline,
      mode,
      tags: tags.split(","),
      rolesNeeded
    }, editingHackathon);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Hackathons</p>
            <h2 className="text-lg font-black text-white">{editingHackathon ? "Editar oportunidad" : "Publicar oportunidad"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-slate-400 hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[78vh] space-y-5 overflow-y-auto p-5">
          <label className="block space-y-2">
            <span className="text-xs font-black text-slate-300">Titulo</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
              placeholder="Hackathon de agentes para educacion"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-black text-slate-300">Descripcion</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2500}
              rows={6}
              className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm leading-relaxed text-white outline-none focus:border-emerald-500"
              placeholder="Explica la oportunidad, premios, foco y por que es interesante para creadores con prompts."
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block space-y-2 sm:col-span-2">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-300">
                <ExternalLink size={13} />
                Link
              </span>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                maxLength={1000}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                placeholder="https://..."
              />
            </label>

            <label className="block space-y-2">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-300">
                <Calendar size={13} />
                Deadline
              </span>
              <input
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-black text-slate-300">Modalidad</span>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="online">Online</option>
                <option value="presencial">Presencial</option>
                <option value="hibrido">Hibrido</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-black text-slate-300">Tags separados por coma</span>
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                maxLength={240}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                placeholder="ai, no-code, agentes"
              />
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black text-slate-300">Roles buscados</span>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  className={`rounded-xl border px-3 py-2 text-xs font-black transition-all cursor-pointer ${
                    rolesNeeded.includes(role.id)
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                      : "border-slate-800 bg-slate-950/50 text-slate-400 hover:text-white"
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 p-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-black text-slate-300 hover:text-white cursor-pointer">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white transition-all hover:bg-emerald-500 disabled:opacity-60 cursor-pointer">
            <Send size={14} />
            {saving ? "Guardando..." : editingHackathon ? "Guardar cambios" : "Publicar oportunidad"}
          </button>
        </div>
      </form>
    </div>
  );
}
