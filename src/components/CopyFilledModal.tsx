import React, { useState, useEffect } from "react";
import { X, Copy, Check, Info, FileText, Sparkles } from "lucide-react";
import { Prompt, PromptVariable } from "../types";

interface CopyFilledModalProps {
  prompt: Prompt;
  onClose: () => void;
  onNotification?: (message: string, type: "success" | "info") => void;
}

export default function CopyFilledModal({
  prompt,
  onClose,
  onNotification
}: CopyFilledModalProps) {
  const [variables, setVariables] = useState<PromptVariable[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [finalPrompt, setFinalPrompt] = useState("");

  // Detect and extract variables in promptText
  useEffect(() => {
    let definedVars: PromptVariable[] = prompt.suggestedVariables || [];

    // Search for {{variableName}} patterns in the prompt text
    const regex = /\{\{([a-zA-Z0-9_ñáéíóúÁÉÍÓÚ]+)\}\}/g;
    const matchesSet = new Set<string>();
    let match;
    while ((match = regex.exec(prompt.promptText)) !== null) {
      matchesSet.add(match[1]);
    }

    const parsedVars: PromptVariable[] = Array.from(matchesSet).map(name => {
      const existing = definedVars.find(v => v.name === name);
      return existing || { name, description: `Valor para {{${name}}}`, defaultValue: "" };
    });

    const finalVars = parsedVars.length > 0 ? parsedVars : definedVars;
    setVariables(finalVars);

    // Populate initial inputs with default values
    const initialValues: Record<string, string> = {};
    finalVars.forEach(v => {
      initialValues[v.name] = v.defaultValue || "";
    });
    setValues(initialValues);
  }, [prompt]);

  // Combine into final formatted prompt output
  useEffect(() => {
    let output = prompt.promptText;
    Object.keys(values).forEach(key => {
      const val = values[key];
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g');
      output = output.replace(regex, val || `{{${key}}}`);
    });
    setFinalPrompt(output);
  }, [values, prompt.promptText]);

  const handleInputChange = (name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(finalPrompt);
    setCopied(true);
    if (onNotification) {
      onNotification("¡Prompt formateado con variables copiado al portapapeles!", "success");
    }
    setTimeout(() => {
      setCopied(false);
      onClose(); // Automatically close after a small delay to make it feel super-fast and productive!
    }, 1500);
  };

  return (
    <div id="copy-filled-backdrop" className="fixed inset-0 bg-[#0f172a]/85 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        id="copy-filled-dialog" 
        className="ui-modal-panel bg-[#1e293b] rounded-2xl sm:rounded-3xl w-full max-w-xl shadow-2xl border border-slate-700/80 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[96vh]"
      >
        {/* Header */}
        <div className="ui-modal-header flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-700/50 bg-slate-900/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/10 shrink-0">
              <Sparkles size={17} className="animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-[15px] leading-tight">Copiar con Variables Rellenas</h3>
              <p className="text-[11px] text-slate-400">Inserta valores ágilmente antes de copiar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ui-action-secondary p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
          <div className="ui-muted-panel text-xs bg-[#0f172a]/55 border border-[#334155]/30 rounded-xl p-3 text-slate-350 leading-relaxed font-sans">
            <span className="font-bold text-slate-200 block mb-1">Prompt base:</span>
            <span className="text-slate-400 line-clamp-1 italic">"{prompt.title}"</span>
          </div>

          {variables.length === 0 ? (
            <div className="ui-muted-panel text-slate-400 bg-slate-950/30 p-5 rounded-2xl border border-dashed border-slate-800 text-center text-xs">
              Este prompt no contiene variables con el formato <code className="bg-indigo-500/15 text-indigo-300 px-1 py-0.5 rounded font-mono">{"{{variable}}"}</code>. Se copiará en su estado original.
            </div>
          ) : (
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block border-b border-slate-850 pb-2">
                Rellenar valores interactivamente
              </span>
              <div className="space-y-3.5">
                {variables.map((variable) => (
                  <div key={variable.name} className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span className="font-mono text-pink-400 bg-pink-500/5 border border-pink-500/15 px-1.5 py-0.5 rounded">
                        {variable.name}
                      </span>
                    </label>

                    {variable.name.toLowerCase().includes("codigo") || variable.name.toLowerCase().includes("texto") || variable.name.toLowerCase().includes("fuente") ? (
                      <textarea
                        value={values[variable.name] || ""}
                        onChange={(e) => handleInputChange(variable.name, e.target.value)}
                        placeholder={`Introduce ${variable.name}...`}
                        rows={3}
                        className="w-full rounded-xl border border-slate-700/80 px-3.5 py-2 text-xs font-sans focus:outline-none focus:border-indigo-400 transition-all font-mono bg-slate-950/70 text-white placeholder-slate-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={values[variable.name] || ""}
                        onChange={(e) => handleInputChange(variable.name, e.target.value)}
                        placeholder={`Introduce ${variable.name}...`}
                        className="w-full rounded-xl border border-slate-700/80 px-3.5 py-2 text-xs font-sans focus:outline-none focus:border-indigo-400 transition-all bg-slate-950/70 text-white placeholder-slate-500"
                      />
                    )}

                    {variable.description && (
                      <p className="text-[10px] text-slate-450 leading-normal flex items-start gap-1">
                        <Info size={10} className="shrink-0 text-indigo-400 mt-0.5" />
                        <span>{variable.description}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="ui-modal-footer px-4 sm:px-6 py-4 border-t border-slate-700/40 bg-slate-900/20 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="ui-action-secondary px-4 py-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleCopyClipboard}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-600/10 ${
              copied
                ? "bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold shadow-emerald-500/10"
                : "bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-95 text-white font-bold"
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
                <span>Copiar Prompt Formateado</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
