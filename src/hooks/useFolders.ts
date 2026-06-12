import { FormEvent, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import type { Folder, Prompt } from "../types";
import { mapFolderDoc } from "../utils/firestoreMappers";

interface UseFoldersOptions {
  user: User | null;
  prompts: Prompt[];
  getAuthorIdentity: () => {
    authorName: string;
    authorAvatar: string;
    authorHandle: string;
  };
  onNotification: (message: string, type?: "success" | "info") => void;
}

export function useFolders({ user, prompts, getAuthorIdentity, onNotification }: UseFoldersOptions) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [showShareFolderModal, setShowShareFolderModal] = useState<Folder | null>(null);
  const [isFolderSharedInput, setIsFolderSharedInput] = useState(false);
  const [publishFolderPromptsInput, setPublishFolderPromptsInput] = useState(false);
  const [isSavingFolderShare, setIsSavingFolderShare] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setFolders([]);
      setSelectedFolderId(null);
      return;
    }

    setLoadingFolders(true);
    const foldersCollectionPath = "folders";
    const userFoldersQuery = query(
      collection(db, foldersCollectionPath),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      userFoldersQuery,
      (snapshot) => {
        const list = snapshot.docs.map(mapFolderDoc).sort((a, b) => a.name.localeCompare(b.name));
        setFolders(list);
        setLoadingFolders(false);
      },
      (error) => {
        setLoadingFolders(false);
        handleFirestoreError(error, OperationType.LIST, foldersCollectionPath);
      }
    );

    return unsubscribe;
  }, [user]);

  const closeCreateFolderModal = () => {
    setShowCreateFolder(false);
    setNewFolderName("");
    setNewFolderDesc("");
  };

  const handleCreateFolder = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !newFolderName.trim()) return;

    setIsSavingFolder(true);
    const foldersCollectionPath = "folders";
    try {
      await setDoc(doc(collection(db, foldersCollectionPath)), {
        userId: user.uid,
        name: newFolderName.trim(),
        description: newFolderDesc.trim(),
        createdAt: serverTimestamp()
      });

      onNotification("Carpeta creada correctamente.", "success");
      closeCreateFolderModal();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, foldersCollectionPath);
    } finally {
      setIsSavingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!user) return;

    const foldersCollectionPath = "folders";
    try {
      await deleteDoc(doc(db, foldersCollectionPath, folderId));
      const promptsInFolder = prompts.filter((p) => p.folderId === folderId);
      await Promise.all(promptsInFolder.map((p) => updateDoc(doc(db, "prompts", p.id), { folderId: null })));

      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }

      onNotification("Carpeta eliminada con éxito.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, foldersCollectionPath);
    }
  };

  const handleOpenShareFolderModal = (folder: Folder) => {
    setShowShareFolderModal(folder);
    setIsFolderSharedInput(folder.isShared || false);
    setPublishFolderPromptsInput(false);
  };

  const handleSaveFolderShareSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !showShareFolderModal) return;

    setIsSavingFolderShare(true);
    const foldersCollectionPath = "folders";
    try {
      await updateDoc(doc(db, foldersCollectionPath, showShareFolderModal.id), {
        isShared: isFolderSharedInput,
        authorName: getAuthorIdentity().authorName,
        authorHandle: getAuthorIdentity().authorHandle
      });

      const promptsToPublish = prompts.filter((p) => p.folderId === showShareFolderModal.id && !p.isShared);
      if (isFolderSharedInput && publishFolderPromptsInput && promptsToPublish.length > 0) {
        await Promise.all(promptsToPublish.map((prompt) => updateDoc(doc(db, "prompts", prompt.id), {
          isShared: true,
          ...getAuthorIdentity(),
          updatedAt: serverTimestamp()
        })));
      }

      onNotification(
        isFolderSharedInput
          ? publishFolderPromptsInput && promptsToPublish.length > 0
            ? `Colección compartida y ${promptsToPublish.length} prompts publicados.`
            : "Colección compartida públicamente. Puedes copiar el enlace."
          : "La coleccion ahora es privada.",
        "success"
      );
      setShowShareFolderModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, foldersCollectionPath);
    } finally {
      setIsSavingFolderShare(false);
    }
  };

  const handleMovePromptToFolder = async (promptId: string, folderId: string | null) => {
    if (!user) {
      onNotification("Inicia sesión para poder organizar tus prompts.", "info");
      return;
    }

    const promptsCollectionPath = "prompts";
    try {
      await updateDoc(doc(db, promptsCollectionPath, promptId), {
        folderId,
        updatedAt: serverTimestamp()
      });

      let folderName = "Sin carpeta";
      if (folderId) {
        const foundFolder = folders.find((f) => f.id === folderId);
        if (foundFolder) folderName = `"${foundFolder.name}"`;
      }
      onNotification(`Prompt organizado en la carpeta ${folderName} con éxito.`, "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, promptsCollectionPath);
    }
  };

  return {
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
  };
}
