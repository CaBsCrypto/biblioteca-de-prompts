import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Copy, Edit2, Play, Star, Trash2, Check, Folder, StickyNote, Globe, Share2, Download, Printer, Sparkles, Heart, MessageSquare, GitFork } from "lucide-react";
import { Prompt, Folder as FolderType } from "../types";
import { User } from "firebase/auth";
import CommentsSection from "./CommentsSection";

interface PromptCardProps {
  key?: React.Key;
  prompt: Prompt;
  folders?: FolderType[];
  onFavoriteToggle: (prompt: Prompt) => void;
  onEdit: (prompt: Prompt) => void;
  onDelete: (prompt: Prompt) => void;
  onUse: (prompt: Prompt) => void;
  onCopyFilled: (prompt: Prompt) => void;
  onNotification?: (message: string, type: "success" | "info") => void;
  isCommunityView?: boolean;
  currentUser?: User | null;
  onFork?: (prompt: Prompt) => void;
  onLikeToggle?: (prompt: Prompt) => void;
  onAuthorClick?: (author: { name: string; uid: string; avatar?: string }) => void;
}

export default function PromptCard({
  prompt,
  folders = [],
  onFavoriteToggle,
  onEdit,
  onDelete,
  onUse,
  onCopyFilled,
  onNotification,
  isCommunityView = false,
  currentUser = null,
  onFork,
  onLikeToggle,
  onAuthorClick
}: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState<number | null>(null);

  useEffect(() => {
    if (prompt.isShared) {
      const q = query(collection(db, `prompts/${prompt.id}/comments`));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setCommentCount(snapshot.size);
        },
        (error) => {
          console.error("Error subscribing to comments count:", error);
        }
      );
      return unsubscribe;
    }
  }, [prompt.id, prompt.isShared]);

  const isLiked = currentUser ? prompt.likedBy?.includes(currentUser.uid) : false;
  const likesCount = prompt.likesCount || prompt.likedBy?.length || 0;

  // Define styling based on category
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "YouTube":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "Marketing":
        return "bg-amber-500/10 text-amber-400 border-amber-500/25";
      case "Programación":
        return "bg-blue-500/10 text-blue-400 border-blue-500/25";
      case "Redacción":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
      case "IA Agentes":
        return "bg-purple-500/10 text-purple-400 border-purple-500/25";
      case "IA Imágenes":
        return "bg-pink-500/10 text-pink-400 border-pink-500/25";
      case "IA Videos":
        return "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/25";
      case "Acompañante Personal":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/25";
      case "Asistente de Prompts":
        return "bg-teal-500/10 text-teal-400 border-teal-500/25";
      default:
        return "bg-slate-700/50 text-slate-350 border-slate-600/30";
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onNotification) {
      onNotification("Contenido del prompt copiado con éxito.", "success");
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!prompt.isShared) {
      if (onNotification) {
        onNotification("Este prompt es privado. Activa 'Permitir compartir públicamente' al editar.", "info");
      } else {
        alert("Este prompt es privado. Activa 'Permitir compartir públicamente' al editar.");
      }
      return;
    }

    // Determine the share URL
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?share=${prompt.id}`;
    
    navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    
    if (onNotification) {
      onNotification("¡Enlace de compartición copiado al portapapeles!", "success");
    }
  };

  const handleExportMarkdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const tagsStr = prompt.tags && prompt.tags.length > 0 ? prompt.tags.map(t => `#${t}`).join(" ") : "Ninguna";
    const notesStr = prompt.notas ? `\n## Notas de Ejecución\n${prompt.notas}\n` : "";
    const markdownContent = `# ${prompt.title}

**Categoría:** ${prompt.category}
**Etiquetas:** ${tagsStr}

## Descripción
${prompt.description || "Sin descripción proporcionada."}

## Texto del Prompt
\`\`\`text
${prompt.promptText}
\`\`\`
${notesStr}
---
*Exportado desde Biblioteca de Prompts de IA el ${new Date().toLocaleDateString()}*
`;

    const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // Clean file name
    const safeTitle = prompt.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    link.download = `prompt-${safeTitle || "untitled"}.md`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onNotification) {
      onNotification("Prompt exportado como Markdown (.md) con éxito.", "success");
    }
  };

  const handleExportPDF = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Create the unique styled printable container
    const printContainer = document.createElement("div");
    printContainer.id = "printable-prompt-container";
    
    // Styles only for printing
    const printStyle = document.createElement("style");
    printStyle.id = "printable-style";
    printStyle.textContent = `
      @media print {
        body {
          background-color: white !important;
          color: black !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          padding: 2cm !important;
        }
        /* Hide everything else in the body */
        body > *:not(#printable-prompt-container) {
          display: none !important;
        }
        #printable-prompt-container {
          display: block !important;
          width: 100% !important;
        }
        .print-title {
          font-size: 24pt !important;
          font-weight: bold !important;
          margin-bottom: 8pt !important;
          color: #111827 !important;
          border-bottom: 2px solid #e5e7eb !important;
          padding-bottom: 8pt !important;
        }
        .print-meta {
          font-size: 10pt !important;
          color: #4b5563 !important;
          margin-bottom: 16pt !important;
        }
        .print-section-title {
          font-size: 14pt !important;
          font-weight: bold !important;
          color: #1f2937 !important;
          margin-top: 20pt !important;
          margin-bottom: 6pt !important;
        }
        .print-box {
          background-color: #f9fafb !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          padding: 12pt !important;
          font-size: 11pt !important;
          line-height: 1.5 !important;
          white-space: pre-wrap !important;
          font-family: inherit !important;
        }
        .print-prompt-text {
          font-family: "Courier New", Courier, monospace !important;
          background-color: #f3f4f6 !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
          padding: 14pt !important;
          font-size: 10pt !important;
          line-height: 1.4 !important;
          white-space: pre-wrap !important;
        }
        .print-footer {
          margin-top: 30pt !important;
          text-align: center !important;
          font-size: 8pt !important;
          color: #9ca3af !important;
          border-top: 1px solid #e5e7eb !important;
          padding-top: 10pt !important;
        }
      }
    `;

    document.head.appendChild(printStyle);

    // Build internal printable elements
    const tagsStr = prompt.tags && prompt.tags.length > 0 ? prompt.tags.map(t => `#${t}`).join(" ") : "";
    const notesHtml = prompt.notas ? `
      <div class="print-section-title">Notas de Ejecución / Instrucciones</div>
      <div class="print-box">${prompt.notas}</div>
    ` : "";

    printContainer.innerHTML = `
      <div class="print-title">${prompt.title}</div>
      <div class="print-meta">
        <strong>Categoría:</strong> ${prompt.category} &nbsp;|&nbsp; 
        <strong>Etiquetas:</strong> ${tagsStr || "Ninguna"} &nbsp;|&nbsp;
        <strong>Fecha de Exportación:</strong> ${new Date().toLocaleDateString()}
      </div>
      
      <div class="print-section-title">Descripción</div>
      <div class="print-box">${prompt.description || "Sin descripción proporcionada."}</div>
      
      <div class="print-section-title">Plantilla del Prompt</div>
      <div class="print-prompt-text">${prompt.promptText}</div>
      
      ${notesHtml}
      
      <div class="print-footer">
        Documento generado y exportado desde Biblioteca de Prompts de IA.
      </div>
    `;

    document.body.appendChild(printContainer);
    
    // Trigger the print dialogue
    window.print();
    
    // Cleanup afterwards
    setTimeout(() => {
      if (document.head.contains(printStyle)) {
        document.head.removeChild(printStyle);
      }
      if (document.body.contains(printContainer)) {
        document.body.removeChild(printContainer);
      }
    }, 500);

    if (onNotification) {
      onNotification("Preparado diálogo de impresión / guardado PDF.", "success");
    }
  };

  return (
    <div
      id={`prompt-card-${prompt.id}`}
      className={`bg-[#1e293b]/90 border border-slate-700/60 rounded-3xl p-6 shadow-xl hover:shadow-[0_0_25px_rgba(129,140,248,0.12)] hover:border-indigo-450/80 transition-all duration-250 flex flex-col justify-between group ${
        !isCommunityView ? "cursor-grab active:cursor-grabbing select-none" : ""
      }`}
      draggable={!isCommunityView}
      onDragStart={(e) => {
        if (isCommunityView) return;
        e.dataTransfer.setData("text/plain", prompt.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <div>
        {/* Header: Category & Favorite Button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              id={`category-badge-${prompt.id}`}
              className={`text-[11px] font-bold px-3 py-1 rounded-full border ${getCategoryStyles(
                prompt.category
              )} flex items-center gap-1.5`}
            >
              <Folder size={12} />
              {prompt.category}
            </span>
            {!isCommunityView && folders && prompt.folderId && folders.find(f => f.id === prompt.folderId) && (
              <span className="text-[11px] font-extrabold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1 rounded-full flex items-center gap-1.5" title={`Carpeta: ${folders.find(f => f.id === prompt.folderId)?.name}`}>
                <Folder size={11} className="text-pink-400" fill="currentColor" />
                <span>{folders.find(f => f.id === prompt.folderId)?.name}</span>
              </span>
            )}
            {prompt.isShared && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5" title="Publicado en Comunidad">
                <Globe size={11} className="animate-pulse" />
                <span>En Comunidad</span>
              </span>
            )}
          </div>
          
          {!isCommunityView && (
            <button
              id={`btn-fav-${prompt.id}`}
              onClick={() => onFavoriteToggle(prompt)}
              className={`p-2 rounded-full hover:bg-slate-800 transition-colors ${
                prompt.isFavorite
                  ? "text-pink-500 hover:text-pink-400"
                  : "text-slate-500 hover:text-slate-400"
              }`}
              title={prompt.isFavorite ? "Quitar de favoritos" : "Marcar como favorito"}
            >
              <Star size={18} fill={prompt.isFavorite ? "currentColor" : "none"} />
            </button>
          )}
        </div>

        {/* Social Author Attribute */}
        {prompt.authorName && (
          <button
            onClick={() => onAuthorClick?.({ name: prompt.authorName!, uid: prompt.userId, avatar: prompt.authorAvatar })}
            className="flex items-center gap-2 text-xs text-slate-400 mt-1 mb-3.5 bg-slate-900/30 px-3 py-1.5 rounded-xl border border-slate-800/40 w-fit hover:border-indigo-500/50 hover:bg-slate-900/60 hover:text-slate-200 transition-all cursor-pointer text-left group/author"
            title={`Ver más prompts públicos de ${prompt.authorName}`}
          >
            {prompt.authorAvatar ? (
              <img
                src={prompt.authorAvatar}
                alt={prompt.authorName}
                referrerPolicy="no-referrer"
                className="w-4 h-4 rounded-full border border-indigo-500/25 group-hover/author:border-indigo-400 group-hover/author:scale-110 transition-all"
              />
            ) : (
              <div className="w-4 h-4 rounded-full flex items-center justify-center bg-indigo-500/10 text-[8px] font-bold text-indigo-400 font-mono border border-indigo-550/25 group-hover/author:border-indigo-400 transition-all">
                {prompt.authorName.charAt(0).toUpperCase()}
              </div>
            )}
            <span>Por <span className="font-bold text-slate-200 group-hover/author:text-indigo-400 transition-colors">{prompt.authorName}</span></span>
          </button>
        )}

        {/* Fork indicator label */}
        {prompt.forkedFrom && (
          <div className="inline-flex items-center gap-1 text-[10px] text-indigo-300 bg-indigo-500/5 px-2.5 py-1 rounded-lg border border-indigo-500/15 mb-3.5 font-mono">
            <GitFork size={10} />
            <span>Bifurcado de {prompt.forkedFrom}</span>
          </div>
        )}

        {/* Title */}
        <h3
          id={`prompt-title-${prompt.id}`}
          className="text-lg font-bold text-white mb-2 font-sans leading-tight group-hover:text-indigo-450 transition-colors"
        >
          {prompt.title}
        </h3>

        {/* Description */}
        <p
          id={`prompt-desc-${prompt.id}`}
          className="text-sm text-slate-400 mb-5 font-sans leading-relaxed line-clamp-3"
        >
          {prompt.description || "Sin descripción proporcionada."}
        </p>

        {/* Execution Notes */}
        {prompt.notas && (
          <div className="mb-5 p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2">
            <StickyNote size={14} className="mt-0.5 shrink-0 text-indigo-400" />
            <div className="leading-relaxed font-sans">
              <span className="font-extrabold block mb-0.5 text-indigo-200">Tip de ejecución:</span>
              <p className="text-slate-250">{prompt.notas}</p>
            </div>
          </div>
        )}

        {/* Tag list */}
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {prompt.tags.map((tag, idx) => (
              <span
                key={idx}
                className="bg-slate-800 text-slate-350 border border-slate-700/50 text-[11px] font-medium px-2.5 py-0.5 rounded-md"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions segment */}
      <div className="border-t border-slate-700/50 pt-4 flex flex-col gap-4 mt-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Modify / Social Actions Buttons */}
          <div className="flex flex-wrap items-center gap-1">
            {/* If community view and not owned, hide delete/edit, show social interaction */}
            {(!isCommunityView || (currentUser && prompt.userId === currentUser.uid)) && (
              <>
                <button
                  id={`btn-edit-${prompt.id}`}
                  onClick={() => onEdit(prompt)}
                  className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                  title="Editar prompt"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  id={`btn-delete-${prompt.id}`}
                  onClick={() => onDelete(prompt)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Eliminar prompt"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}

            {/* Social Likes Interaction Button */}
            {onLikeToggle && (
              <button
                onClick={() => onLikeToggle(prompt)}
                className={`p-2 rounded-lg transition-all flex items-center gap-1.5 ${
                  isLiked
                    ? "text-rose-400 bg-rose-550/10 border border-rose-500/20"
                    : "text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                }`}
                title={isLiked ? "Quitar me gusta" : "Dar me gusta"}
              >
                <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                {likesCount > 0 && <span className="text-xs font-bold font-mono">{likesCount}</span>}
              </button>
            )}

            {/* Comments Toggle Button */}
            <button
              onClick={() => setShowComments(!showComments)}
              className={`p-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                showComments
                  ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20"
                  : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10"
              }`}
              title="Ver comentarios y aportar recomendaciones o sugerencias de mejora"
            >
              <MessageSquare size={16} />
              <span className="text-xs font-bold font-mono">
                {commentCount !== null && commentCount > 0 ? `Comentarios (${commentCount})` : "Sugerencias"}
              </span>
            </button>

            {/* Fork/Duplicate Button */}
            {isCommunityView && onFork && currentUser && prompt.userId !== currentUser.uid && (
              <button
                onClick={() => onFork(prompt)}
                className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all flex items-center gap-1.5"
                title="Clonar a mi biblioteca personal (Bifurcar)"
              >
                <GitFork size={16} />
                <span className="text-xs font-bold">Clonar</span>
              </button>
            )}

            {/* Native Share button */}
            <button
              id={`btn-share-${prompt.id}`}
              onClick={handleShareClick}
              className={`p-2 rounded-lg transition-all ${
                linkCopied
                  ? "text-emerald-400 bg-emerald-500/10"
                  : prompt.isShared
                  ? "text-indigo-400 hover:text-white hover:bg-indigo-500/10"
                  : "text-slate-550 hover:text-indigo-400 hover:bg-slate-800"
              }`}
              title={prompt.isShared ? "Copiar enlace de compartición pública" : "Activar compartir en Editar para obtener enlace"}
            >
              {linkCopied ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
            </button>
            
            <button
              id={`btn-export-md-${prompt.id}`}
              onClick={handleExportMarkdown}
              className="p-2 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
              title="Exportar como Markdown (.md)"
            >
              <Download size={16} />
            </button>

            <button
              id={`btn-print-${prompt.id}`}
              onClick={handleExportPDF}
              className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
              title="Imprimir o Guardar como PDF"
            >
              <Printer size={16} />
            </button>
          </div>

          {/* Right: Copy & Run Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id={`btn-copy-${prompt.id}`}
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                copied
                  ? "bg-slate-800 text-slate-200 border-indigo-500/40"
                  : "bg-slate-800 text-slate-350 border-slate-700 hover:bg-slate-700 hover:text-white"
              }`}
              title="Copiar prompt crudo"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copiar</span>
                </>
              )}
            </button>

            <button
              id={`btn-copy-filled-${prompt.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onCopyFilled(prompt);
              }}
              className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white border border-indigo-500/25 hover:border-indigo-400/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow-[0_0_10px_rgba(99,102,241,0.1)]"
              title="Copiar prompt rellenando variables rápidamente"
            >
              <Sparkles size={13} className="text-pink-400 animate-pulse" />
              <span>Copiar Relleno</span>
            </button>

            <button
              id={`btn-use-${prompt.id}`}
              onClick={() => onUse(prompt)}
              className="px-4 py-1.5 bg-gradient-to-r from-indigo-650 to-pink-600 hover:opacity-90 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
              title="Rellenar variables interactivamente"
            >
              <Play size={12} fill="currentColor" />
              <span>Usar</span>
            </button>
          </div>
        </div>

        {/* Real-time lazy load Comments Section expandable container */}
        {showComments && (
          <CommentsSection
            promptId={prompt.id}
            currentUser={currentUser}
            promptOwnerId={prompt.userId}
            onNotification={onNotification}
          />
        )}
      </div>
    </div>
  );
}
