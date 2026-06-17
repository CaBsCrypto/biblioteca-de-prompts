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
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
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

    // Query 1: Own folders
    const ownQuery = query(
      collection(db, foldersCollectionPath),
      where("userId", "==", user.uid)
    );

    // Query 2: Shared folders
    const sharedQuery = query(
      collection(db, foldersCollectionPath),
      where(`collaborators.${user.uid}.role`, "in", ["viewer", "editor"])
    );

    let ownList: Folder[] = [];
    let sharedList: Folder[] = [];

    const updateCombinedFolders = () => {
      const merged = [...ownList];
      sharedList.forEach((folder) => {
        if (!merged.some((f) => f.id === folder.id)) {
          merged.push(folder);
        }
      });
      merged.sort((a, b) => a.name.localeCompare(b.name));
      setFolders(merged);
      setLoadingFolders(false);
    };

    const unsubscribeOwn = onSnapshot(
      ownQuery,
      (snapshot) => {
        ownList = snapshot.docs.map(mapFolderDoc);
        updateCombinedFolders();
      },
      (error) => {
        console.error("Error loading own folders:", error);
        setLoadingFolders(false);
      }
    );

    const unsubscribeShared = onSnapshot(
      sharedQuery,
      (snapshot) => {
        sharedList = snapshot.docs.map(mapFolderDoc);
        updateCombinedFolders();
      },
      (error) => {
        console.warn("Shared folders query skipped or failed:", error);
        sharedList = [];
        updateCombinedFolders();
      }
    );

    return () => {
      unsubscribeOwn();
      unsubscribeShared();
    };
  }, [user]);

  const closeCreateFolderModal = () => {
    setShowCreateFolder(false);
    setNewFolderName("");
    setNewFolderDesc("");
    setNewFolderParentId(null);
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
        parentId: newFolderParentId,
        collaborators: {},
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
      const getSubfolderIds = (id: string): string[] => {
        const direct = folders.filter((f) => f.parentId === id);
        let ids = direct.map((f) => f.id);
        direct.forEach((f) => {
          ids = [...ids, ...getSubfolderIds(f.id)];
        });
        return ids;
      };

      const idsToDelete = [folderId, ...getSubfolderIds(folderId)];

      await Promise.all(idsToDelete.map((id) => deleteDoc(doc(db, foldersCollectionPath, id))));
      
      const promptsInFolders = prompts.filter((p) => p.folderId && idsToDelete.includes(p.folderId));
      await Promise.all(promptsInFolders.map((p) => updateDoc(doc(db, "prompts", p.id), { folderId: null })));

      if (selectedFolderId && idsToDelete.includes(selectedFolderId)) {
        setSelectedFolderId(null);
      }

      onNotification("Carpeta y subcarpetas eliminadas con éxito.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, foldersCollectionPath);
    }
  };

  const handleOpenShareFolderModal = (folder: Folder) => {
    setShowShareFolderModal(folder);
    setIsFolderSharedInput(folder.isShared || false);
    setPublishFolderPromptsInput(false);
  };

  const handleSaveFolderShareSettings = async (e: FormEvent, collaborators?: any) => {
    e.preventDefault();
    if (!user || !showShareFolderModal) return;

    setIsSavingFolderShare(true);
    const foldersCollectionPath = "folders";
    try {
      await updateDoc(doc(db, foldersCollectionPath, showShareFolderModal.id), {
        isShared: isFolderSharedInput,
        authorName: getAuthorIdentity().authorName,
        authorHandle: getAuthorIdentity().authorHandle,
        collaborators: collaborators || showShareFolderModal.collaborators || {}
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
  };
}
