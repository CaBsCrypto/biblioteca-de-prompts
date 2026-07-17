/**
 * useLibraryModals
 * ----------------
 * Centraliza el control de modales de la biblioteca (form, filler, share,
 * recommendation, seed-pack, join-class, quick-switcher) usando el AppStore
 * global en lugar de estados locales dispersos en App.tsx.
 *
 * Uso:
 *   const { isOpen, openForm, openFiller, openShare, closeAll } = useLibraryModals();
 */

import { useCallback } from "react";
import { useAppStore } from "../store/appStore";
import type { ModalId } from "../store/appStore";

export function useLibraryModals() {
  const { state, openModal, closeModal } = useAppStore();
  const currentModal: ModalId = state.modal;
  const payload = state.modalPayload;

  /** Abre el modal de creación/edición de prompt */
  const openForm = useCallback(
    (editingPrompt?: unknown) => openModal("form", editingPrompt ?? null),
    [openModal]
  );

  /** Abre el modal de relleno interactivo (filler) */
  const openFiller = useCallback(
    (prompt: unknown) => openModal("filler", prompt),
    [openModal]
  );

  /** Abre el modal de compartir prompt */
  const openShare = useCallback(
    (prompt: unknown) => openModal("share", prompt),
    [openModal]
  );

  /** Abre el modal de recomendación de IA */
  const openRecommendation = useCallback(
    (goalText?: string) => openModal("recommendation", goalText ?? ""),
    [openModal]
  );

  /** Abre el seed-pack modal */
  const openSeedPack = useCallback(() => openModal("seed-pack"), [openModal]);

  /** Abre el modal de unión a clase */
  const openJoinClass = useCallback(() => openModal("join-class"), [openModal]);

  /** Abre el quick switcher de secciones */
  const openQuickSwitcher = useCallback(
    () => openModal("quick-switcher"),
    [openModal]
  );

  /** Abre el modal de prompt público en detalle */
  const openPublicPromptDetail = useCallback(
    (prompt: unknown) => openModal("public-prompt-detail", prompt),
    [openModal]
  );

  /** Abre el modal de perfil público */
  const openPublicProfile = useCallback(
    (uid: string) => openModal("public-profile", uid),
    [openModal]
  );

  /** Abre el modal de prompt copiado/rellenado */
  const openCopyFilled = useCallback(
    (prompt: unknown) => openModal("copy-filled", prompt),
    [openModal]
  );

  /** Abre el modal de compartir carpeta */
  const openShareFolder = useCallback(
    (folderId: string) => openModal("share-folder", folderId),
    [openModal]
  );

  /** Abre el modal de crear carpeta */
  const openCreateFolder = useCallback(
    () => openModal("create-folder"),
    [openModal]
  );

  return {
    /** El ID del modal actualmente abierto */
    currentModal,
    /** Payload del modal activo */
    payload,

    // Helpers de estado booleano para retrocompatibilidad
    isFormOpen: currentModal === "form",
    isFillerOpen: currentModal === "filler",
    isShareOpen: currentModal === "share",
    isRecommendationOpen: currentModal === "recommendation",
    isSeedPackOpen: currentModal === "seed-pack",
    isJoinClassOpen: currentModal === "join-class",
    isQuickSwitcherOpen: currentModal === "quick-switcher",
    isPublicPromptDetailOpen: currentModal === "public-prompt-detail",
    isPublicProfileOpen: currentModal === "public-profile",
    isCopyFilledOpen: currentModal === "copy-filled",
    isShareFolderOpen: currentModal === "share-folder",
    isCreateFolderOpen: currentModal === "create-folder",

    // Acciones
    openForm,
    openFiller,
    openShare,
    openRecommendation,
    openSeedPack,
    openJoinClass,
    openQuickSwitcher,
    openPublicPromptDetail,
    openPublicProfile,
    openCopyFilled,
    openShareFolder,
    openCreateFolder,
    closeAll: closeModal,
  };
}
