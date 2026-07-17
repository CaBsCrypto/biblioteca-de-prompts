import React, { useState, useEffect } from "react";
import { X, Save, Plus, Trash2, Tag, HelpCircle, Sparkles, StickyNote, Globe, History, RotateCcw, Mic, MicOff, GitFork } from "lucide-react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Prompt, PromptVariable, Folder } from "../types";
import AIModelSelector from "./AIModelSelector";


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

function diffWords(oldStr: string, newStr: string) {
  const oldWords = oldStr.split(/(\s+)/);
  const newWords = newStr.split(/(\s+)/);
  const diff: { type: "added" | "removed" | "normal"; value: string }[] = [];
  
  let o = 0;
  let n = 0;
  while (o < oldWords.length || n < newWords.length) {
    if (o < oldWords.length && n < newWords.length && oldWords[o] === newWords[n]) {
      diff.push({ type: "normal", value: oldWords[o] });
      o++;
      n++;
    } else if (n < newWords.length && !oldWords.slice(o).includes(newWords[n])) {
      diff.push({ type: "added", value: newWords[n] });
      n++;
    } else if (o < oldWords.length) {
      diff.push({ type: "removed", value: oldWords[o] });
      o++;
    } else {
      break;
    }
  }
  return diff;
}

interface VoiceDictationButtonProps {
  onTranscript: (text: string) => void;
  onNotification?: (message: string, type: "success" | "info") => void;
  tooltipText?: string;
}

