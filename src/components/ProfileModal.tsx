import type { FormEvent } from "react";
import type { User } from "firebase/auth";
import { UserCheck, X } from "lucide-react";
import type { UserProfile } from "../types";

interface ProfileModalProps {
  user: User;
  currentUserProfile: UserProfile | null;
  profileNameInput: string;
  profileHandleInput: string;
  profileBioInput: string;
  isSavingProfile: boolean;
  normalizeProfileHandle: (source: string, fallback?: string) => string;
  setProfileNameInput: (value: string) => void;
  setProfileHandleInput: (value: string) => void;
  setProfileBioInput: (value: string) => void;
  onSave: (event: FormEvent) => void;
  onClose: () => void;
}

export default function ProfileModal({
  user,
  currentUserProfile,
  profileNameInput,
  profileHandleInput,
  profileBioInput,
  isSavingProfile,
  normalizeProfileHandle,
  setProfileNameInput,
  setProfileHandleInput,
  setProfileBioInput,
  onSave,
  onClose
}: ProfileModalProps) {
  return (
    <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <form onSubmit={onSave} className="bg-[#1e293b] rounded-3xl w-full max-w-lg shadow-2xl p-6 border border-slate-700/80 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-indigo-400" />
            <h3 className="font-extrabold text-white text-md">Perfil público</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
          {(currentUserProfile?.photoURL || user.photoURL) ? (
            <img
              src={currentUserProfile?.photoURL || user.photoURL || ""}
              referrerPolicy="no-referrer"
              alt={profileNameInput || "Usuario"}
              className="h-12 w-12 rounded-2xl object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-pink-600 flex items-center justify-center text-sm font-black text-white">
              {(profileNameInput || "U").charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-white">{profileNameInput || "Miembro de la comunidad"}</p>
            <p className="truncate text-[11px] font-mono text-indigo-300">@{normalizeProfileHandle(profileHandleInput, user.uid.slice(0, 8))}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Nombre público *</label>
            <input
              type="text"
              required
              maxLength={120}
              value={profileNameInput}
              onChange={(e) => setProfileNameInput(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-700 bg-[#0f172a]/50 px-3 py-2.5 text-white focus:outline-none focus:border-indigo-400 font-sans"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Handle *</label>
            <div className="flex items-center rounded-xl border border-slate-700 bg-[#0f172a]/50 focus-within:border-indigo-400">
              <span className="pl-3 text-xs font-mono text-slate-500">@</span>
              <input
                type="text"
                required
                maxLength={40}
                value={profileHandleInput}
                onChange={(e) => setProfileHandleInput(e.target.value)}
                className="w-full bg-transparent px-1.5 py-2.5 text-xs text-white focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Bio</label>
            <textarea
              maxLength={500}
              rows={4}
              value={profileBioInput}
              onChange={(e) => setProfileBioInput(e.target.value)}
              placeholder="Creador de prompts para IA, YouTube, automatizacion..."
              className="w-full text-xs rounded-xl border border-slate-700 bg-[#0f172a]/50 px-3 py-2.5 text-white focus:outline-none focus:border-indigo-400 font-sans resize-none"
            />
            <p className="text-[10px] text-slate-500 text-right">{profileBioInput.length}/500</p>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800/60">
          <button type="button" onClick={onClose} className="px-4 py-2 hover:bg-slate-800 rounded-xl text-slate-350 text-xs font-bold transition-colors cursor-pointer">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSavingProfile}
            className="px-4.5 py-2 bg-gradient-to-r from-indigo-600 to-pink-600 text-white text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isSavingProfile ? "Guardando..." : "Guardar Perfil"}
          </button>
        </div>
      </form>
    </div>
  );
}
