import React, { useRef, useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Search,
  Star,
  Tag,
  X,
  FolderOpen,
  Share2,
  BookOpen,
  GitFork,
  Shield,
  Wrench,
  CheckCircle2,
  Youtube,
  Target,
  Cpu,
  HelpCircle,
  Bot,
  Wand2,
  Film,
  Image,
  User as UserIcon,
  Pencil,
  ChevronRight,
  SlidersHorizontal,
  LayoutGrid,
  Download,
  Upload,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { User } from "firebase/auth";
import type { Prompt, Folder, CategoryFilter } from "../types";
import type {
  LibraryViewFilter,
  CommunitySort,
  SelectedAuthor,
  CommunityScope,
} from "../utils/promptFilters";
import PromptCard from "./PromptCard";
import FolderTreeView from "./FolderTreeView";
import CategoryPromptsModal from "./CategoryPromptsModal";

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

// ──────────────────────────────────────────────────────────
// Category config
// ──────────────────────────────────────────────────────────
type CatConfig = {
  name: string;
  icon: React.ReactNode;
  color: string;
  isPrimary?: boolean;
};

const CATEGORY_CONFIG: CatConfig[] = [
  {
    name: "Todas",
    icon: <LayoutGrid size={14} />,
    color: "#94a3b8",
  },
  {
    name: "Refactorización",
    icon: <Wrench size={14} />,
    color: "#a5b4fc",
    isPrimary: true,
  },
  {
    name: "Seguridad",
    icon: <Shield size={14} />,
    color: "#fda4af",
    isPrimary: true,
  },
  {
    name: "Buenas Prácticas",
    icon: <CheckCircle2 size={14} />,
    color: "#6ee7b7",
    isPrimary: true,
  },
  { name: "YouTube", icon: <Youtube size={14} />, color: "#f87171" },
  { name: "Marketing", icon: <Target size={14} />, color: "#fbbf24" },
  { name: "Programación", icon: <Cpu size={14} />, color: "#60a5fa" },
  { name: "IA Agentes", icon: <Bot size={14} />, color: "#c084fc" },
  {
    name: "Asistente de Prompts",
    icon: <Wand2 size={14} />,
    color: "#2dd4bf",
  },
  { name: "Redacción", icon: <Pencil size={14} />, color: "#fb923c" },
  { name: "IA Imágenes", icon: <Image size={14} />, color: "#e879f9" },
  { name: "IA Videos", icon: <Film size={14} />, color: "#f472b6" },
  {
    name: "Acompañante Personal",
    icon: <UserIcon size={14} />,
    color: "#34d399",
  },
  { name: "General", icon: <HelpCircle size={14} />, color: "#64748b" },
  {
    name: "Favoritos",
    icon: <Star size={14} />,
    color: "#fbbf24",
  },
];

const COMMUNITY_CATS: CatConfig[] = CATEGORY_CONFIG.filter((c) =>
  [
    "Todas",
    "YouTube",
    "Marketing",
    "Refactorización",
    "Seguridad",
    "Buenas Prácticas",
    "IA Agentes",
    "Asistente de Prompts",
    "IA Videos",
    "General",
    "Favoritos",
  ].includes(c.name)
);

// ──────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────
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
  showcasePostsCount,
}: LibraryWorkspaceViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategoryPopup, setSelectedCategoryPopup] = useState<
    string | null
  >(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleDragStart = () => setIsDragging(true);
    const handleDragEnd = () => setIsDragging(false);
    window.addEventListener("dragstart", handleDragStart);
    window.addEventListener("dragend", handleDragEnd);
    return () => {
      window.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("dragend", handleDragEnd);
    };
  }, []);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result;
      if (typeof text === "string") await handleImportJSON(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const cats =
    currentTab === "mi-biblioteca" ? CATEGORY_CONFIG : COMMUNITY_CATS;

  const getPromptCount = (catName: string) => {
    const pool =
      currentTab === "mi-biblioteca" ? prompts : visibleCommunityCatalogPrompts;
    if (catName === "Todas") return pool.length;
    if (catName === "Favoritos") return pool.filter((p) => p.isFavorite).length;
    return pool.filter((p) => p.category === catName).length;
  };

  const viewFilters: Array<{ id: LibraryViewFilter; label: string; count: number }> = [
    { id: "todos", label: "Todos", count: prompts.length },
    {
      id: "privados",
      label: "Privados",
      count: prompts.filter((p) => !p.isShared).length,
    },
    {
      id: "publicados",
      label: "Publicados",
      count: prompts.filter((p) => p.isShared).length,
    },
    {
      id: "remixes",
      label: "Remixes",
      count: prompts.filter((p) => p.forkedFromPromptId || p.forkedFrom).length,
    },
    {
      id: "favoritos",
      label: "Mis Favoritos",
      count: prompts.filter((p) => p.isFavorite).length,
    },
  ];

  const isLoading =
    currentTab === "mi-biblioteca" ? loadingPrompts : loadingCommunityPrompts;

  return (
    <div
      className="w-full max-w-7xl mx-auto"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── TOP HEADER BAR ─────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-3 mb-4 px-1"
      >
        {/* Left: title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 rounded-xl border transition-all cursor-pointer flex-shrink-0"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.08)",
              color: "#94a3b8",
            }}
            title="Toggle sidebar"
          >
            <SlidersHorizontal size={15} />
          </button>
          <div className="min-w-0">
            <h2 className="text-base font-black text-white leading-tight truncate">
              {currentTab === "mi-biblioteca"
                ? "Mi Biblioteca"
                : selectedAuthor
                ? `Catálogo · ${selectedAuthor.name}`
                : "Comunidad"}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {currentTab === "mi-biblioteca"
                ? `${prompts.length} prompts guardados`
                : `${filteredPrompts.length} prompts públicos`}
            </p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {currentTab === "mi-biblioteca" && missingDefaultPromptCount > 0 && (
            <button
              id="btn-seed-defaults"
              onClick={() => setShowSeedPackModal(true)}
              disabled={loadingPrompts}
              className="hidden sm:flex px-3 py-2 text-xs font-bold rounded-xl border items-center gap-1.5 cursor-pointer animate-pulse transition-all"
              style={{
                background: "rgba(99,102,241,0.1)",
                borderColor: "rgba(99,102,241,0.25)",
                color: "#a5b4fc",
              }}
            >
              <BookOpen size={13} />
              {prompts.length === 0 ? "Pack inicial" : "Sumar pack"}
            </button>
          )}

          {currentTab === "mi-biblioteca" && (
            <button
              id="btn-open-recommender"
              onClick={() => {
                trackUserEvent("recommendation_open", undefined, {
                  promptsCount: prompts.length,
                  selectedCategory,
                  selectedTags,
                });
                setGeminiRecommendation(null);
                setGeminiRecommendationError("");
                setShowRecommendationModal(true);
              }}
              className="hidden md:flex px-3 py-2 text-xs font-bold rounded-xl border items-center gap-1.5 cursor-pointer transition-all"
              style={{
                background: "rgba(16,185,129,0.08)",
                borderColor: "rgba(16,185,129,0.2)",
                color: "#6ee7b7",
              }}
            >
              <Sparkles size={13} />
              Recomendar
            </button>
          )}

          <button
            id="btn-open-assistant"
            onClick={() => {
              setPresetAItext("");
              setShowAIAssistant(!showAIAssistant);
            }}
            className="flex px-3 py-2 text-xs font-bold rounded-xl border items-center gap-1.5 cursor-pointer transition-all"
            style={
              showAIAssistant
                ? {
                    background: "rgba(244,63,94,0.1)",
                    borderColor: "rgba(244,63,94,0.3)",
                    color: "#fda4af",
                  }
                : {
                    background: "rgba(255,255,255,0.04)",
                    borderColor: "rgba(255,255,255,0.1)",
                    color: "#94a3b8",
                  }
            }
            title="Ctrl+K"
          >
            <Zap size={13} />
            <span className="hidden sm:inline">IA</span>
            <kbd className="hidden lg:inline text-[9px] font-mono opacity-60">
              ⌘K
            </kbd>
          </button>

          <button
            id="btn-open-switcher"
            onClick={() => setShowQuickSwitcher(true)}
            className="flex px-3 py-2 text-xs font-bold rounded-xl border items-center gap-1.5 cursor-pointer transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.1)",
              color: "#94a3b8",
            }}
            title="Ctrl+J"
          >
            <Search size={13} />
            <kbd className="hidden lg:inline text-[9px] font-mono opacity-60">
              ⌘J
            </kbd>
          </button>

          <button
            id="btn-new-prompt"
            onClick={handleOpenAdd}
            className="flex px-4 py-2 text-xs font-extrabold rounded-xl items-center gap-1.5 cursor-pointer transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "white",
              boxShadow: "0 0 16px rgba(99,102,241,0.3)",
            }}
          >
            <Plus size={14} />
            Nuevo Prompt
          </button>
        </div>
      </div>

      {/* ── MAIN LAYOUT: SIDEBAR + CONTENT ─────────────────────── */}
      <div className="flex gap-4 items-start">

        {/* ── LEFT SIDEBAR ─────────────────────────────────────── */}
        {sidebarOpen && (
          <aside
            className="hidden md:flex flex-col gap-2 flex-shrink-0 w-52"
            style={{ minWidth: "13rem" }}
          >
            {/* Category navigation */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.025)",
                borderColor: "rgba(255,255,255,0.07)",
              }}
            >
              <div
                className="px-3 py-2.5 border-b"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Categorías
                </p>
              </div>
              <div className="p-1.5 space-y-0.5">
                {cats.map((cat) => {
                  const count = getPromptCount(cat.name);
                  const isActive = selectedCategory === cat.name;
                  const isPrimary = cat.isPrimary;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => {
                        if (isPrimary) setSelectedCategoryPopup(cat.name);
                        setSelectedCategory(cat.name as CategoryFilter);
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer group"
                      style={{
                        background: isActive
                          ? `${cat.color}18`
                          : "transparent",
                        borderLeft: isActive
                          ? `2px solid ${cat.color}`
                          : "2px solid transparent",
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          style={{
                            color: isActive ? cat.color : "#64748b",
                          }}
                          className="flex-shrink-0 transition-colors group-hover:text-white"
                        >
                          {cat.icon}
                        </span>
                        <span
                          className="text-xs font-semibold truncate transition-colors"
                          style={{
                            color: isActive ? cat.color : "#94a3b8",
                          }}
                        >
                          {cat.name}
                        </span>
                        {isPrimary && (
                          <span
                            className="flex-shrink-0 h-1.5 w-1.5 rounded-full animate-pulse"
                            style={{ background: cat.color }}
                          />
                        )}
                      </div>
                      <span
                        className="text-[10px] font-mono flex-shrink-0"
                        style={{ color: isActive ? cat.color : "#475569" }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Folders — only for mi-biblioteca */}
            {user && currentTab === "mi-biblioteca" && (
              <div
                className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                  isDragging
                    ? "border-dashed border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.01]"
                    : "rgba(255,255,255,0.025)"
                }`}
                style={{
                  background: isDragging ? "rgba(99,102,241,0.05)" : "rgba(255,255,255,0.025)",
                  borderColor: isDragging ? "#6366f1" : "rgba(255,255,255,0.07)",
                }}
              >
                <div
                  className="px-3 py-2.5 border-b flex items-center justify-between"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest transition-all duration-200" style={{ color: isDragging ? "#a5b4fc" : "#64748b" }}>
                    {isDragging ? "Soltar para mover" : "Carpetas"}
                  </p>
                  <button
                    onClick={() => setShowCreateFolder(true)}
                    className="p-1 rounded-lg cursor-pointer transition-all hover:text-white"
                    style={{ color: "#6366f1" }}
                    title="Nueva carpeta"
                  >
                    <Plus size={12} className="stroke-[2.5]" />
                  </button>
                </div>
                <div className="p-2 space-y-1">
                  {/* All / Uncategorized quick filters */}
                  <button
                    onClick={() => setSelectedFolderId(null)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer"
                    style={{
                      background:
                        selectedFolderId === null
                          ? "rgba(99,102,241,0.15)"
                          : "transparent",
                      color: selectedFolderId === null ? "#a5b4fc" : "#64748b",
                    }}
                  >
                    <FolderOpen size={13} />
                    Todo ({prompts.length})
                  </button>
                  <button
                    onClick={() => setSelectedFolderId("uncategorized")}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverFolderId("uncategorized");
                    }}
                    onDragLeave={() => setDragOverFolderId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverFolderId(null);
                      const promptId = e.dataTransfer.getData("text/plain");
                      if (promptId) handleMovePromptToFolder(promptId, null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer"
                    style={{
                      background:
                        selectedFolderId === "uncategorized"
                          ? "rgba(99,102,241,0.15)"
                          : dragOverFolderId === "uncategorized"
                          ? "rgba(251,191,36,0.15)"
                          : "transparent",
                      color:
                        selectedFolderId === "uncategorized"
                          ? "#a5b4fc"
                          : "#64748b",
                    }}
                  >
                    <FolderOpen size={13} />
                    Sin carpeta ({prompts.filter((p) => !p.folderId).length})
                  </button>

                  {loadingFolders ? (
                    <p className="text-[10px] text-slate-500 italic px-2.5 py-1">
                      Cargando...
                    </p>
                  ) : folders.length === 0 ? (
                    <p className="text-[10px] text-slate-600 italic px-2.5 py-1">
                      Sin carpetas aún
                    </p>
                  ) : (
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
                  )}
                </div>
              </div>
            )}

            {/* Import / Export */}
            {user && currentTab === "mi-biblioteca" && (
              <div
                className="rounded-2xl border p-2 flex flex-col gap-1"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              >
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
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                >
                  <Upload size={12} />
                  Importar JSON
                </button>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                >
                  <Download size={12} />
                  Exportar JSON
                </button>
              </div>
            )}
          </aside>
        )}

        {/* ── MAIN CONTENT AREA ──────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* ── SEARCH + FILTER STRIP ──────────────────────────── */}
          <div
            className="rounded-2xl border p-3 space-y-3"
            style={{
              background: "rgba(255,255,255,0.025)",
              borderColor: "rgba(255,255,255,0.07)",
            }}
          >
            {/* Search row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 w-full shrink-0">
              {/* Unified Search Omnibar */}
              <div className="relative flex-1" id="tag-autocomplete-container">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    const words = val.split(" ");
                    const lastWord = words[words.length - 1];
                    if (lastWord.startsWith("#")) {
                      setTagSearchInput(lastWord.substring(1));
                      setIsTagDropdownOpen(true);
                    } else {
                      setIsTagDropdownOpen(false);
                    }
                  }}
                  onFocus={(e) => {
                    setIsTagDropdownOpen(true);
                    e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  }}
                  placeholder="Buscar por título, texto o etiqueta (ej: #ia)..."
                  className="w-full text-xs rounded-xl border py-2.5 pl-9.5 pr-20 outline-none transition-all text-white placeholder-slate-650"
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                />
                
                {/* Visual indicator for tag search dropdown list triggers */}
                <button
                  type="button"
                  onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-pink-400 hover:text-pink-300 font-extrabold border border-pink-500/20 bg-pink-500/5 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Tag size={10} />
                  <span>Tags</span>
                </button>

                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setIsTagDropdownOpen(false);
                    }}
                    className="absolute right-20 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer mr-2"
                  >
                    <X size={13} />
                  </button>
                )}

                {isTagDropdownOpen && tagSuggestions.length > 0 && (
                  <div
                    className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border shadow-2xl z-50 overflow-hidden"
                    style={{
                      background: "#0f172a",
                      borderColor: "rgba(255,255,255,0.1)",
                    }}
                  >
                    <div className="max-h-40 overflow-y-auto p-1.5 space-y-0.5">
                      <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-2.5 py-1 border-b border-slate-800 flex items-center justify-between">
                        <span>Filtro de etiquetas</span>
                        <span className="text-[8px] bg-slate-900 px-1.5 py-0.5 rounded text-indigo-400 font-mono">
                          {tagSuggestions.length}
                        </span>
                      </div>
                      {tagSuggestions.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            if (!selectedTags.includes(tag))
                              setSelectedTags([...selectedTags, tag]);
                            
                            // Remove partial #tag query from search input
                            const words = searchQuery.split(" ");
                            if (words[words.length - 1].startsWith("#")) {
                              words.pop();
                              setSearchQuery(words.join(" "));
                            }
                            setTagSearchInput("");
                            setIsTagDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800 flex items-center justify-between cursor-pointer transition-all"
                        >
                          <span className="font-bold text-pink-400">
                            #{tag}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {(currentTab === "mi-biblioteca"
                              ? prompts
                              : visibleCommunityCatalogPrompts
                            ).filter((p) =>
                              p.tags?.some(
                                (t) => t.toLowerCase() === tag.toLowerCase()
                              )
                            ).length}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Active tag badges */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Tags:
                </span>
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: "rgba(236,72,153,0.1)",
                      borderColor: "rgba(236,72,153,0.25)",
                      color: "#f472b6",
                    }}
                  >
                    #{tag}
                    <button
                      onClick={() =>
                        setSelectedTags(selectedTags.filter((t) => t !== tag))
                      }
                      className="cursor-pointer hover:text-white ml-0.5"
                    >
                      <X size={9} className="stroke-[3]" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => setSelectedTags([])}
                  className="text-[10px] text-pink-500 hover:text-pink-300 font-bold cursor-pointer underline"
                >
                  Limpiar
                </button>
              </div>
            )}

            {/* Mobile categories scroll (hidden on md+) */}
            <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {cats.map((cat) => {
                const isActive = selectedCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => {
                      if (cat.isPrimary) setSelectedCategoryPopup(cat.name);
                      setSelectedCategory(cat.name as CategoryFilter);
                    }}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap flex items-center gap-1 cursor-pointer transition-all"
                    style={{
                      background: isActive ? `${cat.color}22` : "rgba(255,255,255,0.04)",
                      borderColor: isActive ? cat.color : "rgba(255,255,255,0.08)",
                      color: isActive ? cat.color : "#64748b",
                    }}
                  >
                    {cat.icon}
                    {cat.name}
                    {cat.isPrimary && (
                      <span
                        className="h-1.5 w-1.5 rounded-full animate-pulse"
                        style={{ background: cat.color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── VIEW FILTER TABS (mi-biblioteca only) ──────────── */}
          {user && currentTab === "mi-biblioteca" && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {viewFilters.map((f) => {
                const isActive = libraryViewFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setLibraryViewFilter(f.id)}
                    className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all"
                    style={{
                      background: isActive
                        ? "rgba(99,102,241,0.15)"
                        : "rgba(255,255,255,0.03)",
                      borderColor: isActive
                        ? "rgba(99,102,241,0.4)"
                        : "rgba(255,255,255,0.07)",
                      color: isActive ? "#a5b4fc" : "#64748b",
                    }}
                  >
                    <span>{f.label}</span>
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg"
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        color: isActive ? "#a5b4fc" : "#475569",
                      }}
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}

              {/* Social favorites shortcut */}
              {socialFavorites.length > 0 && (
                <button
                  onClick={() => {
                    setCommunityScope("favoritos");
                    setSelectedAuthor(null);
                    setSelectedCategory("Todas");
                  }}
                  className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all"
                  style={{
                    background: "rgba(251,191,36,0.08)",
                    borderColor: "rgba(251,191,36,0.2)",
                    color: "#fbbf24",
                  }}
                >
                  <Star size={12} fill="currentColor" />
                  Favoritos sociales
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg bg-black/30">
                    {socialFavorites.length}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* ── STATS STRIP ────────────────────────────────────── */}
          {user && currentTab === "mi-biblioteca" && (
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-2"
            >
              {[
                {
                  label: "Privados",
                  value: prompts.filter((p) => !p.isShared).length,
                  color: "#94a3b8",
                },
                {
                  label: "Publicados",
                  value: prompts.filter((p) => p.isShared).length,
                  color: "#6ee7b7",
                },
                {
                  label: "Remixes",
                  value: prompts.filter(
                    (p) => p.forkedFromPromptId || p.forkedFrom
                  ).length,
                  color: "#f472b6",
                },
                {
                  label: "Favoritos propios",
                  value: prompts.filter((p) => p.isFavorite).length,
                  color: "#fbbf24",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-3 rounded-2xl border px-3.5 py-3"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderColor: "rgba(255,255,255,0.06)",
                  }}
                >
                  <p
                    className="text-xl font-black"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-tight">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Results count */}
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] text-slate-500">
              {isLoading ? (
                "Cargando..."
              ) : (
                <>
                  <span className="font-bold text-slate-300">
                    {filteredPrompts.length}
                  </span>{" "}
                  {filteredPrompts.length === 1 ? "resultado" : "resultados"}
                  {selectedCategory !== "Todas" && (
                    <span className="ml-1 text-slate-600">
                      · {selectedCategory}
                    </span>
                  )}
                </>
              )}
            </p>
            {(searchQuery || selectedTags.length > 0 || selectedCategory !== "Todas") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTags([]);
                  setSelectedCategory("Todas");
                }}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer flex items-center gap-1"
              >
                <X size={10} />
                Limpiar filtros
              </button>
            )}
          </div>

          {/* ── PROMPTS GRID ──────────────────────────────────── */}
          {isLoading ? (
            <div className="py-24 flex flex-col items-center gap-4">
              <div
                className="w-10 h-10 rounded-full border-4 border-t-indigo-500 animate-spin"
                style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "#6366f1" }}
              />
              <p className="text-xs text-slate-500">
                {currentTab === "mi-biblioteca"
                  ? "Sincronizando biblioteca..."
                  : "Cargando comunidad..."}
              </p>
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div
              className="rounded-3xl border border-dashed p-12 text-center space-y-4"
              style={{
                background: "rgba(255,255,255,0.015)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border animate-pulse"
                style={{
                  background: "rgba(99,102,241,0.1)",
                  borderColor: "rgba(99,102,241,0.2)",
                  color: "#a5b4fc",
                }}
              >
                <FolderOpen size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm">
                  Sin resultados
                </h3>
                <p className="text-slate-500 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
                  {currentTab === "mi-biblioteca"
                    ? prompts.length === 0
                      ? "Tu biblioteca está lista. Elige un pack para empezar o crea tu primer prompt."
                      : "No hay prompts que coincidan con los filtros actuales."
                    : "No hay prompts en la comunidad que coincidan con los filtros."}
                </p>
              </div>
              {currentTab === "mi-biblioteca" && missingDefaultPromptCount > 0 && (
                <button
                  onClick={() => setShowSeedPackModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer transition-all"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #ec4899)",
                  }}
                >
                  <BookOpen size={13} />
                  {prompts.length === 0 ? "Elegir pack inicial" : "Sumar prompts del pack"}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout">
                {filteredPrompts.map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 26,
                      mass: 0.8,
                      opacity: { duration: 0.18 },
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
                      onHidePrompt={(prompt) =>
                        void handleHideCommunityPrompt(prompt)
                      }
                      onReportPrompt={(prompt) =>
                        void handleReportCommunityPrompt(prompt)
                      }
                      isSocialFavorite={socialFavoritePromptIds.has(p.id)}
                      knownRemixCount={
                        knownRemixCountsByPromptId.get(p.id) || 0
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ── SUITE POPUP OVERLAY ────────────────────────────────── */}
      {selectedCategoryPopup && (
        <CategoryPromptsModal
          isOpen={true}
          onClose={() => setSelectedCategoryPopup(null)}
          category={selectedCategoryPopup}
          prompts={prompts}
          onCopyFilledPrompt={handleCopyFilledPrompt}
          onUsePrompt={handleUsePrompt}
          user={user}
        />
      )}
    </div>
  );
}
