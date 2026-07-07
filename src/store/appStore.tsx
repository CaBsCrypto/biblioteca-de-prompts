import { createContext, useContext, useMemo, useReducer, useCallback, type ReactNode, useEffect, type Dispatch } from "react";
import type { Prompt } from "../types";

export type ModalId =
  | "none"
  | "form"
  | "filler"
  | "share"
  | "shared-prompt"
  | "share-folder"
  | "profile"
  | "public-prompt-detail"
  | "public-profile"
  | "recommendation"
  | "seed-pack"
  | "category-prompts"
  | "quick-switcher"
  | "create-folder"
  | "create-post"
  | "create-hackathon"
  | "join-class"
  | "copy-filled";

export type Section = AppSectionId;

export type AppSectionId =
  | "inicio"
  | "biblioteca"
  | "comunidad"
  | "foro"
  | "hackathons"
  | "noticias"
  | "galeria"
  | "perfil"
  | "admin";

export interface AppNotification {
  id: string;
  message: string;
  type: "success" | "info" | "error";
}

export interface AppRouterState {
  share?: string;
  folder?: string;
  profile?: string;
  briefing?: string;
}

export interface AppState {
  section: AppSectionId;
  modal: ModalId;
  modalPayload: unknown;
  notifications: AppNotification[];
  editingPrompt: Prompt | null;
  selectedAuthorUid: string | null;
  selectedCommunityScope: "todos" | "siguiendo" | "favoritos" | "remixeados";
  libraryFilter: "todos" | "privados" | "publicados" | "remixes" | "favoritos";
  router: AppRouterState;
}

export type AppAction =
  | { type: "section"; section: AppSectionId }
  | { type: "modal"; modal: ModalId; payload?: unknown }
  | { type: "close-modal" }
  | { type: "edit-prompt"; prompt: Prompt | null }
  | { type: "select-author"; uid: string | null }
  | { type: "select-community-scope"; scope: AppState["selectedCommunityScope"] }
  | { type: "set-library-filter"; filter: AppState["libraryFilter"] }
  | { type: "router"; router: AppRouterState }
  | { type: "notify"; message: string; notifType?: "success" | "info" | "error" }
  | { type: "dismiss-notification"; id: string };

const initialState: AppState = {
  section: "inicio",
  modal: "none",
  modalPayload: null,
  notifications: [],
  editingPrompt: null,
  selectedAuthorUid: null,
  selectedCommunityScope: "todos",
  libraryFilter: "todos",
  router: {},
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "section":
      return { ...state, section: action.section, modal: "none", modalPayload: null };
    case "modal":
      return { ...state, modal: action.modal, modalPayload: action.payload ?? null };
    case "close-modal":
      return { ...state, modal: "none", modalPayload: null };
    case "edit-prompt":
      return { ...state, editingPrompt: action.prompt };
    case "select-author":
      return { ...state, selectedAuthorUid: action.uid };
    case "select-community-scope":
      return { ...state, selectedCommunityScope: action.scope };
    case "set-library-filter":
      return { ...state, libraryFilter: action.filter };
    case "router":
      return { ...state, router: action.router };
    case "notify": {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return {
        ...state,
        notifications: [
          ...state.notifications,
          { id, message: action.message, type: action.notifType || "success" },
        ],
      };
    }
    case "dismiss-notification":
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.id),
      };
    default:
      return state;
  }
}

interface AppStoreApi {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  notify: (message: string, type?: "success" | "info" | "error") => void;
  dismiss: (id: string) => void;
  openModal: (modal: ModalId, payload?: unknown) => void;
  closeModal: () => void;
  goSection: (section: AppSectionId) => void;
  setEditingPrompt: (prompt: Prompt | null) => void;
}

const StoreContext = createContext<AppStoreApi | null>(null);

const NOTIF_TIMEOUT_MS = 4000;

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const notify = useCallback((message: string, type: "success" | "info" | "error" = "success") => {
    dispatch({ type: "notify", message, notifType: type });
  }, []);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: "dismiss-notification", id });
  }, []);

  const openModal = useCallback((modal: ModalId, payload?: unknown) => {
    dispatch({ type: "modal", modal, payload });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: "close-modal" });
  }, []);

  const goSection = useCallback((section: AppSectionId) => {
    dispatch({ type: "section", section });
  }, []);

  const setEditingPrompt = useCallback((prompt: Prompt | null) => {
    dispatch({ type: "edit-prompt", prompt });
  }, []);

  useEffect(() => {
    if (state.notifications.length === 0) return;
    const timers = state.notifications.map((n) =>
      setTimeout(() => dismiss(n.id), NOTIF_TIMEOUT_MS)
    );
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [state.notifications, dismiss]);

  const api = useMemo<AppStoreApi>(
    () => ({
      state,
      dispatch,
      notify,
      dismiss,
      openModal,
      closeModal,
      goSection,
      setEditingPrompt,
    }),
    [state, notify, dismiss, openModal, closeModal, goSection, setEditingPrompt]
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useAppStore(): AppStoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useAppStore debe usarse dentro de <AppStoreProvider>");
  }
  return ctx;
}