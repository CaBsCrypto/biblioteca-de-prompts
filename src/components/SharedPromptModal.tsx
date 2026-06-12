import { Copy, Globe, Play, Sparkles, StickyNote, X, Zap } from "lucide-react";
import { Prompt } from "../types";

interface SharedPromptModalProps {
  prompt: Prompt;
  onClose: () => void;
  onCopy: () => void;
  onUse: () => void;
}

export default function SharedPromptModal({
  prompt,
  onClose,
  onCopy,
  onUse
}: SharedPromptModalProps) {
  const hasVariables = Boolean(prompt.suggestedVariables?.length);

  return (
    <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e293b] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-700/80 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-250">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/60 bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Globe size={16} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 leading-none">
                Prompt Compartido Públicamente
              </h2>
              <p className="text-[10px] text-slate-400 mt-1">Visible para cualquier persona con el enlace único</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 px-2.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white font-bold transition-all cursor-pointer"
            title="Cerrar vista"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded font-bold">
                {prompt.category}
              </span>
              {prompt.tags?.map((tag) => (
                <span key={tag} className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700/60">
                  #{tag}
                </span>
              ))}
            </div>

            <h3 className="text-xl font-extrabold text-white leading-tight">{prompt.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-sans">
              {prompt.description || "Este prompt no tiene una descripción adicional."}
            </p>
          </div>

          {prompt.notas && (
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/25 space-y-1">
              <h4 className="text-xs font-bold text-[#818cf8] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <StickyNote size={12} className="text-indigo-400" /> Notas sobre cómo ejecutar este prompt
              </h4>
              <p className="text-xs text-[#cbd5e1] leading-relaxed font-sans">{prompt.notas}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Texto del Prompt</label>
            <div className="relative">
              <pre className="w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-xs font-mono text-slate-100 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[250px] overflow-y-auto">
                {prompt.promptText}
              </pre>

              {hasVariables && (
                <p className="text-[10px] text-pink-400 bg-pink-500/5 border-t border-slate-800/80 p-2.5 rounded-b-2xl flex items-center gap-1">
                  <Sparkles size={11} className="animate-spin duration-1000 shrink-0" />
                  <span>
                    Este prompt contiene <strong>{prompt.suggestedVariables?.length} variables</strong> editables. Haz clic en
                    "Rellenar Variables" para usarlas.
                  </span>
                </p>
              )}
            </div>
          </div>

          {hasVariables && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campos / Variables Disponibles</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {prompt.suggestedVariables?.map((variable, index) => (
                  <div
                    key={`${variable.name}-${index}`}
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between text-xs font-sans"
                  >
                    <span className="font-extrabold text-pink-400 font-mono">{"{{" + variable.name + "}}"}</span>
                    <span className="text-[10px] text-slate-400 italic max-w-xs">{variable.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-5 border-t border-slate-700/60 bg-slate-900/40 flex items-center justify-between gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-1 font-mono text-[9px] text-slate-400 select-none">
            <Zap size={10} className="text-yellow-405 fill-current" />
            <span>¿Quieres guardar tus propios prompts? Conecta con Google.</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onCopy}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Copy size={13} />
              <span>Copiar Plano</span>
            </button>

            <button
              type="button"
              onClick={onUse}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/15 cursor-pointer"
            >
              <Play size={12} fill="currentColor" />
              <span>Rellenar Variables</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
