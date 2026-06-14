import { useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { Calendar, Edit3, ExternalLink, Plus, Search, Trash2, Trophy, Users } from "lucide-react";
import type { HackathonInput } from "../hooks/useHackathons";
import type { HackathonOpportunity } from "../typesCommunity";
import CreateHackathonModal from "./CreateHackathonModal";

const ROLE_LABELS: Record<string, string> = {
  diseno: "Diseno",
  dev: "Dev",
  ia: "IA",
  "3d": "3D",
  marketing: "Marketing",
  research: "Research"
};

interface HackathonsSectionProps {
  hackathons: HackathonOpportunity[];
  loading: boolean;
  currentUser: User | null;
  onSignIn: () => void;
  onSave: (input: HackathonInput, editingHackathon?: HackathonOpportunity | null) => Promise<boolean>;
  onDelete: (hackathon: HackathonOpportunity) => void;
}

export default function HackathonsSection({ hackathons, loading, currentUser, onSignIn, onSave, onDelete }: HackathonsSectionProps) {
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingHackathon, setEditingHackathon] = useState<HackathonOpportunity | null>(null);

  const filteredHackathons = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return hackathons;
    return hackathons.filter((hackathon) =>
      [
        hackathon.title,
        hackathon.description,
        hackathon.mode,
        hackathon.authorName || "",
        hackathon.authorHandle || "",
        ...hackathon.tags,
        ...hackathon.rolesNeeded
      ].join(" ").toLowerCase().includes(needle)
    );
  }, [hackathons, search]);

  const openCreate = () => {
    if (!currentUser) {
      onSignIn();
      return;
    }
    setEditingHackathon(null);
    setShowCreateModal(true);
  };

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/55 p-5 shadow-2xl md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              <Trophy size={12} />
              Oportunidades
            </span>
            <h2 className="text-2xl font-black leading-tight text-white md:text-4xl">
              Hackathons para builders que saben prompear.
            </h2>
            <p className="text-sm leading-relaxed text-slate-400">
              Encuentra oportunidades, comparte convocatorias y arma equipo con perfiles de diseno, dev, IA, 3D, marketing y research.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition-all hover:bg-emerald-500 cursor-pointer"
          >
            <Plus size={14} />
            Publicar hackathon
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
        <Search size={14} className="text-slate-500" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-200 outline-none placeholder:text-slate-600"
          placeholder="Buscar por rol, modalidad, tag o autor"
        />
      </label>

      {loading ? (
        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/40 py-16 text-center text-sm font-bold text-slate-400">
          Cargando oportunidades...
        </div>
      ) : filteredHackathons.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center">
          <p className="text-sm font-black text-slate-200">Todavia no hay hackathons publicados.</p>
          <p className="mt-2 text-xs text-slate-500">Puedes curar oportunidades externas o publicar una convocatoria propia.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filteredHackathons.map((hackathon) => {
            const isOwner = currentUser?.uid === hackathon.authorUid;
            return (
              <article key={hackathon.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-5 shadow-xl shadow-slate-950/20">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                          {hackathon.mode || "online"}
                        </span>
                        {hackathon.deadline && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-[10px] font-black text-slate-300">
                            <Calendar size={11} />
                            {hackathon.deadline}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-black leading-tight text-white">{hackathon.title}</h3>
                      <p className="text-xs font-bold text-slate-500">
                        Publicado por {hackathon.authorName || "Creador"} {hackathon.authorHandle ? `@${hackathon.authorHandle}` : ""}
                      </p>
                    </div>

                    {isOwner && (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingHackathon(hackathon);
                            setShowCreateModal(true);
                          }}
                          className="rounded-xl border border-slate-800 bg-slate-950/50 p-2 text-slate-400 hover:text-emerald-300 cursor-pointer"
                          title="Editar oportunidad"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(hackathon)}
                          className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20 cursor-pointer"
                          title="Eliminar oportunidad"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{hackathon.description}</p>

                  {hackathon.rolesNeeded.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-[11px] font-black text-slate-400">
                        <Users size={13} />
                        Roles
                      </span>
                      {hackathon.rolesNeeded.map((role) => (
                        <span key={role} className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-black text-emerald-300">
                          {ROLE_LABELS[role] || role}
                        </span>
                      ))}
                    </div>
                  )}

                  {hackathon.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {hackathon.tags.map((tag) => (
                        <span key={tag} className="rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1 text-[10px] font-bold text-slate-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <a
                    href={hackathon.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition-all hover:bg-emerald-500"
                  >
                    Ver oportunidad
                    <ExternalLink size={13} />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <CreateHackathonModal
        isOpen={showCreateModal}
        editingHackathon={editingHackathon}
        onClose={() => {
          setShowCreateModal(false);
          setEditingHackathon(null);
        }}
        onSave={onSave}
      />
    </section>
  );
}
