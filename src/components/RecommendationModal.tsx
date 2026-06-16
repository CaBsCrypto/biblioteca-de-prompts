import { Copy, Play, Sparkles, X } from "lucide-react";
import { Prompt } from "../types";
import type { LocalRecommendation } from "../utils/recommendations";

export interface GeminiRecommendationResult {
  recommendations: {
    id: string;
    reason: string;
    confidence: number;
  }[];
  gapAnalysis: string;
  suggestedNewPrompt?: {
    title: string;
    description: string;
    promptText: string;
    category: Prompt["category"];
    tags: string[];
    suggestedVariables?: Prompt["suggestedVariables"];
  };
}

interface RecommendationModalProps {
  prompts: Prompt[];
  recommendationGoal: string;
  setRecommendationGoal: (value: string) => void;
  recommendedPrompts: LocalRecommendation[];
  geminiRecommendation: GeminiRecommendationResult | null;
  geminiRecommendationLoading: boolean;
  geminiRecommendationError: string;
  onImproveWithGemini: () => void;
  onUse: (prompt: Prompt) => void;
  onCopy: (prompt: Prompt) => void;
  onEdit: (prompt: Prompt) => void;
  onCopySuggestedPrompt: (promptText: string) => void;
  onClose: () => void;
}

export default function RecommendationModal({
  prompts,
  recommendationGoal,
  setRecommendationGoal,
  recommendedPrompts,
  geminiRecommendation,
  geminiRecommendationLoading,
  geminiRecommendationError,
  onImproveWithGemini,
  onUse,
  onCopy,
  onEdit,
  onCopySuggestedPrompt,
  onClose
}: RecommendationModalProps) {
  return (
    <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-md flex items-start sm:items-center justify-center z-50 p-3 sm:p-4">
      <div className="ui-modal-panel bg-[#1e293b] rounded-2xl sm:rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-700/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[96vh] flex flex-col">
        <div className="ui-modal-header flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-700/60 bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-emerald-400" />
            <div>
              <h3 className="font-extrabold text-white text-md leading-tight">Recomendador local</h3>
              <p className="text-[10px] text-slate-400 font-mono">Sin costo IA. Usa solo tu biblioteca.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="ui-action-secondary p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase">¿Qué quieres lograr?</label>
            <textarea
              value={recommendationGoal}
              onChange={(e) => setRecommendationGoal(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ej: crear un guion para YouTube sobre agentes IA, mejorar una miniatura, explicar un concepto complejo..."
              className="w-full text-xs rounded-2xl border border-slate-700 bg-[#0f172a]/50 px-4 py-3 text-white focus:outline-none focus:border-emerald-400 font-sans resize-none"
            />
            <p className="text-[10px] text-slate-500">También considera tus filtros activos: categoría y etiquetas seleccionadas.</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onImproveWithGemini}
                disabled={geminiRecommendationLoading || prompts.length === 0}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                title="Usa Gemini solo sobre candidatos reducidos del recomendador local"
              >
                <Sparkles size={12} />
                <span>{geminiRecommendationLoading ? "Mejorando..." : "Mejorar con Gemini"}</span>
              </button>
              <span className="text-[10px] text-slate-500">Gemini no recibe el texto completo de tus prompts.</span>
            </div>
          </div>

          {geminiRecommendationError && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-xs font-bold text-amber-200">{geminiRecommendationError}</p>
              <p className="text-[10px] text-amber-100/70 mt-1">El recomendador local sigue disponible.</p>
            </div>
          )}

          {geminiRecommendation && (
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-indigo-200 uppercase tracking-wider">Capa Gemini opcional</p>
                  <p className="text-[11px] text-slate-300 mt-1">{geminiRecommendation.gapAnalysis}</p>
                </div>
                <span className="text-[10px] text-indigo-200 bg-indigo-500/15 border border-indigo-500/25 rounded-full px-2 py-1 font-bold">ranking asistido</span>
              </div>

              {geminiRecommendation.recommendations.length > 0 && (
                <div className="space-y-2">
                  {geminiRecommendation.recommendations.map((item) => {
                    const matchedPrompt = prompts.find((prompt) => prompt.id === item.id);
                    if (!matchedPrompt) return null;
                    return (
                      <div key={item.id} className="surface-nested-card rounded-xl border border-indigo-500/20 bg-slate-950/35 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-white truncate">{matchedPrompt.title}</p>
                          <p className="text-[11px] text-slate-300 mt-1">{item.reason}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-indigo-200 font-mono">{item.confidence}%</span>
                          <button type="button" onClick={() => onUse(matchedPrompt)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer">
                            <Play size={11} fill="currentColor" />
                            <span>Usar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {geminiRecommendation.suggestedNewPrompt && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <p className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">Prompt nuevo sugerido</p>
                  <h4 className="text-sm font-extrabold text-white mt-1">{geminiRecommendation.suggestedNewPrompt.title}</h4>
                  <p className="text-[11px] text-slate-300 mt-1">{geminiRecommendation.suggestedNewPrompt.description}</p>
                  <div className="flex flex-wrap justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => onCopySuggestedPrompt(geminiRecommendation.suggestedNewPrompt?.promptText || "")}
                    className="ui-action-secondary px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy size={11} />
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {prompts.length === 0 ? (
            <div className="ui-muted-panel rounded-2xl border border-slate-700 border-dashed bg-slate-900/40 p-8 text-center">
              <p className="text-sm font-extrabold text-white">Tu biblioteca aún está vacía.</p>
              <p className="text-xs text-slate-400 mt-1">Carga ejemplos o crea prompts para que el recomendador tenga material.</p>
            </div>
          ) : recommendedPrompts.length === 0 ? (
            <div className="ui-muted-panel rounded-2xl border border-slate-700 border-dashed bg-slate-900/40 p-8 text-center">
              <p className="text-sm font-extrabold text-white">No encontré una coincidencia clara.</p>
              <p className="text-xs text-slate-400 mt-1">Prueba con otro objetivo o limpia filtros activos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendedPrompts.map(({ prompt, score, reasons }, index) => (
                <div key={prompt.id} className="surface-nested-card rounded-2xl border border-slate-700/70 bg-slate-900/35 p-4 flex flex-col gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">#{index + 1}</span>
                      <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">{prompt.category}</span>
                      <span className="text-[10px] text-slate-400 font-mono">score {score}</span>
                    </div>
                    <h4 className="text-sm font-extrabold text-white mt-2 leading-tight">{prompt.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{prompt.description || "Sin descripción."}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(reasons.length > 0 ? reasons : ["Candidato relevante de tu biblioteca."]).map((reason) => (
                      <span key={reason} className="text-[10px] text-slate-300 bg-slate-800 border border-slate-700/70 px-2 py-1 rounded-lg">{reason}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                    <button type="button" onClick={() => onUse(prompt)} className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-pink-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer">
                      <Play size={12} fill="currentColor" />
                      <span>Usar</span>
                    </button>
                    <button type="button" onClick={() => onCopy(prompt)} className="ui-action-secondary px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer">
                      <Copy size={12} />
                      <span>Copiar</span>
                    </button>
                    <button type="button" onClick={() => onEdit(prompt)} className="ui-action-secondary px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl cursor-pointer">Editar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
