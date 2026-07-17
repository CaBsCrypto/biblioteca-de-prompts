import React, { useState, useEffect, useMemo } from "react";
import { Sparkles, ArrowRight, Save, RotateCcw, Copy, Check, FileText, BarChart3, AlertCircle, Eye } from "lucide-react";
import { auth } from "../firebase";
import type { Prompt } from "../types";
import AIModelSelector from "./AIModelSelector";


interface PromptVariableInput {
  name: string;
  description: string;
  defaultValue?: string;
}

interface GeneratedPromptData {
  title: string;
  description: string;
  promptText: string;
  category: Prompt["category"];
  tags: string[];
  suggestedVariables: PromptVariableInput[];
}

interface AIHelperPanelProps {
  onImportToLibrary: (data: GeneratedPromptData) => void;
  onClose: () => void;
  presetTextToOptimize?: string;
}

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return [];
  const unique = new Set(matches.map(m => m.slice(2, -2).trim()));
  return Array.from(unique);
}

interface QualityScore {
  score: number;
  hasRole: boolean;
  hasContext: boolean;
  hasVariables: boolean;
  hasOutputFormat: boolean;
  tips: string[];
}

function calculateQualityScore(text: string): QualityScore {
  const lowercase = text.toLowerCase();
  const tips: string[] = [];
  let score = 0;

  const roleKeywords = ["eres un", "actúa como", "diseña como", "experto", "como un", "role", "act as", "you are a", "profesional"];
  const hasRole = roleKeywords.some(kw => lowercase.includes(kw));
  if (hasRole) {
    score += 25;
  } else {
    tips.push("Define un Rol claro para la IA (ej: 'Eres un copywriter experto...').");
  }

  const hasContext = text.trim().length > 60;
  if (hasContext) {
    score += 25;
  } else {
    tips.push("Añade Contexto o detalles de la tarea (mínimo 60 caracteres).");
  }

  const variables = extractVariables(text);
  const hasVariables = variables.length > 0;
  if (hasVariables) {
    score += 25;
  } else {
    tips.push("Usa variables dinámicas {{ejemplo}} para flexibilizar la instrucción.");
  }

  const formatKeywords = ["salida", "output", "formato", "json", "markdown", "lista", "tabla", "estructura", "formato de respuesta"];
  const hasOutputFormat = formatKeywords.some(kw => lowercase.includes(kw));
  if (hasOutputFormat) {
    score += 25;
  } else {
    tips.push("Define la estructura o Formato de Salida (ej: 'Responde en Markdown').");
  }

  return { score, hasRole, hasContext, hasVariables, hasOutputFormat, tips };
}

