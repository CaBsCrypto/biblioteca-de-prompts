import React, { useState } from "react";
import { Sparkles, ArrowRight, Save, RotateCcw, Copy, Check, FileText } from "lucide-react";

interface PromptVariableInput {
  name: string;
  description: string;
  defaultValue?: string;
}

interface GeneratedPromptData {
  title: string;
  description: string;
  promptText: string;
  category: "YouTube" | "Marketing" | "Programación" | "Redacción" | "General";
  tags: string[];
  suggestedVariables: PromptVariableInput[];
}

interface AIHelperPanelProps {
  onImportToLibrary: (data: GeneratedPromptData) => void;
  onClose: () => void;
  presetTextToOptimize?: string; // Preseed if clicked 'Optimize with AI' from form
}

export default function AIHelperPanel({
  onImportToLibrary,
  onClose,
  presetTextToOptimize = ""
}: AIHelperPanelProps) {
  const [activeTab, setActiveTab] = useState<"crear" | "optimizar">(
    presetTextToOptimize ? "optimizar" : "crear"
  );

  // Creator state
  const [description, setDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [channelContext, setChannelContext] = useState("Suscriptores de mi canal educativo de IA");

  // Optimizer state
  const [originalPrompt, setOriginalPrompt] = useState(presetTextToOptimize);
  const [comments, setComments] = useState("");

  // Common response state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedPromptData | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/ai/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          targetRole: targetRole.trim() || undefined,
          channelContext: channelContext.trim() || undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Ocurrió un error generando el prompt.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error del servidor de Inteligencia Artificial");
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalPrompt.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/ai/optimizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalPromptText: originalPrompt.trim(),
          comments: comments.trim() || undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Ocurrió un error optimizando el prompt.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error del servidor al optimizar el prompt");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPromptText = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    if (!result) return;
    onImportToLibrary(result);
    // Reset state
    setResult(null);
    setDescription("");
    setOriginalPrompt("");
    setComments("");
  };

  return (
    <div id="ai-assistant-container" className="bg-[#1e293b]/95 rounded-3xl border border-slate-700/80 p-6 shadow-xl flex flex-col h-full overflow-hidden select-text text-slate-200">
      
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-pink-500 text-white flex items-center justify-center shadow-sm">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="font-extrabold text-white text-sm leading-tight">Asistente de Prompts IA</h2>
            <p className="text-[10px] text-slate-400 font-mono">Impulsado por Gemini 3.5 Flash</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs font-bold text-slate-300 hover:text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
        >
          Cerrar
        </button>
      </div>

      {/* Tabs Selector */}
      <div className="grid grid-cols-2 bg-[#0f172a] p-1.5 rounded-xl mb-5 shrink-0 select-none border border-slate-800">
        <button
          onClick={() => {
            setActiveTab("crear");
            setError(null);
          }}
          className={`text-xs font-extrabold py-2 rounded-lg transition-all cursor-pointer ${
            activeTab === "crear"
              ? "bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-md font-extrabold"
              : "text-slate-450 hover:text-slate-200"
          }`}
        >
          Creador Inteligente
        </button>
        <button
          onClick={() => {
            setActiveTab("optimizar");
            setError(null);
          }}
          className={`text-xs font-extrabold py-2 rounded-lg transition-all cursor-pointer ${
            activeTab === "optimizar"
              ? "bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-md font-extrabold"
              : "text-slate-450 hover:text-slate-200"
          }`}
        >
          Optimizador Avanzado
        </button>
      </div>

      {/* Scrollable Work Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-4">
        
        {/* Render Tab View */}
        {!result && (
          <>
            {activeTab === "crear" ? (
              <form onSubmit={handleCreatePrompt} className="space-y-4">
                <p className="text-[11px] text-slate-405 leading-relaxed bg-[#0f172a]/40 p-2.5 rounded-xl border border-slate-800">
                  Describe una idea de lo que quieres que haga tu Inteligencia Artificial y Gemini construirá un prompt estructurado profesionalmente.
                </p>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Objetivo o Idea del Prompt *</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="ej. Crear un guion educativo sobre cómo el machine learning analiza imágenes paso a paso para explicarlo de forma divertida..."
                    rows={4}
                    required
                    maxLength={1000}
                    className="w-full text-xs rounded-xl border border-slate-700 p-3 bg-slate-950/60 focus:outline-none focus:border-indigo-400 transition-all font-sans leading-relaxed text-white placeholder-slate-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rol sugerido de la IA (Opcional)</label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={e => setTargetRole(e.target.value)}
                    placeholder="ej. Divulgador Científico de Silicon Valley"
                    maxLength={100}
                    className="w-full text-xs rounded-xl border border-slate-700 px-3.5 py-2.5 bg-slate-950/60 focus:outline-none focus:border-indigo-400 transition-all text-white placeholder-slate-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contexto del Canal o Audiencia</label>
                  <input
                    type="text"
                    value={channelContext}
                    onChange={e => setChannelContext(e.target.value)}
                    placeholder="ej. Espectadores principiantes de YouTube"
                    maxLength={200}
                    className="w-full text-xs rounded-xl border border-slate-700 px-3.5 py-2.5 bg-slate-950/60 focus:outline-none focus:border-indigo-400 transition-all text-white placeholder-slate-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-95 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md focus:outline-none cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin"></div>
                      <span>Generando Estructura de Prompt...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="animate-bounce" />
                      <span>Generar Prompt Profesional</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOptimizePrompt} className="space-y-4">
                <p className="text-[11px] text-slate-405 leading-relaxed bg-[#0f172a]/40 p-2.5 rounded-xl border border-slate-800">
                  Pega un prompt de nivel básico o desorganizado y Gemini lo transformará aplicando técnicas de ingeniería de prompts.
                </p>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prompt Crudo a Optimizar *</label>
                  <textarea
                    value={originalPrompt}
                    onChange={e => setOriginalPrompt(e.target.value)}
                    placeholder="Pega aquí tu prompt..."
                    rows={6}
                    required
                    className="w-full text-xs rounded-xl border border-slate-700 p-3 bg-slate-950/60 focus:outline-none focus:border-indigo-400 transition-all font-mono leading-relaxed text-white placeholder-slate-550"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pautas adicionales (Opcional)</label>
                  <input
                    type="text"
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    placeholder="ej. Asegúrate de agregar variables para el tono y duración."
                    maxLength={250}
                    className="w-full text-xs rounded-xl border border-slate-700 px-3.5 py-2.5 bg-slate-950/60 focus:outline-none focus:border-indigo-400 transition-all text-white placeholder-slate-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-95 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md focus:outline-none cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin"></div>
                      <span>Ejecutando Ingeniería de Prompts...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Optimizar con IA</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* Error state */}
        {error && (
          <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-red-300 text-xs leading-relaxed font-sans shrink-0">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading placeholder animations */}
        {loading && (
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col items-center justify-center py-12 gap-3 shrink-0">
            <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-pink-500 rounded-full animate-spin"></div>
            <div className="text-center">
              <p className="text-xs font-bold text-white">Modelando con Gemini...</p>
              <p className="text-[10px] text-slate-400 mt-1.5 max-w-[200px] leading-relaxed mx-auto font-sans">
                Buscando el mejor rol, estandarizando formato, y extrayendo variables dinámicas en español.
              </p>
            </div>
          </div>
        )}

        {/* AI Result Cards */}
        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-slate-900/65 border border-slate-700/80 p-5 rounded-2xl shadow-lg space-y-4">
              
              {/* Output Title & Category Badges */}
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 shadow-xs">
                  PROMPT MODELADO
                </span>
                <span className="text-[10px] font-bold bg-slate-950 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-800 font-mono">
                  {result.category}
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-white text-sm leading-tight mb-1">{result.title}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{result.description}</p>
              </div>

              {/* Tag lines */}
              <div className="flex flex-wrap gap-1">
                {result.tags.map((tag, idx) => (
                  <span key={idx} className="bg-slate-900 text-slate-350 border border-slate-800 text-[10px] px-2 py-0.5 rounded-md font-medium">
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Code raw formatted textbox */}
              <div className="relative group">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <FileText size={12} className="text-indigo-400" /> Contenido del Prompt
                </span>
                <div className="bg-slate-950 rounded-xl p-4 text-[11px] font-mono leading-relaxed text-slate-300 max-h-[300px] overflow-y-auto whitespace-pre-wrap border border-slate-800">
                  {result.promptText}
                </div>
                
                {/* Copy float Button */}
                <button
                  onClick={handleCopyPromptText}
                  className={`absolute right-2 top-8 p-1.5 rounded-lg transition-all cursor-pointer ${
                    copied
                      ? "bg-emerald-500 text-white"
                      : "bg-[#1e293b] text-slate-300 hover:text-white border border-slate-700"
                  }`}
                  title="Copiar prompt"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>

              {/* Extracted/recommended Variables */}
              {result.suggestedVariables && result.suggestedVariables.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Variables inteligentes detectadas:
                  </span>
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/45">
                    {result.suggestedVariables.map((v, idx) => (
                      <div key={idx} className="p-2.5 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 border border-indigo-500/20 rounded">
                            {v.name}
                          </span>
                          {v.defaultValue && (
                            <span className="text-[9px] text-slate-500 truncate font-mono">
                              (Por defecto: {v.defaultValue})
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">{v.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions panel */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setResult(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-305 font-bold rounded-xl border border-slate-700 text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Volver</span>
                </button>
                
                <button
                  onClick={handleImport}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-all shadow-md cursor-pointer animate-pulse"
                >
                  <Save size={14} />
                  <span>Guardar</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
