import { Copy, GitFork, Globe, Play, Sparkles, StickyNote, UserPlus, X, Zap } from "lucide-react";
import { Prompt } from "../types";

interface SharedPromptModalProps {
  prompt: Prompt;
  onClose: () => void;
  onCopy: () => void;
  onUse: () => void;
  onSaveToLibrary: () => void;
  isAuthenticated: boolean;
}

export default function SharedPromptModal({
  prompt,
  onClose,
  onCopy,
  onUse,
  onSaveToLibrary,
  isAuthenticated
}: SharedPromptModalProps) {
  const hasVariables = Boolean(prompt.suggestedVariables?.length);
  const isRemix = Boolean(prompt.forkedFromPromptId || prompt.forkedFrom);

  return (
    <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-md flex items-start sm:items-center justify-center z-50 p-3 sm:p-4">
      <div className="ui-modal-panel bg-[#1e293b] rounded-2xl sm:rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-700/80 flex flex-col max-h-[96vh] sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-250">
        <div className="ui-modal-header flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-700/60 bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Globe size={16} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 leading-none">
                Recurso publico compartido
              </h2>
              <p className="text-[10px] text-slate-400 mt-1">
                Pruebalo gratis y guardalo como remix privado editable
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-action-secondary p-1 px-2.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white font-bold transition-all cursor-pointer shrink-0"
            title="Cerrar vista"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 text-slate-200">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded font-bold">
                {prompt.category}
              </span>
              {isRemix && (
                <span className="text-[10px] uppercase tracking-widest bg-pink-500/10 text-pink-300 border border-pink-500/20 px-2.5 py-0.5 rounded font-bold flex items-center gap-1.5">
                  <GitFork size={11} />
                  Remix
                </span>
              )}
              {prompt.tags?.slice(0, 5).map((tag) => (
                <span key={tag} className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700/60">
                  #{tag}
                </span>
              ))}
            </div>

            <h3 className="text-xl font-extrabold text-white leading-tight">{prompt.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-sans">
              {prompt.description || "Este prompt no tiene una descripcion adicional."}
            </p>

            {prompt.authorName && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/35 px-3 py-1.5">
                  <UserPlus size={12} className="text-indigo-300" />
                  Publicado por <strong className="text-slate-200">@{prompt.authorHandle || prompt.authorName}</strong>
                </span>
                {isRemix && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-pink-500/20 bg-pink-500/5 px-3 py-1.5 text-pink-200">
                    <GitFork size={12} />
                    Basado en {prompt.forkedFromTitle || prompt.forkedFrom || "otro recurso"}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="ui-muted-panel rounded-2xl border border-slate-700/70 bg-slate-900/35 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-black">Paso 1</p>
              <p className="text-xs font-extrabold text-white mt-1">Probar</p>
            </div>
            <div className="ui-muted-panel rounded-2xl border border-slate-700/70 bg-slate-900/35 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-black">Paso 2</p>
              <p className="text-xs font-extrabold text-emerald-300 mt-1">Guardar remix privado</p>
            </div>
            <div className="ui-muted-panel rounded-2xl border border-slate-700/70 bg-slate-900/35 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-black">Paso 3</p>
              <p className="text-xs font-extrabold text-pink-300 mt-1">Publicar si aporta</p>
            </div>
          </div>

          {prompt.notas && (
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/25 space-y-1">
              <h4 className="text-xs font-bold text-[#818cf8] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <StickyNote size={12} className="text-indigo-400" /> Como ejecutar este prompt
              </h4>
              <p className="text-xs text-[#cbd5e1] leading-relaxed font-sans">{prompt.notas}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Texto del prompt</label>
            <div className="relative">
              <pre className="w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-xs font-mono text-slate-100 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[250px] overflow-y-auto">
                {prompt.promptText}
              </pre>

              {hasVariables && (
                <p className="text-[10px] text-pink-400 bg-pink-500/5 border-t border-slate-800/80 p-2.5 rounded-b-2xl flex items-center gap-1">
                  <Sparkles size={11} className="animate-spin duration-1000 shrink-0" />
                  <span>
                    Este prompt contiene <strong>{prompt.suggestedVariables?.length} variables</strong> editables. Usa rellenar variables para probarlo sin reescribirlo.
                  </span>
                </p>
              )}
            </div>
          </div>

          {hasVariables && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Variables disponibles</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {prompt.suggestedVariables?.map((variable, index) => (
                  <div
                    key={`${variable.name}-${index}`}
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-3 text-xs font-sans"
                  >
                    <span className="font-extrabold text-pink-400 font-mono shrink-0">{"{{" + variable.name + "}}"}</span>
                    <span className="text-[10px] text-slate-400 italic min-w-0">{variable.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-100 space-y-2">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <GitFork size={13} />
              Guardar no modifica el original
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              La copia queda privada en tu biblioteca. Puedes editarla, usarla con tus variables y decidir despues si la publicas como una version propia.
            </p>
          </div>
        </div>

        <div className="ui-modal-footer px-4 sm:px-6 py-4 sm:py-5 border-t border-slate-700/60 bg-slate-900/40 flex items-center justify-between gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-1 font-mono text-[9px] text-slate-400 select-none">
            <Zap size={10} className="text-yellow-405 fill-current" />
            <span>{isAuthenticated ? "Guardar crea una copia privada editable." : "Conecta con Google para crear tu remix privado."}</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 ml-auto">
            <button
              type="button"
              onClick={onSaveToLibrary}
              className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-500/25 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <GitFork size={13} />
              <span>{isAuthenticated ? "Guardar remix privado" : "Crear mi biblioteca"}</span>
            </button>

            <button
              type="button"
              onClick={onCopy}
              className="ui-action-secondary px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Copy size={13} />
              <span>Copiar</span>
            </button>

            <button
              type="button"
              onClick={onUse}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/15 cursor-pointer"
            >
              <Play size={12} fill="currentColor" />
              <span>Rellenar variables</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
