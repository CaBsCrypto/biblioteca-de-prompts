import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs
} from "firebase/firestore";
import {
  Sparkles,
  Plus,
  Search,
  LogOut,
  FolderOpen,
  Filter,
  Check,
  Zap,
  Youtube,
  BookOpen,
  Calendar,
  Star,
  Users,
  ArrowRight,
  X,
  Tag,
  Globe,
  Share2,
  StickyNote,
  Copy,
  Play,
  ArrowLeft,
  UserCheck,
  UserPlus
} from "lucide-react";

import { auth, db } from "./firebase";
import { motion, AnimatePresence } from "motion/react";
import { Prompt, CategoryFilter, Folder } from "./types";
import PromptCard from "./components/PromptCard";
import PromptFormModal from "./components/PromptFormModal";
import PromptFillerModal from "./components/PromptFillerModal";
import CopyFilledModal from "./components/CopyFilledModal";
import AIHelperPanel from "./components/AIHelperPanel";
import QuickSwitcherModal from "./components/QuickSwitcherModal";
import RecommendationModal, { GeminiRecommendationResult } from "./components/RecommendationModal";
import ProfileModal from "./components/ProfileModal";
import CreateFolderModal from "./components/CreateFolderModal";
import ShareFolderModal from "./components/ShareFolderModal";
import SharedPromptModal from "./components/SharedPromptModal";
import ActivationChecklist from "./components/ActivationChecklist";
import { useAuthProfile } from "./hooks/useAuthProfile";
import { usePromptEvents } from "./hooks/usePromptEvents";
import { usePromptLibrary } from "./hooks/usePromptLibrary";
import { useFolders } from "./hooks/useFolders";
import { useCommunity } from "./hooks/useCommunity";
import { buildLocalRecommendations } from "./utils/recommendations";
import { getActivationChecklistState, type ActivationStepId } from "./utils/activationChecklist";
import { DEFAULT_PROMPTS } from "./data";
import {
  combineSearchablePrompts,
  filterPrompts,
  getAuthorProfileStats,
  getAvailableTags,
  getPublicFeaturedPrompts,
  getTagSuggestions
} from "./utils/promptFilters";

const FOUNDER_PACK_USER_ID = "founder-pack";