export default function AIHelperPanel({
  onImportToLibrary,
  onClose,
  presetTextToOptimize = ""
}: AIHelperPanelProps) {
  const [activeTab, setActiveTab] = useState<"crear" | "optimizar">(
    presetTextToOptimize ? "optimizar" : "crear"
  );

  // States
  const [description, setDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [channelContext, setChannelContext] = useState("Espectadores interesados en Inteligencia Artificial");

  const [promptText, setPromptText] = useState(presetTextToOptimize);
  const [comments, setComments] = useState("");

  // Variables mock values state
  const [mockValues, setMockValues] = useState<Record<string, string>>({});

  // Common response state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);


  // Suggested tags & category from AI result
  const [aiMetadata, setAiMetadata] = useState<{
    title: string;
    description: string;
    category: Prompt["category"];
    tags: string[];
  } | null>(null);

  // Sync preset text
  useEffect(() => {
    if (presetTextToOptimize) {
      setPromptText(presetTextToOptimize);
      setActiveTab("optimizar");
    }
  }, [presetTextToOptimize]);

  // Extract variables in real-time
  const activeVariables = useMemo(() => extractVariables(promptText), [promptText]);

  // Prompt quality score in real-time
  const quality = useMemo(() => calculateQualityScore(promptText), [promptText]);

  // Filled prompt text preview in real-time
  const filledPreview = useMemo(() => {
    let filled = promptText;
    activeVariables.forEach(v => {
      const val = mockValues[v] || `[${v}]`;
      // Replace all occurrences of {{v}} or {{ v }}
      const regex = new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`, "g");
      filled = filled.replace(regex, val);
    });
    return filled;
  }, [promptText, activeVariables, mockValues]);

  const requestAI = async (endpoint: "/api/ai/crear" | "/api/ai/optimizar", payload: Record<string, unknown>) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Inicia sesión para usar el asistente de IA.");
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ...payload, ...(selectedModel ? { modelId: selectedModel } : {}) })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || "Ocurrió un error con el asistente de IA.");
    }

    return data as GeneratedPromptData;
  };


  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await requestAI("/api/ai/crear", {
        description: description.trim(),
        targetRole: targetRole.trim() || undefined,
        channelContext: channelContext.trim() || undefined
      });
      setPromptText(data.promptText);
      setAiMetadata({
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags
      });
      // Pre-populate mock values
      const mocks: Record<string, string> = {};
      data.suggestedVariables?.forEach(v => {
        if (v.defaultValue) mocks[v.name] = v.defaultValue;
      });
      setMockValues(mocks);
      setActiveTab("optimizar"); // Switch to Sandbox view
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error del servidor de Inteligencia Artificial");
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await requestAI("/api/ai/optimizar", {
        originalPromptText: promptText.trim(),
        comments: comments.trim() || undefined
      });
      setPromptText(data.promptText);
      setAiMetadata({
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags
      });
      // Pre-populate mock values
      const mocks: Record<string, string> = {};
      data.suggestedVariables?.forEach(v => {
        if (v.defaultValue) mocks[v.name] = v.defaultValue;
      });
      setMockValues(mocks);
      setComments("");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error del servidor al optimizar el prompt");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPromptText = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    if (!promptText.trim()) return;
    onImportToLibrary({
      title: aiMetadata?.title || "Prompt Optimizado por IA",
      description: aiMetadata?.description || "Prompt redactado con asistencia de Gemini Sandbox.",
      promptText: promptText,
      category: aiMetadata?.category || "General",
      tags: aiMetadata?.tags || ["ia", "optimizador"],
      suggestedVariables: activeVariables.map(v => ({
        name: v,
        description: `Variable ${v} para rellenar dinámicamente`,
        defaultValue: mockValues[v] || ""
      }))
    });
    // Reset state
    setPromptText("");
    setDescription("");
    setComments("");
    setAiMetadata(null);
  };

  return (
    <div id="ai-assistant-container" className="bg-[#1e293b]/95 rounded-3xl border border-slate-700/80 p-5 shadow-xl flex flex-col h-full overflow-hidden select-text text-slate-200">
      
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-pink-500 text-white flex items-center justify-center shadow-sm">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="font-extrabold text-white text-sm leading-tight">AI Sandbox & Optimizer</h2>
            <p className="text-[10px] text-slate-400 font-mono">Modelado en vivo: {selectedModel || "Gemini 1.5 Pro"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AIModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} compact />
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-350 hover:text-white bg-slate-805 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="grid grid-cols-2 bg-[#0f172a] p-1.5 rounded-xl mb-4 shrink-0 select-none border border-slate-800">
        <button
          onClick={() => {
            setActiveTab("crear");
            setError(null);
          }}
          className={`text-xs font-extrabold py-2 rounded-lg transition-all cursor-pointer ${
            activeTab === "crear"
              ? "bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-md"
              : "text-slate-450 hover:text-slate-200"
          }`}
        >
          Creador de Prompts
        </button>
        <button
          onClick={() => {
            setActiveTab("optimizar");
            setError(null);
          }}
          className={`text-xs font-extrabold py-2 rounded-lg transition-all cursor-pointer ${
            activeTab === "optimizar"
              ? "bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-md"
              : "text-slate-450 hover:text-slate-200"
          }`}
        >
          Sandbox de Ingeniería
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden">
        
        {/* TAB 1: CREADOR */}
        {activeTab === "crear" && (
          <div className="flex-1 flex flex-col overflow-y-auto pr-1 space-y-4 pb-4">
            <p className="text-[11px] text-slate-400 leading-relaxed bg-[#0f172a]/40 p-3 rounded-xl border border-slate-800/80 font-sans">
              Describe tu idea a nivel general y Gemini creará una plantilla estructurada y lista para usar en la sección de Sandbox.
            </p>
            
            <form onSubmit={handleCreatePrompt} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">¿Qué quieres lograr? *</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="ej. Un prompt para redactar hilos de Twitter educativos sobre ciberseguridad para principiantes usando analogías divertidas..."
                  rows={6}
                  required
                  maxLength={1000}
                  className="w-full text-xs rounded-xl border border-slate-700 p-3 bg-slate-950/65 focus:outline-none focus:border-indigo-400 transition-all font-sans leading-relaxed text-white placeholder-slate-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rol de IA Deseado (Opcional)</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  placeholder="ej. Educador tecnológico divertido"
                  maxLength={100}
                  className="w-full text-xs rounded-xl border border-slate-700 px-3.5 py-2.5 bg-slate-950/65 focus:outline-none focus:border-indigo-400 transition-all text-white placeholder-slate-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contexto de la Audiencia</label>
                <input
                  type="text"
                  value={channelContext}
                  onChange={e => setChannelContext(e.target.value)}
                  placeholder="ej. Espectadores de YouTube o Redes Sociales"
                  maxLength={200}
                  className="w-full text-xs rounded-xl border border-slate-700 px-3.5 py-2.5 bg-slate-950/65 focus:outline-none focus:border-indigo-400 transition-all text-white placeholder-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-indigo-650 to-pink-650 hover:opacity-95 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md focus:outline-none cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin"></div>
                    <span>Diseñando estructura de Prompt...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="animate-pulse" />
                    <span>Construir Prompt con Gemini</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: OPTIMIZADOR & SANDBOX (DOUBLE COLUMN ON MD SCREEN) */}
        {activeTab === "optimizar" && (
          <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden h-full">
            
            {/* Left Column: Input Prompt Editor */}
            <div className="flex-1 flex flex-col space-y-3 min-w-0 overflow-y-auto h-full pr-1">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText size={12} className="text-indigo-400" /> Editor de Prompt
                  </label>
                  <button
                    onClick={handleCopyPromptText}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 font-sans cursor-pointer transition-colors"
                  >
                    {copied ? <Check size={11} className="text-emerald-450" /> : <Copy size={11} />}
                    {copied ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>
                <textarea
                  value={promptText}
                  onChange={e => setPromptText(e.target.value)}
                  placeholder="Escribe, edita o pega tu prompt aquí. Usa {{variable}} para crear campos dinámicos interactivos..."
                  rows={10}
                  className="w-full text-xs rounded-xl border border-slate-700 p-3 bg-slate-950/70 focus:outline-none focus:border-indigo-455 transition-all font-mono leading-relaxed text-white placeholder-slate-500 resize-none min-h-[180px] md:flex-1"
                />
              </div>

              {/* Instruct Gemini Box */}
              <form onSubmit={handleOptimizePrompt} className="space-y-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dar Instrucciones de mejora a Gemini</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={comments}
                      onChange={e => setComments(e.target.value)}
                      placeholder="ej. Hazlo más profesional, agrega variables de tono..."
                      maxLength={300}
                      className="flex-1 text-xs rounded-xl border border-slate-700 px-3.5 py-2.5 bg-slate-950/65 focus:outline-none focus:border-indigo-400 transition-all text-white placeholder-slate-500"
                    />
                    <button
                      type="submit"
                      disabled={loading || !promptText.trim()}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 font-bold rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <Sparkles size={13} />
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Right Column: Real-time Quality Checker & Variables Playground */}
            <div className="flex-1 flex flex-col space-y-4 min-w-0 overflow-y-auto h-full border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-5">
              
              {/* Quality Checker Card */}
              <div className="bg-[#0f172a]/80 rounded-2xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 size={13} className="text-pink-400" /> Medidor de Calidad
                  </span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded font-mono ${
                    quality.score >= 75 ? "bg-emerald-500/10 text-emerald-400" :
                    quality.score >= 50 ? "bg-amber-500/10 text-amber-400" :
                    "bg-red-500/10 text-red-400"
                  }`}>
                    {quality.score}%
                  </span>
                </div>

                {/* Score slider bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      quality.score >= 75 ? "bg-gradient-to-r from-emerald-500 to-teal-400" :
                      quality.score >= 50 ? "bg-gradient-to-r from-amber-500 to-orange-400" :
                      "bg-gradient-to-r from-red-500 to-pink-500"
                    }`}
                    style={{ width: `${quality.score}%` }}
                  />
                </div>

                {/* Checklist indicators */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                  <span className={`flex items-center gap-1 ${quality.hasRole ? "text-emerald-450" : "text-slate-500"}`}>
                    <Check size={11} className={quality.hasRole ? "text-emerald-450 stroke-[3]" : "text-slate-650"} /> Rol de IA
                  </span>
                  <span className={`flex items-center gap-1 ${quality.hasContext ? "text-emerald-450" : "text-slate-500"}`}>
                    <Check size={11} className={quality.hasContext ? "text-emerald-450 stroke-[3]" : "text-slate-650"} /> Contexto Amplio
                  </span>
                  <span className={`flex items-center gap-1 ${quality.hasVariables ? "text-emerald-450" : "text-slate-500"}`}>
                    <Check size={11} className={quality.hasVariables ? "text-emerald-450 stroke-[3]" : "text-slate-650"} /> Variables {"{{}}"}
                  </span>
                  <span className={`flex items-center gap-1 ${quality.hasOutputFormat ? "text-emerald-450" : "text-slate-500"}`}>
                    <Check size={11} className={quality.hasOutputFormat ? "text-emerald-450 stroke-[3]" : "text-slate-650"} /> Formato Salida
                  </span>
                </div>

                {/* Interactive Tips */}
                {quality.tips.length > 0 && (
                  <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-bold">Consejos rápidos:</span>
                    {quality.tips.slice(0, 2).map((tip, idx) => (
                      <p key={idx} className="text-[10px] text-amber-250 flex items-start gap-1 font-sans leading-relaxed">
                        <AlertCircle size={10} className="mt-0.5 shrink-0" />
                        <span>{tip}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Variables Playground */}
              <div className="flex-1 flex flex-col space-y-3 min-h-[120px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={12} className="text-indigo-400" /> Playground de Variables
                </label>

                {activeVariables.length === 0 ? (
                  <div className="flex-1 border border-dashed border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center text-slate-500">
                    <AlertCircle size={16} className="mb-1 text-slate-600" />
                    <p className="text-[10px] font-bold leading-normal font-sans">No hay variables dinámicas.</p>
                    <p className="text-[9px] text-slate-550 max-w-[180px] mt-0.5 leading-normal">
                      Escribe un texto entre llaves dobles como <code className="font-mono text-indigo-400">{"{{tema}}"}</code> para ver los campos aquí.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                    {activeVariables.map(v => (
                      <div key={v} className="flex flex-col gap-1 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60">
                        <span className="font-mono font-bold text-[10px] text-indigo-400 w-fit bg-indigo-500/5 px-1.5 py-0.5 border border-indigo-500/10 rounded">
                          {v}
                        </span>
                        <input
                          type="text"
                          value={mockValues[v] || ""}
                          onChange={e => setMockValues({ ...mockValues, [v]: e.target.value })}
                          placeholder={`Escribe un valor de prueba para {{${v}}}...`}
                          className="w-full text-xs rounded-lg border border-slate-750 px-2.5 py-1.5 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/80 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Filled Real-Time Preview */}
                {activeVariables.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Eye size={10} /> Previsualización del Prompt Relleno
                    </label>
                    <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-[10px] font-mono leading-relaxed text-slate-300 max-h-[120px] overflow-y-auto whitespace-pre-wrap select-text">
                      {filledPreview}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions panel */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-800/80 shrink-0">
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!promptText.trim()}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-95 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer select-none"
                >
                  <Save size={14} />
                  <span>Guardar a mi Biblioteca</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Global Error message in sandbox tab */}
        {error && (
          <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-red-350 text-xs leading-relaxed font-sans shrink-0">
            <strong>Error:</strong> {error}
          </div>
        )}

      </div>
    </div>
  );
}
