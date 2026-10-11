import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Copy, Check, Info, FileText, GitFork } from "lucide-react";
import type { Prompt } from "../types";
import { copyText, selectCopyText } from "../utils/clipboard";
import { extractPromptVariables, fillPromptVariables } from "../utils/promptPreparation";
import "../catalog.css";

interface PromptFillerModalProps {
  prompt: Prompt;
  onClose: () => void;
}

export default function PromptFillerModal({ prompt, onClose }: PromptFillerModalProps) {
  const variables = useMemo(() => extractPromptVariables(prompt.promptText).map(name => {
    const suggestion = prompt.suggestedVariables?.find(variable => variable.name === name);
    return { name, description: suggestion?.description || "", defaultValue: suggestion?.defaultValue || "" };
  }), [prompt.promptText, prompt.suggestedVariables]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<"original" | "prepared" | null>(null);
  const [copying, setCopying] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [manualText, setManualText] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const manualRef = useRef<HTMLTextAreaElement>(null);
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>(Object.create(null));
  const busyRef = useRef(false);
  const operationRef = useRef(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalPrompt = fillPromptVariables(prompt.promptText, values);
  const forkSource = prompt.forkedFromTitle || prompt.forkedFrom;
  const actionClass = "ui-action-secondary min-h-11 px-3 rounded-lg border border-slate-700 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:opacity-50 disabled:cursor-wait";

  useEffect(() => {
    operationRef.current += 1;
    busyRef.current = false;
    setCopying(false);
    setValues(Object.fromEntries(variables.map(variable => [variable.name, variable.defaultValue])));
    setCopied(null);
    setMissing([]);
    setManualText(null);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    return () => {
      operationRef.current += 1;
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [prompt.id, variables]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const modal = dialogRef.current;
    (modal?.querySelector<HTMLElement>("input, textarea") || modal?.querySelector<HTMLElement>("button"))?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab" || !modal) return;
      const controls = Array.from(modal.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href], [tabindex='0']"));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  useEffect(() => {
    if (manualText !== null) {
      selectCopyText(manualRef.current);
      manualRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [manualText]);

  const handleInputChange = (name: string, value: string) => {
    if (busyRef.current) return;
    setValues(previous => ({ ...previous, [name]: value }));
    setMissing(previous => previous.filter(key => key !== name));
    setCopied(null);
    setManualText(null);
  };

  const handleCopy = async (variant: "original" | "prepared") => {
    if (busyRef.current) return;
    const snapshot = { ...values };
    if (variant === "prepared") {
      const pending = variables.map(variable => variable.name).filter(name => !snapshot[name]?.trim());
      setMissing(pending);
      if (pending.length) {
        fieldRefs.current[pending[0]]?.focus();
        return;
      }
    }
    const text = variant === "original" ? prompt.promptText : fillPromptVariables(prompt.promptText, snapshot);
    const operation = ++operationRef.current;
    busyRef.current = true;
    setCopying(true);
    setCopied(null);
    setManualText(null);
    try {
      const confirmed = await copyText(text);
      if (operation !== operationRef.current) return;
      if (confirmed) {
        setCopied(variant);
        resetTimerRef.current = setTimeout(() => setCopied(null), 2000);
      } else {
        setManualText(text);
      }
    } finally {
      if (operation === operationRef.current) {
        busyRef.current = false;
        setCopying(false);
      }
    }
  };

  return (
    <div id="filler-modal-backdrop" className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-3 sm:p-4">
      <div id="filler-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="filler-title" className="ui-modal-panel bg-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90dvh] overflow-hidden border border-slate-700">
        <div className="ui-modal-header flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
          <div className="flex items-start gap-2 min-w-0">
            <FileText size={18} className="mt-1 text-indigo-300 shrink-0" />
            <div className="min-w-0">
              <h2 id="filler-title" className="font-semibold text-white text-base break-words">{prompt.title}</h2>
              <p className="text-xs text-slate-400 mt-1">Prepara tus variables y copia el resultado.</p>
            </div>
          </div>
          <button id="close-filler-btn" onClick={onClose} aria-label="Cerrar preparación" className={`${actionClass} min-w-11 shrink-0`}><X size={18} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
          {prompt.description && <p className="text-sm text-slate-300 mb-3">{prompt.description}</p>}
          {forkSource && <p className="flex gap-1.5 items-start text-xs text-slate-400 mb-3"><GitFork size={14} className="shrink-0" />Remix de {forkSource}{prompt.forkedFromAuthorName ? ` por ${prompt.forkedFromAuthorName}` : ""}</p>}
          {prompt.notas && <p className="ui-muted-panel rounded-lg border border-slate-700 p-3 text-xs text-slate-400 whitespace-pre-wrap mb-4">{prompt.notas}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <section aria-labelledby="filler-variables-title">
              <h3 id="filler-variables-title" className="text-sm font-semibold text-slate-200 mb-3">Variables</h3>
              {!variables.length ? <p className="text-sm text-slate-400">Este prompt está listo para copiar, sin variables pendientes.</p> : <div className="space-y-3">
                {variables.map(variable => {
                  const fieldId = `filler-variable-${variable.name}`;
                  const needsValue = missing.includes(variable.name);
                  const inputClass = `ui-input w-full min-h-11 rounded-lg border px-3 py-2.5 text-sm bg-slate-950 text-white placeholder-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:opacity-60 ${needsValue ? "border-rose-400" : "border-slate-700"}`;
                  const multiline = /codigo|código|texto|fuente|entrada|datos/i.test(variable.name);
                  return <div key={variable.name} className="space-y-1.5">
                    <label htmlFor={fieldId} className="text-sm font-medium text-slate-300 block">{variable.name}</label>
                    {multiline ? <textarea id={fieldId} ref={element => { fieldRefs.current[variable.name] = element; }} value={values[variable.name] || ""} disabled={copying} onChange={event => handleInputChange(variable.name, event.target.value)} rows={4} aria-invalid={needsValue} aria-describedby={variable.description || needsValue ? `${fieldId}-hint` : undefined} className={inputClass} /> : <input id={fieldId} ref={element => { fieldRefs.current[variable.name] = element; }} type="text" value={values[variable.name] || ""} disabled={copying} onChange={event => handleInputChange(variable.name, event.target.value)} aria-invalid={needsValue} aria-describedby={variable.description || needsValue ? `${fieldId}-hint` : undefined} className={inputClass} />}
                    {(needsValue || variable.description) && <p id={`${fieldId}-hint`} className={`text-xs ${needsValue ? "text-rose-300" : "text-slate-400"}`}>{needsValue ? "Completa este campo antes de copiar el preparado." : variable.description}</p>}
                  </div>;
                })}
              </div>}
            </section>
            <section aria-labelledby="filler-preview-title" className="min-w-0">
              <h3 id="filler-preview-title" className="text-sm font-semibold text-slate-200 mb-3">Vista previa</h3>
              <pre className="ui-muted-panel bg-slate-950 border border-slate-700 rounded-lg p-3 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words select-text">{finalPrompt}</pre>
              <p className="flex items-start gap-1.5 text-xs text-slate-400 mt-2"><Info size={13} className="shrink-0 mt-0.5" />Tus valores se mantienen como texto. Pega el preparado en la herramienta que prefieras.</p>
            </section>
          </div>
          {manualText !== null && <div className="mt-4 space-y-2" role="status">
            <p className="text-sm text-slate-300">El navegador bloqueó la copia automática. El texto está seleccionado: pulsa Ctrl+C o ⌘C para copiarlo.</p>
            <textarea ref={manualRef} readOnly value={manualText} aria-label="Texto para copiar manualmente" rows={6} className="ui-input bg-slate-950 text-slate-200 w-full rounded-lg border border-slate-700 p-3 font-mono text-xs focus-visible:outline-2 focus-visible:outline-indigo-400" onFocus={event => event.currentTarget.select()} />
          </div>}
        </div>

        <div className="ui-modal-footer shrink-0 border-t border-slate-700 px-4 py-3 flex flex-wrap items-center justify-end gap-2">
          <span role="status" aria-live="polite" className="text-xs text-slate-400 mr-auto">{copying ? "Copiando…" : copied ? "Copiado" : manualText !== null ? "Copia el texto seleccionado con Ctrl+C o ⌘C." : missing.length ? `${missing.length} campo${missing.length === 1 ? " pendiente" : "s pendientes"}` : ""}</span>
          <button id="btn-copy-original" disabled={copying} onClick={() => void handleCopy("original")} className={actionClass}>{copied === "original" ? <Check size={15} /> : <Copy size={15} />}Copiar original</button>
          <button id="btn-copy-filled" disabled={copying} onClick={() => void handleCopy("prepared")} className={`${actionClass} ui-button-primary bg-indigo-600 border-indigo-500 text-white`}>{copied === "prepared" ? <Check size={15} /> : <Copy size={15} />}Copiar preparado</button>
        </div>
      </div>
    </div>
  );
}
