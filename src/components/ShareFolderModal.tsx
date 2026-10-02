import { FormEvent, useState } from "react";
import { Copy, Share2, X, Plus, User, Trash2 } from "lucide-react";
import type { Folder, Prompt } from "../types";
import { db } from "../firebase";
import { fetchPublishedResourceForSource } from "../services/firestore/catalogService";

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
  connectedConnections?: any[];
}

export default function ShareFolderModal({
  folder,
  isSavingFolderShare,
  onSave,
  onClose,
  onNotification,
  connectedConnections = []
}: ShareFolderModalProps) {

  const publicLink = `${window.location.origin}/?collection=${encodeURIComponent(folder.id)}`;

  const [collaborators, setCollaborators] = useState<any>(folder.collaborators || {});
  const [collabInput, setCollabInput] = useState("");
  const [collabRole, setCollabRole] = useState<"viewer" | "editor">("viewer");
  const [copyingLink, setCopyingLink] = useState(false);

  const handleCopyApprovedCollection = async () => {
    if (copyingLink) return;
    setCopyingLink(true);
    try {
      const resources = await fetchPublishedResourceForSource(db, { folderId: folder.id });
      if (!resources.length) {
        onNotification("Esta carpeta aún no tiene recursos aprobados. Postula sus prompts desde Publicar antes de compartir el enlace.", "info");
        return;
      }
      try {
        await navigator.clipboard.writeText(publicLink);
        onNotification("Enlace a los recursos aprobados de la colección copiado.", "success");
      } catch {
        onNotification("No pudimos copiar el enlace. Puedes seleccionarlo para copiarlo manualmente.", "info");
      }
    } catch {
      onNotification("No pudimos comprobar los recursos aprobados. Inténtalo de nuevo.", "info");
    } finally { setCopyingLink(false); }
  };

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

  const handleAddDirect = (uid: string, name: string) => {
    setCollaborators((prev: any) => ({
      ...prev,
      [uid]: {
        type: "user",
        role: collabRole,
        displayName: name
      }
    }));
    onNotification(`¡${name} agregado! Recuerda guardar los cambios.`, "success");
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
            <h3 className="font-extrabold text-white text-md">Colaboración privada de la carpeta</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar configuración de la carpeta"
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

            {/* Invitaciones desde Conexiones/Amigos */}
            {connectedConnections.length > 0 && (
              <div className="space-y-1.5 mt-2.5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Invitar a Conexiones directas</p>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {connectedConnections
                    .filter((conn) => !collaborators[conn.targetUid])
                    .map((conn) => (
                      <button
                        key={conn.id}
                        type="button"
                        onClick={() => handleAddDirect(conn.targetUid, conn.targetName)}
                        className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/60 hover:bg-indigo-950/40 hover:border-indigo-500/40 text-[10px] text-slate-350 hover:text-white font-bold transition-all cursor-pointer"
                      >
                        {conn.targetAvatar ? (
                          <img
                            src={conn.targetAvatar}
                            alt={conn.targetName}
                            className="w-3.5 h-3.5 rounded-full object-cover"
                          />
                        ) : (
                          <User size={10} className="text-slate-400" />
                        )}
                        <span>{conn.targetName}</span>
                      </button>
                    ))}
                  {connectedConnections.filter((conn) => !collaborators[conn.targetUid]).length === 0 && (
                    <p className="text-[9px] text-slate-600 italic">Todas tus conexiones activas ya colaboran en esta colección.</p>
                  )}
                </div>
              </div>
            )}

            {/* Listado de colaboradores actuales */}
            <div className="bg-slate-950/40 rounded-2xl border border-slate-850 p-2.5 max-h-[140px] overflow-y-auto space-y-1.5">
              {Object.keys(collaborators).length === 0 ? (
                <p className="text-[10px] text-slate-500 italic p-1">No hay colaboradores específicos añadidos aún.</p>
              ) : (
                Object.entries(collaborators).map(([uid, details]: any) => {
                  // Buscar el nombre del colaborador si está en tus conexiones para mostrarlo amigable
                  const connectionFriend = connectedConnections.find((c) => c.targetUid === uid);
                  const nameToShow = connectionFriend?.targetName || details.displayName || "Usuario externo";
                  const avatarToShow = connectionFriend?.targetAvatar;
                  
                  return (
                    <div key={uid} className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                      <div className="flex items-center gap-2 truncate">
                        {avatarToShow ? (
                          <img
                            src={avatarToShow}
                            alt={nameToShow}
                            className="w-4 h-4 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <User size={13} className="text-slate-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-200 truncate">{nameToShow}</p>
                          <p className="text-[8px] font-mono text-slate-550 truncate" title={uid}>{uid.slice(0, 12)}...</p>
                        </div>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold font-mono uppercase shrink-0 ${
                          details.role === "editor" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}>
                          {details.role === "editor" ? "Editor" : "Lector"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCollaborator(uid)}
                        className="p-1.5 hover:bg-red-500/15 text-slate-450 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>


            <div className="ui-muted-panel space-y-3 bg-slate-900/30 p-4 rounded-2xl border border-slate-800">
              <p className="text-xs font-extrabold text-white">Compartir los recursos aprobados</p>
              <p className="text-xs text-slate-400">Gestiona aquí los colaboradores privados. Para el catálogo, postula cada recurso desde Publicar; este enlace reúne únicamente las versiones aprobadas de esta carpeta.</p>

              <div className="flex flex-col gap-1">
                <label htmlFor="approved-collection-link" className="text-[10px] font-black tracking-wider text-emerald-400 uppercase">Enlace a los recursos aprobados</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="approved-collection-link"
                    readOnly
                    value={publicLink}
                    className="flex-1 text-[11px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-350 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCopyApprovedCollection()}
                    disabled={copyingLink}
                    className="px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Copiar enlace"
                  >
                    <Copy size={13} />
                    <span className="hidden sm:inline">{copyingLink ? "Comprobando…" : "Copiar"}</span>
                  </button>
                </div>
              </div>
            </div>
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
