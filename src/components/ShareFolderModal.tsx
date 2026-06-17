import { FormEvent, useState } from "react";
import { Copy, Share2, X, Plus, User, Trash2 } from "lucide-react";
import type { Folder, Prompt } from "../types";

interface ShareFolderModalProps {
  folder: Folder;
  prompts: Prompt[];
  isFolderSharedInput: boolean;
  publishFolderPromptsInput: boolean;
  isSavingFolderShare: boolean;
  setIsFolderSharedInput: (value: boolean) => void;
  setPublishFolderPromptsInput: (value: boolean) => void;
  onSave: (event: FormEvent, collaborators?: any) => void;
  onClose: () => void;
  onNotification: (message: string, type?: "success" | "info") => void;
}

export default function ShareFolderModal({
  folder,
  prompts,
  isFolderSharedInput,
  publishFolderPromptsInput,
  isSavingFolderShare,
  setIsFolderSharedInput,
  setPublishFolderPromptsInput,
  onSave,
  onClose,
  onNotification
}: ShareFolderModalProps) {
  const privatePromptsCount = prompts.filter((prompt) => prompt.folderId === folder.id && !prompt.isShared).length;
  const publicLink = `${window.location.origin}${window.location.pathname}?collection=${folder.id}`;

  const [collaborators, setCollaborators] = useState<any>(folder.collaborators || {});
  const [collabInput, setCollabInput] = useState("");
  const [collabRole, setCollabRole] = useState<"viewer" | "editor">("viewer");

  const handleAddCollaborator = () => {
    if (!collabInput.trim()) return;
    const cleanId = collabInput.trim();
    setCollaborators((prev: any) => ({
      ...prev,
      [cleanId]: {
        type: "user",
        role: collabRole
      }
    }));
    setCollabInput("");
    onNotification("Colaborador agregado a la lista. Recuerda guardar los cambios.", "info");
  };

  const handleRemoveCollaborator = (id: string) => {
    setCollaborators((prev: any) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    onNotification("Colaborador removido de la lista. Recuerda guardar los cambios.", "info");
  };

  return (
    <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-md flex items-start sm:items-center justify-center z-50 p-3 sm:p-4">
      <form
        onSubmit={(e) => onSave(e, collaborators)}
        className="ui-modal-panel bg-[#1e293b] rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl border border-slate-700/80 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[96vh] overflow-y-auto"
      >
        <div className="ui-modal-header flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Share2 size={18} className="text-emerald-400" />
            <h3 className="font-extrabold text-white text-md">Configuración de la Carpeta</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-action-secondary p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-4 sm:px-6">
          <div className="ui-muted-panel bg-slate-900/40 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
            <p className="text-xs font-bold text-white">
              Colección: <span className="text-indigo-400">{folder.name}</span>
            </p>
            <p className="text-[11px] text-slate-400">{folder.description || "Sin descripción establecida."}</p>
          </div>

          {/* Colaboradores Directos */}
          <div className="space-y-2">
            <label className="text-[10px] font-black tracking-wider text-indigo-400 uppercase">Colaboradores (Permisos)</label>
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ID de usuario de Firebase del colaborador"
                value={collabInput}
                onChange={(e) => setCollabInput(e.target.value)}
                className="flex-1 text-[11px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-350 focus:outline-none"
              />
              <select
                value={collabRole}
                onChange={(e) => setCollabRole(e.target.value as any)}
                className="text-[11px] rounded-xl border border-slate-700 bg-slate-950 px-2 text-slate-300 focus:outline-none"
              >
                <option value="viewer">Lector</option>
                <option value="editor">Editor</option>
              </select>
              <button
                type="button"
                onClick={handleAddCollaborator}
                className="px-3 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={13} />
                <span>Agregar</span>
              </button>
            </div>

            {/* Listado de colaboradores actuales */}
            <div className="bg-slate-950/40 rounded-2xl border border-slate-850 p-2 max-h-[140px] overflow-y-auto space-y-1.5">
              {Object.keys(collaborators).length === 0 ? (
                <p className="text-[10px] text-slate-500 italic p-1">No hay colaboradores específicos añadidos aún.</p>
              ) : (
                Object.entries(collaborators).map(([uid, details]: any) => (
                  <div key={uid} className="flex items-center justify-between bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                    <div className="flex items-center gap-2 truncate">
                      <User size={12} className="text-slate-400" />
                      <span className="text-[10px] font-mono text-slate-300 truncate" title={uid}>{uid}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold font-mono uppercase ${
                        details.role === "editor" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}>
                        {details.role === "editor" ? "Editor" : "Lector"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCollaborator(uid)}
                      className="p-1 hover:bg-red-500/15 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="ui-muted-panel flex items-center justify-between bg-slate-900/30 p-4 rounded-2xl border border-slate-800">
            <div className="space-y-0.5 pointer-events-none">
              <p className="text-xs font-extrabold text-white">Publicar carpeta en la web</p>
              <p className="text-[10px] text-slate-400 font-sans">Cualquiera con el enlace podrá ver los prompts guardados en esta carpeta.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 ml-4">
              <input
                type="checkbox"
                checked={isFolderSharedInput}
                onChange={(event) => {
                  setIsFolderSharedInput(event.target.checked);
                  if (!event.target.checked) {
                    setPublishFolderPromptsInput(false);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white"></div>
            </label>
          </div>

          {isFolderSharedInput && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
              {privatePromptsCount > 0 && (
                <label className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishFolderPromptsInput}
                    onChange={(event) => setPublishFolderPromptsInput(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-950 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="space-y-1">
                    <span className="block text-xs font-extrabold text-amber-300">Publicar también los prompts de esta carpeta</span>
                    <span className="block text-[10px] leading-relaxed text-slate-400 font-sans">
                      Hay {privatePromptsCount} prompts privados en esta carpeta. Si marcas esta opción, también quedarán visibles para cualquiera con el enlace.
                    </span>
                  </span>
                </label>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black tracking-wider text-emerald-400 uppercase">Enlace de la Colección Pública</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicLink}
                    className="flex-1 text-[11px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-350 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(publicLink);
                      onNotification("¡Enlace de colección copiado con éxito!", "success");
                    }}
                    className="px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Copiar enlace"
                  >
                    <Copy size={13} />
                    <span className="hidden sm:inline">Copiar</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ui-modal-footer flex justify-end gap-2.5 px-4 sm:px-6 py-4 border-t border-slate-800/60">
          <button
            type="button"
            onClick={onClose}
            className="ui-action-secondary px-4 py-2 hover:bg-slate-800 rounded-xl text-slate-355 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSavingFolderShare}
            className="px-4.5 py-2 bg-gradient-to-r from-emerald-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isSavingFolderShare ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
