import React, { useState, useEffect } from "react";
import { X, Copy, Check, Info, FileText, ChevronRight } from "lucide-react";
import { Prompt, PromptVariable } from "../types";

interface PromptFillerModalProps {
  prompt: Prompt;
  onClose: () => void;
}

export default function PromptFillerModal({ prompt, onClose }: PromptFillerModalProps) {
  const [variables, setVariables] = useState<PromptVariable[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [finalPrompt, setFinalPrompt] = useState("");

  // 1. Detect variables on mount or prompt change
  useEffect(() => {
    let detectedVars: PromptVariable[] = prompt.suggestedVariables || [];

    // Parse prompt text dynamically
    const regex = /\{\{([a-zA-Z0-9_ñáéíóúÁÉÍÓÚ]+)\}\}/g;
    const matchesSet = new Set<string>();
    let match;
    while ((match = regex.exec(prompt.promptText)) !== null) {
      matchesSet.add(match[1]);
    }

    const parsedVars: PromptVariable[] = Array.from(matchesSet).map(name => {
      const existing = detectedVars.find(v => v.name === name);
      return existing || { name, description: `Valor para {{${name}}}`, defaultValue: "" };
    });

    const finalVars = parsedVars.length > 0 ? parsedVars : detectedVars;
    setVariables(finalVars);

    // Seed values with defaults
    const initialValues: Record<string, string> = {};
    finalVars.forEach(v => {
      initialValues[v.name] = v.defaultValue || "";
    });
    setValues(initialValues);
  }, [prompt]);

  // 2. Generate final filled-in prompt dynamically
  useEffect(() => {
    let output = prompt.promptText;
    Object.keys(values).forEach(key => {
      const val = values[key];
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g');
      output = output.replace(regex, val || `[Pendiente: ${key}]`);
    });
    setFinalPrompt(output);
  }, [values, prompt.promptText]);

  const handleInputChange = (name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="filler-modal-backdrop" className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-md flex items-start sm:items-center justify-center z-50 p-3 sm:p-4 transition-all duration-300">
      <div id="filler-modal" className="ui-modal-panel bg-[#1e293b] rounded-2xl sm:rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[90vh] overflow-hidden border border-slate-700/85 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="ui-modal-header flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-700/60 bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#4f46e5] to-[#ec4899] text-white flex items-center justify-center shadow-md">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-md leading-tight">{prompt.title}</h2>
              <p className="text-xs text-slate-400">Rellena las variables interactivamente antes de copiar</p>
            </div>
          </div>
          <button 
            id="close-filler-btn"
            onClick={onClose}
            className="ui-action-secondary p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Split: Left variables input, Right raw preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Panel: Inputs */}
          <div className="w-full md:w-1/2 p-4 sm:p-6 overflow-y-auto border-r border-[#334155]/60 bg-slate-900/10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-4 flex items-center gap-1">
              <ChevronRight size={14} className="text-indigo-400" /> Variables del Prompt
            </span>

            {variables.length === 0 ? (
              <div className="ui-muted-panel text-slate-400 bg-slate-950/40 p-6 rounded-2xl border border-dashed border-slate-800 text-center text-sm">
                No se detectaron variables dinámicas (del formato <code className="bg-indigo-500/10 text-indigo-400 px-1 py-0.5 rounded font-mono text-xs">{"{{variable}}"}</code>) en este prompt. Puedes copiar el texto directamente a la derecha.
              </div>
            ) : (
              <div className="space-y-5">
                {variables.map((variable) => (
                  <div key={variable.name} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span className="font-mono bg-pink-500/10 text-pink-400 border border-pink-500/20 px-1.5 py-0.5 rounded text-[11px] font-bold tracking-wide">
                        {variable.name}
                      </span>
                    </label>
                    
                    {variable.name.toLowerCase().includes("codigo") || variable.name.toLowerCase().includes("texto") || variable.name.toLowerCase().includes("fuente") ? (
                      <textarea
                        value={values[variable.name] || ""}
                        onChange={(e) => handleInputChange(variable.name, e.target.value)}
                        placeholder={`Introduce ${variable.name}...`}
                        rows={4}
                        className="w-full rounded-xl border border-slate-700 px-3.5 py-2.5 text-sm font-sans focus:outline-none focus:border-indigo-400 transition-all font-mono bg-slate-950/60 text-white placeholder-slate-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={values[variable.name] || ""}
                        onChange={(e) => handleInputChange(variable.name, e.target.value)}
                        placeholder={`Introduce ${variable.name}...`}
                        className="w-full rounded-xl border border-slate-700 px-3.5 py-2.5 text-sm font-sans focus:outline-none focus:border-indigo-400 transition-all bg-slate-950/60 text-white placeholder-slate-500"
                      />
                    )}
                    
                    {variable.description && (
                      <p className="text-[11px] text-slate-400 leading-relaxed flex items-center gap-1 mb-1.5">
                        <Info size={11} className="shrink-0 text-indigo-400" />
                        {variable.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel: Rendered Prompt Output */}
          <div className="ui-muted-panel w-full md:w-1/2 p-4 sm:p-6 overflow-hidden flex flex-col bg-[#0f172a] text-slate-100">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span> Vista Previa Resultante
              </span>
              
              <button
                id="btn-copy-filled"
                onClick={handleCopy}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10 ${
                  copied
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold"
                    : "bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-95 text-white"
                }`}
              >
                {copied ? (
                  <>
                    <Check size={14} />
                    <span>¡Copiado con Éxito!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copiar Prompt Listo</span>
                  </>
                )}
              </button>
            </div>

            {/* Rendered prompt box */}
            <div className="flex-1 bg-slate-950/50 rounded-2xl p-5 overflow-y-auto border border-slate-800/80 font-mono text-xs leading-relaxed select-all whitespace-pre-wrap select-text text-slate-350 scrollbar-thin">
              {finalPrompt}
            </div>
            
            <p className="text-[10px] text-slate-500 mt-2 font-sans flex items-center gap-1">
              <Info size={10} className="text-pink-500" />
              <span>El texto de arriba tiene las variables auto-sustituidas. Cópialo para ChatGPT o Gemini del canal de YouTube.</span>
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
