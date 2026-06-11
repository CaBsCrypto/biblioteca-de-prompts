import React, { useState, useEffect, useRef } from "react";
import { Search, X, Play, Edit2, Sparkles, Copy, Check, Hash, CornerDownLeft } from "lucide-react";
import { Prompt } from "../types";

interface QuickSwitcherModalProps {
  prompts: Prompt[];
  isOpen: boolean;
  onClose: () => void;
  onUse: (prompt: Prompt) => void;
  onCopyFilled: (prompt: Prompt) => void;
  onEdit: (prompt: Prompt) => void;
  onNotification?: (message: string, type: "success" | "info") => void;
}

export default function QuickSwitcherModal({
  prompts,
  isOpen,
  onClose,
  onUse,
  onCopyFilled,
  onEdit,
  onNotification
}: QuickSwitcherModalProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter prompts based on search query (fuzzy matching over title, description, prompt text, and tags)
  const filtered = prompts.filter(prompt => {
    const q = search.toLowerCase();
    const titleMatch = prompt.title.toLowerCase().includes(q);
    const descMatch = prompt.description.toLowerCase().includes(q);
    const textMatch = prompt.promptText.toLowerCase().includes(q);
    const tagMatch = prompt.tags?.some(tag => tag.toLowerCase().includes(q));
    const catMatch = prompt.category.toLowerCase().includes(q);
    return titleMatch || descMatch || textMatch || tagMatch || catMatch;
  });

  // Automatically focus the input ref when opened
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Reset selected index if search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Handle keyboard events (Navigation & Execute)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          // Default action is to open the interactive filler modal ("Usar")
          onUse(filtered[selectedIndex]);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, filtered, selectedIndex, onClose, onUse]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeElement = listRef.current.querySelector('[data-active="true"]');
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const handleCopyRaw = (e: React.MouseEvent, prompt: Prompt) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.promptText);
    setCopiedId(prompt.id);
    if (onNotification) {
      onNotification("¡Prompt crudo copiado al portapapeles!", "success");
    }
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div
      id="quick-switcher-backdrop"
      className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-md flex items-start justify-center z-50 p-4 pt-10 sm:pt-20 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="quick-switcher-dialog"
        className="bg-[#1e293b]/95 border border-slate-700/80 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Search Input bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/60 bg-slate-900/40 shrink-0">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Escribe para buscar prompts por título, contenido, categoría o #etiqueta..."
            className="w-full bg-transparent text-sm border-0 focus:outline-none focus:ring-0 text-white placeholder-slate-400 font-sans"
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-slate-700 bg-slate-800 px-1.5 font-mono text-[10px] font-bold text-slate-400 shrink-0">
            Esc
          </kbd>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* List of matched items */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto max-h-[380px] p-2 space-y-1 custom-scrollbar min-h-[120px]"
        >
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <p className="font-bold mb-1">No se encontró ningún prompt</p>
              <p className="text-slate-550">Intenta buscar otra palabra clave, etiqueta o categoría.</p>
            </div>
          ) : (
            filtered.map((prompt, idx) => {
              const isActive = idx === selectedIndex;
              return (
                <div
                  key={prompt.id}
                  data-active={isActive ? "true" : "false"}
                  onClick={() => {
                    onUse(prompt);
                    onClose();
                  }}
                  className={`group relative flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all ${
                    isActive
                      ? "bg-indigo-500/10 border border-indigo-500/35 shadow-inner"
                      : "border border-transparent hover:bg-slate-800/45"
                  }`}
                >
                  <div className="flex flex-col gap-1 min-w-0 pr-4 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-100 text-xs sm:text-[13px] leading-snug group-hover:text-indigo-300 transition-colors truncate">
                        {prompt.title}
                      </span>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-400 font-mono">
                        {prompt.category}
                      </span>
                    </div>

                    {prompt.description && (
                      <p className="text-slate-420 text-[11px] leading-relaxed truncate max-w-lg font-sans">
                        {prompt.description}
                      </p>
                    )}

                    {prompt.tags && prompt.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {prompt.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[9px] font-bold text-pink-400 bg-pink-500/5 px-1 py-0.2 rounded-md flex items-center font-mono"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar for the item */}
                  <div className="flex items-center gap-1 shrink-0 select-none">
                    {/* Raw Text Copy Button */}
                    <button
                      onClick={(e) => handleCopyRaw(e, prompt)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                      title="Copiar prompt sin rellenar"
                    >
                      {copiedId === prompt.id ? (
                        <Check size={13} className="text-emerald-400" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>

                    {/* Copy with filled variables */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyFilled(prompt);
                        onClose();
                      }}
                      className="p-1.5 text-indigo-400 hover:text-indigo-200 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                      title="Copiar con variables rellenadas"
                    >
                      <Sparkles size={13} />
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(prompt);
                        onClose();
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                      title="Editar prompt"
                    >
                      <Edit2 size={13} />
                    </button>

                    {/* Use / Play button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUse(prompt);
                        onClose();
                      }}
                      className="p-1.5 text-pink-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer flex items-center justify-center"
                      title="Usar e interactuar"
                    >
                      <Play size={12} fill="currentColor" />
                    </button>

                    {/* Active Keyboard Hint indicator */}
                    {isActive && (
                      <span className="hidden sm:inline-flex items-center gap-0.5 ml-2 text-[10px] font-bold text-slate-450 bg-slate-800/80 px-1 py-0.5 rounded font-mono">
                        <CornerDownLeft size={8} /> Enter
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper description bar */}
        <div className="px-5 py-3 border-t border-slate-700/40 bg-slate-950/25 flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-sans gap-2 select-none shrink-0">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="bg-slate-800/80 text-slate-400 px-1 py-0.2 rounded font-mono font-bold">↑↓</kbd> Navegar
            </span>
            <span>
              <kbd className="bg-slate-800/80 text-slate-400 px-1 py-0.2 rounded font-mono font-bold">Enter</kbd> Usar / Rellenar
            </span>
            <span>
              <kbd className="bg-slate-800/80 text-slate-400 px-1 py-0.2 rounded font-mono font-bold">Esc</kbd> Cerrar
            </span>
          </div>
          <div>
            <span>Combinación rápida: <kbd className="bg-gradient-to-r from-indigo-500/20 to-pink-500/20 text-indigo-300 font-mono font-bold px-1 py-0.5 rounded border border-indigo-500/15">Ctrl/Cmd + J</kbd></span>
          </div>
        </div>
      </div>
    </div>
  );
}
