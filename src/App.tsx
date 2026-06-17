import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import {
  Sparkles,
  Plus,
  Search,
  LogOut,
  FolderOpen,
  Check,
  Zap,
  Youtube,
  BookOpen,
  Calendar,
  Clock,
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
  UserPlus,
  GitFork,
  TrendingUp,
  Newspaper,
  Moon,
  Sun,
  ShieldCheck
} from "lucide-react";

import { auth, db } from "./firebase";
import { motion, AnimatePresence } from "motion/react";
import { Prompt, CategoryFilter, Folder } from "./types";
import WelcomeHeroSection from "./components/WelcomeHeroSection";
import PromptPlaylistPlayer from "./components/PromptPlaylistPlayer";
import { LibraryWorkspaceView } from "./components/LibraryWorkspaceView";
import PromptCard from "./components/PromptCard";
import ActivationChecklist from "./components/ActivationChecklist";
import AdminDashboard from "./components/AdminDashboard";
import BetaInvitePanel from "./components/BetaInvitePanel";
import ConnectionsPanel from "./components/ConnectionsPanel";
import CommunityExplore from "./components/CommunityExplore";
import CreatorGrowthPanel from "./components/CreatorGrowthPanel";
import DailyMissionPanel from "./components/DailyMissionPanel";
import DailyWorkspace from "./components/DailyWorkspace";
import TrustModerationPanel from "./components/TrustModerationPanel";
import AppTopNav from "./components/AppTopNav";
import ForumSection from "./components/ForumSection";
import HackathonsSection from "./components/HackathonsSection";
import ShowcaseSection from "./components/ShowcaseSection";
import NewsSection from "./components/NewsSection";
import PublicBriefingView from "./components/PublicBriefingView";
import SeedPackModal from "./components/SeedPackModal";
import ClassroomView from "./components/ClassroomView";
import JoinClassModal from "./components/JoinClassModal";
import { AIAssistantAside, AppModalLayer, PublicProfileSurface } from "./components/AppDeferredSurfaces";
import type { GeminiRecommendationResult } from "./components/RecommendationModal";
import type { PublicProfileTab } from "./components/PublicProfileView";
import { useAuthProfile } from "./hooks/useAuthProfile";
import { usePromptEvents } from "./hooks/usePromptEvents";
import { usePromptLibrary } from "./hooks/usePromptLibrary";
import { useFolders } from "./hooks/useFolders";
import { useCommunity } from "./hooks/useCommunity";
import { useSocialFavorites } from "./hooks/useSocialFavorites";
import { useContentSafety } from "./hooks/useContentSafety";
import { useModerationReview } from "./hooks/useModerationReview";
import { useCommunityPosts } from "./hooks/useCommunityPosts";
import type { CommunityPostInput } from "./hooks/useCommunityPosts";
import { useHackathons } from "./hooks/useHackathons";
import { useSavedIdeas } from "./hooks/useSavedIdeas";
import { useBriefings } from "./hooks/useBriefings";
import { useConnections } from "./hooks/useConnections";
import { useConnectionChats } from "./hooks/useConnectionChats";
import { useAdminDashboard } from "./hooks/useAdminDashboard";
import { useClassroomAccess } from "./hooks/useClassroomAccess";
import type { AppSection, Briefing, BriefingItem, NewsCategory, NewsItem, SavedIdea } from "./typesCommunity";
import { buildLocalRecommendations } from "./utils/recommendations";
import { getActivationChecklistState, type ActivationStepId } from "./utils/activationChecklist";
import { buildCommunityExploreSections, buildDailyWorkspaceState, buildSuggestedCreators } from "./utils/dailyLoop";
import { DEFAULT_PROMPTS } from "./data";
import {
  combineSearchablePrompts,
  filterPrompts,
  getAuthorProfileStats,
  getAvailableTags,
  getPublicShowcasePrompts,
  getTagSuggestions,
  type CommunitySort,
  type LibraryViewFilter
} from "./utils/promptFilters";

const FOUNDER_PACK_USER_ID = "founder-pack";
const PUBLIC_SHOWCASE_CATEGORIES: CategoryFilter[] = [
  "Todas",
  "YouTube",
  "Marketing",
  "IA Agentes",
  "Asistente de Prompts",
  "IA Videos",
  "General"
];
const LIBRARY_VIEW_FILTERS: Array<{ id: LibraryViewFilter; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "privados", label: "Privados" },
  { id: "publicados", label: "Publicados" },
  { id: "remixes", label: "Remixes" },
  { id: "favoritos", label: "Favoritos propios" }
];
type UiThemeMode = "dark" | "clear";
const STARTER_PROMPT_GOAL = 8;

