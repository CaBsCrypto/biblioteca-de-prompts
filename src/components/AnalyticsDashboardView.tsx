import React, { useMemo } from "react";
import { BarChart3, Tag, Folder, Sparkles, Heart, Share2, FileText, CheckCircle } from "lucide-react";
import type { Prompt, Folder as FolderType } from "../types";

interface AnalyticsDashboardViewProps {
  prompts: Prompt[];
  folders: FolderType[];
}

export default function AnalyticsDashboardView({ prompts, folders }: AnalyticsDashboardViewProps) {
  // 1. Core counters
  const totalPrompts = prompts.length;
  const totalFolders = folders.length;
  const favoritePrompts = prompts.filter((p) => p.isFavorite).length;
  const sharedPrompts = prompts.filter((p) => p.isShared).length;

  // 2. Category distribution
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    prompts.forEach((p) => {
      const cat = p.category || "General";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [prompts]);

  // Max value for categories relative scale
  const maxCategoryValue = useMemo(() => {
    if (categoryData.length === 0) return 1;
    return Math.max(...categoryData.map((d) => d.value));
  }, [categoryData]);

  // 3. Top tags
  const tagData = useMemo(() => {
    const counts: Record<string, number> = {};
    prompts.forEach((p) => {
      if (p.tags) {
        p.tags.forEach((t) => {
          if (t.trim()) {
            counts[t.trim()] = (counts[t.trim() || ""] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [prompts]);

  const maxTagValue = useMemo(() => {
    if (tagData.length === 0) return 1;
    return Math.max(...tagData.map((d) => d.value));
  }, [tagData]);

  // 4. Folder distribution
  const folderData = useMemo(() => {
    const counts: Record<string, number> = {};
    prompts.forEach((p) => {
      if (p.folderId) {
        const folder = folders.find((f) => f.id === p.folderId);
        const folderName = folder ? folder.name : "Desconocida";
        counts[folderName] = (counts[folderName] || 0) + 1;
      } else {
        counts["Sin Carpeta"] = (counts["Sin Carpeta"] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [prompts, folders]);

  const maxFolderValue = useMemo(() => {
    if (folderData.length === 0) return 1;
    return Math.max(...folderData.map((d) => d.value));
  }, [folderData]);

  // 5. Avg prompt length
  const avgPromptLength = useMemo(() => {
    if (prompts.length === 0) return 0;
    const totalChars = prompts.reduce((sum, p) => sum + (p.promptText?.length || 0), 0);
    return Math.round(totalChars / prompts.length);
  }, [prompts]);

  return (
    <div className="space-y-6 text-slate-200 select-none animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/30 via-slate-900/20 to-pink-900/20 p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">Dashboard de Analíticas</h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">Estadísticas e insights de productividad sobre tu biblioteca personal de prompts.</p>
        </div>
        <div className="bg-[#1e293b] p-3 rounded-2xl border border-slate-850 flex items-center gap-3">
          <BarChart3 className="text-pink-400 stroke-[2.5]" size={24} />
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Calidad Promedio</span>
            <span className="text-base font-black text-emerald-450 font-mono">Premium</span>
          </div>
        </div>
      </div>

      {/* Stats grid Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1e293b]/50 p-4.5 rounded-2xl border border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/15 text-indigo-400">
            <FileText size={18} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Prompts</span>
            <span className="text-lg font-black text-white font-mono">{totalPrompts}</span>
          </div>
        </div>

        <div className="bg-[#1e293b]/50 p-4.5 rounded-2xl border border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 bg-pink-500/10 rounded-xl border border-pink-500/15 text-pink-400">
            <Folder size={18} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Carpetas</span>
            <span className="text-lg font-black text-white font-mono">{totalFolders}</span>
          </div>
        </div>

        <div className="bg-[#1e293b]/50 p-4.5 rounded-2xl border border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/15 text-red-400">
            <Heart size={18} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Favoritos</span>
            <span className="text-lg font-black text-white font-mono">{favoritePrompts}</span>
          </div>
        </div>

        <div className="bg-[#1e293b]/50 p-4.5 rounded-2xl border border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/15 text-emerald-400">
            <Share2 size={18} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Compartidos</span>
            <span className="text-lg font-black text-white font-mono">{sharedPrompts}</span>
          </div>
        </div>
      </div>

      {/* Charts Panels layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories breakdown Bar Chart */}
        <div className="bg-[#1e293b]/60 rounded-3xl border border-slate-800 p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400" />
            Distribución por Categorías
          </h3>
          {categoryData.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-12">No hay suficientes datos para generar estadísticas.</p>
          ) : (
            <div className="space-y-3 pt-2">
              {categoryData.map((d) => {
                const percent = Math.round((d.value / maxCategoryValue) * 100);
                return (
                  <div key={d.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">{d.name}</span>
                      <span className="font-bold text-slate-400 font-mono">{d.value} {d.value === 1 ? "prompt" : "prompts"}</span>
                    </div>
                    <div className="w-full bg-slate-950/60 h-2.5 rounded-full overflow-hidden border border-slate-850">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Folders usage distribution Chart */}
        <div className="bg-[#1e293b]/60 rounded-3xl border border-slate-800 p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Folder size={16} className="text-pink-400" />
            Organización en Carpetas
          </h3>
          {folderData.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-12">No hay suficientes datos para generar estadísticas.</p>
          ) : (
            <div className="space-y-3 pt-2">
              {folderData.map((d) => {
                const percent = Math.round((d.value / maxFolderValue) * 100);
                return (
                  <div key={d.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">{d.name}</span>
                      <span className="font-bold text-slate-400 font-mono">{d.value} {d.value === 1 ? "prompt" : "prompts"}</span>
                    </div>
                    <div className="w-full bg-slate-950/60 h-2.5 rounded-full overflow-hidden border border-slate-850">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pink-500 to-pink-600 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Tags Bar List */}
        <div className="lg:col-span-2 bg-[#1e293b]/60 rounded-3xl border border-slate-800 p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Tag size={16} className="text-emerald-400" />
            Top 5 Etiquetas (Tags) más utilizadas
          </h3>
          {tagData.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-12">No hay suficientes etiquetas añadidas.</p>
          ) : (
            <div className="space-y-3 pt-2">
              {tagData.map((d) => {
                const percent = Math.round((d.value / maxTagValue) * 100);
                return (
                  <div key={d.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-emerald-400 font-bold">#{d.name}</span>
                      <span className="font-bold text-slate-400 font-mono">{d.value} {d.value === 1 ? "uso" : "usos"}</span>
                    </div>
                    <div className="w-full bg-slate-950/60 h-2 rounded-full overflow-hidden border border-slate-850">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Productivity card highlights */}
        <div className="bg-[#1e293b]/60 rounded-3xl border border-slate-800 p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <CheckCircle size={16} className="text-amber-400" />
              Insights Rápidos
            </h3>
            
            <div className="space-y-3">
              <div className="bg-slate-950/35 p-3 rounded-xl border border-slate-850/60">
                <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Tamaño Promedio de Prompt</span>
                <span className="text-base font-extrabold text-white font-mono">{avgPromptLength} caracteres</span>
              </div>

              <div className="bg-slate-950/35 p-3 rounded-xl border border-slate-850/60">
                <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Porcentaje Organizado</span>
                <span className="text-base font-extrabold text-white font-mono">
                  {totalPrompts === 0 ? "0%" : `${Math.round((prompts.filter(p => p.folderId).length / totalPrompts) * 100)}%`}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-sans italic border-t border-slate-800/80 pt-3 mt-4">
            Consejo: Rellenar la descripción y tags de tus prompts incrementa en un 40% el puntaje de búsqueda en tu switcher rápido.
          </div>
        </div>
      </div>
    </div>
  );
}