export default function App() {
  // Social / Community navigation
  const [currentTab, setCurrentTab] = useState<"mi-biblioteca" | "comunidad">("mi-biblioteca");

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("Todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagSearchInput, setTagSearchInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  // Close tag autocomplete dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const container = document.getElementById("tag-autocomplete-container");
      if (container && !container.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Modals / Panels togglers
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [usingPrompt, setUsingPrompt] = useState<Prompt | null>(null);
  const [copyingFilledPrompt, setCopyingFilledPrompt] = useState<Prompt | null>(null);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  const [recommendationGoal, setRecommendationGoal] = useState("");
  const [geminiRecommendation, setGeminiRecommendation] = useState<GeminiRecommendationResult | null>(null);
  const [geminiRecommendationLoading, setGeminiRecommendationLoading] = useState(false);
  const [geminiRecommendationError, setGeminiRecommendationError] = useState("");
  const [presetAItext, setPresetAItext] = useState("");

  // Notifications feedback State
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);

  const triggerNotification = (message: string, type: "success" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const {
    user,
    currentUserProfile,
    authLoading,
    showProfileModal,
    setShowProfileModal,
    profileNameInput,
    setProfileNameInput,
    profileHandleInput,
    setProfileHandleInput,
    profileBioInput,
    setProfileBioInput,
    isSavingProfile,
    handleSignIn,
    handleSignOut,
    handleOpenProfileModal,
    handleSaveProfile,
    getAuthorIdentity,
    normalizeProfileHandle,
    buildProfileHandle
  } = useAuthProfile({
    onNotification: triggerNotification,
    onAfterSignOut: () => {
      setSelectedCategory("Todas");
      setSearchQuery("");
      setShowAIAssistant(false);
    }
  });

  const {
    prompts,
    loadingPrompts,
    setLoadingPrompts,
    handleSeedDefaults,
    handleSavePrompt,
    handleFavoriteToggle,
    handleDeletePrompt,
    handleImportFromAI
  } = usePromptLibrary({
    user,
    editingPrompt,
    setEditingPrompt,
    setShowFormModal,
    getAuthorIdentity,
    onNotification: triggerNotification
  });

  const {
    folders,
    loadingFolders,
    selectedFolderId,
    setSelectedFolderId,
    showCreateFolder,
    setShowCreateFolder,
    newFolderName,
    setNewFolderName,
    newFolderDesc,
    setNewFolderDesc,
    isSavingFolder,
    showShareFolderModal,
    setShowShareFolderModal,
    isFolderSharedInput,
    setIsFolderSharedInput,
    publishFolderPromptsInput,
    setPublishFolderPromptsInput,
    isSavingFolderShare,
    dragOverFolderId,
    setDragOverFolderId,
    closeCreateFolderModal,
    handleCreateFolder,
    handleDeleteFolder,
    handleOpenShareFolderModal,
    handleSaveFolderShareSettings,
    handleMovePromptToFolder
  } = useFolders({
    user,
    prompts,
    getAuthorIdentity,
    onNotification: triggerNotification
  });

  const { userEvents, promptEventScores, trackUserEvent } = usePromptEvents(user);

  const handleOpenEdit = (p: Prompt) => {
    trackUserEvent("edit", p);
    setEditingPrompt(p);
    setShowFormModal(true);
  };

  const {
    communityPrompts,
    loadingCommunityPrompts,
    communityScope,
    setCommunityScope,
    selectedAuthor,
    setSelectedAuthor,
    followedCreatorUids,
    handleLikeToggle,
    handleForkPrompt,
    handleToggleFollowCreator,
    handleSelectAuthor
  } = useCommunity({
    user,
    prompts,
    setCurrentTab,
    setLoadingPrompts,
    onOpenEdit: handleOpenEdit,
    getAuthorIdentity,
    onNotification: triggerNotification
  });

  const founderPackPrompts = useMemo<Prompt[]>(() => {
    return DEFAULT_PROMPTS.map((prompt, index) => ({
      ...prompt,
      id: `founder-pack-${index + 1}`,
      userId: FOUNDER_PACK_USER_ID,
      isShared: true,
      authorName: "Pack Fundador",
      authorAvatar: "",
      authorHandle: "pack-fundador",
      likedBy: [],
      likesCount: 0,
      createdAt: null,
      updatedAt: null
    }));
  }, []);

  const communityCatalogPrompts = useMemo(() => {
    const communityIds = new Set(communityPrompts.map((prompt) => prompt.id));
    return [
      ...founderPackPrompts.filter((prompt) => !communityIds.has(prompt.id)),
      ...communityPrompts
    ];
  }, [communityPrompts, founderPackPrompts]);

  // Shared public prompt state managers
  const [sharedPromptId, setSharedPromptId] = useState<string | null>(null);
  const [sharedPrompt, setSharedPrompt] = useState<Prompt | null>(null);
  const [loadingSharedPrompt, setLoadingSharedPrompt] = useState(false);

  // Shared collections states
  const [sharedCollectionId, setSharedCollectionId] = useState<string | null>(null);
  const [sharedCollection, setSharedCollection] = useState<Folder | null>(null);
  const [sharedCollectionPrompts, setSharedCollectionPrompts] = useState<Prompt[]>([]);
  const [loadingSharedCollection, setLoadingSharedCollection] = useState(false);

  // Global Keyboard Shortcuts (Ctrl+K/Cmd+K for AI Helper, Ctrl+J/Cmd+J for Quick Switcher)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle AI helper panel
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPresetAItext("");
        setShowAIAssistant((prev) => {
          const next = !prev;
          triggerNotification(
            next ? "Asistente de Prompts IA abierto" : "Asistente de Prompts IA cerrado",
            "info"
          );
          return next;
        });
      }

      // Toggle Quick Switcher modal
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setShowQuickSwitcher((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // 1.5 Detect and fetch shared prompt or collection on mount
  useEffect(() => {
    const checkShareParam = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const shareId = searchParams.get("share");
      const colId = searchParams.get("collection");
      
      if (shareId) {
        setSharedPromptId(shareId);
        setLoadingSharedPrompt(true);
        try {
          const docRef = doc(db, "prompts", shareId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.isShared) {
              setSharedPrompt({
                id: docSnap.id,
                ...data
              } as Prompt);
              triggerNotification("Prompt compartido cargado.", "success");
            } else {
              triggerNotification("Este prompt no está marcado como público.", "info");
              setSharedPrompt(null);
            }
          } else {
            triggerNotification("El prompt compartido no existe.", "info");
            setSharedPrompt(null);
          }
        } catch (error) {
          console.error("Error fetching shared prompt:", error);
          triggerNotification("Error al intentar obtener el prompt compartido.", "info");
        } finally {
          setLoadingSharedPrompt(false);
        }
      }

      if (colId) {
        setSharedCollectionId(colId);
        setLoadingSharedCollection(true);
        try {
          const docRef = doc(db, "folders", colId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const folderData = docSnap.data() as Folder;
            if (folderData.isShared) {
              setSharedCollection({
                id: docSnap.id,
                ...folderData
              });
              
              // Now fetch all prompts in this folder
              const promptsQuery = query(
                collection(db, "prompts"),
                where("folderId", "==", colId),
                where("isShared", "==", true)
              );
              const pSnap = await getDocs(promptsQuery);
              const pList: Prompt[] = [];
              pSnap.forEach((d) => {
                pList.push({
                  id: d.id,
                  ...d.data()
                } as Prompt);
              });
              setSharedCollectionPrompts(pList);
              triggerNotification("Colección compartida cargada.", "success");
            } else {
              triggerNotification("Esta colección no está marcada como pública o está inactiva.", "info");
              setSharedCollection(null);
            }
          } else {
            triggerNotification("La colección solicitada no existe.", "info");
            setSharedCollection(null);
          }
        } catch (error) {
          console.error("Error fetching shared collection:", error);
          triggerNotification("Error al obtener la colección compartida.", "info");
          setSharedCollection(null);
        } finally {
          setLoadingSharedCollection(false);
        }
      }
    };
    checkShareParam();
  }, []);

  // Direct Option: Open Form creation
  const handleOpenAdd = () => {
    setEditingPrompt(null);
    setShowFormModal(true);
  };

  const handleCloseShared = () => {
    setSharedPrompt(null);
    // Clean query parameter from address bar without reloading
    const url = new URL(window.location.href);
    url.searchParams.delete("share");
    window.history.replaceState({}, "", url.toString());
  };

  const handleUsePrompt = (prompt: Prompt, source = "library") => {
    trackUserEvent(source === "recommendation" ? "recommendation_use" : "use", prompt, { source });
    setUsingPrompt(prompt);
  };

  const handleCopyFilledPrompt = (prompt: Prompt) => {
    trackUserEvent("copy", prompt, { mode: "filled" });
    setCopyingFilledPrompt(prompt);
  };

  // Live trigger optimize with AI directly from Form
  const handleOptimizeWithAIDirect = (promptText: string) => {
    setShowFormModal(false);
    setPresetAItext(promptText);
    setShowAIAssistant(true);
  };

  const handleActivationAction = (stepId: ActivationStepId) => {
    if (stepId === "seed") {
      handleSeedDefaults();
      return;
    }

    if (stepId === "use") {
      setCurrentTab("mi-biblioteca");
      setSelectedCategory("Todas");
      setSelectedFolderId(null);
      triggerNotification("Abre una tarjeta y usa Copiar, Copiar Relleno o Usar para completar este paso.", "info");
      return;
    }

    if (stepId === "remix") {
      setCurrentTab("comunidad");
      setSelectedCategory("Todas");
      setSelectedAuthor(null);
      setCommunityScope("todos");
      triggerNotification("Elige un prompt comunitario y pulsa Clonar para crear tu remix editable.", "info");
      return;
    }

    if (stepId === "folder") {
      setCurrentTab("mi-biblioteca");
      setShowCreateFolder(true);
      return;
    }

    if (stepId === "share") {
      setCurrentTab("mi-biblioteca");
      const promptToShare = prompts.find((prompt) => !prompt.isShared) || prompts[0];
      if (promptToShare) {
        handleOpenEdit(promptToShare);
        triggerNotification("Activa Permitir compartir publicamente y guarda para completar este paso.", "info");
      } else {
        triggerNotification("Primero crea o carga prompts para poder publicar uno.", "info");
      }
    }
  };

  // 7. Filtering and Searching Locally For ultra responsive actions
  const filteredPrompts = useMemo(() => {
    return filterPrompts({
      prompts,
      communityPrompts: communityCatalogPrompts,
      currentTab,
      selectedAuthor,
      communityScope,
      followedCreatorUids,
      selectedCategory,
      searchQuery,
      selectedTags,
      selectedFolderId
    });
  }, [prompts, communityCatalogPrompts, currentTab, selectedCategory, searchQuery, selectedTags, selectedAuthor, selectedFolderId, communityScope, followedCreatorUids]);

  const defaultPromptTitles = useMemo(
    () => new Set(DEFAULT_PROMPTS.map((prompt) => prompt.title.trim().toLocaleLowerCase("es"))),
    []
  );
  const existingDefaultPromptCount = useMemo(() => {
    const matchedTitles = new Set(
      prompts
        .map((prompt) => prompt.title.trim().toLocaleLowerCase("es"))
        .filter((title) => defaultPromptTitles.has(title))
    );

    return matchedTitles.size;
  }, [defaultPromptTitles, prompts]);
  const missingDefaultPromptCount = Math.max(DEFAULT_PROMPTS.length - existingDefaultPromptCount, 0);
  const activationChecklistState = useMemo(() => getActivationChecklistState({
    prompts,
    folders,
    userEvents,
    defaultPromptTitles,
    defaultPromptsTotal: DEFAULT_PROMPTS.length
  }), [prompts, folders, userEvents, defaultPromptTitles]);

  const allAvailableTags = useMemo(() => {
    return getAvailableTags({
      prompts,
      communityPrompts: communityCatalogPrompts,
      currentTab,
      selectedAuthor,
      communityScope,
      followedCreatorUids
    });
  }, [prompts, communityCatalogPrompts, currentTab, selectedAuthor, communityScope, followedCreatorUids]);

  const tagSuggestions = useMemo(() => {
    return getTagSuggestions(allAvailableTags, tagSearchInput, selectedTags);
  }, [allAvailableTags, tagSearchInput, selectedTags]);

  const recommendedPrompts = useMemo(() => {
    return buildLocalRecommendations({
      prompts,
      goal: recommendationGoal,
      selectedCategory,
      selectedTags,
      promptEventScores
    });
  }, [prompts, recommendationGoal, selectedCategory, selectedTags, promptEventScores]);

  const handleImproveRecommendationsWithGemini = async () => {
    if (!user || !auth.currentUser) {
      triggerNotification("Inicia sesion para usar Gemini en el recomendador.", "info");
      return;
    }

    if (!recommendationGoal.trim()) {
      setGeminiRecommendationError("Escribe primero el objetivo que quieres lograr.");
      return;
    }

    const candidates = (recommendedPrompts.length > 0 ? recommendedPrompts : prompts.slice(0, 5).map((prompt) => ({
      prompt,
      score: prompt.isFavorite ? 4 : 1,
      reasons: prompt.isFavorite ? ["Favorito de tu biblioteca."] : ["Candidato general de tu biblioteca."]
    }))).slice(0, 8);

    if (candidates.length === 0) {
      setGeminiRecommendationError("Necesitas al menos un prompt en tu biblioteca para comparar candidatos.");
      return;
    }

    setGeminiRecommendationLoading(true);
    setGeminiRecommendationError("");
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/ai/recomendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          goal: recommendationGoal.trim(),
          filters: {
            category: selectedCategory,
            tags: selectedTags
          },
          candidates: candidates.map(({ prompt, score, reasons }) => ({
            id: prompt.id,
            title: prompt.title,
            description: prompt.description || "",
            category: prompt.category,
            tags: prompt.tags || [],
            isFavorite: prompt.isFavorite,
            likesCount: prompt.likesCount || 0,
            score,
            reasons
          }))
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo mejorar la recomendacion con Gemini.");
      }

      setGeminiRecommendation(data);
      triggerNotification("Gemini reviso tus candidatos locales.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gemini no respondio correctamente.";
      setGeminiRecommendationError(message);
    } finally {
      setGeminiRecommendationLoading(false);
    }
  };

  const allSearchablePrompts = useMemo(() => {
    return combineSearchablePrompts(prompts, communityCatalogPrompts);
  }, [prompts, communityCatalogPrompts]);

  const authorProfileStats = useMemo(() => {
    return getAuthorProfileStats(communityCatalogPrompts, selectedAuthor);
  }, [communityCatalogPrompts, selectedAuthor]);

  const publicFeaturedPrompts = useMemo(() => {
    return getPublicFeaturedPrompts(communityCatalogPrompts);
  }, [communityCatalogPrompts]);

  // Statistics counters
  const favoritesCount = useMemo(() => prompts.filter((p) => p.isFavorite).length, [prompts]);
  const youtubeCount = useMemo(() => prompts.filter((p) => p.category === "YouTube").length, [prompts]);

  return (
    <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(circle_at_top_right,#1e1b4b,#0f172a)] text-slate-100 flex flex-col font-sans selection:bg-pink-500/30 selection:text-white transition-colors duration-200">
      
      {/* Toast Notification HUD */}
      {notification && (
        <div
          id="toast-hud"
          className={`fixed left-4 right-4 bottom-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 px-4 sm:px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            notification.type === "success"
              ? "bg-[#1e293b]/95 border-indigo-500/40 backdrop-blur-md shadow-[0_0_20px_rgba(99,102,241,0.15)] text-white"
              : "bg-slate-900 border-slate-800 text-white"
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check size={12} className="stroke-[3]" />
          </div>
          <span className="text-xs font-bold font-sans">{notification.message}</span>
        </div>
      )}

      {/* Main Top Header Navigation */}
      <header id="main-app-header" className="bg-[#1e293b]/75 border-b border-[#334155]/60 backdrop-blur-md py-3.5 px-4 md:px-12 flex items-center justify-between gap-3 sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#4f46e5] to-[#ec4899] text-white flex items-center justify-center shadow-lg shadow-indigo-600/10 shrink-0">
            <Zap size={18} fill="currentColor" className="text-yellow-300 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-white text-sm sm:text-md leading-tight font-sans tracking-tight flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="bg-gradient-to-r from-[#818cf8] to-[#ec4899] bg-clip-text text-transparent truncate">Biblioteca de Prompts</span>
              <span className="hidden min-[430px]:inline bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest leading-none shrink-0">
                Creadores IA
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-sans hidden sm:block">
              Instrucciones y guias optimizadas listas para tus videos de YouTube
            </p>
          </div>
        </div>

        {/* Right Header Navigation - Auth State panel */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-3 bg-slate-900/60 p-1.5 sm:pr-4 rounded-2xl border border-slate-800">
              {(currentUserProfile?.photoURL || user.photoURL) ? (
                <img
                  src={currentUserProfile?.photoURL || user.photoURL || ""}
                  referrerPolicy="no-referrer"
                  alt={currentUserProfile?.displayName || user.displayName || "Usuario"}
                  className="w-8 h-8 rounded-xl object-cover hover:rotate-6 transition-transform"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-pink-600 text-white font-bold rounded-xl flex items-center justify-center text-xs">
                  {(currentUserProfile?.displayName || user.displayName)?.charAt(0) || "U"}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-[10px] font-extrabold text-slate-200 leading-tight">
                  {currentUserProfile?.displayName || user.displayName}
                </p>
                <p className="text-[8px] text-slate-400 leading-none">
                  @{currentUserProfile?.handle || buildProfileHandle(user)}
                </p>
              </div>
              <button
                id="btn-edit-profile"
                onClick={handleOpenProfileModal}
                className="p-2 sm:p-1 sm:px-2.5 bg-slate-800 hover:bg-indigo-500/15 hover:text-indigo-300 rounded-lg border border-slate-700 text-xs font-bold transition-all sm:ml-1.5 flex items-center gap-1 cursor-pointer"
                title="Editar perfil publico"
              >
                <UserCheck size={12} />
                <span className="hidden md:inline">Perfil</span>
              </button>
              <button
                id="btn-logout"
                onClick={handleSignOut}
                className="p-2 sm:p-1 sm:px-2.5 bg-slate-800 hover:bg-red-500/15 hover:text-red-400 rounded-lg border border-slate-700 text-xs font-bold transition-all sm:ml-1.5 flex items-center gap-1 cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut size={12} />
                <span className="hidden md:inline">Cerrar</span>
              </button>
            </div>
          ) : (
            !authLoading && (
              <button
                id="btn-google-login"
                onClick={handleSignIn}
                className="px-3 sm:px-5 py-2.5 bg-gradient-to-r from-[#4f46e5] to-[#ec4899] hover:opacity-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/10 active:scale-[0.98] cursor-pointer"
              >
                <svg className="w-4 h-4 mr-0.5" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.62-.18-1.18-.46-1.59-.81z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
                <span className="hidden min-[390px]:inline">Conectar Google</span>
                <span className="min-[390px]:hidden">Google</span>
              </button>
            )
          )}
        </div>
      </header>

      {/* Main Core Area layout */}
      {sharedCollection ? (
        <div className="flex-1 overflow-y-auto px-4 py-8 md:px-12 md:py-12 max-w-6xl mx-auto w-full space-y-6 md:space-y-8 animate-in fade-in duration-300">
          {/* Header of the Shared Collection */}
          <div className="bg-[#1e293b]/50 rounded-2xl md:rounded-3xl p-5 md:p-8 border border-slate-700/60 shadow-2xl space-y-6 relative overflow-hidden transition-all duration-300">
            <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-indigo-600/10 blur-[80px] pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <Globe size={11} className="animate-pulse" />
                    Colección Pública Compartida
                  </span>
                </div>
                <h2 className="text-3xl font-black text-white leading-tight">{sharedCollection.name}</h2>
                <p className="text-sm text-slate-400 font-sans max-w-2xl leading-relaxed">
                  {sharedCollection.description || "Esta colección no tiene una descripción adicional."}
                </p>
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-400 font-bold font-sans">
                  <span>Creador:</span>
                  <span className="text-pink-400 font-extrabold">{sharedCollection.authorName || "Miembro de la biblioteca"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setSharedCollection(null);
                    // Clear the query parameter
                    const url = new URL(window.location.href);
                    url.searchParams.delete("collection");
                    window.history.replaceState({}, "", url.toString());
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#9333ea] hover:opacity-95 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-[0.98]"
                >
                  <ArrowLeft size={14} />
                  <span>Ir a la Biblioteca General</span>
                </button>
              </div>
            </div>
          </div>

          {/* List or grid of public prompts inside this collection */}
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2 font-sans">
                <span>Prompts en esta Colección</span>
                <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 rounded-full px-2.5 py-0.5 text-[11px] font-black pointer-events-none">
                  {sharedCollectionPrompts.length}
                </span>
              </h3>
            </div>

            {loadingSharedCollection ? (
              <div className="text-center py-24 space-y-4">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin mx-auto"></div>
                <p className="text-xs text-slate-400 italic font-sans animate-pulse">Cargando los prompts de la colección...</p>
              </div>
            ) : sharedCollectionPrompts.length === 0 ? (
              <div className="text-center py-24 bg-[#1e293b]/25 rounded-3xl border border-dashed border-slate-800 text-slate-400 space-y-2">
                <p className="text-sm font-bold">Esta colección no tiene ningún prompt guardado o visible aún.</p>
                <p className="text-xs font-sans text-slate-500">Los prompts agregados a esta carpeta por su creador aparecerán aquí en tiempo real.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sharedCollectionPrompts.map((p) => (
                  <PromptCard
                    key={p.id}
                    prompt={p}
                    folders={[]}
                    onFavoriteToggle={() => {}}
                    onEdit={handleOpenEdit}
                    onDelete={() => {}}
                    onUse={(p) => handleUsePrompt(p, "shared_collection")}
                    onCopyFilled={(p) => handleCopyFilledPrompt(p)}
                    onNotification={triggerNotification}
                    isCommunityView={true}
                    currentUser={user}
                    onFork={handleForkPrompt}
                    onLikeToggle={handleLikeToggle}
                    onAuthorClick={handleSelectAuthor}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left Side: Prompts Viewer Grid and category bar */}
        <main className="flex-1 overflow-y-auto p-4 md:p-12 space-y-6 md:space-y-8">
          
          {/* Welcome Dashboard Block if offline/unauthenticated */}
          {!user && !authLoading ? (
            <div id="welcome-callout" className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-white rounded-2xl md:rounded-3xl p-5 md:p-12 shadow-2xl border border-slate-700/80 space-y-6 relative overflow-hidden max-w-4xl mx-auto">
              {/* background vector accent spheres */}
              <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-violet-600/10 blur-[80px] pointer-events-none"></div>
              <div className="absolute left-1/3 bottom-0 w-60 h-60 rounded-full bg-pink-500/5 blur-[60px] pointer-events-none"></div>

              <div className="space-y-3 relative z-10 max-w-2xl">
                <span className="font-extrabold uppercase tracking-widest text-[9px] text-pink-400 bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.15)]">
                  Herramienta de Canal Educativo
                </span>
                <h2 className="text-2xl md:text-3.5xl font-extrabold tracking-tight leading-tight">
                  Tu biblioteca integrada para Almacenar, Rellenar y Crear Prompts Inteligentes
                </h2>
                <p className="text-slate-350 text-sm leading-relaxed font-sans">
                  ¿Vas a enseñar Inteligencia Artificial en YouTube? Esta biblioteca te permite tener todas las plantillas de instrucciones organizadas en un solo lugar. Rellena variables en vivo para tus espectadores y optimiza cualquier prompt básico al instante mediante el Asistente IA de Gemini.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 pt-2 relative z-10">
                <button
                  id="btn-callout-login"
                  onClick={handleSignIn}
                  className="px-6 py-3 bg-gradient-to-r from-[#4f46e5] to-[#ec4899] text-white font-bold rounded-xl text-xs flex items-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] cursor-pointer"
                >
                  <span>Empezar con Google</span>
                  <ArrowRight size={14} className="text-white" />
                </button>
              </div>

              {/* Bento Row points */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-700/60 relative z-10 text-xs">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-indigo-400 flex items-center gap-1">
                    <Zap size={14} fill="currentColor" /> 1. Guarda Prompts
                  </h4>
                  <p className="text-slate-400 leading-relaxed font-sans">
                    Almacena tus mejores instrucciones y clasifícalas por categorías adaptadas a tus clases.
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-pink-400 flex items-center gap-1">
                    <Check size={14} className="stroke-[3]" /> 2. Rellena Interactivamente
                  </h4>
                  <p className="text-slate-400 leading-relaxed font-sans">
                    Declara variables con <code className="font-mono text-[10px] bg-[#0f172a] text-slate-300 px-1.5 py-0.5 rounded border border-slate-700/50">{"{{tema}}"}</code> y rellénalas mediante un formulario visual.
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-violet-300 flex items-center gap-1">
                    <Sparkles size={14} /> 3. Ingeniería de Prompts con IA
                  </h4>
                  <p className="text-slate-400 leading-relaxed font-sans">
                    Usa Gemini integrado para crear prompts profesionales desde cero o pulir los básicos.
                  </p>
                </div>
              </div>

              <div className="relative z-10 pt-6 border-t border-slate-700/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                      Biblioteca gratuita de prompts
                    </span>
                    <h3 className="text-lg font-extrabold text-white mt-3">Explora prompts publicos antes de iniciar sesion</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                      Puedes probar plantillas compartidas por la comunidad. Para guardar, clonar o publicar tus propias colecciones, crea tu biblioteca.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignIn}
                    className="px-4 py-2 bg-slate-900/70 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer w-fit"
                  >
                    <Plus size={13} />
                    <span>Crear mi biblioteca</span>
                  </button>
                </div>

                {loadingCommunityPrompts ? (
                  <div className="rounded-2xl border border-slate-700/60 bg-slate-900/35 p-8 text-center">
                    <div className="w-7 h-7 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-400 mt-3">Cargando prompts publicos...</p>
                  </div>
                ) : publicFeaturedPrompts.length === 0 ? (
                  <div className="rounded-2xl border border-slate-700/60 bg-slate-900/35 p-6">
                    <p className="text-sm font-bold text-white">Aun no hay prompts publicos destacados.</p>
                    <p className="text-xs text-slate-400 mt-1">Cuando publiques tu primera coleccion, aparecera aqui como vitrina inicial.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {publicFeaturedPrompts.map((prompt) => (
                      <div key={prompt.id} className="rounded-2xl border border-slate-700/70 bg-slate-900/45 p-4 flex flex-col gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">{prompt.category}</span>
                            {prompt.authorName && (
                              <span className="text-[10px] text-slate-400">por {prompt.authorName}</span>
                            )}
                          </div>
                          <h4 className="text-sm font-extrabold text-white mt-2 leading-tight line-clamp-1">{prompt.title}</h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{prompt.description || "Prompt publico de la comunidad."}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(prompt.tags || []).slice(0, 4).map((tag) => (
                            <span key={tag} className="text-[10px] text-slate-300 bg-slate-800 border border-slate-700/70 px-2 py-0.5 rounded-lg">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2 mt-auto">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(prompt.promptText);
                              triggerNotification("Prompt publico copiado.", "success");
                            }}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                          >
                            <Copy size={12} />
                            <span>Copiar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUsePrompt(prompt, "public_showcase")}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                          >
                            <Play size={12} fill="currentColor" />
                            <span>Usar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            // Authenticated Dashboard Layout
            <div className="space-y-8">
              
              {/* Sleek Navigation Tabs */}
              <div className="flex items-center gap-1 p-1 bg-[#0f172a]/65 rounded-2xl border border-slate-800/80 w-fit">
                <button
                  onClick={() => {
                    setCurrentTab("mi-biblioteca");
                    setSelectedCategory("Todas");
                    setSelectedAuthor(null);
                    setCommunityScope("todos");
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    currentTab === "mi-biblioteca"
                      ? "bg-gradient-to-r from-indigo-650 to-indigo-555 text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-450 hover:text-slate-205"
                  }`}
                >
                  <FolderOpen size={13} />
                  <span>Mi Biblioteca</span>
                  <span className="text-[10px] bg-slate-900 text-indigo-300 font-extrabold px-2 py-0.5 rounded-md font-mono">
                    {prompts.length}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setCurrentTab("comunidad");
                    setSelectedCategory("Todas");
                    setSelectedAuthor(null);
                    setCommunityScope("todos");
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    currentTab === "comunidad"
                      ? "bg-gradient-to-r from-indigo-650 to-indigo-555 text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-450 hover:text-slate-205"
                  }`}
                >
                  <Users size={13} />
                  <span>Red de la Comunidad</span>
                  <span className="text-[10px] bg-slate-900 text-pink-400 font-extrabold px-2 py-0.5 rounded-md font-mono animate-pulse">
                    {communityCatalogPrompts.length}
                  </span>
                </button>
              </div>

              {currentTab === "comunidad" && !selectedAuthor && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-[#1e293b]/45 p-3">
                  <div className="flex items-center gap-1.5 rounded-xl bg-slate-950/50 p-1 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCommunityScope("todos")}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        communityScope === "todos"
                          ? "bg-indigo-600 text-white shadow-md"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommunityScope("siguiendo")}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        communityScope === "siguiendo"
                          ? "bg-emerald-600 text-white shadow-md"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <UserCheck size={13} />
                      <span>Siguiendo</span>
                      {followedCreatorUids.length > 0 && (
                        <span className="text-[10px] bg-slate-950/50 px-1.5 py-0.5 rounded-md font-mono">{followedCreatorUids.length}</span>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 font-sans">
                    {communityScope === "siguiendo"
                      ? "Mostrando prompts de creadores que sigues."
                      : "Explora prompts publicos de toda la comunidad."}
                  </p>
                </div>
              )}

              {/* Author Community Profile Banner */}
              {currentTab === "comunidad" && selectedAuthor && (
                <div className="bg-gradient-to-r from-slate-900/60 via-indigo-950/20 to-slate-900/60 border border-indigo-500/25 p-6 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                    <button 
                      onClick={() => setSelectedAuthor(null)}
                      className="p-3 bg-slate-800/80 hover:bg-slate-700/80 text-indigo-400 hover:text-indigo-300 rounded-2xl border border-slate-700/50 transition-all cursor-pointer mr-1 flex items-center justify-center shrink-0"
                      title="Volver al feed general de la comunidad"
                    >
                      <ArrowLeft size={16} />
                    </button>

                    {selectedAuthor.avatar ? (
                      <img
                        src={selectedAuthor.avatar}
                        alt={selectedAuthor.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-full border-2 border-indigo-500/40 object-cover shadow-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-indigo-500/10 text-xl font-bold text-indigo-400 font-mono border-2 border-indigo-550/20 shadow-lg shrink-0">
                        {selectedAuthor.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                          Creador de la Comunidad
                        </span>
                        {followedCreatorUids.includes(selectedAuthor.uid) && (
                          <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono flex items-center gap-1">
                            <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                            <span>Seguido</span>
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-black text-white mt-1.5 leading-none">{selectedAuthor.name}</h2>
                      
                      {/* Author Stats Row */}
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400 font-sans">
                        <div className="flex items-center gap-1.5">
                          <span className="text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/15 font-mono">
                            {authorProfileStats.count}
                          </span>
                          <span>prompts compartidos públicamente</span>
                        </div>
                        <div className="hidden sm:block text-slate-700 font-bold">•</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-pink-300 font-bold bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/15 font-mono">
                            {authorProfileStats.likes}
                          </span>
                          <span>likes acumulados</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Follow/Unfollow Creator Button */}
                  <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-end">
                    <button
                      onClick={() => handleToggleFollowCreator(selectedAuthor.uid)}
                      className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md border ${
                        followedCreatorUids.includes(selectedAuthor.uid)
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                          : "bg-[#4f46e5] hover:bg-indigo-500 text-white border-indigo-500 hover:scale-[1.01]"
                      }`}
                    >
                      {followedCreatorUids.includes(selectedAuthor.uid) ? (
                        <>
                          <UserCheck size={14} className="stroke-[2.5]" />
                          <span>Siguiendo Creador</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} />
                          <span>Seguir Creador</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setSelectedAuthor(null)}
                      className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-755 text-slate-300 hover:text-white text-xs font-bold rounded-2xl border border-slate-700/80 transition-all cursor-pointer"
                    >
                      Volver al feed general
                    </button>
                  </div>
                </div>
              )}

              {currentTab === "mi-biblioteca" && (
                <ActivationChecklist
                  state={activationChecklistState}
                  onAction={handleActivationAction}
                />
              )}

              {/* Stats & Controls Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1e293b]/90 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-700/85 shadow-xl">
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
                            Pack inicial: <strong className="text-indigo-300">{existingDefaultPromptCount}/{DEFAULT_PROMPTS.length}</strong> guardados.
                          </span>
                        )}
                      </>
                    ) : selectedAuthor ? (
                      <>Explorando el catálogo público de <strong className="text-indigo-300">{selectedAuthor.name}</strong>. Mostrando sus <strong className="text-pink-400">{filteredPrompts.length}</strong> prompts compartidos.</>
                    ) : communityScope === "siguiendo" ? (
                      <>Feed de creadores seguidos. Mostrando <strong className="text-emerald-400">{filteredPrompts.length}</strong> prompts de <strong className="text-indigo-300">{followedCreatorUids.length}</strong> creadores.</>
                    ) : (
                      <>Descubre innovadoras plantillas de la comunidad. ¡Agrégalas a tu biblioteca, vótala, o discútela!</>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:flex lg:flex-wrap items-stretch lg:items-center gap-2 w-full md:w-auto">
                  {currentTab === "mi-biblioteca" && missingDefaultPromptCount > 0 && (
                    <button
                      id="btn-seed-defaults"
                      onClick={handleSeedDefaults}
                      disabled={loadingPrompts}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-pulse min-w-0"
                    >
                      <BookOpen size={14} />
                      <span>
                        {prompts.length === 0
                          ? `Cargar ${DEFAULT_PROMPTS.length} prompts iniciales`
                          : `Completar pack inicial (+${missingDefaultPromptCount})`}
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
                    {/* Todas las Carpetas Pill */}
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

                    {/* Prompts sin carpeta Pill */}
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

                    {/* Loaded user custom folders list */}
                    {folders.map((folder) => {
                      const count = prompts.filter((p) => p.folderId === folder.id).length;
                      const isSelected = selectedFolderId === folder.id;
                      return (
                        <div
                          key={folder.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (dragOverFolderId !== folder.id) {
                              setDragOverFolderId(folder.id);
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
                              handleMovePromptToFolder(promptId, folder.id);
                            }
                          }}
                          className={`flex items-center gap-1 border rounded-xl pl-3.5 pr-2 py-1.5 text-xs font-bold transition-all relative ${
                            isSelected
                              ? "bg-pink-500/10 border-pink-500/40 text-pink-400"
                              : dragOverFolderId === folder.id
                              ? "bg-indigo-505/20 border-dashed border-indigo-500 text-indigo-300 scale-105 ring-2 ring-indigo-500/30"
                              : "bg-slate-900/60 text-slate-350 border-slate-800/80 hover:border-slate-730 hover:text-white"
                          }`}
                        >
                          <button
                            onClick={() => setSelectedFolderId(folder.id)}
                            className="text-left flex items-center gap-1.5 cursor-pointer truncate max-w-[120px]"
                            title={folder.description || "Sin descripción"}
                          >
                            <span>{folder.name}</span>
                            <span className="text-[10px] opacity-75">({count})</span>
                          </button>
                          
                          {/* Share Collection Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenShareFolderModal(folder);
                            }}
                            className={`p-1 hover:bg-indigo-500/15 rounded transition-all ml-1 cursor-pointer flex items-center justify-center ${
                              folder.isShared
                                ? "text-emerald-400 hover:text-emerald-300"
                                : "text-slate-400 hover:text-white"
                            }`}
                            title={
                              folder.isShared
                                ? "Colección compartida públicamente. Haz clic para copiar enlace o ajustar configuración."
                                : "Compartir Colección públicamente"
                            }
                          >
                            <Share2 size={11} className={folder.isShared ? "animate-pulse" : ""} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`¿Estás seguro de eliminar la carpeta "${folder.name}"? Los prompts seguirán existiendo fuera de esta carpeta.`)) {
                                handleDeleteFolder(folder.id);
                              }
                            }}
                            className="p-0.5 hover:bg-red-500/15 hover:text-red-400 rounded transition-all ml-1 cursor-pointer"
                            title="Eliminar carpeta de organización"
                          >
                            <X size={11} className="stroke-[3]" />
                          </button>
                        </div>
                      );
                    })}

                    {loadingFolders && (
                      <span className="text-[10px] text-slate-400 italic">Sincronizando carpetas...</span>
                    )}

                    {!loadingFolders && folders.length === 0 && (
                      <span className="text-[11px] text-slate-450 italic ml-1">No tienes carpetas organizacionales creadas aún.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Horizontal Navigation Categories & Search Box */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Horizontal Category Pill buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pr-2 pt-1 font-sans no-scrollbar">
                  {(["Todas", "YouTube", "Marketing", "Programación", "Redacción", "IA Agentes", "IA Imágenes", "IA Videos", "Acompañante Personal", "Asistente de Prompts", "General", "Favoritos"] as CategoryFilter[]).map((category) => (
                    <button
                      key={category}
                      id={`filter-pill-${category}`}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer select-none ${
                        selectedCategory === category
                          ? "bg-[#4f46e5] text-white border-[#4f46e5] shadow-md shadow-indigo-650/15 font-extrabold"
                          : "bg-[#1e293b] text-slate-400 border-[#334155]/85 hover:text-slate-250 hover:border-slate-650"
                      }`}
                    >
                      {category === "Favoritos" && <Star size={12} fill={selectedCategory === "Favoritos" ? "white" : "none"} className="text-pink-450" />}
                      <span>{category === "Todas" ? "Ver Todo" : category}</span>
                    </button>
                  ))}
                </div>

                {/* Double Search Inputs: Text & Tags Autocomplete */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:max-w-xl shrink-0">
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
                    
                    {/* Floating counts / clear tags */}
                    {selectedTags.length > 0 && (
                      <button
                        onClick={() => setSelectedTags([])}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-pink-400 hover:text-pink-300 font-extrabold cursor-pointer hover:underline"
                        title="Limpiar todas las etiquetas"
                      >
                        Limpiar ({selectedTags.length})
                      </button>
                    )}

                    {/* Autocomplete suggestions dropdown panel */}
                    {isTagDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-2 bg-[#1b2537] border border-slate-700 rounded-2xl shadow-2xl max-h-48 overflow-y-auto z-40 p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
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
                                {(currentTab === "mi-biblioteca" ? prompts : communityCatalogPrompts).filter(p => p.tags?.some(t => t.toLowerCase() === tag.toLowerCase())).length}
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
                          ? "Tu biblioteca está lista para ser poblada. Puedes dar clic en 'Cargar Prompts Ejemplos' para agregar plantillas recomendadas de inmediato o crear una nueva con el Asistente IA de Gemini."
                          : "No se encontraron prompts en tu biblioteca que coincidan con la categoría o filtros."
                      ) : (
                        communityScope === "siguiendo" && followedCreatorUids.length === 0
                          ? "Todavia no sigues a ningun creador. Explora la comunidad, abre un perfil y pulsa Seguir Creador para construir tu feed."
                          : communityScope === "siguiendo"
                          ? "Los creadores que sigues aun no tienen prompts publicos que coincidan con tus filtros."
                          : communityCatalogPrompts.length === 0
                          ? "Aun no hay prompts publicos publicados en la comunidad. Se el primero compartiendo una de tus plantillas personales activando el interruptor Hacer publico."
                          : "No se encontraron prompts publicos que coincidan con los filtros de busqueda o categoria en la comunidad."
                      )}
                    </p>
                  </div>
                  {currentTab === "mi-biblioteca" && missingDefaultPromptCount > 0 && (
                    <button
                      onClick={handleSeedDefaults}
                      className="px-4 py-2 bg-gradient-to-r from-[#4f46e5] to-[#ec4899] hover:opacity-95 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      {prompts.length === 0
                        ? `Cargar ${DEFAULT_PROMPTS.length} prompts iniciales`
                        : `Completar pack inicial (+${missingDefaultPromptCount})`}
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
                          onFork={handleForkPrompt}
                          onLikeToggle={handleLikeToggle}
                          onAuthorClick={handleSelectAuthor}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

            </div>
          )}

        </main>

        {/* Right Side: Gemini Engineering and Prompt optimization assistant slide panel */}
        {showAIAssistant && (
          <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-[420px] lg:relative lg:inset-auto lg:w-[420px] lg:border-t-0 lg:border-l border-[#334155]/60 bg-[#1e293b]/95 lg:bg-[#1e293b]/70 backdrop-blur-md flex flex-col h-full overflow-hidden shrink-0 animate-in slide-in-from-right duration-300 shadow-2xl lg:shadow-none">
            <div className="flex-1 p-4 overflow-y-auto h-full">
              <AIHelperPanel
                presetTextToOptimize={presetAItext}
                onImportToLibrary={handleImportFromAI}
                onClose={() => {
                  setPresetAItext("");
                  setShowAIAssistant(false);
                }}
              />
            </div>
          </aside>
        )}

      </div>
      )}

      {/* Manual Add / Edit properties form Modal */}
      {showFormModal && (
        <PromptFormModal
          prompt={editingPrompt}
          folders={folders}
          onSave={handleSavePrompt}
          onClose={() => {
            setShowFormModal(false);
            setEditingPrompt(null);
          }}
          onOptimizeWithAI={handleOptimizeWithAIDirect}
          onNotification={triggerNotification}
        />
      )}

      {/* Interactive prompt fillers modal */}
      {usingPrompt && (
        <PromptFillerModal
          prompt={usingPrompt}
          onClose={() => setUsingPrompt(null)}
        />
      )}

      {/* Copy with variables filled mini-dialog */}
      {copyingFilledPrompt && (
        <CopyFilledModal
          prompt={copyingFilledPrompt}
          onClose={() => setCopyingFilledPrompt(null)}
          onNotification={triggerNotification}
        />
      )}

      {/* Quick Switcher Modal (triggered by Cmd/Ctrl+J) */}
      <QuickSwitcherModal
        prompts={allSearchablePrompts}
        isOpen={showQuickSwitcher}
        onClose={() => setShowQuickSwitcher(false)}
        onUse={(p) => handleUsePrompt(p, "quick_switcher")}
        onCopyFilled={(p) => handleCopyFilledPrompt(p)}
        onEdit={(p) => handleOpenEdit(p)}
        onNotification={triggerNotification}
      />

      {/* Modal - Recomendador Local */}
      {showRecommendationModal && (
        <RecommendationModal
          prompts={prompts}
          recommendationGoal={recommendationGoal}
          setRecommendationGoal={setRecommendationGoal}
          recommendedPrompts={recommendedPrompts}
          geminiRecommendation={geminiRecommendation}
          geminiRecommendationLoading={geminiRecommendationLoading}
          geminiRecommendationError={geminiRecommendationError}
          onImproveWithGemini={handleImproveRecommendationsWithGemini}
          onUse={(prompt) => {
            handleUsePrompt(prompt, "recommendation");
            setShowRecommendationModal(false);
          }}
          onCopy={(prompt) => {
            navigator.clipboard.writeText(prompt.promptText);
            trackUserEvent("recommendation_copy", prompt, { source: "recommendation" });
            triggerNotification("Prompt recomendado copiado.", "success");
          }}
          onEdit={(prompt) => {
            handleOpenEdit(prompt);
            setShowRecommendationModal(false);
          }}
          onCopySuggestedPrompt={(promptText) => {
            navigator.clipboard.writeText(promptText);
            triggerNotification("Sugerencia Gemini copiada.", "success");
          }}
          onClose={() => setShowRecommendationModal(false)}
        />
      )}

      {/* Modal - Editar Perfil Publico */}
      {showProfileModal && user && (
        <ProfileModal
          user={user}
          currentUserProfile={currentUserProfile}
          profileNameInput={profileNameInput}
          profileHandleInput={profileHandleInput}
          profileBioInput={profileBioInput}
          isSavingProfile={isSavingProfile}
          setProfileNameInput={setProfileNameInput}
          setProfileHandleInput={setProfileHandleInput}
          setProfileBioInput={setProfileBioInput}
          normalizeProfileHandle={normalizeProfileHandle}
          onSave={handleSaveProfile}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Modal - Crear Nueva Carpeta */}
      {showCreateFolder && (
        <CreateFolderModal
          newFolderName={newFolderName}
          newFolderDesc={newFolderDesc}
          isSavingFolder={isSavingFolder}
          setNewFolderName={setNewFolderName}
          setNewFolderDesc={setNewFolderDesc}
          onCreate={handleCreateFolder}
          onClose={closeCreateFolderModal}
        />
      )}

      {/* Modal - Configurar Compartido de la Carpeta/Coleccion */}
      {showShareFolderModal && (
        <ShareFolderModal
          folder={showShareFolderModal}
          prompts={prompts}
          isFolderSharedInput={isFolderSharedInput}
          publishFolderPromptsInput={publishFolderPromptsInput}
          isSavingFolderShare={isSavingFolderShare}
          setIsFolderSharedInput={setIsFolderSharedInput}
          setPublishFolderPromptsInput={setPublishFolderPromptsInput}
          onSave={handleSaveFolderShareSettings}
          onClose={() => setShowShareFolderModal(null)}
          onNotification={triggerNotification}
        />
      )}
      {/* Public Shared Prompt Modal Viewer Overlay */}
      {sharedPrompt && (
        <SharedPromptModal
          prompt={sharedPrompt}
          onClose={handleCloseShared}
          onCopy={() => {
            navigator.clipboard.writeText(sharedPrompt.promptText);
            trackUserEvent("copy", sharedPrompt, { source: "shared_prompt" });
            triggerNotification("Contenido del prompt copiado con exito.", "success");
          }}
          onUse={() => {
            handleUsePrompt(sharedPrompt, "shared_prompt");
            handleCloseShared();
          }}
        />
      )}
      {/* Humble Footer */}
      <footer className="bg-[#0f172a]/95 border-t border-[#334155]/50 py-5 px-6 md:px-12 text-center text-[10px] text-slate-450 shrink-0 font-sans flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 select-none">
        <p>© {new Date().getFullYear()} Biblioteca de Prompts — Diseñado para creadores de YouTube de Inteligencia Artificial.</p>
        <p className="flex items-center justify-center gap-1.5 font-mono text-[9px] text-slate-500">
          <Zap size={10} className="text-yellow-400" fill="currentColor" />
          <span>Sincronizado de forma segura con Firebase Cloud Database</span>
        </p>
      </footer>

    </div>
  );
}
