import { useState, type FormEvent } from "react";
import { KeyRound, X } from "lucide-react";
import type { Classroom } from "../typesCommunity";

interface JoinClassModalProps {
  onClose: () => void;
  onResolve: (code: string) => Classroom | null;
  onOpenClassroom: (classroom: Classroom) => void;
}

export default function JoinClassModal({ onClose, onResolve, onOpenClassroom }: JoinClassModalProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const classroom = onResolve(code);
    if (!classroom) {
      setError("Codigo no encontrado o clase inactiva. Revisa mayusculas, guion y espacios.");
      return;
    }

    setError("");
    onOpenClassroom(classroom);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/70 p-3 pt-6 backdrop-blur-md sm:items-center sm:p-4">
      <form onSubmit={handleSubmit} className="ui-modal-panel surface-card w-full max-w-lg rounded-2xl border border-slate-700/80 bg-[#1e293b] p-4 shadow-2xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
              <KeyRound size={12} />
              Clase privada
            </p>
            <h2 className="ui-text-primary mt-3 text-xl font-black text-white">Ingresa tu codigo de clase</h2>
            <p className="ui-text-muted mt-1 text-sm leading-relaxed text-slate-400">
              Usa el codigo entregado en la sala para abrir el pack privado de la jornada.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-action-secondary rounded-xl border border-slate-800 bg-slate-950/50 p-2 text-slate-400 transition-colors hover:text-white"
            aria-label="Cerrar codigo de clase"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Codigo</label>
          <input
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toLocaleUpperCase("es"));
              setError("");
            }}
            placeholder="PROMPT-UNI"
            autoFocus
            className="ui-input w-full rounded-2xl border border-slate-700 bg-slate-950/45 px-4 py-3 text-center font-mono text-lg font-black uppercase tracking-[0.18em] text-white outline-none transition-colors focus:border-amber-400"
          />
          {error && <p className="text-xs font-bold text-amber-300">{error}</p>}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="ui-action-secondary min-h-11 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-black text-slate-300 transition-colors hover:bg-slate-900"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="ui-button-primary min-h-11 rounded-xl px-5 py-2.5 text-xs font-black"
          >
            Abrir clase
          </button>
        </div>
      </form>
    </div>
  );
}
