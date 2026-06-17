import React, { useState } from "react";
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, Share2, X } from "lucide-react";
import type { Folder as FolderType, Prompt } from "../types";
import type { User } from "firebase/auth";

interface FolderTreeViewProps {
  folders: FolderType[];
  prompts: Prompt[];
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  dragOverFolderId: string | null;
  setDragOverFolderId: (id: string | null) => void;
  handleMovePromptToFolder: (promptId: string, folderId: string | null) => void;
  handleDeleteFolder: (folderId: string) => void;
  handleOpenShareFolderModal: (folder: FolderType) => void;
  setShowCreateFolder: (show: boolean) => void;
  setNewFolderParentId: (id: string | null) => void;
  user: User | null;
}

interface TreeNode {
  folder: FolderType;
  children: TreeNode[];
}

export default function FolderTreeView({
  folders,
  prompts,
  selectedFolderId,
  setSelectedFolderId,
  dragOverFolderId,
  setDragOverFolderId,
  handleMovePromptToFolder,
  handleDeleteFolder,
  handleOpenShareFolderModal,
  setShowCreateFolder,
  setNewFolderParentId,
  user
}: FolderTreeViewProps) {
  const [expandedFolderIds, setExpandedFolderIds] = useState<{ [id: string]: boolean }>({});

  const toggleExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolderIds((prev) => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const buildTree = (list: FolderType[]): TreeNode[] => {
    const map: { [id: string]: TreeNode } = {};
    const roots: TreeNode[] = [];

    list.forEach((f) => {
      map[f.id] = { folder: f, children: [] };
    });

    list.forEach((f) => {
      const parentId = f.parentId;
      if (parentId && map[parentId]) {
        map[parentId].children.push(map[f.id]);
      } else {
        roots.push(map[f.id]);
      }
    });

    return roots;
  };

  const treeRoots = buildTree(folders);

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const folder = node.folder;
    const isExpanded = !!expandedFolderIds[folder.id];
    const isSelected = selectedFolderId === folder.id;
    const isDragOver = dragOverFolderId === folder.id;
    const hasChildren = node.children.length > 0;

    const getFolderPromptCount = (n: TreeNode): number => {
      let count = prompts.filter((p) => p.folderId === n.folder.id).length;
      n.children.forEach((child) => {
        count += getFolderPromptCount(child);
      });
      return count;
    };
    const count = getFolderPromptCount(node);

    const isOwner = user && folder.userId === user.uid;
    const isEditor = user && folder.collaborators?.[user.uid]?.role === "editor";
    const canModify = isOwner || isEditor;

    return (
      <div key={folder.id} className="flex flex-col">
        <div
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
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className={`group flex items-center justify-between py-1.5 pr-2 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none ${
            isSelected
              ? "bg-pink-500/10 border-pink-500/40 text-pink-400 shadow-sm"
              : isDragOver
              ? "bg-indigo-500/20 border-dashed border-indigo-500 text-indigo-300 scale-[1.02] ring-2 ring-indigo-500/30"
              : "bg-slate-900/30 text-slate-300 border-transparent hover:bg-slate-900/60 hover:text-white"
          }`}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          <div className="flex items-center gap-1.5 truncate">
            <button
              onClick={(e) => toggleExpand(folder.id, e)}
              className={`p-0.5 rounded hover:bg-slate-800 text-slate-400 transition-all flex items-center justify-center ${
                !hasChildren ? "opacity-30 cursor-default" : "cursor-pointer"
              }`}
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {isExpanded ? (
              <FolderOpen size={13} className={isSelected ? "text-pink-400" : "text-indigo-400"} />
            ) : (
              <Folder size={13} className={isSelected ? "text-pink-400" : "text-indigo-400"} />
            )}
            <span className="truncate" title={folder.description}>{folder.name}</span>
            <span className="text-[10px] opacity-75 font-normal">({count})</span>
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {canModify && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNewFolderParentId(folder.id);
                  setShowCreateFolder(true);
                }}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-all cursor-pointer"
                title="Agregar Subcarpeta"
              >
                <Plus size={11} className="stroke-[3]" />
              </button>
            )}
            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenShareFolderModal(folder);
                }}
                className={`p-1 hover:bg-slate-800 rounded transition-all cursor-pointer ${
                  folder.isShared
                    ? "text-emerald-400"
                    : "text-slate-400 hover:text-white"
                }`}
                title={
                  folder.isShared
                    ? "Colección compartida. Ajustar configuración."
                    : "Compartir Colección"
                }
              >
                <Share2 size={11} className={folder.isShared ? "animate-pulse" : ""} />
              </button>
            )}
            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`¿Estás seguro de eliminar la carpeta "${folder.name}" y todas sus subcarpetas? Los prompts no se eliminarán.`)) {
                    handleDeleteFolder(folder.id);
                  }
                }}
                className="p-1 hover:bg-red-500/15 hover:text-red-400 rounded transition-all cursor-pointer"
                title="Eliminar Carpeta"
              >
                <X size={11} className="stroke-[3]" />
              </button>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="flex flex-col mt-0.5 gap-0.5 border-l border-slate-800 ml-3.5 pl-0.5">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1">
      {treeRoots.map((root) => renderNode(root, 0))}
    </div>
  );
}
