import type { FormEvent } from "react";
import { X } from "lucide-react";

interface CreateFolderModalProps {
  newFolderName: string;
  newFolderDesc: string;
  isSavingFolder: boolean;
  setNewFolderName: (value: string) => void;
  setNewFolderDesc: (value: string) => void;
  onCreate: (event: FormEvent) => void;
  onClose: () => void;
}

export default function CreateFolderModal({
  newFolderName,
  newFolderDesc,
  isSavingFolder,
  setNewFolderName,
  setNewFolderDesc,
  onCreate,
  onClose
}: CreateFolderModalProps) {
  return (
    <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <form onSubmit={onCreate} className="bg-[#1e293b] rounded-3xl w-full max-w-md shadow-2xl p-6 border border-slate-700/80 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-white text-md">Crear Nueva Carpeta</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Nombre de la Carpeta *</label>
            <input
              type="text"
              required
              maxLength={50}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="ej. Canales Secundarios, SEO Youtube..."
              className="w-full text-xs rounded-xl border border-slate-700 bg-[#0f172a]/50 px-3 py-2.5 text-white focus:outline-none focus:border-indigo-400 font-sans"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Descripción (Opcional)</label>
            <input
              type="text"
              maxLength={150}
              value={newFolderDesc}
              onChange={(e) => setNewFolderDesc(e.target.value)}
              placeholder="ej. Plantillas de scripts y shorts..."
              className="w-full text-xs rounded-xl border border-slate-700 bg-[#0f172a]/50 px-3 py-2.5 text-white focus:outline-none focus:border-indigo-400 font-sans"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 hover:bg-slate-800 rounded-xl text-slate-350 text-xs font-bold transition-colors cursor-pointer">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSavingFolder || !newFolderName.trim()}
            className="px-4.5 py-2 bg-gradient-to-r from-indigo-600 to-pink-600 text-white text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSavingFolder ? "Creando..." : "Crear Carpeta"}
          </button>
        </div>
      </form>
    </div>
  );
}
