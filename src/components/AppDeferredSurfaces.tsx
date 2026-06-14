import { lazy, Suspense, type FormEvent } from "react";
import type { User } from "firebase/auth";
import type { Prompt, Folder, PromptVariable, UserProfile } from "../types";
import type { GeminiRecommendationResult } from "./RecommendationModal";
import type { PublicProfileTab } from "./PublicProfileView";
import type { LocalRecommendation } from "../utils/recommendations";

const PromptFormModal = lazy(() => import("./PromptFormModal"));
const PromptFillerModal = lazy(() => import("./PromptFillerModal"));
const CopyFilledModal = lazy(() => import("./CopyFilledModal"));
const AIHelperPanel = lazy(() => import("./AIHelperPanel"));
const QuickSwitcherModal = lazy(() => import("./QuickSwitcherModal"));
const RecommendationModal = lazy(() => import("./RecommendationModal"));
const ProfileModal = lazy(() => import("./ProfileModal"));
const CreateFolderModal = lazy(() => import("./CreateFolderModal"));
const ShareFolderModal = lazy(() => import("./ShareFolderModal"));
const SharedPromptModal = lazy(() => import("./SharedPromptModal"));
const PublicPromptDetailModal = lazy(() => import("./PublicPromptDetailModal"));
const PublicProfileView = lazy(() => import("./PublicProfileView"));

type NotificationKind = "success" | "info";

function DeferredSurfaceFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/70 backdrop-blur-sm">
      <div className="rounded-2xl border border-slate-700/70 bg-[#1e293b] px-5 py-4 text-xs font-bold uppercase tracking-widest text-slate-300 shadow-2xl">
        Cargando...
      </div>
    </div>
  );
}

