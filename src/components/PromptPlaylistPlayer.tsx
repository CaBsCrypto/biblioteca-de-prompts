import React, { useState, useMemo } from "react";
import { Check, Copy, Play, ArrowLeft, ArrowRight, Share2, Sparkles, FolderPlus, ListTodo, HelpCircle, Eye } from "lucide-react";
import type { User } from "firebase/auth";
import type { Prompt } from "../types";

interface PromptPlaylistPlayerProps {
  collectionName: string;
  collectionDescription?: string;
  authorName?: string;
  prompts: Prompt[];
  onClose: () => void;
  user: User | null;
  onCloneCollection: () => void | Promise<void>;
  isCloning: boolean;
  onNotification: (message: string, type?: "success" | "info") => void;
  handleUsePrompt: (prompt: Prompt, context: string) => void;
  handleCopyFilledPrompt: (prompt: Prompt) => void;
}

export default function PromptPlaylistPlayer({
  collectionName,
  collectionDescription,
  authorName,
  prompts,
  onClose,
  user,
  onCloneCollection,
  isCloning,
  onNotification,
  handleUsePrompt,
  handleCopyFilledPrompt
}: PromptPlaylistPlayerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mockValues, setMockValues] = useState<Record<string, string>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const activePrompt = prompts[activeIndex];

  // Extract variables of the active prompt
  const activeVariables = useMemo(() => {
    if (!activePrompt) return [];
    const matches = activePrompt.promptText.match(/\{\{([^}]+)\}\}/g);
    if (!matches) return [];
    const unique = new Set(matches.map(m => m.slice(2, -2).trim()));
    return Array.from(unique);
  }, [activePrompt]);

  // Filled prompt text preview in real-time
  const filledPreview = useMemo(() => {
    if (!activePrompt) return "";
    let filled = activePrompt.promptText;
    activeVariables.forEach(v => {
      const val = mockValues[v] || `[${v}]`;
      const regex = new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`, "g");
      filled = filled.replace(regex, val);
    });
    return filled;
  }, [activePrompt, activeVariables, mockValues]);

  if (prompts.length === 0) {
    return (
      <div className="surface-card text-center py-24 bg-[#1e293b]/25 rounded-3xl border border-dashed border-slate-800 text-slate-400 space-y-2">
        <p className="text-sm font-bold">Esta colección no tiene ningún prompt guardado o visible aún.</p>
        <button
          onClick={onClose}
          className="ui-button-secondary px-4 py-2 text-xs font-bold rounded-xl"
        >
          Volver a la Biblioteca
        </button>
      </div>
    );
  }

  const handleNext = () => {
    if (activeIndex < prompts.length - 1) {
      setActiveIndex(activeIndex + 1);
      setMockValues({});
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
      setMockValues({});
    }
  };

  const markStepCompleted = (index: number) => {
    const nextCompleted = new Set(completedSteps);
    nextCompleted.add(index);
    setCompletedSteps(nextCompleted);
  };

  const handleCopy = () => {
    if (!activePrompt) return;
    navigator.clipboard.writeText(filledPreview);
    handleCopyFilledPrompt(activePrompt);
    markStepCompleted(activeIndex);
  };

  const handleUse = () => {
    if (!activePrompt) return;
    handleUsePrompt(activePrompt, "playlist_player");
    markStepCompleted(activeIndex);
  };

  const progressPercent = Math.round((completedSteps.size / prompts.length) * 100);

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      
      {/* Playlist Top Header Bar */}
      <div className="bg-[#1e293b]/90 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-700/80 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-xs">
            PLAYLIST DE PROMPTS
          </span>
          <h2 className="text-2xl font-black text-white mt-1 leading-tight">{collectionName}</h2>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Creado por <strong className="text-pink-400">{authorName || "Miembro de la biblioteca"}</strong> • {prompts.length} pasos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={onCloneCollection}
              disabled={isCloning}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 disabled:opacity-55 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <FolderPlus size={14} />
              <span>{isCloning ? "Guardando..." : "Guardar en mi Biblioteca"}</span>
            </button>
          )}
          
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Volver general</span>
          </button>
        </div>
      </div>

      {/* Playlist Workspace Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        
        {/* Left Column: Sequential Steps List */}
        <div className="bg-[#1e293b]/60 rounded-2xl md:rounded-3xl border border-slate-700/70 p-4 space-y-4 h-fit">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-sans">
              <ListTodo size={14} /> Secuencia del Curso
            </h3>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pt-1">
              <span>PROGRESO</span>
              <span className="font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 no-scrollbar">
            {prompts.map((p, idx) => {
              const isActive = idx === activeIndex;
              const isDone = completedSteps.has(idx);
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveIndex(idx);
                    setMockValues({});
                  }}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 cursor-pointer select-none ${
                    isActive
                      ? "bg-indigo-600/15 border-indigo-550 text-white font-extrabold shadow-sm"
                      : "bg-slate-950/35 border-slate-850 hover:border-slate-750 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 font-extrabold ${
                    isActive ? "bg-indigo-600 text-white" :
                    isDone ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                    "bg-slate-800 text-slate-500"
                  }`}>
                    {isDone && !isActive ? <Check size={10} className="stroke-[3]" /> : idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate leading-snug">{p.title}</p>
                    <p className="text-[10px] text-slate-500 font-sans mt-0.5 line-clamp-1">{p.category}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Step Workspace */}
        {activePrompt && (
          <div className="bg-[#1e293b]/80 rounded-2xl md:rounded-3xl border border-slate-700/80 p-5 md:p-8 space-y-6 shadow-lg animate-in fade-in duration-200">
            
            {/* Step Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  PASO {activeIndex + 1}: {activePrompt.category}
                </span>
                <h3 className="text-xl font-extrabold text-white mt-2 leading-tight">{activePrompt.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl font-sans">{activePrompt.description}</p>
              </div>

              {/* Navigation arrows */}
              <div className="flex items-center gap-1.5 self-end md:self-auto">
                <button
                  onClick={handlePrev}
                  disabled={activeIndex === 0}
                  className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-350 hover:text-white rounded-xl border border-slate-750 transition-all cursor-pointer"
                  title="Paso Anterior"
                >
                  <ArrowLeft size={16} />
                </button>
                <span className="text-xs font-mono font-bold text-slate-500 px-1">
                  {activeIndex + 1} / {prompts.length}
                </span>
                <button
                  onClick={handleNext}
                  disabled={activeIndex === prompts.length - 1}
                  className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-350 hover:text-white rounded-xl border border-slate-750 transition-all cursor-pointer"
                  title="Siguiente Paso"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Split Screen Step Workspace */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Prompt Template and Mock Inputs */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} className="text-indigo-400" /> Rellenar Variables
                  </label>
                  
                  {activeVariables.length === 0 ? (
                    <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 text-center text-slate-400 font-sans text-xs">
                      <HelpCircle size={18} className="mx-auto text-slate-650 mb-1" />
                      Este prompt no requiere variables dinámicas. Puedes usarlo/copiarlo tal como está.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                      {activeVariables.map(v => (
                        <div key={v} className="flex flex-col gap-1 bg-slate-950/45 p-3 rounded-xl border border-slate-800/80">
                          <span className="font-mono font-bold text-[10px] text-indigo-400 w-fit bg-indigo-500/5 px-1.5 py-0.5 border border-indigo-500/10 rounded">
                            {v}
                          </span>
                          <input
                            type="text"
                            value={mockValues[v] || ""}
                            onChange={e => setMockValues({ ...mockValues, [v]: e.target.value })}
                            placeholder={`Escribe un valor de prueba para {{${v}}}...`}
                            className="w-full text-xs rounded-lg border border-slate-750 px-2.5 py-1.5 bg-slate-900 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/80 transition-all"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Filled Preview */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye size={12} className="text-indigo-400" /> Previsualización en Vivo del Prompt Relleno
                </label>
                <div className="bg-slate-950 rounded-2xl p-4 border border-slate-850 text-xs font-mono leading-relaxed text-slate-300 max-h-[320px] md:min-h-[250px] overflow-y-auto whitespace-pre-wrap select-text">
                  {filledPreview}
                </div>
              </div>

            </div>

            {/* Step Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-850 justify-between items-center">
              <span className="text-[11px] text-slate-400 font-sans italic">
                {completedSteps.has(activeIndex) ? "✅ ¡Ya has copiado/usado este paso!" : "💡 Completa este paso antes de pasar al siguiente."}
              </span>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopy}
                  className="flex-1 sm:flex-initial px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white border border-slate-705 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Copy size={13} />
                  <span>Copiar Relleno</span>
                </button>
                
                <button
                  onClick={handleUse}
                  className="flex-1 sm:flex-initial ui-button-primary px-6 py-3 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Play size={13} fill="currentColor" />
                  <span>Usar Prompt</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
      
    </div>
  );
}
