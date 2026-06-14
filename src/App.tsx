import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Newspaper
} from "lucide-react";

import { auth, db } from "./firebase";
import { motion, AnimatePresence } from "motion/react";
import { Prompt, CategoryFilter, Folder } from "./types";
import PromptCard from "./components/PromptCard";
import ActivationChecklist from "./components/ActivationChecklist";
import CommunityExplore from "./components/CommunityExplore";
import DailyWorkspace from "./components/DailyWorkspace";
import TrustModerationPanel from "./components/TrustModerationPanel";
import AppTopNav from "./components/AppTopNav";
import ForumSection from "./components/ForumSection";
import HackathonsSection from "./components/HackathonsSection";
import ShowcaseSection from "./components/ShowcaseSection";
import NewsSection from "./components/NewsSection";
import PublicBriefingView from "./components/PublicBriefingView";
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

export default function App() {
  // Social / Community navigation
  const [currentTab, setCurrentTab] = useState<"mi-biblioteca" | "comunidad">("mi-biblioteca");
  const [currentSection, setCurrentSection] = useState<AppSection>("inicio");

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
    window.history.replaceState({}, "", url.toString());
  };

  const handleCopyPublicProfileLink = () => {
    if (!selectedAuthor) return;
    const url = new URL(window.location.href);
    url.searchParams.set("user", selectedAuthor.uid);
    url.searchParams.delete("share");
    url.searchParams.delete("collection");
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

  // Statistics counters
  const favoritesCount = useMemo(() => prompts.filter((p) => p.isFavorite).length, [prompts]);
  const youtubeCount = useMemo(() => prompts.filter((p) => p.category === "YouTube").length, [prompts]);
  const forumPostsCount = useMemo(() => communityPosts.filter((post) => post.type !== "showcase").length, [communityPosts]);
  const showcasePostsCount = useMemo(() => communityPosts.filter((post) => post.type === "showcase").length, [communityPosts]);

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

      <AppTopNav
        currentSection={currentSection}
        promptsCount={visibleCommunityCatalogPrompts.length}
        libraryCount={prompts.length}
        postsCount={forumPostsCount}
        hackathonsCount={hackathons.length}
        showcasesCount={showcasePostsCount}
        newsCount={savedIdeas.length}
        onSectionChange={handleSectionChange}
      />

      {/* Main Core Area layout */}
      {sharedBriefing ? (
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
                    onFork={(prompt) => void resolvePublicSavePrompt(prompt)}
                    onLikeToggle={handleLikeToggle}
                    onAuthorClick={openPublicProfile}
                    onViewDetails={setSelectedPublicPrompt}
                    onSocialFavoriteToggle={handleToggleSocialFavorite}
                    onHidePrompt={(prompt) => void handleHideCommunityPrompt(prompt)}
                    onReportPrompt={(prompt) => void handleReportCommunityPrompt(prompt)}
                    isSocialFavorite={socialFavoritePromptIds.has(p.id)}
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
          {currentSection === "foro" ? (
            <ForumSection
              posts={communityPosts}
              loading={loadingPosts}
              currentUser={user}
              onSignIn={handleSignIn}
              onSave={savePost}
              onDelete={deletePost}
              onLike={togglePostLike}
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
                activeTab={publicProfileTab}
                currentUser={user}
                followedCreatorUids={followedCreatorUids}
                socialFavoritePromptIds={socialFavoritePromptIds}
                onTabChange={setPublicProfileTab}
                onBack={closePublicProfile}
                onCopyProfileLink={handleCopyPublicProfileLink}
                onToggleFollow={handleToggleFollowCreator}
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
            <div id="welcome-callout" className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-white rounded-2xl md:rounded-3xl p-5 md:p-12 shadow-2xl border border-slate-700/80 space-y-6 relative overflow-hidden max-w-5xl mx-auto">
              <div className="space-y-3 relative z-10 max-w-3xl">
                <span className="font-extrabold uppercase tracking-widest text-[9px] text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.12)]">
                  Radar social para creadores IA
                </span>
                <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-tight">
                  Convierte tendencias IA en ideas guardadas, prompts remixables y briefings compartibles.
                </h2>
                <p className="hidden text-slate-350 text-sm leading-relaxed font-sans max-w-2xl">
                  ¿Vas a enseñar Inteligencia Artificial en YouTube? Esta biblioteca te permite tener todas las plantillas de instrucciones organizadas en un solo lugar. Rellena variables en vivo para tus espectadores y optimiza cualquier prompt básico al instante mediante el Asistente IA de Gemini.
                </p>
                <p className="text-slate-350 text-sm leading-relaxed font-sans max-w-2xl">
                  Descubre noticias, hackathons y recursos de la comunidad. Guarda lo importante en tu biblioteca, transforma cada senal en un prompt editable y comparte briefings para atraer otros creadores.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2 relative z-10 min-[430px]:grid-cols-2 md:flex md:flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSectionChange("noticias")}
                  className="px-5 py-3 bg-cyan-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-600/10 active:scale-[0.98] cursor-pointer"
                >
                  <Newspaper size={14} />
                  <span>Explorar radar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSectionChange("prompts")}
                  className="px-5 py-3 bg-slate-900/70 hover:bg-slate-800 text-slate-100 border border-slate-700 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <GitFork size={14} />
                  <span>Remixear prompts</span>
                </button>
                <button
                  id="btn-callout-login"
                  onClick={handleSignIn}
                  className="px-5 py-3 bg-gradient-to-r from-[#4f46e5] to-[#ec4899] text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] cursor-pointer min-[430px]:col-span-2 md:col-span-1"
                >
                  <span>Crear mi biblioteca</span>
                  <ArrowRight size={14} className="text-white" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-5 border-t border-slate-700/60 relative z-10">
                {[
                  { label: "Prompts publicos", value: visibleCommunityCatalogPrompts.length },
                  { label: "Posts de comunidad", value: forumPostsCount },
                  { label: "Hackathons", value: hackathons.length },
                  { label: "Galeria", value: showcasePostsCount }
                ].map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-950/35 p-3">
                    <p className="text-xl font-black text-white">{metric.value}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{metric.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t border-slate-700/60 relative z-10 text-xs">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-cyan-300 flex items-center gap-1">
                    <TrendingUp size={14} /> 1. Detecta senales
                  </h4>
                  <p className="text-slate-400 leading-relaxed font-sans">
                    Lee tendencias IA, devtools, diseno y hackathons desde el radar.
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-amber-300 flex items-center gap-1">
                    <StickyNote size={14} /> 2. Guarda ideas
                  </h4>
                  <p className="text-slate-400 leading-relaxed font-sans">
                    Conserva oportunidades para volver cuando quieras crear contenido.
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-pink-400 flex items-center gap-1">
                    <Sparkles size={14} /> 3. Crea prompts
                  </h4>
                  <p className="text-slate-400 leading-relaxed font-sans">
                    Convierte cada noticia o recurso en instrucciones reutilizables.
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-emerald-300 flex items-center gap-1">
                    <Share2 size={14} /> 4. Comparte briefings
                  </h4>
                  <p className="text-slate-400 leading-relaxed font-sans">
                    Publica links que otros pueden leer, guardar y comentar.
                  </p>
                </div>
              </div>

              {/* Bento Row points */}
              <div className="hidden grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t border-slate-700/60 relative z-10 text-xs">
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-full">
                      Briefings para compartir
                    </span>
                    <h3 className="text-lg font-extrabold text-white mt-3">Empieza por un radar curado</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                      Abre un briefing publico, guarda una idea y conviertela en prompt o conversacion para la comunidad.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSectionChange("noticias")}
                    className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/25 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer w-fit"
                  >
                    <Newspaper size={13} />
                    <span>Crear briefing</span>
                  </button>
                </div>

                {loadingPublicBriefings ? (
                  <div className="rounded-2xl border border-slate-700/60 bg-slate-900/35 p-6 text-center">
                    <div className="w-7 h-7 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-400 mt-3">Cargando briefings publicos...</p>
                  </div>
                ) : publicBriefings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-cyan-500/20 bg-cyan-500/5 p-5">
                    <p className="text-sm font-black text-cyan-100">Todavia no hay briefings publicados.</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      Ve a Noticias, filtra una categoria y pulsa Briefing publico para crear el primer recurso compartible.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSectionChange("noticias")}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-black text-slate-950 transition-all hover:bg-cyan-400 cursor-pointer"
                    >
                      <Newspaper size={13} />
                      Abrir Noticias
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {publicBriefings.slice(0, 3).map((briefing) => (
                      <article key={briefing.id} className="rounded-2xl border border-cyan-500/15 bg-slate-950/35 p-4 flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-black text-cyan-300">
                            {briefing.items.length} fuentes
                          </span>
                          <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                            {briefing.language.toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="line-clamp-2 text-sm font-extrabold leading-tight text-white">{briefing.title}</h4>
                          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-400">{briefing.intro}</p>
                          <p className="mt-2 text-[10px] font-bold text-slate-500">
                            por {briefing.authorName}{briefing.authorHandle ? ` @${briefing.authorHandle}` : ""}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-2 py-1.5">
                            <p className="text-xs font-black text-white">{briefing.stats?.ideaSaves || 0}</p>
                            <p className="text-[9px] font-bold uppercase text-slate-500">Ideas</p>
                          </div>
                          <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-2 py-1.5">
                            <p className="text-xs font-black text-white">{briefing.stats?.promptCreates || 0}</p>
                            <p className="text-[9px] font-bold uppercase text-slate-500">Prompts</p>
                          </div>
                          <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-2 py-1.5">
                            <p className="text-xs font-black text-white">{briefing.stats?.forumPosts || 0}</p>
                            <p className="text-[9px] font-bold uppercase text-slate-500">Posts</p>
                          </div>
                        </div>
                        {briefing.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {briefing.tags.slice(0, 4).map((tag) => (
                              <span key={tag} className="text-[10px] text-slate-300 bg-slate-800 border border-slate-700/70 px-2 py-0.5 rounded-lg">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => openPublicBriefing(briefing)}
                          className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-300 transition-all hover:bg-cyan-500/15 cursor-pointer"
                        >
                          <BookOpen size={13} />
                          Abrir briefing
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative z-10 pt-6 border-t border-slate-700/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                      Red social de prompts y briefings
                    </span>
                    <h3 className="text-lg font-extrabold text-white mt-3">Explora recursos publicos y guarda tu version privada</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                      Empieza por un prompt, una idea o un briefing. Guardar crea tu copia privada para adaptarla antes de publicar algo a la comunidad.
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

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-start">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                      <Search size={14} />
                    </div>
                    <input
                      type="text"
                      value={publicShowcaseSearch}
                      onChange={(e) => setPublicShowcaseSearch(e.target.value)}
                      placeholder="Buscar por titulo, autor, tag o texto..."
                      className="w-full text-xs rounded-2xl border border-slate-700 bg-slate-950/45 pl-9.5 pr-4 py-3 focus:outline-none focus:border-indigo-455 transition-all font-sans text-white placeholder-slate-450"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {PUBLIC_SHOWCASE_CATEGORIES.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setPublicShowcaseCategory(category)}
                        className={`px-3 py-2 text-[11px] font-bold rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                          publicShowcaseCategory === category
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-slate-900/55 text-slate-400 border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        {category === "Todas" ? "Todo" : category}
                      </button>
                    ))}
                  </div>
                </div>

                <CommunityExplore
                  sections={communityExploreSections}
                  suggestedCreators={suggestedCreators}
                  onView={setSelectedPublicPrompt}
                  onUse={(prompt) => handleUsePrompt(prompt, "public_explore")}
                  onSave={(prompt) => void resolvePublicSavePrompt(prompt)}
                  onOpenCreator={(creator) => openPublicProfile(creator)}
                  onFollowCreator={(creator) => void handleToggleFollowCreator(creator.uid, creator)}
                />

                {loadingCommunityPrompts ? (
                  <div className="rounded-2xl border border-slate-700/60 bg-slate-900/35 p-8 text-center">
                    <div className="w-7 h-7 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-400 mt-3">Cargando prompts publicos...</p>
                  </div>
                ) : publicShowcasePrompts.length === 0 ? (
                  <div className="rounded-2xl border border-slate-700/60 bg-slate-900/35 p-6">
                    <p className="text-sm font-bold text-white">No encontramos prompts publicos con esos filtros.</p>
                    <p className="text-xs text-slate-400 mt-1">Prueba otra categoria o limpia la busqueda para explorar el pack completo.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {publicShowcasePrompts.map((prompt) => (
                      <div key={prompt.id} className="rounded-2xl border border-slate-700/70 bg-slate-900/45 p-4 flex flex-col gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">{prompt.category}</span>
                            {prompt.userId === FOUNDER_PACK_USER_ID && (
                              <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                                Pack Fundador
                              </span>
                            )}
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
                        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2 mt-auto">
                          <button
                            type="button"
                            onClick={() => setSelectedPublicPrompt(prompt)}
                            className="px-3 py-2 bg-slate-950/50 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Globe size={12} />
                            <span>Ver prompt</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void resolvePublicSavePrompt(prompt)}
                            className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <GitFork size={12} />
                            <span>Guardar remix</span>
                          </button>
                          {prompt.userId !== FOUNDER_PACK_USER_ID && (
                            <button
                              type="button"
                              onClick={() => void handleToggleSocialFavorite(prompt)}
                              className={`px-3 py-2 border text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer ${
                                socialFavoritePromptIds.has(prompt.id)
                                  ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                              }`}
                            >
                              <Star size={12} fill={socialFavoritePromptIds.has(prompt.id) ? "currentColor" : "none"} />
                              <span>Favorito</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(prompt.promptText);
                              triggerNotification("Prompt publico copiado.", "success");
                            }}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Copy size={12} />
                            <span>Copiar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUsePrompt(prompt, "public_showcase")}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
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
                  activeTab={publicProfileTab}
                  currentUser={user}
                  followedCreatorUids={followedCreatorUids}
                  socialFavoritePromptIds={socialFavoritePromptIds}
                  onTabChange={setPublicProfileTab}
                  onBack={closePublicProfile}
                  onCopyProfileLink={handleCopyPublicProfileLink}
                  onToggleFollow={handleToggleFollowCreator}
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

              {user && currentTab === "mi-biblioteca" && (
                <div className="bg-[#1e293b]/50 p-3.5 rounded-2xl border border-slate-800/85 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Vista de mi biblioteca</h3>
                      <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                        Separa privados, publicaciones, remixes, favoritos propios y referencias sociales guardadas.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                      {LIBRARY_VIEW_FILTERS.map((filter) => {
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
                          setCurrentSection("prompts");
                          setCurrentTab("comunidad");
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
                        setCurrentSection("prompts");
                        setCurrentTab("comunidad");
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
                          ? "Tu biblioteca está lista para ser poblada. Puedes dar clic en 'Cargar Prompts Ejemplos' para agregar plantillas recomendadas de inmediato o crear una nueva con el Asistente IA de Gemini."
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