export default function App() {
  // Social / Community navigation
  const [currentTab, setCurrentTab] = useState<"mi-biblioteca" | "comunidad">("mi-biblioteca");
  const [currentSection, setCurrentSection] = useState<AppSection>("inicio");
  const [uiThemeMode, setUiThemeMode] = useState<UiThemeMode>(() => {
    const savedTheme = window.localStorage.getItem("biblioteca-ui-theme");
    return savedTheme === "dark" ? "dark" : "clear";
  });

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("Todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagSearchInput, setTagSearchInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [libraryViewFilter, setLibraryViewFilter] = useState<LibraryViewFilter>("todos");
  const [communitySort, setCommunitySort] = useState<CommunitySort>("populares");
  const [publicProfileTab, setPublicProfileTab] = useState<PublicProfileTab>("prompts");

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
  const [selectedPublicPrompt, setSelectedPublicPrompt] = useState<Prompt | null>(null);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  const [showSeedPackModal, setShowSeedPackModal] = useState(false);
  const [showJoinClassModal, setShowJoinClassModal] = useState(false);
  const [recommendationGoal, setRecommendationGoal] = useState("");
  const [geminiRecommendation, setGeminiRecommendation] = useState<GeminiRecommendationResult | null>(null);
  const [geminiRecommendationLoading, setGeminiRecommendationLoading] = useState(false);
  const [geminiRecommendationError, setGeminiRecommendationError] = useState("");
  const [presetAItext, setPresetAItext] = useState("");
  const [publicShowcaseCategory, setPublicShowcaseCategory] = useState<CategoryFilter>("Todas");
  const [publicShowcaseSearch, setPublicShowcaseSearch] = useState("");
  const [pendingPublicSavePrompt, setPendingPublicSavePrompt] = useState<Prompt | null>(null);
  const [isResolvingPendingPublicSave, setIsResolvingPendingPublicSave] = useState(false);
  const [pendingForumDraft, setPendingForumDraft] = useState<CommunityPostInput | null>(null);
  const [pendingSaveIdeaItem, setPendingSaveIdeaItem] = useState<NewsItem | null>(null);
  const [pendingBriefingDraft, setPendingBriefingDraft] = useState<{ items: NewsItem[]; category: NewsCategory } | null>(null);
  const [pendingBriefingSaveItem, setPendingBriefingSaveItem] = useState<BriefingItem | null>(null);
  const [pendingBriefingPromptItem, setPendingBriefingPromptItem] = useState<BriefingItem | null>(null);
  const [pendingBriefingForumItem, setPendingBriefingForumItem] = useState<BriefingItem | null>(null);
  const trackedBriefingOpenRef = useRef<Set<string>>(new Set());
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
      setLibraryViewFilter("todos");
      setSelectedAuthor(null);
      setShowAIAssistant(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("user");
      window.history.replaceState({}, "", url.toString());
    }
  });
  const isFounder = currentUserProfile?.role === "founder";

  const {
    connectionByTargetUid,
    sendConnectionRequest,
    acceptConnection,
    removeConnection,
    connectedConnections,
    incomingConnectionRequests,
    outgoingConnectionRequests
  } = useConnections({
    user,
    currentUserIdentity: getAuthorIdentity,
    onNotification: triggerNotification
  });

  const {
    activeChatConnection,
    chatMessages,
    chatDraft,
    setChatDraft,
    loadingChatMessages,
    blockedUserIds,
    openChat,
    closeChat,
    sendChatMessage,
    blockUser,
    reportChat
  } = useConnectionChats({
    user,
    connectedConnections,
    getAuthorIdentity,
    onNotification: triggerNotification
  });

  const handleBlockConnection = async (connection: Parameters<typeof blockUser>[0]) => {
    const blocked = await blockUser(connection);
    if (blocked) {
      await removeConnection(connection.targetUid);
    }
  };

  const adminDashboard = useAdminDashboard(isFounder);

  const {
    prompts,
    loadingPrompts,
    setLoadingPrompts,
    handleSeedDefaults,
    handleSavePrompt,
    handleFavoriteToggle,
    handleDeletePrompt,
    handleImportFromAI,
    handleExportJSON,
    handleImportJSON
  } = usePromptLibrary({
    user,
    editingPrompt,
    setEditingPrompt,
    setShowFormModal,
    getAuthorIdentity,
    onNotification: triggerNotification
  });

  const {
    activeClassroom,
    activeClassMembership,
    classMembers,
    loadingClassroomAction,
    classSavedPromptCount,
    classMissingPromptCount,
    resolveClassroomCode,
    resolveClassroomId,
    openClassroom,
    closeClassroom,
    joinClassroom,
    saveClassroomPack
  } = useClassroomAccess({
    user,
    prompts,
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
    newFolderParentId,
    setNewFolderParentId,
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
    communityFolders,
    loadingCommunityPrompts,
    communityScope,
    setCommunityScope,
    selectedAuthor,
    setSelectedAuthor,
    followedCreatorUids,
    handleLikeToggle,
    handleForkPrompt,
    handleToggleFollowCreator
  } = useCommunity({
    user,
    prompts,
    setCurrentTab,
    setLoadingPrompts,
    onOpenEdit: handleOpenEdit,
    getAuthorIdentity,
    onNotification: triggerNotification
  });

  const handleOpenConnectionChatFromProfile = (targetUid: string) => {
    const connection = connectionByTargetUid.get(targetUid);
    if (!connection || connection.status !== "connected") {
      triggerNotification("Primero necesitas una conexion aceptada para abrir chat.", "info");
      return;
    }

    setCurrentSection("prompts");
    setCurrentTab("mi-biblioteca");
    setSelectedAuthor(null);
    void openChat(connection);
  };

  const {
    socialFavorites,
    socialFavoritePromptIds,
    handleToggleSocialFavorite
  } = useSocialFavorites({
    user,
    onNotification: triggerNotification
  });

  const {
    hiddenPromptIds,
    handleHidePrompt,
    handleReportPrompt
  } = useContentSafety({
    user,
    onNotification: triggerNotification
  });

  const {
    publicOwnPrompts,
    reportedPrompts,
    totalReportsCount,
    hasPermissionIssue: hasModerationPermissionIssue
  } = useModerationReview(user, prompts);

  const {
    posts: communityPosts,
    loadingPosts,
    savePost,
    deletePost,
    togglePostLike
  } = useCommunityPosts({
    user,
    getAuthorIdentity,
    onNotification: triggerNotification
  });

  const {
    hackathons,
    loadingHackathons,
    saveHackathon,
    deleteHackathon
  } = useHackathons({
    user,
    getAuthorIdentity,
    onNotification: triggerNotification
  });

  const {
    savedIdeas,
    savedIdeaIds,
    loadingSavedIdeas,
    saveIdeaFromNews,
    deleteSavedIdea
  } = useSavedIdeas({
    user,
    onNotification: triggerNotification
  });

  const {
    createBriefingFromNews,
    loadBriefing,
    loadingSharedBriefing,
    publicBriefings,
    loadingPublicBriefings,
    incrementBriefingStat
  } = useBriefings({
    user,
    getAuthorIdentity,
    onNotification: triggerNotification
  });

  useEffect(() => {
    if (currentSection === "admin" && !isFounder) {
      setCurrentSection("inicio");
    }
  }, [currentSection, isFounder]);

  // Shared public prompt state managers
  const [sharedPromptId, setSharedPromptId] = useState<string | null>(null);
  const [sharedPrompt, setSharedPrompt] = useState<Prompt | null>(null);
  const [loadingSharedPrompt, setLoadingSharedPrompt] = useState(false);

  const [sharedBriefingId, setSharedBriefingId] = useState<string | null>(null);
  const [sharedBriefing, setSharedBriefing] = useState<Briefing | null>(null);

  // Shared collections states
  const [sharedCollectionId, setSharedCollectionId] = useState<string | null>(null);
  const [sharedCollection, setSharedCollection] = useState<Folder | null>(null);
  const [sharedCollectionPrompts, setSharedCollectionPrompts] = useState<Prompt[]>([]);
  const [isCloningCollection, setIsCloningCollection] = useState(false);

  const handleCloneCollection = async () => {
    if (!user || !sharedCollection) return;
    setIsCloningCollection(true);
    try {
      // 1. Create a new folder document
      const foldersCollectionPath = "folders";
      const newFolderRef = doc(collection(db, foldersCollectionPath));
      await setDoc(newFolderRef, {
        userId: user.uid,
        name: sharedCollection.name,
        description: sharedCollection.description || "",
        createdAt: serverTimestamp()
      });

      // 2. Clone all prompts under the new folder
      const promptsCollectionPath = "prompts";
      const batchPromises = sharedCollectionPrompts.map(async (p) => {
        const newPromptRef = doc(collection(db, promptsCollectionPath));
        return setDoc(newPromptRef, {
          userId: user.uid,
          title: p.title,
          description: p.description,
          promptText: p.promptText,
          category: p.category,
          tags: p.tags || [],
          suggestedVariables: p.suggestedVariables || [],
          folderId: newFolderRef.id,
          isFavorite: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await Promise.all(batchPromises);
      triggerNotification("¡Playlist guardada con éxito en tu biblioteca!", "success");
    } catch (err) {
      console.error("Error cloning collection: ", err);
      triggerNotification("Error al guardar la playlist en tu biblioteca.", "info");
    } finally {
      setIsCloningCollection(false);
    }
  };
  const [loadingSharedCollection, setLoadingSharedCollection] = useState(false);

  const handleHideCommunityPrompt = async (prompt: Prompt) => {
    await handleHidePrompt(prompt);
    if (selectedPublicPrompt?.id === prompt.id) {
      setSelectedPublicPrompt(null);
    }
  };

  const handleReportCommunityPrompt = async (prompt: Prompt) => {
    await handleReportPrompt(prompt);
    if (selectedPublicPrompt?.id === prompt.id) {
      setSelectedPublicPrompt(null);
    }
  };

  const openPublicProfile = (author: { name: string; uid: string; avatar?: string; handle?: string }) => {
    setCurrentSection("prompts");
    setCurrentTab("comunidad");
    setSelectedAuthor(author);
    setCommunityScope("todos");
    setPublicProfileTab("prompts");
    const url = new URL(window.location.href);
    url.searchParams.set("user", author.uid);
    url.searchParams.delete("share");
    url.searchParams.delete("collection");
    url.searchParams.delete("briefing");
    url.searchParams.delete("class");
    window.history.replaceState({}, "", url.toString());
  };

  const closePublicProfile = () => {
    setSelectedAuthor(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("user");
    window.history.replaceState({}, "", url.toString());
  };

  const handleSectionChange = (section: AppSection) => {
    setCurrentSection(section);
    setSelectedCategory("Todas");
    setSearchQuery("");
    setSelectedTags([]);
    setSelectedFolderId(null);
    setCommunityScope("todos");
    setSelectedAuthor(null);
    setSharedPrompt(null);
    setSharedPromptId(null);
    setSharedCollection(null);
    setSharedCollectionId(null);
    setSharedCollectionPrompts([]);
    setSharedBriefing(null);
    setSharedBriefingId(null);
    closeClassroom();

    if (section === "prompts") {
      setCurrentTab("comunidad");
    }

    if (section === "mi-biblioteca" || section === "inicio") {
      setCurrentTab("mi-biblioteca");
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("user");
    url.searchParams.delete("share");
    url.searchParams.delete("collection");
    url.searchParams.delete("briefing");
    url.searchParams.delete("class");
    window.history.replaceState({}, "", url.toString());
  };

  const openGuidedBetaMode = () => {
    setCurrentSection("mi-biblioteca");
    setCurrentTab("mi-biblioteca");
    setSelectedCategory("Todas");
    setSearchQuery("");
    setSelectedTags([]);
    setSelectedFolderId(null);
    setCommunityScope("todos");
    setSelectedAuthor(null);
    setSharedPrompt(null);
    setSharedPromptId(null);
    setSharedCollection(null);
    setSharedCollectionId(null);
    setSharedCollectionPrompts([]);
    setSharedBriefing(null);
    setSharedBriefingId(null);
    closeClassroom();

    const url = new URL(window.location.href);
    url.searchParams.delete("user");
    url.searchParams.delete("share");
    url.searchParams.delete("collection");
    url.searchParams.delete("briefing");
    url.searchParams.delete("class");
    window.history.replaceState({}, "", url.toString());
  };

  const handleCopyPublicProfileLink = () => {
    if (!selectedAuthor) return;
    const url = new URL(window.location.href);
    url.searchParams.set("user", selectedAuthor.uid);
    url.searchParams.delete("share");
    url.searchParams.delete("collection");
    url.searchParams.delete("briefing");
    navigator.clipboard.writeText(url.toString());
    triggerNotification("Enlace del perfil copiado.", "success");
  };

  const briefingItemToNewsItem = (item: BriefingItem): NewsItem => ({
    id: item.url || item.title,
    title: item.title,
    summary: item.summary,
    url: item.url,
    source: item.source,
    language: item.language,
    category: item.category,
    tags: item.tags || []
  });

  const savedIdeaToNewsItem = (idea: SavedIdea): NewsItem => ({
    id: idea.id,
    title: idea.title,
    summary: idea.summary,
    url: idea.url,
    source: idea.source,
    imageUrl: idea.imageUrl,
    language: idea.language,
    category: idea.category,
    tags: idea.tags || []
  });

  const buildBriefingEventMetadata = (item?: BriefingItem) => ({
    briefingId: sharedBriefing?.id || sharedBriefingId || "",
    briefingTitle: sharedBriefing?.title || "",
    itemTitle: item?.title || "",
    source: item?.source || "",
    url: item?.url || ""
  });

  const bumpSharedBriefingStat = (stat: "opens" | "linkCopies" | "ideaSaves" | "promptCreates" | "forumPosts") => {
    setSharedBriefing((current) => {
      if (!current) return current;
      return {
        ...current,
        stats: {
          ...(current.stats || {}),
          [stat]: (current.stats?.[stat] || 0) + 1
        }
      };
    });
  };

  const openNewsInAssistant = (item: NewsItem, mode: "prompt" | "summary" | "translation" | "opportunity") => {
    const context = `Titulo original: ${item.title}\nFuente: ${item.source}\nURL: ${item.url}\nResumen/contexto disponible: ${item.summaryEs || item.summary || "Sin resumen disponible."}`;
    const instructions = {
      prompt: `Crea un prompt reutilizable en espanol basado en esta noticia o tendencia.\n\n${context}\n\nObjetivo: convertir esta noticia en una plantilla para crear contenido, investigar oportunidades o preparar una idea de hackathon.`,
      summary: `Resume esta noticia en espanol neutro para un newsletter de creadores IA.\n\n${context}\n\nDevuelve: 1) resumen en 5 bullets, 2) por que importa, 3) idea de prompt accionable, 4) posible oportunidad de comunidad.`,
      translation: `Traduce y adapta esta noticia al espanol neutro para una comunidad de creadores IA.\n\n${context}\n\nMantén el sentido, evita exagerar y termina con 3 ideas de uso practico.`,
      opportunity: `Analiza esta noticia como oportunidad de hackathon o proyecto.\n\n${context}\n\nDevuelve: 1) problema, 2) posible proyecto, 3) roles necesarios, 4) prompts utiles, 5) primer MVP en 48 horas.`
    };
    setPresetAItext(instructions[mode]);
    setShowAIAssistant(true);
    triggerNotification("Abrimos el asistente con contexto de la noticia.", "success");
  };

  const handleCreatePromptFromNews = (item: NewsItem) => {
    openNewsInAssistant(item, "prompt");
  };

  const handleCreateForumPostFromNews = (item: NewsItem, intent: "idea" | "question" | "team" = "idea") => {
    const titlePrefix = intent === "team" ? "Busco equipo:" : intent === "question" ? "Pregunta:" : "Idea:";
    setPendingForumDraft({
      type: intent,
      title: `${titlePrefix} ${item.title}`.slice(0, 140),
      body: [
        item.summaryEs || item.summary || "Quiero abrir conversacion sobre esta noticia/tendencia.",
        "",
        `Fuente: ${item.source}`,
        item.url,
        "",
        intent === "team"
          ? "Busco personas para explorar si esto puede convertirse en proyecto, demo o hackathon."
          : "Que oportunidad, prompt o proyecto ven aqui?"
      ].join("\n"),
      tags: Array.from(new Set([...(item.tags || []), "radar"])).slice(0, 10),
      linkUrl: item.url,
      imageUrl: item.imageUrl || ""
    });
    setCurrentSection("foro");
    setCurrentTab("comunidad");
    if (!user) {
      triggerNotification("Conecta con Google y abriremos el borrador del foro.", "info");
      void handleSignIn();
      return;
    }
    triggerNotification("Preparamos un borrador en el foro.", "success");
  };

  const buildNewsDigestLines = (items: NewsItem[]) => {
    return items.slice(0, 5).map((item, index) => {
      const context = item.summaryEs || item.summary || "Sin resumen disponible.";
      return `${index + 1}. ${item.title}\nFuente: ${item.source}\n${context}\n${item.url}`;
    }).join("\n\n");
  };

  const handleCreateForumDigest = (items: NewsItem[], category: NewsCategory) => {
    if (items.length === 0) return;
    setPendingForumDraft({
      type: "idea",
      title: `Briefing radar ${category.toUpperCase()}`.slice(0, 140),
      body: [
        "Comparto un briefing rapido del radar para detectar prompts, ideas de contenido y oportunidades de proyecto.",
        "",
        buildNewsDigestLines(items),
        "",
        "Que tendencia deberiamos convertir en prompt, demo o hackathon?"
      ].join("\n"),
      tags: Array.from(new Set(["radar", "newsletter", category, ...items.flatMap((item) => item.tags || [])])).slice(0, 10),
      linkUrl: items[0]?.url || "",
      imageUrl: items.find((item) => item.imageUrl)?.imageUrl || ""
    });
    setCurrentSection("foro");
    setCurrentTab("comunidad");
    if (!user) {
      triggerNotification("Conecta con Google y abriremos el briefing en el foro.", "info");
      void handleSignIn();
      return;
    }
    triggerNotification("Briefing preparado como borrador de foro.", "success");
  };

  const handleCreateBetaFeedbackPost = () => {
    setPendingForumDraft({
      type: "question",
      title: "Feedback beta: mi primera prueba",
      body: [
        "Probe la beta y este es mi feedback:",
        "",
        "1. Lo mas claro fue:",
        "2. Lo mas confuso fue:",
        "3. Algo que no funciono:",
        "4. Lo probaria de nuevo si:",
        "",
        "Dispositivo/navegador:"
      ].join("\n"),
      tags: ["feedback", "beta"],
      linkUrl: window.location.origin,
      imageUrl: ""
    });
    setCurrentSection("foro");
    setCurrentTab("comunidad");
    if (!user) {
      triggerNotification("Conecta con Google y abriremos el feedback en el foro.", "info");
      void handleSignIn();
      return;
    }
    triggerNotification("Borrador de feedback preparado en el foro.", "success");
  };

  const handleCreateNewsletterFromNews = (items: NewsItem[], category: NewsCategory) => {
    if (items.length === 0) return;
    setPresetAItext([
      `Crea una edicion de newsletter en espanol neutro para una comunidad de creadores IA.`,
      `Categoria del radar: ${category}`,
      "",
      "Noticias seleccionadas:",
      buildNewsDigestLines(items),
      "",
      "Formato esperado:",
      "1. Titulo atractivo.",
      "2. Resumen editorial breve.",
      "3. 5 bullets con lo importante.",
      "4. Ideas de prompts accionables.",
      "5. Oportunidades de hackathon o equipo.",
      "6. CTA para comentar en comunidad."
    ].join("\n"));
    setShowAIAssistant(true);
    triggerNotification("Abrimos el asistente para preparar newsletter.", "success");
  };

  const handleCreatePublicBriefing = async (items: NewsItem[], category: NewsCategory) => {
    if (!user) {
      setPendingBriefingDraft({ items, category });
      triggerNotification("Conecta con Google y publicaremos este briefing.", "info");
      await handleSignIn();
      return;
    }

    const briefingId = await createBriefingFromNews(items, category, true);
    if (!briefingId) return;

    const url = new URL(window.location.href);
    url.searchParams.set("briefing", briefingId);
    url.searchParams.delete("share");
    url.searchParams.delete("collection");
    url.searchParams.delete("user");
    window.history.replaceState({}, "", url.toString());
    setSharedBriefingId(briefingId);
    const loadedBriefing = await loadBriefing(briefingId);
    if (loadedBriefing) {
      setSharedBriefing(loadedBriefing);
      triggerNotification("Briefing listo para compartir.", "success");
    }
  };

  const handleSaveIdeaFromNews = async (item: NewsItem) => {
    if (!user) {
      setPendingSaveIdeaItem(item);
      triggerNotification("Conecta con Google y guardaremos esta idea.", "info");
      await handleSignIn();
      return;
    }
    await saveIdeaFromNews(item);
  };

  const handleCreatePromptFromSavedIdea = (idea: SavedIdea) => {
    openNewsInAssistant(savedIdeaToNewsItem(idea), "prompt");
  };

  const handleCreateForumPostFromSavedIdea = (idea: SavedIdea, intent: "idea" | "question" | "team" = "idea") => {
    handleCreateForumPostFromNews(savedIdeaToNewsItem(idea), intent);
  };

  const handleSaveBriefingItem = async (item: BriefingItem) => {
    if (!user) {
      setPendingBriefingSaveItem(item);
      triggerNotification("Conecta con Google y guardaremos esta idea del briefing.", "info");
      await handleSignIn();
      return;
    }

    await saveIdeaFromNews(briefingItemToNewsItem(item));
    void trackUserEvent("briefing_idea_save", undefined, buildBriefingEventMetadata(item));
    if (sharedBriefing?.id) {
      bumpSharedBriefingStat("ideaSaves");
      void incrementBriefingStat(sharedBriefing.id, "ideaSaves");
    }
  };

  const handleCreatePromptFromBriefingItem = async (item: BriefingItem) => {
    if (!user) {
      setPendingBriefingPromptItem(item);
      triggerNotification("Conecta con Google y abriremos el prompt con contexto del briefing.", "info");
      await handleSignIn();
      return;
    }

    void trackUserEvent("briefing_prompt_create", undefined, buildBriefingEventMetadata(item));
    if (sharedBriefing?.id) {
      bumpSharedBriefingStat("promptCreates");
      void incrementBriefingStat(sharedBriefing.id, "promptCreates");
    }
    openNewsInAssistant(briefingItemToNewsItem(item), "prompt");
  };

  const handleCreateForumPostFromBriefingItem = async (item: BriefingItem) => {
    if (!user) {
      setPendingBriefingForumItem(item);
      triggerNotification("Conecta con Google y abriremos el borrador del foro.", "info");
      await handleSignIn();
      return;
    }

    void trackUserEvent("briefing_forum_post", undefined, buildBriefingEventMetadata(item));
    if (sharedBriefing?.id) {
      bumpSharedBriefingStat("forumPosts");
      void incrementBriefingStat(sharedBriefing.id, "forumPosts");
    }
    handleCreateForumPostFromNews(briefingItemToNewsItem(item), "question");
  };

  const handleCopyBriefingLink = async () => {
    if (!sharedBriefing) return;
    const url = new URL(window.location.href);
    url.searchParams.set("briefing", sharedBriefing.id);
    url.searchParams.delete("share");
    url.searchParams.delete("collection");
    url.searchParams.delete("user");
    await navigator.clipboard.writeText(url.toString());
    void trackUserEvent("briefing_link_copy", undefined, buildBriefingEventMetadata());
    bumpSharedBriefingStat("linkCopies");
    void incrementBriefingStat(sharedBriefing.id, "linkCopies");
    triggerNotification("Link del briefing copiado.", "success");
  };

  const resolvePublicSavePrompt = async (prompt: Prompt) => {
    if (!user) {
      setPendingPublicSavePrompt(prompt);
      triggerNotification("Conecta con Google y guardaremos este prompt como remix privado.", "info");
      await handleSignIn();
      return;
    }

    if (prompt.userId === user.uid && prompt.userId !== FOUNDER_PACK_USER_ID) {
      const ownPrompt = prompts.find((candidate) => candidate.id === prompt.id) || prompt;
      setCurrentSection("mi-biblioteca");
      setCurrentTab("mi-biblioteca");
      handleOpenEdit(ownPrompt);
      triggerNotification("Este prompt ya es tuyo. Abrimos el editor directamente.", "info");
      return;
    }

    await handleForkPrompt(prompt);
    setCurrentSection("mi-biblioteca");
  };

  useEffect(() => {
    if (!user || !pendingPublicSavePrompt || loadingPrompts || isResolvingPendingPublicSave) return;

    let cancelled = false;
    const promptToSave = pendingPublicSavePrompt;
    setPendingPublicSavePrompt(null);
    setIsResolvingPendingPublicSave(true);

    const resolvePendingSave = async () => {
      try {
        await resolvePublicSavePrompt(promptToSave);
      } finally {
        if (!cancelled) {
          setIsResolvingPendingPublicSave(false);
        }
      }
    };

    void resolvePendingSave();

    return () => {
      cancelled = true;
    };
  }, [user, pendingPublicSavePrompt, loadingPrompts, isResolvingPendingPublicSave]);

  useEffect(() => {
    if (!user || !pendingSaveIdeaItem) return;
    const itemToSave = pendingSaveIdeaItem;
    setPendingSaveIdeaItem(null);
    void saveIdeaFromNews(itemToSave);
  }, [user, pendingSaveIdeaItem, saveIdeaFromNews]);

  useEffect(() => {
    if (!user || !pendingBriefingDraft) return;
    const draftToPublish = pendingBriefingDraft;
    setPendingBriefingDraft(null);
    void handleCreatePublicBriefing(draftToPublish.items, draftToPublish.category);
  }, [user, pendingBriefingDraft]);

  useEffect(() => {
    if (!user || !sharedBriefing) return;
    const trackingKey = `${user.uid}:${sharedBriefing.id}`;
    if (trackedBriefingOpenRef.current.has(trackingKey)) return;
    trackedBriefingOpenRef.current.add(trackingKey);
    void trackUserEvent("briefing_open", undefined, buildBriefingEventMetadata());
    bumpSharedBriefingStat("opens");
    void incrementBriefingStat(sharedBriefing.id, "opens");
  }, [user, sharedBriefing]);

  useEffect(() => {
    if (!user || !pendingBriefingSaveItem) return;
    const itemToSave = pendingBriefingSaveItem;
    setPendingBriefingSaveItem(null);
    void handleSaveBriefingItem(itemToSave);
  }, [user, pendingBriefingSaveItem]);

  useEffect(() => {
    if (!user || !pendingBriefingPromptItem) return;
    const itemToOpen = pendingBriefingPromptItem;
    setPendingBriefingPromptItem(null);
    void handleCreatePromptFromBriefingItem(itemToOpen);
  }, [user, pendingBriefingPromptItem]);

  useEffect(() => {
    if (!user || !pendingBriefingForumItem) return;
    const itemToPost = pendingBriefingForumItem;
    setPendingBriefingForumItem(null);
    void handleCreateForumPostFromBriefingItem(itemToPost);
  }, [user, pendingBriefingForumItem]);

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

  useEffect(() => {
    window.localStorage.setItem("biblioteca-ui-theme", uiThemeMode);
  }, [uiThemeMode]);

  const communityCatalogPrompts = useMemo(() => {
    const communityIds = new Set(communityPrompts.map((prompt) => prompt.id));
    return [
      ...founderPackPrompts.filter((prompt) => !communityIds.has(prompt.id)),
      ...communityPrompts
    ];
  }, [communityPrompts, founderPackPrompts]);

  const visibleCommunityCatalogPrompts = useMemo(() => {
    return communityCatalogPrompts.filter((prompt) => !hiddenPromptIds.has(prompt.id));
  }, [communityCatalogPrompts, hiddenPromptIds]);

  useEffect(() => {
    if (!selectedAuthor) return;
    const authorPrompt = visibleCommunityCatalogPrompts.find((prompt) => prompt.userId === selectedAuthor.uid);
    if (!authorPrompt) return;
    const nextAuthor = {
      name: authorPrompt.authorName || selectedAuthor.name,
      uid: selectedAuthor.uid,
      avatar: authorPrompt.authorAvatar || selectedAuthor.avatar,
      handle: authorPrompt.authorHandle
    };
    if (
      nextAuthor.name !== selectedAuthor.name ||
      nextAuthor.avatar !== selectedAuthor.avatar ||
      nextAuthor.handle !== selectedAuthor.handle
    ) {
      setSelectedAuthor(nextAuthor);
    }
  }, [visibleCommunityCatalogPrompts, selectedAuthor]);

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
      const userId = searchParams.get("user");
      const briefingId = searchParams.get("briefing");
      const classId = searchParams.get("class");

      if (classId && !briefingId && !shareId && !colId && !userId) {
        const classroom = resolveClassroomId(classId);
        if (classroom) {
          openClassroom(classroom);
          setCurrentSection("inicio");
          setCurrentTab("mi-biblioteca");
          setSharedPrompt(null);
          setSharedPromptId(null);
          setSharedCollection(null);
          setSharedCollectionId(null);
          setSharedBriefing(null);
          setSharedBriefingId(null);
          setSelectedAuthor(null);
        } else {
          triggerNotification("La clase no existe o ya no esta activa.", "info");
        }
      }

      if (briefingId && !shareId && !colId) {
        setSharedBriefingId(briefingId);
        setSharedPrompt(null);
        setSharedPromptId(null);
        setSharedCollection(null);
        setSharedCollectionId(null);
        setSelectedAuthor(null);
        const loadedBriefing = await loadBriefing(briefingId);
        if (loadedBriefing) {
          setSharedBriefing(loadedBriefing);
          triggerNotification("Briefing publico cargado.", "success");
        } else {
          setSharedBriefing(null);
          triggerNotification("El briefing no existe o no esta publicado.", "info");
        }
      }

      if (userId && !shareId && !colId && !briefingId) {
        setCurrentSection("prompts");
        setCurrentTab("comunidad");
        setSelectedAuthor({ name: "Creador", uid: userId });
        setPublicProfileTab("prompts");
      }
      
      if (shareId) {
        setCurrentSection("prompts");
        setSharedPromptId(shareId);
        setSelectedAuthor(null);
        setSharedCollection(null);
        setSharedCollectionId(null);
        setSharedBriefing(null);
        setSharedBriefingId(null);
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
              triggerNotification("Recurso publico cargado. Puedes probarlo o guardarlo como remix privado.", "success");
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
        setCurrentSection("prompts");
        setSharedCollectionId(colId);
        setSharedPrompt(null);
        setSharedPromptId(null);
        setSelectedAuthor(null);
        setSharedBriefing(null);
        setSharedBriefingId(null);
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

  const handleCloseBriefing = () => {
    setSharedBriefing(null);
    setSharedBriefingId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("briefing");
    window.history.replaceState({}, "", url.toString());
  };

  const openPublicBriefing = (briefing: Briefing) => {
    setSharedBriefing(briefing);
    setSharedBriefingId(briefing.id);
    setSharedPrompt(null);
    setSharedPromptId(null);
    setSharedCollection(null);
    setSharedCollectionId(null);
    setSelectedAuthor(null);
    const url = new URL(window.location.href);
    url.searchParams.set("briefing", briefing.id);
    url.searchParams.delete("share");
    url.searchParams.delete("collection");
    url.searchParams.delete("user");
    window.history.replaceState({}, "", url.toString());
    triggerNotification("Briefing publico cargado.", "success");
  };

  const handleUsePrompt = (prompt: Prompt, source = "library") => {
    trackUserEvent(source === "recommendation" ? "recommendation_use" : "use", prompt, { source });
    setUsingPrompt(prompt);
  };

  const handleCopyFilledPrompt = (prompt: Prompt) => {
    trackUserEvent("copy", prompt, { mode: "filled" });
    setCopyingFilledPrompt(prompt);
  };

  const handleSeedSelectedPack = (selectedPrompts: typeof DEFAULT_PROMPTS) => {
    void handleSeedDefaults(selectedPrompts);
    setShowSeedPackModal(false);
  };

  const handleOpenClassroom = (classroom: NonNullable<typeof activeClassroom>) => {
    openClassroom(classroom);
    setCurrentSection("inicio");
    setCurrentTab("mi-biblioteca");
    setSelectedAuthor(null);
    setSharedPrompt(null);
    setSharedPromptId(null);
    setSharedCollection(null);
    setSharedCollectionId(null);
    setSharedCollectionPrompts([]);
    setSharedBriefing(null);
    setSharedBriefingId(null);

    const url = new URL(window.location.href);
    url.searchParams.set("class", classroom.id);
    url.searchParams.delete("user");
    url.searchParams.delete("share");
    url.searchParams.delete("collection");
    url.searchParams.delete("briefing");
    window.history.replaceState({}, "", url.toString());
    triggerNotification("Clase privada cargada.", "success");
  };

  const handleCloseClassroom = () => {
    closeClassroom();
    const url = new URL(window.location.href);
    url.searchParams.delete("class");
    window.history.replaceState({}, "", url.toString());
  };

  // Live trigger optimize with AI directly from Form
  const handleOptimizeWithAIDirect = (promptText: string) => {
    setShowFormModal(false);
    setPresetAItext(promptText);
    setShowAIAssistant(true);
  };

  const handleActivationAction = (stepId: ActivationStepId) => {
    if (stepId === "seed") {
      setShowSeedPackModal(true);
      return;
    }

    if (stepId === "use") {
      setCurrentSection("mi-biblioteca");
      setCurrentTab("mi-biblioteca");
      setSelectedCategory("Todas");
      setSelectedFolderId(null);
      triggerNotification("Abre una tarjeta y usa Copiar, Copiar Relleno o Usar para completar este paso.", "info");
      return;
    }

    if (stepId === "remix") {
      setCurrentSection("prompts");
      setCurrentTab("comunidad");
      setSelectedCategory("Todas");
      setSelectedAuthor(null);
      setCommunityScope("todos");
      triggerNotification("Elige un prompt comunitario y pulsa Clonar para crear tu remix editable.", "info");
      return;
    }

    if (stepId === "folder") {
      setCurrentSection("mi-biblioteca");
      setCurrentTab("mi-biblioteca");
      setShowCreateFolder(true);
      return;
    }

    if (stepId === "share") {
      setCurrentSection("mi-biblioteca");
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

  const ownForkedSourceIds = useMemo(() => {
    return new Set(
      prompts
        .map((prompt) => prompt.forkedFromPromptId || "")
        .filter(Boolean)
    );
  }, [prompts]);

  // 7. Filtering and Searching Locally For ultra responsive actions
  const filteredPrompts = useMemo(() => {
    return filterPrompts({
      prompts,
      communityPrompts: visibleCommunityCatalogPrompts,
      currentTab,
      selectedAuthor,
      communityScope,
      followedCreatorUids,
      selectedCategory,
      searchQuery,
      selectedTags,
      selectedFolderId,
      socialFavoritePromptIds,
      hiddenPromptIds,
      ownForkedSourceIds,
      communitySort,
      libraryViewFilter
    });
  }, [prompts, visibleCommunityCatalogPrompts, currentTab, selectedCategory, searchQuery, selectedTags, selectedAuthor, selectedFolderId, communityScope, followedCreatorUids, socialFavoritePromptIds, hiddenPromptIds, ownForkedSourceIds, communitySort, libraryViewFilter]);

  const defaultPromptTitles = useMemo(
    () => new Set(DEFAULT_PROMPTS.map((prompt) => prompt.title.trim().toLocaleLowerCase("es"))),
    []
  );
  const existingPromptTitles = useMemo(
    () => new Set(prompts.map((prompt) => prompt.title.trim().toLocaleLowerCase("es"))),
    [prompts]
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
    defaultPromptsTotal: DEFAULT_PROMPTS.length,
    defaultPromptsStarterGoal: STARTER_PROMPT_GOAL
  }), [prompts, folders, userEvents, defaultPromptTitles]);

  const allAvailableTags = useMemo(() => {
    return getAvailableTags({
      prompts,
      communityPrompts: visibleCommunityCatalogPrompts,
      currentTab,
      selectedAuthor,
      communityScope,
      followedCreatorUids,
      socialFavoritePromptIds,
      hiddenPromptIds,
      ownForkedSourceIds,
      communitySort,
      libraryViewFilter
    });
  }, [prompts, visibleCommunityCatalogPrompts, currentTab, selectedAuthor, communityScope, followedCreatorUids, socialFavoritePromptIds, hiddenPromptIds, ownForkedSourceIds, communitySort, libraryViewFilter]);

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
    return combineSearchablePrompts(prompts, visibleCommunityCatalogPrompts);
  }, [prompts, visibleCommunityCatalogPrompts]);

  const authorProfileStats = useMemo(() => {
    return getAuthorProfileStats(visibleCommunityCatalogPrompts, selectedAuthor);
  }, [visibleCommunityCatalogPrompts, selectedAuthor]);

  const selectedAuthorPrompts = useMemo(() => {
    if (!selectedAuthor) return [];
    return visibleCommunityCatalogPrompts.filter((prompt) => prompt.userId === selectedAuthor.uid);
  }, [visibleCommunityCatalogPrompts, selectedAuthor]);

  const selectedAuthorFolders = useMemo(() => {
    if (!selectedAuthor) return [];
    return communityFolders.filter((folder) => folder.userId === selectedAuthor.uid);
  }, [communityFolders, selectedAuthor]);

  const selectedAuthorBriefings = useMemo(() => {
    if (!selectedAuthor) return [];
    return publicBriefings.filter((briefing) => briefing.authorUid === selectedAuthor.uid);
  }, [publicBriefings, selectedAuthor]);

  const selectedAuthorPosts = useMemo(() => {
    if (!selectedAuthor) return [];
    return communityPosts.filter((post) => post.authorUid === selectedAuthor.uid);
  }, [communityPosts, selectedAuthor]);

  const selectedAuthorHackathons = useMemo(() => {
    if (!selectedAuthor) return [];
    return hackathons.filter((hackathon) => hackathon.authorUid === selectedAuthor.uid);
  }, [hackathons, selectedAuthor]);

  const publicShowcasePrompts = useMemo(() => {
    return getPublicShowcasePrompts({
      prompts: visibleCommunityCatalogPrompts,
      selectedCategory: publicShowcaseCategory,
      searchQuery: publicShowcaseSearch
    });
  }, [visibleCommunityCatalogPrompts, publicShowcaseCategory, publicShowcaseSearch]);

  const socialFavoritePrompts = useMemo(() => {
    return socialFavorites.map((favorite) => ({
      favorite,
      prompt: visibleCommunityCatalogPrompts.find((prompt) => prompt.id === favorite.promptId) || null
    }));
  }, [socialFavorites, visibleCommunityCatalogPrompts]);

  const communityExploreSections = useMemo(() => buildCommunityExploreSections({
    prompts: visibleCommunityCatalogPrompts,
    ownPrompts: prompts,
    followedCreatorUids,
    socialFavoritePromptIds,
    ownForkedSourceIds,
    currentUserId: user?.uid || null
  }), [visibleCommunityCatalogPrompts, prompts, followedCreatorUids, socialFavoritePromptIds, ownForkedSourceIds, user]);

  const suggestedCreators = useMemo(() => buildSuggestedCreators({
    prompts: visibleCommunityCatalogPrompts,
    followedCreatorUids,
    currentUserId: user?.uid || null
  }), [visibleCommunityCatalogPrompts, followedCreatorUids, user]);

  const selectedPublicPromptResourceContext = useMemo(() => {
    if (!selectedPublicPrompt) {
      return {
        remixCount: 0,
        hasOwnRemix: false,
        originalPrompt: null as Prompt | null,
        knownRemixes: [] as Prompt[]
      };
    }

    const sourceId = selectedPublicPrompt.forkedFromPromptId || selectedPublicPrompt.id;
    const allKnownPrompts = [...visibleCommunityCatalogPrompts, ...prompts];
    const originalPrompt = selectedPublicPrompt.forkedFromPromptId
      ? allKnownPrompts.find((prompt) => prompt.id === selectedPublicPrompt.forkedFromPromptId) || null
      : null;
    const isKnownRemix = (candidate: Prompt) => {
      if (candidate.id === selectedPublicPrompt.id) return false;
      return (
        candidate.forkedFromPromptId === sourceId ||
        candidate.forkedFromPromptId === selectedPublicPrompt.id ||
        (!candidate.forkedFromPromptId && candidate.forkedFrom === selectedPublicPrompt.title)
      );
    };
    const knownRemixes = allKnownPrompts.filter(isKnownRemix);

    return {
      remixCount: knownRemixes.length,
      hasOwnRemix: prompts.some(isKnownRemix),
      originalPrompt,
      knownRemixes
    };
  }, [selectedPublicPrompt, visibleCommunityCatalogPrompts, prompts]);

  const knownRemixCountsByPromptId = useMemo(() => {
    const allKnownPrompts = [...visibleCommunityCatalogPrompts, ...prompts];
    const counts = new Map<string, number>();

    allKnownPrompts.forEach((prompt) => {
      const sourceId = prompt.forkedFromPromptId || prompt.id;
      const count = allKnownPrompts.filter((candidate) => {
        if (candidate.id === prompt.id) return false;
        return (
          candidate.forkedFromPromptId === sourceId ||
          candidate.forkedFromPromptId === prompt.id ||
          (!candidate.forkedFromPromptId && candidate.forkedFrom === prompt.title)
        );
      }).length;

      if (count > 0) {
        counts.set(prompt.id, count);
      }
    });

    return counts;
  }, [visibleCommunityCatalogPrompts, prompts]);

  const dailyWorkspaceState = useMemo(() => buildDailyWorkspaceState({
    prompts,
    userEvents,
    socialFavoritePrompts
  }), [prompts, userEvents, socialFavoritePrompts]);

  const ownPublicBriefings = useMemo(() => {
    if (!user) return [];
    return publicBriefings.filter((briefing) => briefing.authorUid === user.uid);
  }, [publicBriefings, user]);

  const ownPublicPrompts = useMemo(() => {
    if (!user) return [];
    return prompts.filter((prompt) => prompt.isShared);
  }, [prompts, user]);

  // Statistics counters
  const favoritesCount = useMemo(() => prompts.filter((p) => p.isFavorite).length, [prompts]);
  const youtubeCount = useMemo(() => prompts.filter((p) => p.category === "YouTube").length, [prompts]);
  const forumPostsCount = useMemo(() => communityPosts.filter((post) => post.type !== "showcase").length, [communityPosts]);
  const showcasePostsCount = useMemo(() => communityPosts.filter((post) => post.type === "showcase").length, [communityPosts]);
  const publicAppUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://biblioteca.browns.studio";
    const { hostname, origin, pathname } = window.location;
    if (hostname.endsWith(".vercel.app")) return "https://biblioteca.browns.studio";
    return `${origin}${pathname}`;
  }, []);

  const handleCopyText = async (text: string, successMessage: string) => {
    await navigator.clipboard.writeText(text);
    triggerNotification(successMessage, "success");
  };

  useEffect(() => {
    if (!user || authLoading) return;
    if (currentSection !== "inicio") return;
    if (activeClassroom || sharedBriefing || sharedPrompt || sharedCollection || selectedAuthor) return;
    setCurrentSection("mi-biblioteca");
    setCurrentTab("mi-biblioteca");
  }, [activeClassroom, authLoading, currentSection, selectedAuthor, sharedBriefing, sharedCollection, sharedPrompt, user]);

  return (
    <div className={`ui-page min-h-screen text-slate-100 flex flex-col font-sans selection:bg-pink-500/30 selection:text-white transition-all duration-200 ${
      uiThemeMode === "clear"
        ? "clear-ui"
        : "dark-ui bg-[#0f172a] bg-[radial-gradient(circle_at_top_right,#1e1b4b,#0f172a)]"
    }`}>
      
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
      <header id="main-app-header" className="bg-[#1e293b]/75 border-b border-[#334155]/60 backdrop-blur-md px-3 py-2.5 sm:px-4 sm:py-3.5 md:px-12 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="app-logo-mark w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#4f46e5] to-[#ec4899] text-white flex items-center justify-center shadow-lg shadow-indigo-600/10 shrink-0">
            <Zap size={18} fill="currentColor" className="text-yellow-300 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-white text-sm sm:text-md leading-tight font-sans tracking-tight flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="text-gradient-brand bg-gradient-to-r from-[#818cf8] to-[#ec4899] bg-clip-text text-transparent truncate">Biblioteca de Prompts</span>
              <span className="hidden sm:inline bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest leading-none shrink-0">
                Creadores IA
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-sans hidden md:block">
              Red social + radar para guardar, remixear y compartir prompts
            </p>
          </div>
        </div>

        {/* Right Header Navigation - Auth State panel */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setUiThemeMode((current) => current === "clear" ? "dark" : "clear")}
            className="header-quiet-button inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/65 px-2.5 py-2.5 sm:px-3 text-xs font-black text-slate-200 shadow-lg shadow-slate-950/10 transition-all hover:border-cyan-400/40 hover:text-cyan-200 active:scale-[0.98] cursor-pointer"
            title={uiThemeMode === "clear" ? "Volver al modo oscuro" : "Activar modo claro"}
            aria-label={uiThemeMode === "clear" ? "Volver al modo oscuro" : "Activar modo claro"}
          >
            {uiThemeMode === "clear" ? <Moon size={14} /> : <Sun size={14} />}
            <span className="hidden sm:inline">{uiThemeMode === "clear" ? "Oscuro" : "Claro"}</span>
          </button>
          {user ? (
            <div className="header-account-panel flex items-center gap-1 sm:gap-2 bg-slate-900/60 p-1.5 sm:pr-2.5 md:pr-4 rounded-2xl border border-slate-800">
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
              <div className="hidden lg:block text-left max-w-36">
                <p className="text-[10px] font-extrabold text-slate-200 leading-tight">
                  {currentUserProfile?.displayName || user.displayName}
                </p>
                <p className="text-[8px] text-slate-400 leading-none">
                  @{currentUserProfile?.handle || buildProfileHandle(user)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowJoinClassModal(true)}
                className="p-2 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-amber-500/15 hover:text-amber-300 rounded-lg border border-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Ingresar codigo de clase"
                aria-label="Ingresar codigo de clase"
              >
                <BookOpen size={12} />
                <span className="hidden md:inline">Clase</span>
              </button>
              <button
                id="btn-edit-profile"
                onClick={handleOpenProfileModal}
                className="p-2 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-indigo-500/15 hover:text-indigo-300 rounded-lg border border-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Editar perfil publico"
                aria-label="Editar perfil publico"
              >
                <UserCheck size={12} />
                <span className="hidden md:inline">Perfil</span>
              </button>
              {isFounder && (
                <button
                  id="btn-founder-admin"
                  type="button"
                  onClick={() => handleSectionChange("admin")}
                  className="p-2 sm:px-2.5 sm:py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg border border-indigo-400/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-lg shadow-indigo-800/10"
                  title="Abrir panel admin"
                  aria-label="Abrir panel admin"
                >
                  <ShieldCheck size={12} />
                  <span className="hidden md:inline">Admin</span>
                </button>
              )}
              <button
                id="btn-logout"
                onClick={handleSignOut}
                className="p-2 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-red-500/15 hover:text-red-400 rounded-lg border border-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Cerrar Sesión"
                aria-label="Cerrar sesion"
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
                className="ui-button-primary px-3 sm:px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                aria-label="Crear mi biblioteca con Google"
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

      <AppTopNav
        currentSection={currentSection}
        promptsCount={visibleCommunityCatalogPrompts.length}
        libraryCount={prompts.length}
        postsCount={forumPostsCount}
        hackathonsCount={hackathons.length}
        showcasesCount={showcasePostsCount}
        newsCount={savedIdeas.length}
        showAdmin={isFounder}
        showGuidedMode={Boolean(user)}
        onSectionChange={handleSectionChange}
        onGuidedModeClick={openGuidedBetaMode}
      />

      {/* Main Core Area layout */}
      {activeClassroom ? (
        <main className="app-shell-main flex-1 overflow-y-auto p-3 sm:p-4 md:p-12">
          <ClassroomView
            classroom={activeClassroom}
            user={user}
            membership={activeClassMembership}
            savedCount={classSavedPromptCount}
            missingCount={classMissingPromptCount}
            loading={loadingClassroomAction}
            onBack={handleCloseClassroom}
            onSignIn={handleSignIn}
            onJoin={() => void joinClassroom(activeClassroom)}
            onSavePack={() => void saveClassroomPack(activeClassroom)}
            onOpenLibrary={() => {
              handleCloseClassroom();
              handleSectionChange("mi-biblioteca");
            }}
            isInstructor={isFounder}
            classMembers={classMembers}
          />
        </main>
      ) : sharedBriefing ? (
        <PublicBriefingView
          briefing={sharedBriefing}
          loading={loadingSharedBriefing}
          onBack={handleCloseBriefing}
          onSignIn={handleSignIn}
          onCopyLink={() => void handleCopyBriefingLink()}
          onSaveItem={(item) => void handleSaveBriefingItem(item)}
          onCreatePrompt={(item) => void handleCreatePromptFromBriefingItem(item)}
          onCreateForumPost={(item) => void handleCreateForumPostFromBriefingItem(item)}
        />
      ) : sharedCollection ? (
        <PromptPlaylistPlayer
          collectionName={sharedCollection.name}
          collectionDescription={sharedCollection.description}
          authorName={sharedCollection.authorName}
          prompts={sharedCollectionPrompts}
          onClose={() => {
            setSharedCollection(null);
            const url = new URL(window.location.href);
            url.searchParams.delete("collection");
            window.history.replaceState({}, "", url.toString());
          }}
          user={user}
          onCloneCollection={handleCloneCollection}
          isCloning={isCloningCollection}
          onNotification={triggerNotification}
          handleUsePrompt={handleUsePrompt}
          handleCopyFilledPrompt={handleCopyFilledPrompt}
        />
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left Side: Prompts Viewer Grid and category bar */}
        <main className="app-shell-main flex-1 overflow-y-auto p-3 sm:p-4 md:p-12 space-y-5 sm:space-y-6 md:space-y-8">
          {currentSection === "admin" && isFounder ? (
            <AdminDashboard
              loading={adminDashboard.loading}
              permissionIssue={adminDashboard.permissionIssue}
              userMetrics={adminDashboard.userMetrics}
              totals={adminDashboard.totals}
              classroomMetrics={adminDashboard.classroomMetrics}
            />
          ) : currentSection === "foro" ? (
            <ForumSection
              posts={communityPosts}
              loading={loadingPosts}
              currentUser={user}
              onSignIn={handleSignIn}
              onSave={savePost}
              onDelete={deletePost}
              onLike={togglePostLike}
              onAuthorClick={openPublicProfile}
              onNotification={triggerNotification}
              initialDraft={pendingForumDraft}
              onDraftConsumed={() => setPendingForumDraft(null)}
            />
          ) : currentSection === "hackathons" ? (
            <HackathonsSection
              hackathons={hackathons}
              loading={loadingHackathons}
              currentUser={user}
              onSignIn={handleSignIn}
              onSave={saveHackathon}
              onDelete={deleteHackathon}
              onCreateTeamPostFromNews={(item) => handleCreateForumPostFromNews(item, "team")}
            />
          ) : currentSection === "galeria" ? (
            <ShowcaseSection
              posts={communityPosts}
              loading={loadingPosts}
              currentUser={user}
              onSignIn={handleSignIn}
              onSave={savePost}
              onDelete={deletePost}
              onLike={togglePostLike}
              onAuthorClick={openPublicProfile}
              onNotification={triggerNotification}
            />
          ) : currentSection === "noticias" ? (
            <NewsSection
              savedIdeas={savedIdeas}
              savedIdeaIds={savedIdeaIds}
              loadingSavedIdeas={loadingSavedIdeas}
              onCreatePromptFromNews={handleCreatePromptFromNews}
              onCreateForumPostFromNews={handleCreateForumPostFromNews}
              onCreateForumDigest={handleCreateForumDigest}
              onCreatePublicBriefing={(items, category) => void handleCreatePublicBriefing(items, category)}
              onCreateNewsletterFromNews={handleCreateNewsletterFromNews}
              onSaveIdeaFromNews={(item) => void handleSaveIdeaFromNews(item)}
              onDeleteSavedIdea={(idea) => void deleteSavedIdea(idea)}
              onCreatePromptFromSavedIdea={handleCreatePromptFromSavedIdea}
              onCreateForumPostFromSavedIdea={handleCreateForumPostFromSavedIdea}
              onSummarizeNews={(item) => openNewsInAssistant(item, "summary")}
              onTranslateNews={(item) => openNewsInAssistant(item, "translation")}
              onDetectHackathonOpportunity={(item) => openNewsInAssistant(item, "opportunity")}
            />
          ) : (
            <>
          
          {/* Welcome Dashboard Block if offline/unauthenticated */}
          {!user && !authLoading && selectedAuthor ? (
            <div className="max-w-7xl mx-auto w-full">
              <PublicProfileSurface
                author={selectedAuthor}
                prompts={selectedAuthorPrompts}
                allCommunityPrompts={visibleCommunityCatalogPrompts}
                folders={selectedAuthorFolders}
                briefings={selectedAuthorBriefings}
                posts={selectedAuthorPosts}
                hackathons={selectedAuthorHackathons}
                activeTab={publicProfileTab}
                currentUser={user}
                followedCreatorUids={followedCreatorUids}
                connectionStatus={selectedAuthor ? connectionByTargetUid.get(selectedAuthor.uid)?.status : undefined}
                socialFavoritePromptIds={socialFavoritePromptIds}
                onTabChange={setPublicProfileTab}
                onBack={closePublicProfile}
                onCopyProfileLink={handleCopyPublicProfileLink}
                onOpenBriefing={openPublicBriefing}
                onToggleFollow={handleToggleFollowCreator}
                onSendConnectionRequest={(target) => void sendConnectionRequest(target)}
                onAcceptConnection={(targetUid) => void acceptConnection(targetUid)}
                onRemoveConnection={(targetUid) => void removeConnection(targetUid)}
                onOpenConnectionChat={handleOpenConnectionChatFromProfile}
                onUsePrompt={(prompt) => handleUsePrompt(prompt, "public_profile")}
                onCopyFilled={(prompt) => handleCopyFilledPrompt(prompt)}
                onFork={(prompt) => void resolvePublicSavePrompt(prompt)}
                onLikeToggle={handleLikeToggle}
                onViewDetails={setSelectedPublicPrompt}
                onSocialFavoriteToggle={handleToggleSocialFavorite}
                onHidePrompt={(prompt) => void handleHideCommunityPrompt(prompt)}
                onReportPrompt={(prompt) => void handleReportCommunityPrompt(prompt)}
                onNotification={triggerNotification}
              />
            </div>
          ) : !user && !authLoading ? (
            <WelcomeHeroSection
              user={user}
              authLoading={authLoading}
              handleSignIn={handleSignIn}
              handleSectionChange={handleSectionChange}
              setShowJoinClassModal={setShowJoinClassModal}
              visibleCommunityCatalogPromptsCount={visibleCommunityCatalogPrompts.length}
              forumPostsCount={forumPostsCount}
              hackathons={hackathons}
              showcasePostsCount={showcasePostsCount}
              loadingPublicBriefings={loadingPublicBriefings}
              publicBriefings={publicBriefings}
              openPublicBriefing={openPublicBriefing}
              publicShowcaseSearch={publicShowcaseSearch}
              setPublicShowcaseSearch={setPublicShowcaseSearch}
              publicShowcaseCategory={publicShowcaseCategory}
              setPublicShowcaseCategory={setPublicShowcaseCategory}
              filteredShowcasePrompts={publicShowcasePrompts}
              handleCopyFilledPrompt={handleCopyFilledPrompt}
              handleUsePrompt={handleUsePrompt}
              PUBLIC_SHOWCASE_CATEGORIES={PUBLIC_SHOWCASE_CATEGORIES}
            />
          ) : (
            // Authenticated Dashboard Layout
            <div className="space-y-8">
              
              {/* Sleek Navigation Tabs */}
              <div className="library-switcher-surface flex items-center gap-1 p-1 bg-[#0f172a]/65 rounded-2xl border border-slate-800/80 w-fit">
                <button
                  onClick={() => {
                    setCurrentSection("mi-biblioteca");
                    setCurrentTab("mi-biblioteca");
                    setSelectedCategory("Todas");
                    closePublicProfile();
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
                    setCurrentSection("prompts");
                    setCurrentTab("comunidad");
                    setSelectedCategory("Todas");
                    closePublicProfile();
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
                    {visibleCommunityCatalogPrompts.length}
                  </span>
                </button>
              </div>

              {currentTab === "comunidad" && !selectedAuthor && (
                <div className="control-panel-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-[#1e293b]/45 p-3">
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
                    <button
                      type="button"
                      onClick={() => setCommunityScope("favoritos")}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        communityScope === "favoritos"
                          ? "bg-amber-500 text-slate-950 shadow-md"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <Star size={13} fill={communityScope === "favoritos" ? "currentColor" : "none"} />
                      <span>Favoritos</span>
                      {socialFavorites.length > 0 && (
                        <span className="text-[10px] bg-slate-950/50 px-1.5 py-0.5 rounded-md font-mono">{socialFavorites.length}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommunityScope("remixeados")}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        communityScope === "remixeados"
                          ? "bg-pink-600 text-white shadow-md"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <GitFork size={13} />
                      <span>Remixeados</span>
                      {ownForkedSourceIds.size > 0 && (
                        <span className="text-[10px] bg-slate-950/50 px-1.5 py-0.5 rounded-md font-mono">{ownForkedSourceIds.size}</span>
                      )}
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <p className="text-[11px] text-slate-400 font-sans">
                      {communityScope === "siguiendo"
                        ? "Mostrando prompts de creadores que sigues."
                        : communityScope === "favoritos"
                        ? "Tus favoritos sociales guardados como referencia."
                        : communityScope === "remixeados"
                        ? "Prompts que ya convertiste en remixes editables."
                        : "Explora prompts publicos de toda la comunidad."}
                    </p>
                    <div className="flex items-center gap-1 rounded-xl bg-slate-950/50 p-1 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setCommunitySort("populares")}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          communitySort === "populares"
                            ? "bg-pink-600 text-white"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        <TrendingUp size={12} />
                        <span>Populares</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommunitySort("recientes")}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          communitySort === "recientes"
                            ? "bg-indigo-600 text-white"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        <Clock size={12} />
                        <span>Recientes</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {currentTab === "comunidad" && !selectedAuthor && communityScope === "todos" && (
                <CommunityExplore
                  sections={communityExploreSections}
                  suggestedCreators={suggestedCreators}
                  onView={setSelectedPublicPrompt}
                  onUse={(prompt) => handleUsePrompt(prompt, "community_explore")}
                  onSave={(prompt) => void resolvePublicSavePrompt(prompt)}
                  onOpenCreator={(creator) => openPublicProfile(creator)}
                  onFollowCreator={(creator) => void handleToggleFollowCreator(creator.uid, creator)}
                />
              )}

              {/* Legacy author banner kept dormant while PublicProfileView owns the profile surface */}
              {false && currentTab === "comunidad" && selectedAuthor && (
                <div className="bg-gradient-to-r from-slate-900/60 via-indigo-950/20 to-slate-900/60 border border-indigo-500/25 p-6 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                    <button 
                      onClick={closePublicProfile}
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
                      onClick={closePublicProfile}
                      className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-755 text-slate-300 hover:text-white text-xs font-bold rounded-2xl border border-slate-700/80 transition-all cursor-pointer"
                    >
                      Volver al feed general
                    </button>
                  </div>
                </div>
              )}

              {currentTab === "comunidad" && selectedAuthor && (
                <PublicProfileSurface
                  author={selectedAuthor}
                  prompts={selectedAuthorPrompts}
                  allCommunityPrompts={visibleCommunityCatalogPrompts}
                  folders={selectedAuthorFolders}
                  briefings={selectedAuthorBriefings}
                  posts={selectedAuthorPosts}
                  hackathons={selectedAuthorHackathons}
                  activeTab={publicProfileTab}
                  currentUser={user}
                  followedCreatorUids={followedCreatorUids}
                  connectionStatus={connectionByTargetUid.get(selectedAuthor.uid)?.status}
                  socialFavoritePromptIds={socialFavoritePromptIds}
                  onTabChange={setPublicProfileTab}
                  onBack={closePublicProfile}
                  onCopyProfileLink={handleCopyPublicProfileLink}
                  onOpenBriefing={openPublicBriefing}
                  onToggleFollow={handleToggleFollowCreator}
                  onSendConnectionRequest={(target) => void sendConnectionRequest(target)}
                  onAcceptConnection={(targetUid) => void acceptConnection(targetUid)}
                  onRemoveConnection={(targetUid) => void removeConnection(targetUid)}
                  onOpenConnectionChat={handleOpenConnectionChatFromProfile}
                  onUsePrompt={(prompt) => handleUsePrompt(prompt, "public_profile")}
                  onCopyFilled={(prompt) => handleCopyFilledPrompt(prompt)}
                  onFork={(prompt) => void resolvePublicSavePrompt(prompt)}
                  onLikeToggle={handleLikeToggle}
                  onViewDetails={setSelectedPublicPrompt}
                  onSocialFavoriteToggle={handleToggleSocialFavorite}
                  onHidePrompt={(prompt) => void handleHideCommunityPrompt(prompt)}
                  onReportPrompt={(prompt) => void handleReportCommunityPrompt(prompt)}
                  onNotification={triggerNotification}
                />
              )}

              {currentTab === "mi-biblioteca" && (
                <ActivationChecklist
                  state={activationChecklistState}
                  onAction={handleActivationAction}
                />
              )}

              {user && currentTab === "mi-biblioteca" && (
                <DailyMissionPanel
                  savedIdeasCount={savedIdeas.length}
                  publicBriefingsCount={ownPublicBriefings.length}
                  publicPromptsCount={ownPublicPrompts.length}
                  publishCandidates={dailyWorkspaceState.publishCandidates}
                  recentPrompts={dailyWorkspaceState.recentPrompts}
                  recentRemixes={dailyWorkspaceState.recentRemixes}
                  socialFavoritePromptsCount={dailyWorkspaceState.socialFavoritePrompts.length}
                  onOpenNews={() => handleSectionChange("noticias")}
                  onOpenCommunity={() => {
                    setCurrentSection("prompts");
                    setCurrentTab("comunidad");
                    setCommunityScope("todos");
                    setSelectedAuthor(null);
                    setSelectedCategory("Todas");
                  }}
                  onEditPrompt={handleOpenEdit}
                  onUsePrompt={(prompt) => handleUsePrompt(prompt, "daily_mission")}
                />
              )}

              {user && currentTab === "mi-biblioteca" && (
                <BetaInvitePanel
                  publicUrl={publicAppUrl}
                  publicPromptsCount={ownPublicPrompts.length}
                  publicBriefingsCount={ownPublicBriefings.length}
                  forumPostsCount={forumPostsCount}
                  savedIdeasCount={savedIdeas.length}
                  onCopy={(text, message) => void handleCopyText(text, message)}
                  onCreateFeedbackPost={handleCreateBetaFeedbackPost}
                />
              )}

              {user && currentTab === "mi-biblioteca" && (
                <ConnectionsPanel
                  connectedConnections={connectedConnections}
                  incomingConnectionRequests={incomingConnectionRequests}
                  outgoingConnectionRequests={outgoingConnectionRequests}
                  activeChatConnection={activeChatConnection}
                  chatMessages={chatMessages}
                  chatDraft={chatDraft}
                  loadingChatMessages={loadingChatMessages}
                  blockedUserIds={blockedUserIds}
                  currentUserUid={user.uid}
                  onAccept={(targetUid) => void acceptConnection(targetUid)}
                  onRemove={(targetUid) => void removeConnection(targetUid)}
                  onBlock={(connection) => void handleBlockConnection(connection)}
                  onReportChat={() => void reportChat()}
                  onOpenChat={openChat}
                  onCloseChat={closeChat}
                  onChatDraftChange={setChatDraft}
                  onSendChatMessage={() => void sendChatMessage()}
                />
              )}

              {user && currentTab === "mi-biblioteca" && (
                <CreatorGrowthPanel
                  briefings={ownPublicBriefings}
                  publicPrompts={ownPublicPrompts}
                  publishCandidates={dailyWorkspaceState.publishCandidates}
                  userEvents={userEvents}
                  onOpenBriefing={openPublicBriefing}
                  onEditPrompt={handleOpenEdit}
                  onOpenNews={() => handleSectionChange("noticias")}
                  onOpenCommunity={() => {
                    setCurrentSection("prompts");
                    setCurrentTab("comunidad");
                    setCommunityScope("todos");
                    setSelectedAuthor(null);
                    setSelectedCategory("Todas");
                  }}
                />
              )}

              {user && currentTab === "mi-biblioteca" && (
                <DailyWorkspace
                  state={dailyWorkspaceState}
                  onEdit={handleOpenEdit}
                  onUse={(prompt) => handleUsePrompt(prompt, "daily_workspace")}
                  onViewSocial={setSelectedPublicPrompt}
                  onSaveSocial={(prompt) => void resolvePublicSavePrompt(prompt)}
                  onOpenSocialFavorites={() => {
                    setCurrentSection("prompts");
                    setCurrentTab("comunidad");
                    setCommunityScope("favoritos");
                    setSelectedAuthor(null);
                    setSelectedCategory("Todas");
                  }}
                />
              )}

              {user && currentTab === "mi-biblioteca" && (
                <TrustModerationPanel
                  publicPrompts={publicOwnPrompts}
                  reportedPrompts={reportedPrompts}
                  hiddenCount={hiddenPromptIds.size}
                  totalReportsCount={totalReportsCount}
                  hasPermissionIssue={hasModerationPermissionIssue}
                  onEditPrompt={handleOpenEdit}
                  onViewPrompt={setSelectedPublicPrompt}
                  onOpenCommunity={() => {
                    setCurrentTab("comunidad");
                    setCommunityScope("todos");
                    setSelectedAuthor(null);
                    setSelectedCategory("Todas");
                  }}
                />
              )}

              <LibraryWorkspaceView
                user={user}
                currentTab={currentTab}
                prompts={prompts}
                loadingPrompts={loadingPrompts}
                loadingCommunityPrompts={loadingCommunityPrompts}
                filteredPrompts={filteredPrompts}
                setNewFolderParentId={setNewFolderParentId}
                folders={folders}
                loadingFolders={loadingFolders}
                selectedAuthor={selectedAuthor}
                setSelectedAuthor={setSelectedAuthor}
                selectedAuthorPrompts={selectedAuthorPrompts}
                followedCreatorUids={followedCreatorUids}
                socialFavorites={socialFavorites}
                socialFavoritePrompts={[]}
                socialFavoritePromptIds={socialFavoritePromptIds}
                knownRemixCountsByPromptId={knownRemixCountsByPromptId}
                visibleCommunityCatalogPrompts={visibleCommunityCatalogPrompts}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedTags={selectedTags}
                setSelectedTags={setSelectedTags}
                tagSearchInput={tagSearchInput}
                setTagSearchInput={setTagSearchInput}
                isTagDropdownOpen={isTagDropdownOpen}
                setIsTagDropdownOpen={setIsTagDropdownOpen}
                tagSuggestions={tagSuggestions}
                allAvailableTags={allAvailableTags}
                libraryViewFilter={libraryViewFilter}
                setLibraryViewFilter={setLibraryViewFilter}
                communitySort={communitySort}
                setCommunitySort={setCommunitySort}
                communityScope={communityScope}
                setCommunityScope={setCommunityScope}
                selectedFolderId={selectedFolderId}
                setSelectedFolderId={setSelectedFolderId}
                dragOverFolderId={dragOverFolderId}
                setDragOverFolderId={setDragOverFolderId}
                showAIAssistant={showAIAssistant}
                setShowAIAssistant={setShowAIAssistant}
                setPresetAItext={setPresetAItext}
                setShowQuickSwitcher={setShowQuickSwitcher}
                setShowRecommendationModal={setShowRecommendationModal}
                setShowSeedPackModal={setShowSeedPackModal}
                setShowJoinClassModal={setShowJoinClassModal}
                setShowCreateFolder={setShowCreateFolder}
                setGeminiRecommendation={setGeminiRecommendation}
                setGeminiRecommendationError={setGeminiRecommendationError}
                handleOpenAdd={handleOpenAdd}
                handleOpenEdit={handleOpenEdit}
                handleDeletePrompt={handleDeletePrompt}
                handleFavoriteToggle={handleFavoriteToggle}
                handleUsePrompt={handleUsePrompt}
                handleCopyFilledPrompt={handleCopyFilledPrompt}
                handleLikeToggle={handleLikeToggle}
                handleToggleSocialFavorite={handleToggleSocialFavorite}
                handleHideCommunityPrompt={handleHideCommunityPrompt}
                handleReportCommunityPrompt={handleReportCommunityPrompt}
                openPublicProfile={openPublicProfile}
                setSelectedPublicPrompt={setSelectedPublicPrompt}
                resolvePublicSavePrompt={resolvePublicSavePrompt}
                trackUserEvent={trackUserEvent}
                triggerNotification={triggerNotification}
                handleExportJSON={handleExportJSON}
                handleImportJSON={handleImportJSON}
                handleMovePromptToFolder={handleMovePromptToFolder}
                handleDeleteFolder={handleDeleteFolder}
                handleOpenShareFolderModal={handleOpenShareFolderModal}
                missingDefaultPromptCount={missingDefaultPromptCount}
                existingDefaultPromptCount={existingDefaultPromptCount}
                STARTER_PROMPT_GOAL={STARTER_PROMPT_GOAL}
                forumPostsCount={forumPostsCount}
                showcasePostsCount={showcasePostsCount}
              />
            </div>
          )}
            </>
          )}
                </main>

        {/* Right Side: Gemini Engineering and Prompt optimization assistant slide panel */}
        {showAIAssistant && (
          <AIAssistantAside
            presetAItext={presetAItext}
            onImportToLibrary={handleImportFromAI}
            onClose={() => {
              setPresetAItext("");
              setShowAIAssistant(false);
            }}
          />
        )}

      </div>
      )}

      <AppModalLayer
        showFormModal={showFormModal}
        editingPrompt={editingPrompt}
        folders={folders}
        onSavePrompt={handleSavePrompt}
        onCloseForm={() => {
          setShowFormModal(false);
          setEditingPrompt(null);
        }}
        onOptimizeWithAI={handleOptimizeWithAIDirect}
        onNotification={triggerNotification}
        usingPrompt={usingPrompt}
        onCloseUsingPrompt={() => setUsingPrompt(null)}
        copyingFilledPrompt={copyingFilledPrompt}
        onCloseCopyingFilledPrompt={() => setCopyingFilledPrompt(null)}
        showQuickSwitcher={showQuickSwitcher}
        allSearchablePrompts={allSearchablePrompts}
        onCloseQuickSwitcher={() => setShowQuickSwitcher(false)}
        onQuickUse={(prompt) => handleUsePrompt(prompt, "quick_switcher")}
        onCopyFilled={(prompt) => handleCopyFilledPrompt(prompt)}
        onOpenEdit={(prompt) => handleOpenEdit(prompt)}
        showRecommendationModal={showRecommendationModal}
        prompts={prompts}
        recommendationGoal={recommendationGoal}
        setRecommendationGoal={setRecommendationGoal}
        recommendedPrompts={recommendedPrompts}
        geminiRecommendation={geminiRecommendation}
        geminiRecommendationLoading={geminiRecommendationLoading}
        geminiRecommendationError={geminiRecommendationError}
        onImproveWithGemini={handleImproveRecommendationsWithGemini}
        onRecommendationUse={(prompt) => {
          handleUsePrompt(prompt, "recommendation");
          setShowRecommendationModal(false);
        }}
        onRecommendationCopy={(prompt) => {
          navigator.clipboard.writeText(prompt.promptText);
          trackUserEvent("recommendation_copy", prompt, { source: "recommendation" });
          triggerNotification("Prompt recomendado copiado.", "success");
        }}
        onRecommendationEdit={(prompt) => {
          handleOpenEdit(prompt);
          setShowRecommendationModal(false);
        }}
        onCopySuggestedPrompt={(promptText) => {
          navigator.clipboard.writeText(promptText);
          triggerNotification("Sugerencia Gemini copiada.", "success");
        }}
        onCloseRecommendation={() => setShowRecommendationModal(false)}
        showProfileModal={showProfileModal}
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
        onSaveProfile={handleSaveProfile}
        onCloseProfile={() => setShowProfileModal(false)}
        showCreateFolder={showCreateFolder}
        newFolderName={newFolderName}
        newFolderDesc={newFolderDesc}
        isSavingFolder={isSavingFolder}
        setNewFolderName={setNewFolderName}
        setNewFolderDesc={setNewFolderDesc}
        onCreateFolder={handleCreateFolder}
        onCloseCreateFolder={closeCreateFolderModal}
        showShareFolderModal={showShareFolderModal}
        isFolderSharedInput={isFolderSharedInput}
        publishFolderPromptsInput={publishFolderPromptsInput}
        isSavingFolderShare={isSavingFolderShare}
        setIsFolderSharedInput={setIsFolderSharedInput}
        setPublishFolderPromptsInput={setPublishFolderPromptsInput}
        onSaveFolderShareSettings={handleSaveFolderShareSettings}
        onCloseShareFolder={() => setShowShareFolderModal(null)}
        sharedPrompt={sharedPrompt}
        onCloseSharedPrompt={handleCloseShared}
        onCopySharedPrompt={() => {
          if (!sharedPrompt) return;
          navigator.clipboard.writeText(sharedPrompt.promptText);
          trackUserEvent("copy", sharedPrompt, { source: "shared_prompt" });
          triggerNotification("Contenido del prompt copiado con exito.", "success");
        }}
        onUseSharedPrompt={() => {
          if (!sharedPrompt) return;
          handleUsePrompt(sharedPrompt, "shared_prompt");
          handleCloseShared();
        }}
        onSaveSharedPromptToLibrary={() => {
          if (!sharedPrompt) return;
          void resolvePublicSavePrompt(sharedPrompt);
          handleCloseShared();
        }}
        selectedPublicPrompt={selectedPublicPrompt}
        publicPromptResourceContext={selectedPublicPromptResourceContext}
        currentUser={user}
        socialFavoritePromptIds={socialFavoritePromptIds}
        onClosePublicPrompt={() => setSelectedPublicPrompt(null)}
        onCopyPublicPrompt={(prompt) => {
          navigator.clipboard.writeText(prompt.promptText);
          trackUserEvent("copy", prompt, { source: "public_prompt_detail" });
          triggerNotification("Prompt copiado desde el detalle social.", "success");
        }}
        onUsePublicPrompt={(prompt) => {
          handleUsePrompt(prompt, "public_prompt_detail");
          setSelectedPublicPrompt(null);
        }}
        onSavePublicPromptToLibrary={(prompt) => {
          void resolvePublicSavePrompt(prompt);
          setSelectedPublicPrompt(null);
        }}
        onToggleSocialFavorite={handleToggleSocialFavorite}
        onLikeToggle={handleLikeToggle}
        onHidePrompt={(prompt) => void handleHideCommunityPrompt(prompt)}
        onReportPrompt={(prompt) => void handleReportCommunityPrompt(prompt)}
        onViewRelatedPrompt={setSelectedPublicPrompt}
        onAuthorClick={openPublicProfile}
      />
      {showSeedPackModal && (
        <SeedPackModal
          defaultPrompts={DEFAULT_PROMPTS}
          existingTitles={existingPromptTitles}
          loading={loadingPrompts}
          onClose={() => setShowSeedPackModal(false)}
          onSeedPack={handleSeedSelectedPack}
        />
      )}
      {showJoinClassModal && (
        <JoinClassModal
          onClose={() => setShowJoinClassModal(false)}
          onResolve={resolveClassroomCode}
          onOpenClassroom={handleOpenClassroom}
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
