import React, { useRef } from "react";
import { Sparkles, Plus, Search, Star, Tag, X, FolderOpen, Share2, BookOpen, GitFork } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { User } from "firebase/auth";
import type { Prompt, Folder, CategoryFilter } from "../types";
import type { LibraryViewFilter, CommunitySort, SelectedAuthor, CommunityScope } from "../utils/promptFilters";
import PromptCard from "./PromptCard";
import FolderTreeView from "./FolderTreeView";

interface LibraryWorkspaceViewProps {
  user: User | null;
  currentTab: "mi-biblioteca" | "comunidad";
  prompts: Prompt[];
  loadingPrompts: boolean;
  loadingCommunityPrompts: boolean;
  filteredPrompts: Prompt[];
  setNewFolderParentId: (id: string | null) => void;
  folders: Folder[];
  loadingFolders: boolean;
  selectedAuthor: SelectedAuthor;
  setSelectedAuthor: (author: SelectedAuthor) => void;
  selectedAuthorPrompts: Prompt[];
  followedCreatorUids: string[];
  socialFavorites: any[];
  socialFavoritePrompts: any[];
  socialFavoritePromptIds: Set<string>;
  knownRemixCountsByPromptId: Map<string, number>;
  visibleCommunityCatalogPrompts: Prompt[];
  