function VoiceDictationButton({ onTranscript, onNotification, tooltipText = "Dictar con voz" }: VoiceDictationButtonProps) {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "es-ES";

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (onNotification) {
          if (event.error === "not-allowed") {
            onNotification("Permiso de micrófono denegado. Permite el acceso en la barra del navegador.", "info");
          } else if (event.error === "no-speech") {
            // User did not say anything, handle silently
          } else {
            onNotification(`No se pudo procesar tu voz: ${event.error}`, "info");
          }
        }
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim()) {
          onTranscript(transcript.trim());
          if (onNotification) {
            onNotification("Texto dictado añadido con éxito.", "success");
          }
        }
      };

      setRecognition(rec);
    }

    return () => {
      if (recognition) {
        recognition.abort();
      }
    };
  }, []);

  if (!SpeechRecognition) {
    return (
      <button
        type="button"
        disabled
        className="p-1 px-2 rounded-lg bg-slate-800/40 text-slate-500 border border-slate-700/30 cursor-not-allowed flex items-center gap-1 text-[10px]"
        title="Dictado por voz no disponible en este navegador"
      >
        <MicOff size={10} />
        <span className="hidden sm:inline">No disponible</span>
      </button>
    );
  }

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition", err);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer relative shadow-xs ${
        isListening
          ? "bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse ring-2 ring-rose-500/20"
          : "bg-slate-800 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-705"
      }`}
      title={isListening ? "Escuchando... Haz clic para detener" : tooltipText}
    >
      {isListening ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
          <Mic size={11} className="text-rose-400 animate-pulse" />
          <span className="text-[10px] uppercase tracking-wide font-extrabold animate-pulse">Grabando...</span>
        </>
      ) : (
        <>
          <Mic size={11} className="text-[#38bdf8]" />
          <span className="text-[10px] font-bold">Dictar</span>
        </>
      )}
    </button>
  );
}

interface PromptFormModalProps {
  prompt?: Prompt | null; // If editing
  folders: Folder[];
  onSave: (data: Omit<Prompt, "id" | "userId" | "createdAt" | "updatedAt">) => void;
  onClose: () => void;
  onOptimizeWithAI?: (text: string) => void; // Link to AI helper directly!
  onNotification?: (message: string, type: "success" | "info") => void;
}

export default function PromptFormModal({
  prompt,
  folders,
  onSave,
  onClose,
  onOptimizeWithAI,
  onNotification
}: PromptFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [promptText, setPromptText] = useState("");
  const [category, setCategory] = useState<Prompt["category"]>("General");
  const [tagsInput, setTagsInput] = useState("");
  const [variables, setVariables] = useState<PromptVariable[]>([]);
  const [notas, setNotas] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [folderId, setFolderId] = useState<string>("");

  const [showAIOptimizer, setShowAIOptimizer] = useState(false);
  const [aiInstructions, setAiInstructions] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [mockValues, setMockValues] = useState<Record<string, string>>({});
  const [selectedAIModel, setSelectedAIModel] = useState<string | null>(null);


  const activeVariables = React.useMemo(() => {
    return extractVariables(promptText);
  }, [promptText]);

  const filledPreview = React.useMemo(() => {
    let filled = promptText;
    activeVariables.forEach(v => {
      const val = mockValues[v] || `[${v}]`;
      const regex = new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`, "g");
      filled = filled.replace(regex, val);
    });
    return filled;
  }, [promptText, activeVariables, mockValues]);

  const handleAIOptimize = async () => {
    if (!promptText.trim()) return;
    setLoadingAI(true);
    setAiError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Inicia sesión para usar el asistente de IA.");

      const response = await fetch("/api/ai/optimizar", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          promptText: promptText.trim(),
          instructions: aiInstructions.trim() || undefined,
          ...(selectedAIModel ? { modelId: selectedAIModel } : {})
        })
      });


      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al optimizar.");

      if (data.promptText) {
        setPromptText(data.promptText);
        if (data.title && !title.trim()) setTitle(data.title);
        if (data.description && !description.trim()) setDescription(data.description);
        if (onNotification) onNotification("Prompt optimizado con éxito usando Gemini.", "success");
      }
    } catch (err: any) {
      setAiError(err.message || "Ocurrió un error.");
    } finally {
      setLoadingAI(false);
    }
  };

  // Voice dictation state-update helpers
  const handleDictateTitle = (transcript: string) => {
    setTitle(prev => prev ? prev.trim() + " " + transcript : transcript);
  };

  const handleDictateDescription = (transcript: string) => {
    setDescription(prev => prev ? prev.trim() + " " + transcript : transcript);
  };

  const handleDictatePromptText = (transcript: string) => {
    setPromptText(prev => prev ? prev.trim() + " " + transcript : transcript);
  };

  const handleDictateNotas = (transcript: string) => {
    setNotas(prev => prev ? prev.trim() + " " + transcript : transcript);
  };

  const [versions, setVersions] = useState<{ id: string; promptText: string; createdAt: any }[]>([]);
  const [selectedVersionForDiff, setSelectedVersionForDiff] = useState<any | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const forkSourceTitle = prompt?.forkedFromTitle || prompt?.forkedFrom;
  const forkSourceAuthor = prompt?.forkedFromAuthorName || "";

  // Fetch older versions of promptText
  useEffect(() => {
    if (prompt && prompt.id) {
      const fetchVersions = async () => {
        setLoadingVersions(true);
        try {
          const versionsColRef = collection(db, "prompts", prompt.id, "versions");
          const q = query(versionsColRef, orderBy("createdAt", "desc"));
          const snapshot = await getDocs(q);
          const list = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          })) as { id: string; promptText: string; createdAt: any }[];
          setVersions(list);
        } catch (error) {
          console.error("Error fetching versions:", error);
        } finally {
          setLoadingVersions(false);
        }
      };
      fetchVersions();
    } else {
      setVersions([]);
    }
  }, [prompt]);

  // Seed form if editing
  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title || "");
      setDescription(prompt.description || "");
      setPromptText(prompt.promptText || "");
      setCategory(prompt.category || "General");
      setTagsInput(prompt.tags?.join(", ") || "");
      setVariables(prompt.suggestedVariables || []);
      setNotas(prompt.notas || "");
      setIsShared(prompt.isShared || false);
      setFolderId(prompt.folderId || "");
    } else {
      setTitle("");
      setDescription("");
      setPromptText("");
      setCategory("General");
      setTagsInput("");
      setVariables([]);
      setNotas("");
      setIsShared(false);
      setFolderId("");
    }
  }, [prompt]);

  // Load draft on mount (only for new prompts to prevent overwriting existing prompt edits)
  useEffect(() => {
    if (!prompt) {
      const saved = localStorage.getItem("prompts_editor_draft");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.promptText && window.confirm("¿Deseas restaurar tu borrador anterior sin guardar?")) {
            if (parsed.title) setTitle(parsed.title);
            if (parsed.description) setDescription(parsed.description);
            if (parsed.promptText) setPromptText(parsed.promptText);
            if (parsed.category) setCategory(parsed.category);
            if (parsed.tagsInput) setTagsInput(parsed.tagsInput);
          }
        } catch (e) {
          console.error("Error parsing saved draft", e);
        }
      }
    }
  }, [prompt]);

  // Autosave draft on change
  useEffect(() => {
    if (!prompt && (title.trim() || description.trim() || promptText.trim())) {
      localStorage.setItem("prompts_editor_draft", JSON.stringify({
        title,
        description,
        promptText,
        category,
        tagsInput
      }));
    }
  }, [title, description, promptText, category, tagsInput, prompt]);

  // Parse variables dynamically from text if we see double braces
  const handleExtractVariables = () => {
    const regex = /\{\{([a-zA-Z0-9_ñáéíóúÁÉÍÓÚ]+)\}\}/g;
    const matchesSet = new Set<string>();
    let match;
    while ((match = regex.exec(promptText)) !== null) {
      matchesSet.add(match[1]);
    }

    const currentNames = variables.map(v => v.name);
    const newVars: PromptVariable[] = Array.from(matchesSet).map(name => {
      const idx = currentNames.indexOf(name);
      if (idx !== -1) {
        return variables[idx]; // Keep existing description if exists
      }
      return {
        name,
        description: `Explicación para {{${name}}}`,
        defaultValue: ""
      };
    });

    setVariables(newVars);
  };

  const handleAddVariableRow = () => {
    setVariables(prev => [...prev, { name: "nueva_variable", description: "Descripción", defaultValue: "" }]);
  };

  const handleRemoveVariableRow = (idx: number) => {
    setVariables(prev => prev.filter((_, i) => i !== idx));
  };

  const handleVariableChange = (idx: number, field: keyof PromptVariable, value: string) => {
    setVariables(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !promptText.trim()) return;

    localStorage.removeItem("prompts_editor_draft");

    const parsedTags = tagsInput
      .split(",")
      .map(t => t.trim())
      .filter(t => t !== "" && t.length <= 30);

    onSave({
      title: title.trim(),
      description: description.trim(),
      promptText: promptText.trim(),
      category,
      tags: parsedTags,
      isFavorite: prompt?.isFavorite || false,
      isShared,
      notas: notas.trim(),
      suggestedVariables: variables.filter(v => v.name.trim() !== ""),
      forkedFrom: prompt?.forkedFrom,
      forkedFromPromptId: prompt?.forkedFromPromptId,
      forkedFromUserId: prompt?.forkedFromUserId,
      forkedFromAuthorName: prompt?.forkedFromAuthorName,
      forkedFromAuthorHandle: prompt?.forkedFromAuthorHandle,
      forkedFromTitle: prompt?.forkedFromTitle,
      sourceClassId: prompt?.sourceClassId,
      sourceClassTitle: prompt?.sourceClassTitle,
      folderId: folderId || null
    });
  };

  return (
    <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-md flex items-start sm:items-center justify-center z-50 p-3 sm:p-4">
      <div className={`ui-modal-panel bg-[#1e293b] rounded-2xl sm:rounded-3xl w-full shadow-2xl overflow-hidden border border-slate-700/80 flex flex-col my-2 sm:my-8 max-h-[96vh] sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 transition-all ${showAIOptimizer ? "max-w-6xl" : "max-w-3xl"}`}>

        
        {/* Header */}
        <div className="ui-modal-header flex items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-700/60 bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight">
              {prompt ? "Editar Prompt en la Biblioteca" : "Crear Nuevo Prompt"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ui-action-secondary p-1 px-2.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white font-bold transition-all cursor-pointer"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 text-slate-200">
          <div className={`grid grid-cols-1 ${showAIOptimizer ? "lg:grid-cols-2 gap-6" : "space-y-5"}`}>
            <div className="space-y-5">

          {forkSourceTitle && (
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 text-xs text-indigo-200 flex items-start gap-2.5">
              <GitFork size={14} className="mt-0.5 text-indigo-300 shrink-0" />
              <div className="leading-relaxed">
                <span className="font-extrabold">Remix privado.</span>{" "}
                <span className="text-slate-300">
                  Basado en <span className="font-bold text-indigo-200">{forkSourceTitle}</span>
                  {forkSourceAuthor ? <> por <span className="font-bold text-indigo-200">{forkSourceAuthor}</span></> : ""}.
                  Puedes editarlo libremente; solo se publica si activas compartir publicamente.
                </span>
              </div>
            </div>
          )}
          
          {/* Row 1: Title */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Título del Prompt *</label>
              <VoiceDictationButton onTranscript={handleDictateTitle} onNotification={onNotification} tooltipText="Dictar título con voz" />
            </div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Escribe un título descriptivo..."
              required
              maxLength={120}
              className="w-full rounded-xl border border-slate-705 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 transition-all bg-[#0f172a]/40 text-white font-sans placeholder-slate-500"
            />
          </div>

          {/* Row 1.5: Category & Personal Folder */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoría *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as Prompt["category"])}
                className="w-full rounded-xl border border-slate-705 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 transition-all bg-[#0f172a]/40 text-slate-200 font-sans cursor-pointer"
              >
                <option value="YouTube" className="bg-[#1e293b]">YouTube</option>
                <option value="Marketing" className="bg-[#1e293b]">Marketing</option>
                <option value="Programación" className="bg-[#1e293b]">Programación</option>
                <option value="Refactorización" className="bg-[#1e293b]">Refactorización</option>
                <option value="Seguridad" className="bg-[#1e293b]">Seguridad</option>
                <option value="Buenas Prácticas" className="bg-[#1e293b]">Buenas Prácticas</option>
                <option value="Redacción" className="bg-[#1e293b]">Redacción</option>
                <option value="IA Agentes" className="bg-[#1e293b]">IA Agentes</option>
                <option value="IA Imágenes" className="bg-[#1e293b]">IA Imágenes</option>
                <option value="IA Videos" className="bg-[#1e293b]">IA Videos</option>
                <option value="Acompañante Personal" className="bg-[#1e293b]">Acompañante Personal</option>
                <option value="Asistente de Prompts" className="bg-[#1e293b]">Asistente de Prompts</option>
                <option value="General" className="bg-[#1e293b]">General</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carpeta o Colección Personalizada</label>
              <select
                value={folderId}
                onChange={e => setFolderId(e.target.value)}
                className="w-full rounded-xl border border-slate-705 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 transition-all bg-[#0f172a]/40 text-slate-200 font-sans cursor-pointer"
              >
                <option value="" className="bg-[#1e293b]">Ninguna (Sin carpeta)</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id} className="bg-[#1e293b]">{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Description */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción Breve</label>
              <VoiceDictationButton onTranscript={handleDictateDescription} onNotification={onNotification} tooltipText="Dictar descripción con voz" />
            </div>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="¿Qué objetivo cumple este prompt o cómo ayuda?"
              maxLength={200}
              className="w-full rounded-xl border border-slate-705 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 transition-all bg-[#0f172a]/40 text-white font-sans placeholder-slate-500"
            />
          </div>

          {/* Row 3: Prompt Text */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Instrucción / Prompt *</label>
              <div className="flex flex-wrap justify-end items-center gap-1.5">
                <VoiceDictationButton onTranscript={handleDictatePromptText} onNotification={onNotification} tooltipText="Dictar instrucción con voz" />
                {promptText.trim().length > 10 && (
                  <button
                    type="button"
                    onClick={() => setShowAIOptimizer(!showAIOptimizer)}
                    className={`text-[10px] font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all shadow-sm cursor-pointer ${
                      showAIOptimizer
                        ? "bg-pink-550 text-pink-200 border-pink-500/40"
                        : "text-pink-400 hover:text-pink-350 bg-pink-500/10 border-pink-500/20"
                    }`}
                    title="Toggle evaluador y optimizador de IA"
                  >
                    <Sparkles size={11} className={showAIOptimizer ? "" : "animate-pulse"} />
                    <span>{showAIOptimizer ? "Ocultar Asistente" : "Analizar con IA / Evaluar"}</span>
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={promptText}
              onChange={e => setPromptText(e.target.value)}
              placeholder="Escribe el prompt aquí. Puedes usar variables rodeadas con llaves como {{nombre_variable}} para rellenarlas más tarde."
              rows={7}
              required
              className="w-full rounded-xl border border-slate-705 p-4 text-xs font-mono focus:outline-none focus:border-indigo-400 transition-all bg-[#0f172a] text-slate-100 leading-relaxed shadow-inner"
            />
            <p className="ui-muted-panel text-[10px] text-slate-400 flex items-start sm:items-center gap-1 bg-slate-900/20 p-1.5 px-3 rounded-lg border border-slate-800/60 w-full sm:w-fit">
              <HelpCircle size={11} className="text-indigo-400 animate-pulse" />
              <span>Consejo: El uso de llaves dobles permite que las personas completen interactivamente tu prompt paso a paso.</span>
            </p>

            {/* Version History HUD section */}
            {prompt && (
              <div className="ui-muted-panel mt-3 bg-slate-900/40 border border-[#334155]/40 rounded-2xl p-4.5 space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                    <History size={13} className="text-indigo-400" /> Historial de versiones del Prompt
                  </span>
                  <span className="text-[10px] text-indigo-450 bg-[#1e293b] hover:bg-slate-800 px-2.5 py-0.5 rounded-full border border-indigo-500/20 font-bold transition-all">
                    Últimas 3 versiones en Firestore
                  </span>
                </div>

                {loadingVersions ? (
                  <div className="text-xs text-slate-400 italic py-2">Consultando subcolección de versiones en Firestore...</div>
                ) : versions.length === 0 ? (
                  <div className="text-xs text-slate-450 italic py-2">
                    No hay versiones anteriores registradas. Las versiones se guardan automáticamente al realizar cambios en el texto del prompt.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {versions.map((ver, idx) => {
                      const verDate = ver.createdAt?.toDate ? ver.createdAt.toDate() : (ver.createdAt?.seconds ? new Date(ver.createdAt.seconds * 1000) : new Date());
                      return (
                        <div key={ver.id || idx} className="bg-[#0f172a]/95 border border-slate-850 p-3.5 rounded-xl flex flex-col gap-2 relative group-version">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 shadow-xs">
                              Versión #{versions.length - idx}
                            </span>
                            <span className="text-slate-450 font-mono tracking-wide">
                              {verDate.toLocaleString()}
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-300 font-mono line-clamp-3 bg-slate-950/60 p-3 rounded-lg border border-[#334155]/20 leading-relaxed overflow-y-auto max-h-[70px] break-words whitespace-pre-wrap select-all">
                            {ver.promptText}
                          </p>
                          
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVersionForDiff(
                                  selectedVersionForDiff?.id === ver.id ? null : ver
                                );
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <span>{selectedVersionForDiff?.id === ver.id ? "Ocultar Comparación" : "Comparar Cambios"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPromptText(ver.promptText);
                                if (onNotification) {
                                  onNotification("Texto del prompt revertido a la versión anterior. ¡No olvides hacer clic en 'Guardar Cambios' para persistirlo!", "success");
                                }
                              }}
                              className="px-3 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 hover:text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                              title="Revertir el cuadro de texto del prompt a esta versión anterior"
                            >
                              <RotateCcw size={10} />
                              <span>Revertir</span>
                            </button>
                          </div>

                          {selectedVersionForDiff?.id === ver.id && (
                            <div className="bg-[#0f172a] rounded-xl p-3 border border-slate-850 text-[11px] font-mono leading-relaxed mt-2 select-text text-slate-400">
                              <span className="text-[10px] text-slate-500 font-bold block mb-1.5">DIFERENCIAS VISUALES (Rojo = Anterior, Verde = Actual):</span>
                              <div className="flex flex-wrap gap-x-0.5 gap-y-0.5 leading-relaxed whitespace-pre-wrap break-all">
                                {diffWords(ver.promptText, promptText).map((token, tIdx) => {
                                  const isWhitespace = /^\s+$/.test(token.value);
                                  return (
                                    <span key={tIdx} className={
                                      token.type === "added" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1 rounded font-bold" :
                                      token.type === "removed" ? "bg-red-500/15 text-red-400 border border-red-500/20 px-1 rounded line-through" :
                                      ""
                                    }>
                                      {isWhitespace ? token.value : token.value.trim()}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Row 4: Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Tag size={12} className="text-pink-400" /> Tags (Soportado hasta 10 etiquetas, separadas por coma)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="guion, youtube, seo, educativo"
              className="w-full rounded-xl border border-slate-705 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 transition-all bg-[#0f172a]/40 text-white font-sans placeholder-slate-500"
            />
          </div>

          {/* Row 4.5: Notas de Ejecución */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <StickyNote size={12} className="text-indigo-400" /> Notas o Recordatorios de Ejecución (Opcional)
              </label>
              <VoiceDictationButton onTranscript={handleDictateNotas} onNotification={onNotification} tooltipText="Dictar notas con voz" />
            </div>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Consejos o notas sobre cómo ejecutar este prompt (ej. modelo preferido, tone settings...)"
              rows={3}
              maxLength={2000}
              className="w-full rounded-xl border border-slate-705 px-4 py-3 text-xs focus:outline-none focus:border-indigo-400 transition-all bg-[#0f172a]/40 text-white font-sans placeholder-slate-500 leading-relaxed"
            />
          </div>

          {/* Row 4.8: Enlace Compartido Toggle */}
          <div className="ui-muted-panel border border-indigo-500/15 rounded-2xl p-4 bg-indigo-500/5 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isShared}
                onChange={e => setIsShared(e.target.checked)}
                className="w-4.5 h-4.5 rounded text-pink-500 bg-[#0f172a] border-slate-700/80 focus:ring-opacity-45 focus:ring-pink-500 shrink-0 cursor-pointer accent-indigo-500"
              />
              <span className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Globe size={13} className="text-pink-400 animate-pulse" /> Permitir compartir públicamente
              </span>
            </label>
            <p className="text-[10px] text-slate-400 pl-7 leading-relaxed">
              Cualquier creador podrá acceder de forma directa para rellenar este prompt por medio de su identificador único, sin necesidad de iniciar sesión. Ideal para compartir plantillas en la descripción de tus videos de YouTube.
            </p>
          </div>

          {/* Row 5: Variables Section */}
          <div className="ui-muted-panel border border-slate-700/50 rounded-2xl p-4 sm:p-5 bg-slate-900/30 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Variables de Entrada</h4>
                <p className="text-[11px] text-slate-400">Documenta las variables declaradas mediante llaves en el prompt.</p>
              </div>
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleExtractVariables}
                  className="ui-action-secondary px-2.5 py-2 sm:py-1 bg-[#1e293b] hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-all cursor-pointer"
                  title="Detectar variables del prompt de arriba dinámicamente"
                >
                  Escanear Prompt
                </button>
                <button
                  type="button"
                  onClick={handleAddVariableRow}
                  className="px-2.5 py-2 sm:py-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:opacity-95 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
                >
                  <Plus size={11} /> Añadir
                </button>
              </div>
            </div>

            {variables.length === 0 ? (
              <p className="text-[11px] text-slate-500 text-center py-4 border border-dashed border-slate-800 rounded-xl">Ninguna variable añadida o escaneada. Las variables permiten que tus espectadores ingresen datos fácilmente.</p>
            ) : (
              <div className="space-y-2.5 max-h-[150px] overflow-y-auto pr-1">
                {variables.map((variable, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-[#0f172a]/75 border border-slate-800 p-2.5 rounded-xl items-center shadow-xs">
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={variable.name}
                        onChange={e => handleVariableChange(idx, "name", e.target.value)}
                        placeholder="ej. tema"
                        required
                        className="w-full border-none focus:outline-none p-1 font-mono text-xs text-white bg-slate-900 rounded px-1.5 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={variable.description}
                        onChange={e => handleVariableChange(idx, "description", e.target.value)}
                        placeholder="ej. El tema principal"
                        required
                        className="w-full border-none focus:outline-none p-1 text-xs text-slate-350 bg-slate-900 rounded px-1.5 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={variable.defaultValue || ""}
                        onChange={e => handleVariableChange(idx, "defaultValue", e.target.value)}
                        placeholder="ej. Inteligencia Artificial"
                        className="w-full border-none focus:outline-none p-1 text-xs text-slate-350 bg-slate-900 rounded px-1.5 focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                    <div className="sm:col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveVariableRow(idx)}
                        className="text-red-400 hover:text-red-300 p-1 rounded-full hover:bg-slate-800 transition-all inline-block cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

            </div>

            {/* Right Panel: AI Optimizer & Quality Meter */}
            {showAIOptimizer && (
              <div className="space-y-5 border-t lg:border-t-0 lg:border-l border-slate-700/60 lg:pl-6 pt-5 lg:pt-0">
                {(() => {
                  const qs = calculateQualityScore(promptText);
                  return (
                    <>
                      <div className="bg-slate-900/40 p-4.5 rounded-2xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-300">Medidor de Calidad</span>
                          <span className={`text-sm font-extrabold ${qs.score >= 75 ? "text-emerald-400" : qs.score >= 50 ? "text-amber-400" : "text-red-400"}`}>{qs.score}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${qs.score >= 75 ? "bg-emerald-500" : qs.score >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${qs.score}%` }}></div>
                        </div>
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Rol de IA</span>
                            <span className={qs.hasRole ? "text-emerald-400 font-bold" : "text-slate-500"}>{qs.hasRole ? "✔ Incluido" : "✘ Falta"}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Contexto descriptivo</span>
                            <span className={qs.hasContext ? "text-emerald-400 font-bold" : "text-slate-500"}>{qs.hasContext ? "✔ Incluido" : "✘ Falta"}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Variables dinámicas</span>
                            <span className={qs.hasVariables ? "text-emerald-400 font-bold" : "text-slate-500"}>{qs.hasVariables ? "✔ Incluido" : "✘ Falta"}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Formato de respuesta</span>
                            <span className={qs.hasOutputFormat ? "text-emerald-400 font-bold" : "text-slate-500"}>{qs.hasOutputFormat ? "✔ Incluido" : "✘ Falta"}</span>
                          </div>
                        </div>
                      </div>

                      {qs.tips.length > 0 && (
                        <div className="bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-2xl space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">Consejos de Mejora:</span>
                          <ul className="text-[10px] text-slate-350 space-y-1 list-disc pl-4 leading-normal">
                            {qs.tips.map((tip, idx) => (
                              <li key={idx}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* AI Refiner */}
                <div className="bg-[#1e293b]/60 p-4.5 rounded-2xl border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-pink-400 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-200">Refinar con IA</span>
                    </div>
                    <AIModelSelector selectedModel={selectedAIModel} onSelect={setSelectedAIModel} compact />
                  </div>
                  <textarea
                    value={aiInstructions}
                    onChange={(e) => setAiInstructions(e.target.value)}
                    placeholder="Instrucciones especiales para mejorar (ej: 'Hazlo sonar más formal y estructúralo en una tabla')"
                    rows={3}
                    className="w-full rounded-xl border border-slate-705 p-3 text-xs bg-[#0f172a] text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                  {aiError && (
                    <div className="text-[10px] text-red-400 font-semibold p-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                      {aiError}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={loadingAI}
                    onClick={handleAIOptimize}
                    className="w-full py-2 bg-gradient-to-r from-pink-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {loadingAI ? "Optimizando..." : "Enviar Instrucciones a Gemini"}
                  </button>
                </div>

                {/* Variables Testing */}
                {activeVariables.length > 0 && (
                  <div className="bg-slate-900/40 p-4.5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <HelpCircle size={14} className="text-indigo-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-200">Playground de Variables</span>
                    </div>
                    <div className="space-y-2">
                      {activeVariables.map((variable) => (
                        <div key={variable} className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 font-mono">{"{{" + variable + "}}"}</label>
                          <input
                            type="text"
                            value={mockValues[variable] || ""}
                            onChange={(e) => {
                              setMockValues((prev) => ({
                                ...prev,
                                [variable]: e.target.value
                              }));
                            }}
                            placeholder="Escribe un valor de prueba..."
                            className="w-full text-xs rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1 mt-3">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Previsualización:</span>
                      <pre className="bg-slate-950 p-3 rounded-xl text-[10px] font-mono whitespace-pre-wrap leading-relaxed border border-slate-850 text-slate-300 max-h-[150px] overflow-y-auto select-text select-all">
                        {filledPreview}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="ui-modal-footer px-4 sm:px-6 py-4 border-t border-slate-700/60 bg-slate-900/40 grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex sm:items-center sm:justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="ui-action-secondary px-4 py-2.5 sm:py-2 hover:bg-slate-800 rounded-xl text-slate-300 font-bold text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#ec4899] hover:opacity-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
          >
            <Save size={14} />
            <span>{prompt ? "Guardar Cambios" : "Guardar en Biblioteca"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
