/**
 * AIModelSelector
 * ---------------
 * Dropdown para seleccionar el modelo de IA cuando OpenRouter está disponible.
 * Si OpenRouter no está configurado, muestra solo "Gemini (default)" sin opciones.
 *
 * Uso:
 *   <AIModelSelector selectedModel={model} onSelect={setModel} />
 */

import React, { useEffect, useState } from "react";
import { Cpu, ChevronDown, Zap } from "lucide-react";

interface AIModel {
  id: string;
  name: string;
  provider: string;
  context: number;
}

interface AIModelsResponse {
  openrouterAvailable: boolean;
  geminiModel: string;
  models: AIModel[];
  defaultModel: string;
}

interface AIModelSelectorProps {
  selectedModel: string | null;
  onSelect: (modelId: string | null) => void;
  compact?: boolean;
}

const PROVIDER_COLORS: Record<string, string> = {
  Anthropic: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  OpenAI:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Google:    "text-blue-400 bg-blue-500/10 border-blue-500/20",
  Meta:      "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  Mistral:   "text-orange-400 bg-orange-500/10 border-orange-500/20",
  DeepSeek:  "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
};

function formatContext(ctx: number): string {
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(1)}M ctx`;
  if (ctx >= 1000) return `${Math.round(ctx / 1000)}K ctx`;
  return `${ctx} ctx`;
}

export default function AIModelSelector({ selectedModel, onSelect, compact = false }: AIModelSelectorProps) {
  const [data, setData] = useState<AIModelsResponse | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/ai/models")
      .then((r) => r.json())
      .then((d: AIModelsResponse) => setData(d))
      .catch(() => {});
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const el = document.getElementById("ai-model-selector-dropdown");
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!data) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 animate-pulse">
        <Cpu size={11} />
        <span>Cargando modelos...</span>
      </div>
    );
  }

  // If no OpenRouter, show static badge
  if (!data.openrouterAvailable) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300 font-semibold">
        <Zap size={10} className="text-blue-400" />
        <span>Gemini 2.5 Flash</span>
      </div>
    );
  }

  const selected = data.models.find((m) => m.id === selectedModel) ?? data.models[0];
  const providerColor = PROVIDER_COLORS[selected.provider] || "text-slate-400 bg-slate-800 border-slate-700";

  return (
    <div id="ai-model-selector-dropdown" className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${providerColor}`}
        title="Cambiar modelo de IA"
      >
        <Cpu size={10} />
        <span className={compact ? "hidden sm:inline" : ""}>{selected.name}</span>
        <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-64 bg-[#1e293b] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 pt-3 pb-1.5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Modelo de IA</p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {data.models.map((model) => {
              const color = PROVIDER_COLORS[model.provider] || "text-slate-400 bg-slate-800 border-slate-700";
              const isActive = model.id === selected.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onSelect(model.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors hover:bg-slate-800/60 cursor-pointer ${isActive ? "bg-slate-800/80" : ""}`}
                >
                  <div className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black border ${color}`}>
                    {model.provider.slice(0, 3).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold truncate ${isActive ? "text-white" : "text-slate-200"}`}>
                      {model.name}
                      {isActive && <span className="ml-1.5 text-[9px] text-indigo-400">✓ Activo</span>}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-0.5">{formatContext(model.context)}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-3 py-2.5 border-t border-slate-700/50">
            <p className="text-[9px] text-slate-500 leading-relaxed">
              Modelos via <span className="text-indigo-400 font-bold">OpenRouter</span>. El uso puede generar costos según tu plan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