export function DeferredInlineFallback({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-[#1e293b]/70 px-5 py-8 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
      {label}
    </div>
  );
}

interface PublicProfileSurfaceProps {
  author: UserProfile;
  prompts: Prompt[];
  allCommunityPrompts: Prompt[];
  folders: Folder[];
  activeTab: PublicProfileTab;
  currentUser: User | null;
  followedCreatorUids: string[];
  socialFavoritePromptIds: Set<string>;
  onTabChange: (tab: PublicProfileTab) => void;
  onBack: () => void;
  onCopyProfileLink: () => void;
  onToggleFollow: (creatorUid: string) => void;
  onUsePrompt: (prompt: Prompt) => void;
  onCopyFilled: (prompt: Prompt) => void;
  onFork: (prompt: Prompt) => void;
  onLikeToggle: (prompt: Prompt) => void;
  onViewDetails: (prompt: Prompt) => void;
  onSocialFavoriteToggle: (prompt: Prompt) => void;
  onHidePrompt: (prompt: Prompt) => void;
  onReportPrompt: (prompt: Prompt) => void;
  onNotification: (message: string, type?: NotificationKind) => void;
}

export function PublicProfileSurface(props: PublicProfileSurfaceProps) {
  return (
    <Suspense fallback={<DeferredInlineFallback label="Cargando perfil..." />}>
      <PublicProfileView {...props} />
    </Suspense>
  );
}

interface AIAssistantAsideProps {
  presetAItext: string;
  onImportToLibrary: (prompt: {
    title: string;
    description: string;
    promptText: string;
    category: Prompt["category"];
    tags: string[];
    suggestedVariables: PromptVariable[];
  }) => void | Promise<void>;
  onClose: () => void;
}

export function AIAssistantAside({ presetAItext, onImportToLibrary, onClose }: AIAssistantAsideProps) {
  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-[420px] lg:relative lg:inset-auto lg:w-[420px] lg:border-t-0 lg:border-l border-[#334155]/60 bg-[#1e293b]/95 lg:bg-[#1e293b]/70 backdrop-blur-md flex flex-col h-full overflow-hidden shrink-0 animate-in slide-in-from-right duration-300 shadow-2xl lg:shadow-none">
      <div className="flex-1 p-4 overflow-y-auto h-full">
        <Suspense fallback={<DeferredInlineFallback label="Cargando asistente..." />}>
          <AIHelperPanel
            presetTextToOptimize={presetAItext}
            onImportToLibrary={onImportToLibrary}
            onClose={onClose}
          />
        </Suspense>
      </div>
    </aside>
  );
}

interface AppModalLayerProps {
  showFormModal: boolean;
  editingPrompt: Prompt | null;
  folders: Folder[];
  onSavePrompt: (data: Omit<Prompt, "id" | "userId" | "createdAt" | "updatedAt">) => void | Promise<void>;
  onCloseForm: () => void;
  onOptimizeWithAI: (text: string) => void;
  onNotification: (message: string, type?: NotificationKind) => void;
  usingPrompt: Prompt | null;
  onCloseUsingPrompt: () => void;
  copyingFilledPrompt: Prompt | null;
  onCloseCopyingFilledPrompt: () => void;
  showQuickSwitcher: boolean;
  allSearchablePrompts: Prompt[];
  onCloseQuickSwitcher: () => void;
  onQuickUse: (prompt: Prompt) => void;
  onCopyFilled: (prompt: Prompt) => void;
  onOpenEdit: (prompt: Prompt) => void;
  showRecommendationModal: boolean;
  prompts: Prompt[];
  recommendationGoal: string;
  setRecommendationGoal: (value: string) => void;
  recommendedPrompts: LocalRecommendation[];
  geminiRecommendation: GeminiRecommendationResult | null;
  geminiRecommendationLoading: boolean;
  geminiRecommendationError: string;
  onImproveWithGemini: () => void;
  onRecommendationUse: (prompt: Prompt) => void;
  onRecommendationCopy: (prompt: Prompt) => void;
  onRecommendationEdit: (prompt: Prompt) => void;
  onCopySuggestedPrompt: (promptText: string) => void;
  onCloseRecommendation: () => void;
  showProfileModal: boolean;
  user: User | null;
  currentUserProfile: UserProfile | null;
  profileNameInput: string;
  profileHandleInput: string;
  profileBioInput: string;
  isSavingProfile: boolean;
  setProfileNameInput: (value: string) => void;
  setProfileHandleInput: (value: string) => void;
  setProfileBioInput: (value: string) => void;
  normalizeProfileHandle: (value: string) => string;
  onSaveProfile: (event: FormEvent) => void | Promise<void>;
  onCloseProfile: () => void;
  showCreateFolder: boolean;
  newFolderName: string;
  newFolderDesc: string;
  isSavingFolder: boolean;
  setNewFolderName: (value: string) => void;
  setNewFolderDesc: (value: string) => void;
  onCreateFolder: (event: FormEvent) => void | Promise<void>;
  onCloseCreateFolder: () => void;
  showShareFolderModal: Folder | null;
  isFolderSharedInput: boolean;
  publishFolderPromptsInput: boolean;
  isSavingFolderShare: boolean;
  setIsFolderSharedInput: (value: boolean) => void;
  setPublishFolderPromptsInput: (value: boolean) => void;
  onSaveFolderShareSettings: (event: FormEvent) => void | Promise<void>;
  onCloseShareFolder: () => void;
  sharedPrompt: Prompt | null;
  onCloseSharedPrompt: () => void;
  onCopySharedPrompt: () => void;
  onUseSharedPrompt: () => void;
  onSaveSharedPromptToLibrary: () => void;
  selectedPublicPrompt: Prompt | null;
  publicPromptResourceContext: {
    remixCount: number;
    hasOwnRemix: boolean;
    originalPrompt: Prompt | null;
  };
  currentUser: User | null;
  socialFavoritePromptIds: Set<string>;
  onClosePublicPrompt: () => void;
  onCopyPublicPrompt: (prompt: Prompt) => void;
  onUsePublicPrompt: (prompt: Prompt) => void;
  onSavePublicPromptToLibrary: (prompt: Prompt) => void;
  onToggleSocialFavorite: (prompt: Prompt) => void;
  onLikeToggle: (prompt: Prompt) => void;
  onHidePrompt: (prompt: Prompt) => void;
  onReportPrompt: (prompt: Prompt) => void;
  onAuthorClick: (author: { name: string; uid: string; avatar?: string }) => void;
}

export function AppModalLayer(props: AppModalLayerProps) {
  const {
    showFormModal,
    editingPrompt,
    folders,
    onSavePrompt,
    onCloseForm,
    onOptimizeWithAI,
    onNotification,
    usingPrompt,
    onCloseUsingPrompt,
    copyingFilledPrompt,
    onCloseCopyingFilledPrompt,
    showQuickSwitcher,
    allSearchablePrompts,
    onCloseQuickSwitcher,
    onQuickUse,
    onCopyFilled,
    onOpenEdit,
    showRecommendationModal,
    prompts,
    recommendationGoal,
    setRecommendationGoal,
    recommendedPrompts,
    geminiRecommendation,
    geminiRecommendationLoading,
    geminiRecommendationError,
    onImproveWithGemini,
    onRecommendationUse,
    onRecommendationCopy,
    onRecommendationEdit,
    onCopySuggestedPrompt,
    onCloseRecommendation,
    showProfileModal,
    user,
    currentUserProfile,
    profileNameInput,
    profileHandleInput,
    profileBioInput,
    isSavingProfile,
    setProfileNameInput,
    setProfileHandleInput,
    setProfileBioInput,
    normalizeProfileHandle,
    onSaveProfile,
    onCloseProfile,
    showCreateFolder,
    newFolderName,
    newFolderDesc,
    isSavingFolder,
    setNewFolderName,
    setNewFolderDesc,
    onCreateFolder,
    onCloseCreateFolder,
    showShareFolderModal,
    isFolderSharedInput,
    publishFolderPromptsInput,
    isSavingFolderShare,
    setIsFolderSharedInput,
    setPublishFolderPromptsInput,
    onSaveFolderShareSettings,
    onCloseShareFolder,
    sharedPrompt,
    onCloseSharedPrompt,
    onCopySharedPrompt,
    onUseSharedPrompt,
    onSaveSharedPromptToLibrary,
    selectedPublicPrompt,
    publicPromptResourceContext,
    currentUser,
    socialFavoritePromptIds,
    onClosePublicPrompt,
    onCopyPublicPrompt,
    onUsePublicPrompt,
    onSavePublicPromptToLibrary,
    onToggleSocialFavorite,
    onLikeToggle,
    onHidePrompt,
    onReportPrompt,
    onAuthorClick
  } = props;

  return (
    <Suspense fallback={<DeferredSurfaceFallback />}>
      {showFormModal && (
        <PromptFormModal
          prompt={editingPrompt}
          folders={folders}
          onSave={onSavePrompt}
          onClose={onCloseForm}
          onOptimizeWithAI={onOptimizeWithAI}
          onNotification={onNotification}
        />
      )}

      {usingPrompt && (
        <PromptFillerModal
          prompt={usingPrompt}
          onClose={onCloseUsingPrompt}
        />
      )}

      {copyingFilledPrompt && (
        <CopyFilledModal
          prompt={copyingFilledPrompt}
          onClose={onCloseCopyingFilledPrompt}
          onNotification={onNotification}
        />
      )}

      {showQuickSwitcher && (
        <QuickSwitcherModal
          prompts={allSearchablePrompts}
          isOpen={showQuickSwitcher}
          onClose={onCloseQuickSwitcher}
          onUse={onQuickUse}
          onCopyFilled={onCopyFilled}
          onEdit={onOpenEdit}
          onNotification={onNotification}
        />
      )}

      {showRecommendationModal && (
        <RecommendationModal
          prompts={prompts}
          recommendationGoal={recommendationGoal}
          setRecommendationGoal={setRecommendationGoal}
          recommendedPrompts={recommendedPrompts}
          geminiRecommendation={geminiRecommendation}
          geminiRecommendationLoading={geminiRecommendationLoading}
          geminiRecommendationError={geminiRecommendationError}
          onImproveWithGemini={onImproveWithGemini}
          onUse={onRecommendationUse}
          onCopy={onRecommendationCopy}
          onEdit={onRecommendationEdit}
          onCopySuggestedPrompt={onCopySuggestedPrompt}
          onClose={onCloseRecommendation}
        />
      )}

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
          onSave={onSaveProfile}
          onClose={onCloseProfile}
        />
      )}

      {showCreateFolder && (
        <CreateFolderModal
          newFolderName={newFolderName}
          newFolderDesc={newFolderDesc}
          isSavingFolder={isSavingFolder}
          setNewFolderName={setNewFolderName}
          setNewFolderDesc={setNewFolderDesc}
          onCreate={onCreateFolder}
          onClose={onCloseCreateFolder}
        />
      )}

      {showShareFolderModal && (
        <ShareFolderModal
          folder={showShareFolderModal}
          prompts={prompts}
          isFolderSharedInput={isFolderSharedInput}
          publishFolderPromptsInput={publishFolderPromptsInput}
          isSavingFolderShare={isSavingFolderShare}
          setIsFolderSharedInput={setIsFolderSharedInput}
          setPublishFolderPromptsInput={setPublishFolderPromptsInput}
          onSave={onSaveFolderShareSettings}
          onClose={onCloseShareFolder}
          onNotification={onNotification}
        />
      )}

      {sharedPrompt && (
        <SharedPromptModal
          prompt={sharedPrompt}
          onClose={onCloseSharedPrompt}
          onCopy={onCopySharedPrompt}
          onUse={onUseSharedPrompt}
          onSaveToLibrary={onSaveSharedPromptToLibrary}
          isAuthenticated={Boolean(user)}
        />
      )}

      {selectedPublicPrompt && (
        <PublicPromptDetailModal
          prompt={selectedPublicPrompt}
          resourceContext={publicPromptResourceContext}
          currentUser={currentUser}
          isSocialFavorite={socialFavoritePromptIds.has(selectedPublicPrompt.id)}
          onClose={onClosePublicPrompt}
          onCopy={onCopyPublicPrompt}
          onUse={onUsePublicPrompt}
          onSaveToLibrary={onSavePublicPromptToLibrary}
          onToggleFavorite={onToggleSocialFavorite}
          onLikeToggle={onLikeToggle}
          onHidePrompt={onHidePrompt}
          onReportPrompt={onReportPrompt}
          onAuthorClick={onAuthorClick}
          onNotification={onNotification}
        />
      )}
    </Suspense>
  );
}
