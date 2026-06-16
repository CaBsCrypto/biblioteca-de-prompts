import type { FormEvent } from "react";
import { Copy, Share2, X } from "lucide-react";
import type { Folder, Prompt } from "../types";

interface ShareFolderModalProps {
  folder: Folder;
  prompts: Prompt[];
  isFolderSharedInput: boolean;
  publishFolderPromptsInput: boolean;
  isSavingFolderShare: boolean;
  setIsFolderSharedInput: (value: boolean) => void;
  setPublishFolderPromptsInput: (value: boolean) => void;
  onSave: (event: FormEvent) => void;
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

  return (
    <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-md flex items-start sm:items-center justify-center z-50 p-3 sm:p-4">
      <form onSubmit={onSave} className="ui-modal-panel bg-[#1e293b] rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl border border-slate-700/80 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[96vh] overflow-y-auto">
        <div className="ui-modal-header flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Share2 size={18} className="text-emerald-400" />
            <h3 className="font-extrabold text-white text-md">Compartir Colección</h3>
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
            className="ui-action-secondary px-4 py-2 hover:bg-slate-800 rounded-xl text-slate-350 text-xs font-bold transition-colors cursor-pointer"
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