  // Filter States
  selectedCategory: CategoryFilter;
  setSelectedCategory: (cat: CategoryFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  tagSearchInput: string;
  setTagSearchInput: (input: string) => void;
  isTagDropdownOpen: boolean;
  setIsTagDropdownOpen: (open: boolean) => void;
  tagSuggestions: string[];
  allAvailableTags: string[];
  libraryViewFilter: LibraryViewFilter;
  setLibraryViewFilter: (filter: LibraryViewFilter) => void;
  communitySort: CommunitySort;
  setCommunitySort: (sort: CommunitySort) => void;
  communityScope: CommunityScope;
  setCommunityScope: (scope: CommunityScope) => void;
  
  // Folder States
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  dragOverFolderId: string | null;
  setDragOverFolderId: (id: string | null) => void;
  
  // Modal / Assist triggers
  showAIAssistant: boolean;
  setShowAIAssistant: (show: boolean) => void;
  setPresetAItext: (text: string) => void;
  setShowQuickSwitcher: (show: boolean) => void;
  setShowRecommendationModal: (show: boolean) => void;
  setShowSeedPackModal: (show: boolean) => void;
  setShowJoinClassModal: (show: boolean) => void;
  setShowCreateFolder: (show: boolean) => void;
  setGeminiRecommendation: (rec: any) => void;
  setGeminiRecommendationError: (err: string) => void;
  
  // Handlers
  handleOpenAdd: () => void;
  handleOpenEdit: (prompt: Prompt) => void;
  handleDeletePrompt: (prompt: Prompt) => void;
  handleUsePrompt: (prompt: Prompt, tab: string) => void;
  handleCopyFilledPrompt: (prompt: Prompt) => void;
  handleFavoriteToggle: (prompt: Prompt) => void | Promise<void>;
  handleLikeToggle: (prompt: Prompt) => void;
  handleToggleSocialFavorite: (prompt: Prompt) => void;
  handleHideCommunityPrompt: (prompt: Prompt) => void;
  handleReportCommunityPrompt: (prompt: Prompt) => void;
  openPublicProfile: (author: any) => void;
  setSelectedPublicPrompt: (prompt: Prompt) => void;
  resolvePublicSavePrompt: (prompt: Prompt) => void;
  trackUserEvent: (event: string, prompt?: Prompt, meta?: any) => void;
  triggerNotification: (msg: string, type?: "success" | "info") => void;
  
  // JSON handlers
  handleExportJSON: () => void;
  handleImportJSON: (content: string) => Promise<any>;
  
  // Folder handlers
  handleMovePromptToFolder: (promptId: string, folderId: string | null) => void;
  handleDeleteFolder: (folderId: string) => void;
  handleOpenShareFolderModal: (folder: Folder) => void;
  
  // Global stats helpers
  missingDefaultPromptCount: number;
  existingDefaultPromptCount: number;
  STARTER_PROMPT_GOAL: number;
  forumPostsCount: number;
  showcasePostsCount: number;
}

export function LibraryWorkspaceView({
  user,
  currentTab,
  prompts,
  loadingPrompts,
  loadingCommunityPrompts,
  filteredPrompts,
  setNewFolderParentId,
  folders,
  loadingFolders,
  selectedAuthor,
  setSelectedAuthor,
  selectedAuthorPrompts,
  followedCreatorUids,
  socialFavorites,
  socialFavoritePrompts,
  socialFavoritePromptIds,
  knownRemixCountsByPromptId,
  visibleCommunityCatalogPrompts,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  selectedTags,
  setSelectedTags,
  tagSearchInput,
  setTagSearchInput,
  isTagDropdownOpen,
  setIsTagDropdownOpen,
  tagSuggestions,
  allAvailableTags,
  libraryViewFilter,
  setLibraryViewFilter,
  communitySort,
  setCommunitySort,
  communityScope,
  setCommunityScope,
  selectedFolderId,
  setSelectedFolderId,
  dragOverFolderId,
  setDragOverFolderId,
  showAIAssistant,
  setShowAIAssistant,
  setPresetAItext,
  setShowQuickSwitcher,
  setShowRecommendationModal,
  setShowSeedPackModal,
  setShowJoinClassModal,
  setShowCreateFolder,
  setGeminiRecommendation,
  setGeminiRecommendationError,
  handleOpenAdd,
  handleOpenEdit,
  handleDeletePrompt,
  handleUsePrompt,
  handleCopyFilledPrompt,
  handleFavoriteToggle,
  handleLikeToggle,
  handleToggleSocialFavorite,
  handleHideCommunityPrompt,
  handleReportCommunityPrompt,
  openPublicProfile,
  setSelectedPublicPrompt,
  resolvePublicSavePrompt,
  trackUserEvent,
  triggerNotification,
  handleExportJSON,
  handleImportJSON,
  handleMovePromptToFolder,
  handleDeleteFolder,
  handleOpenShareFolderModal,
  missingDefaultPromptCount,
  existingDefaultPromptCount,
  STARTER_PROMPT_GOAL,
  forumPostsCount,
  showcasePostsCount
}: LibraryWorkspaceViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result;
      if (typeof text === "string") {
        await handleImportJSON(text);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const categoriesToRender = currentTab === "mi-biblioteca"
    ? ["Todas", "YouTube", "Marketing", "Programación", "Refactorización", "Redacción", "IA Agentes", "IA Imágenes", "IA Videos", "Acompañante Personal", "Asistente de Prompts", "General", "Favoritos"]
    : ["Todas", "YouTube", "Marketing", "Refactorización", "IA Agentes", "Asistente de Prompts", "IA Videos", "General", "Favoritos"];

  const libraryViewFilters: Array<{ id: LibraryViewFilter; label: string }> = [
    { id: "todos", label: "Todos" },
    { id: "privados", label: "Privados" },
    { id: "publicados", label: "Publicados" },
    { id: "remixes", label: "Remixes" },
    { id: "favoritos", label: "Favoritos propios" }
  ];

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      {/* Stats & Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1e293b]/90 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-700/85 shadow-xl animate-in fade-in duration-200">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-white leading-tight flex items-center gap-2">
            {currentTab === "mi-biblioteca" ? "Mi Panel de Control" : selectedAuthor ? `Catálogo de ${selectedAuthor.name}` : "Comunidad de Prompts"}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-lg leading-relaxed font-sans">
            {currentTab === "mi-biblioteca" ? (
              <>
                Colección personal. Tienes <strong className="text-pink-400">{prompts.length}</strong> prompts guardados en total.
                {missingDefaultPromptCount > 0 && (
                  <span className="ml-1 text-slate-400">
                    Starter: <strong className="text-indigo-300">{Math.min(existingDefaultPromptCount, STARTER_PROMPT_GOAL)}/{STARTER_PROMPT_GOAL}</strong> guardados. Pack completo opcional.
                  </span>
                )}
              </>
            ) : selectedAuthor ? (
              <>Explorando el catálogo público de <strong className="text-indigo-300">{selectedAuthor.name}</strong>. Mostrando sus <strong className="text-pink-400">{filteredPrompts.length}</strong> prompts compartidos.</>
            ) : communityScope === "siguiendo" ? (
              <>Feed de creadores seguidos. Mostrando <strong className="text-emerald-400">{filteredPrompts.length}</strong> prompts de <strong className="text-indigo-300">{followedCreatorUids.length}</strong> creadores.</>
            ) : communityScope === "favoritos" ? (
              <>Favoritos sociales. Tienes <strong className="text-amber-300">{socialFavorites.length}</strong> prompts guardados como referencia privada.</>
            ) : communityScope === "remixeados" ? (
              <>Remixes creados desde la comunidad. Mostrando <strong className="text-pink-400">{filteredPrompts.length}</strong> origenes que ya adaptaste.</>
            ) : (
              <>Descubre innovadoras plantillas de la comunidad. ¡Agrégalas a tu biblioteca, vótala, o discútela!</>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:flex lg:flex-wrap items-stretch lg:items-center gap-2 w-full md:w-auto">
          {currentTab === "mi-biblioteca" && missingDefaultPromptCount > 0 && (
            <button
              id="btn-seed-defaults"
              onClick={() => setShowSeedPackModal(true)}
              disabled={loadingPrompts}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-pulse min-w-0"
            >
              <BookOpen size={14} />
              <span>
                {prompts.length === 0
                  ? "Elegir pack inicial"
                  : "Sumar prompts del pack"}
              </span>
            </button>
          )}

          {currentTab === "mi-biblioteca" && (
            <button
              id="btn-open-recommender"
              onClick={() => {
                trackUserEvent("recommendation_open", undefined, {
                  promptsCount: prompts.length,
                  selectedCategory,
                  selectedTags
                });
                setGeminiRecommendation(null);
                setGeminiRecommendationError("");
                setShowRecommendationModal(true);
              }}
              className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              title="Recomendar un prompt existente sin usar IA externa"
            >
              <Sparkles size={14} />
              <span>Recomendar Prompt</span>
            </button>
          )}

          <button
            id="btn-open-assistant"
            onClick={() => {
              setPresetAItext("");
              setShowAIAssistant(!showAIAssistant);
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md border cursor-pointer ${
              showAIAssistant
                ? "bg-pink-500/10 text-pink-400 border-pink-500/30 hover:bg-pink-500/20"
                : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
            }`}
            title="Atajo de teclado: Ctrl+K"
          >
            <Sparkles size={14} />
            <span>Asistente de Prompts IA</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-950/80 border border-slate-700/80 text-pink-400 font-bold ml-1 uppercase">
              Ctrl+K
            </kbd>
          </button>

          <button
            id="btn-open-switcher"
            onClick={() => setShowQuickSwitcher(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            title="Atajo de teclado: Ctrl+J o Cmd+J"
          >
            <Search size={14} className="text-indigo-400" />
            <span>Buscador Rápido</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-950/80 border border-slate-700/80 text-indigo-400 font-bold ml-1 uppercase">
              Ctrl+J
            </kbd>
          </button>

          <button
            id="btn-new-prompt"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#9333ea] hover:opacity-95 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15 active:scale-[0.98] cursor-pointer"
          >
            <Plus size={14} />
            <span>Nuevo Prompt</span>
          </button>
        </div>
      </div>

      {user && currentTab === "mi-biblioteca" && (
        <div className="bg-[#1e293b]/50 p-3.5 rounded-2xl border border-slate-800/85 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1 border-b border-slate-800/40">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Vista de mi biblioteca</h3>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                Separa privados, publicaciones, remixes, favoritos propios y referencias sociales guardadas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
              <button
                type="button"
                onClick={handleImportClick}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-all flex items-center gap-1 active:scale-[0.98] cursor-pointer"
                title="Importar prompts desde archivo JSON"
              >
                <Plus size={12} />
                <span>Importar JSON</span>
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-all flex items-center gap-1 active:scale-[0.98] cursor-pointer"
                title="Exportar biblioteca como archivo JSON"
              >
                <Share2 size={12} />
                <span>Exportar JSON</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {libraryViewFilters.map((filter) => {
                const count = filter.id === "todos"
                  ? prompts.length
                  : filter.id === "privados"
                  ? prompts.filter((prompt) => !prompt.isShared).length
                  : filter.id === "publicados"
                  ? prompts.filter((prompt) => prompt.isShared).length
                  : filter.id === "remixes"
                  ? prompts.filter((prompt) => prompt.forkedFromPromptId || prompt.forkedFrom).length
                  : prompts.filter((prompt) => prompt.isFavorite).length;

                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setLibraryViewFilter(filter.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      libraryViewFilter === filter.id
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <span>{filter.label}</span>
                    <span className="text-[10px] bg-slate-950/50 px-1.5 py-0.5 rounded-md font-mono">{count}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setCommunityScope("favoritos");
                  setSelectedAuthor(null);
                  setSelectedCategory("Todas");
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer bg-amber-500/10 text-amber-300 border-amber-500/25 hover:bg-amber-500/20"
                title="Ver favoritos sociales guardados como referencias privadas"
              >
                <Star size={12} fill={socialFavorites.length > 0 ? "currentColor" : "none"} />
                <span>Favoritos sociales</span>
                <span className="text-[10px] bg-slate-950/50 px-1.5 py-0.5 rounded-md font-mono">{socialFavorites.length}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-3">
              <p className="text-lg font-black text-slate-100 font-mono">{prompts.filter((prompt) => !prompt.isShared).length}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">privados</p>
            </div>
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
              <p className="text-lg font-black text-emerald-300 font-mono">{prompts.filter((prompt) => prompt.isShared).length}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">publicados</p>
            </div>
            <div className="rounded-xl border border-pink-500/15 bg-pink-500/5 p-3">
              <p className="text-lg font-black text-pink-300 font-mono">{prompts.filter((prompt) => prompt.forkedFromPromptId || prompt.forkedFrom).length}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">remixes</p>
            </div>
            <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-3">
              <p className="text-lg font-black text-indigo-300 font-mono">{prompts.filter((prompt) => prompt.isFavorite).length}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">favoritos propios</p>
            </div>
            <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
              <p className="text-lg font-black text-amber-300 font-mono">{socialFavorites.length}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">favoritos sociales</p>
            </div>
          </div>
        </div>
      )}

      {user && currentTab === "mi-biblioteca" && socialFavorites.length > 0 && (
        <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Star size={13} fill="currentColor" />
                Favoritos sociales
              </h3>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Referencias guardadas de otros creadores. No son copias editables hasta que las guardes como remix.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCommunityScope("favoritos");
                setSelectedAuthor(null);
              }}
              className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Star size={12} />
              <span>Ver todos</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {socialFavoritePrompts.slice(0, 3).map(({ favorite, prompt }) => (
              <div key={favorite.id} className="rounded-xl border border-amber-500/15 bg-slate-950/35 p-3 min-w-0">
                <p className="text-xs font-extrabold text-white line-clamp-1">{favorite.promptTitle}</p>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                  {favorite.promptCategory} · {favorite.promptAuthorName}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => prompt ? setSelectedPublicPrompt(prompt) : triggerNotification("Este favorito aun no esta disponible en el feed local.", "info")}
                    className="text-[10px] font-bold text-indigo-300 hover:text-indigo-200 cursor-pointer"
                  >
                    Ver prompt
                  </button>
                  {prompt && (
                    <button
                      type="button"
                      onClick={() => void resolvePublicSavePrompt(prompt)}
                      className="text-[10px] font-bold text-emerald-300 hover:text-emerald-200 cursor-pointer"
                    >
                      Remix
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Folders Section (Only for authenticated user and Mi Biblioteca) */}
      {user && currentTab === "mi-biblioteca" && (
        <div id="folders-segment" className="bg-[#1e293b]/50 p-4.5 rounded-2xl border border-slate-800/85 mb-2 mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen size={15} className="text-indigo-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">Mis Carpetas / Colecciones</span>
            </div>
            <button
              onClick={() => setShowCreateFolder(true)}
              className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 hover:border-indigo-400/50 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Plus size={11} className="stroke-[3]" />
              <span>Agregar Carpeta</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedFolderId(null)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedFolderId === null
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md font-extrabold"
                  : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              <span>Ver Todo ({prompts.length})</span>
            </button>

            <button
              onClick={() => setSelectedFolderId("uncategorized")}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverFolderId !== "uncategorized") {
                  setDragOverFolderId("uncategorized");
                }
              }}
              onDragLeave={() => {
                setDragOverFolderId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverFolderId(null);
                const promptId = e.dataTransfer.getData("text/plain");
                if (promptId) {
                  handleMovePromptToFolder(promptId, null);
                }
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedFolderId === "uncategorized"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md font-extrabold"
                  : dragOverFolderId === "uncategorized"
                  ? "bg-amber-500/20 text-amber-300 border-dashed border-amber-500 scale-105 ring-2 ring-amber-500/30"
                  : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              <span>Sin carpeta ({prompts.filter(p => !p.folderId).length})</span>
            </button>

            <div className="w-full mt-2 space-y-1">
              <FolderTreeView
                folders={folders}
                prompts={prompts}
                selectedFolderId={selectedFolderId}
                setSelectedFolderId={setSelectedFolderId}
                dragOverFolderId={dragOverFolderId}
                setDragOverFolderId={setDragOverFolderId}
                handleMovePromptToFolder={handleMovePromptToFolder}
                handleDeleteFolder={handleDeleteFolder}
                handleOpenShareFolderModal={handleOpenShareFolderModal}
                setShowCreateFolder={setShowCreateFolder}
                setNewFolderParentId={setNewFolderParentId}
                user={user}
              />
            </div>

            {loadingFolders && (
              <span className="text-[10px] text-slate-400 italic">Sincronizando carpetas...</span>
            )}
            {!loadingFolders && folders.length === 0 && (
              <span className="text-[11px] text-slate-400 italic ml-1">No tienes carpetas organizacionales creadas aún.</span>
            )}
          </div>
        </div>
      )}

      {/* Main categories navigation list */}
      <div className="flex flex-col gap-4 border-b border-[#334155]/60 pb-5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
          {categoriesToRender.map((category) => (
            <button
              key={category}
              id={`filter-pill-${category}`}
              onClick={() => setSelectedCategory(category as CategoryFilter)}
              className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer select-none ${
                selectedCategory === category
                  ? "bg-[#4f46e5] text-white border-[#4f46e5] shadow-md shadow-indigo-650/15 font-extrabold"
                  : category === "Refactorización"
                  ? "bg-indigo-950/40 text-indigo-300 border-indigo-500/45 hover:text-white hover:border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.2)] animate-pulse"
                  : "bg-[#1e293b] text-slate-400 border-[#334155]/85 hover:text-slate-250 hover:border-slate-650"
              }`}
            >
              {category === "Favoritos" && <Star size={12} fill={selectedCategory === "Favoritos" ? "white" : "none"} className="text-pink-450" />}
              {category === "Refactorización" && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                </span>
              )}
              <span>{category === "Todas" ? "Ver Todo" : category}</span>
              {category === "Refactorización" && (
                <span className="text-[8px] font-extrabold text-pink-400 bg-pink-500/10 border border-pink-500/25 px-1 py-0.2 rounded font-mono uppercase tracking-wider scale-90">
                  ¡Nuevo!
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Double Search Inputs: Text & Tags Autocomplete */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 w-full md:max-w-xl shrink-0">
          {/* Search Bar Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, tag o texto..."
              className="w-full text-xs rounded-full border border-slate-700 bg-[#1e293b] pl-9.5 pr-4 py-2.5 focus:outline-none focus:border-indigo-455 transition-all font-sans text-white placeholder-slate-450"
            />
            {/* Visual search shortcuts suggestions helper */}
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap pl-1.5">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Atajos:</span>
              {[
                { label: "tag:ia", value: "tag:ia" },
                { label: "category:YouTube", value: "category:YouTube" },
                { label: "is:favorite", value: "is:favorite" },
                { label: "is:remix", value: "is:remix" }
              ].map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => {
                    const current = searchQuery.trim();
                    if (current.includes(chip.value)) return;
                    setSearchQuery(current ? `${current} ${chip.value}` : chip.value);
                  }}
                  className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-700 hover:text-white hover:border-slate-650 transition-all cursor-pointer font-mono active:scale-95"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Autocomplete Tag Search Input */}
          <div className="relative flex-1 animate-fade-in" id="tag-autocomplete-container">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
              <Tag size={13} className="text-pink-400" />
            </div>
            <input
              type="text"
              value={tagSearchInput}
              onChange={(e) => {
                setTagSearchInput(e.target.value);
                setIsTagDropdownOpen(true);
              }}
              onFocus={() => setIsTagDropdownOpen(true)}
              placeholder="Filtrar por etiqueta..."
              className="w-full text-xs rounded-full border border-slate-700 bg-[#1e293b] pl-9.5 pr-20 py-2.5 focus:outline-none focus:border-pink-500 transition-all font-sans text-white placeholder-slate-450"
            />
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-pink-400 hover:text-pink-300 font-extrabold cursor-pointer hover:underline"
                title="Limpiar todas las etiquetas"
              >
                Limpiar ({selectedTags.length})
              </button>
            )}

            {isTagDropdownOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-[#1b2537] border border-slate-700 rounded-2xl shadow-2xl max-h-48 overflow-y-auto z-45 p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
                  <span>Sugerencias de Etiquetas</span>
                  <span className="text-[8px] bg-slate-900 px-1.5 py-0.5 rounded text-indigo-400">{tagSuggestions.length} disponibles</span>
                </div>
                {tagSuggestions.length === 0 ? (
                  <div className="text-[11px] text-slate-500 p-3 italic text-center font-sans">
                    {allAvailableTags.length === 0 
                      ? "Carga ejemplos para ver etiquetas" 
                      : "No hay más sugerencias"}
                  </div>
                ) : (
                  tagSuggestions.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        if (!selectedTags.includes(tag)) {
                          setSelectedTags([...selectedTags, tag]);
                        }
                        setTagSearchInput("");
                        setIsTagDropdownOpen(false);
                      }}
                      className="w-full text-left font-sans text-xs px-3.5 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white transition-all cursor-pointer flex items-center justify-between"
                    >
                      <span className="font-bold text-pink-400">#{tag}</span>
                      <span className="text-[9px] font-mono text-slate-400 bg-slate-900 border border-slate-800/80 px-1.5 py-0.5 rounded-md">
                        {(currentTab === "mi-biblioteca" ? prompts : visibleCommunityCatalogPrompts).filter(p => p.tags?.some(t => t.toLowerCase() === tag.toLowerCase())).length}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Filtered Tag Badges Row */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 animate-in fade-in duration-200">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-1 shrink-0 flex items-center gap-1 font-mono">
            <Tag size={10} className="text-indigo-400" /> Filtrando por:
          </span>
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-full px-2.5 py-1 text-xs font-bold flex items-center gap-1 animate-scale-in animate-in zoom-in-75 duration-150"
            >
              <span>#{tag}</span>
              <button
                onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
                className="hover:bg-pink-500/20 rounded-full p-0.5 transition-all text-pink-400 hover:text-white cursor-pointer ml-0.5"
              >
                <X size={10} className="stroke-[3]" />
              </button>
            </span>
          ))}
          <button
            onClick={() => setSelectedTags([])}
            className="text-[10px] font-extrabold text-[#ec4899] hover:text-[#f472b6] underline ml-2 cursor-pointer transition-colors"
          >
            Borrar filtros de etiquetas
          </button>
        </div>
      )}

      {/* Prompts list main core grid layout */}
      {(currentTab === "mi-biblioteca" ? loadingPrompts : loadingCommunityPrompts) ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 font-sans">
          <div className="w-10 h-10 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium whitespace-nowrap">
            {currentTab === "mi-biblioteca" ? "Sincronizando biblioteca personal..." : "Sincronizando red de la comunidad..."}
          </p>
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div className="bg-[#1e293b]/60 border border-slate-700 border-dashed rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 bg-slate-800 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-700 animate-pulse">
            <FolderOpen size={20} />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm">
              {currentTab === "mi-biblioteca" ? "Biblioteca sin resultados" : "Comunidad sin resultados"}
            </h3>
            <p className="text-slate-400 text-xs px-6 mt-1.5 leading-relaxed font-sans animate-fade-in">
              {currentTab === "mi-biblioteca" ? (
                prompts.length === 0
                  ? "Tu biblioteca esta lista. Elige un pack pequeno para empezar segun tu objetivo, o crea un prompt nuevo desde cero."
                  : "No se encontraron prompts en tu biblioteca que coincidan con la categoría o filtros."
              ) : (
                communityScope === "siguiendo" && followedCreatorUids.length === 0
                  ? "Todavia no sigues a ningun creador. Explora la comunidad, abre un perfil y pulsa Seguir Creador para construir tu feed."
                  : communityScope === "siguiendo"
                  ? "Los creadores que sigues aun no tienen prompts publicos que coincidan con tus filtros."
                  : communityScope === "favoritos"
                  ? "Todavia no guardaste favoritos sociales. Abre un prompt publico y marca Favorito para guardarlo como referencia privada."
                  : communityScope === "remixeados"
                  ? "Todavia no tienes remixes creados desde la comunidad. Usa Guardar en mi biblioteca para adaptar prompts de otros creadores."
                  : visibleCommunityCatalogPrompts.length === 0
                  ? "Aun no hay prompts publicos publicados en la comunidad. Se el primero compartiendo una de tus plantillas personales activando el interruptor Hacer publico."
                  : "No se encontraron prompts publicos que coincidan con los filtros de busqueda o categoria en la comunidad."
              )}
            </p>
          </div>
          {currentTab === "mi-biblioteca" && missingDefaultPromptCount > 0 && (
            <button
              onClick={() => setShowSeedPackModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#ec4899] hover:opacity-95 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              {prompts.length === 0
                ? "Elegir pack inicial"
                : "Sumar prompts del pack"}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredPrompts.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -12 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 26, 
                  mass: 0.8,
                  opacity: { duration: 0.2 }
                }}
              >
                <PromptCard
                  prompt={p}
                  folders={folders}
                  onFavoriteToggle={handleFavoriteToggle}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeletePrompt}
                  onUse={(p) => handleUsePrompt(p, currentTab)}
                  onCopyFilled={(p) => handleCopyFilledPrompt(p)}
                  onNotification={triggerNotification}
                  isCommunityView={currentTab === "comunidad"}
                  currentUser={user}
                  onFork={(prompt) => void resolvePublicSavePrompt(prompt)}
                  onLikeToggle={handleLikeToggle}
                  onAuthorClick={openPublicProfile}
                  onViewDetails={setSelectedPublicPrompt}
                  onSocialFavoriteToggle={handleToggleSocialFavorite}
                  onHidePrompt={(prompt) => void handleHideCommunityPrompt(prompt)}
                  onReportPrompt={(prompt) => void handleReportCommunityPrompt(prompt)}
                  isSocialFavorite={socialFavoritePromptIds.has(p.id)}
                  knownRemixCount={knownRemixCountsByPromptId.get(p.id) || 0}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
