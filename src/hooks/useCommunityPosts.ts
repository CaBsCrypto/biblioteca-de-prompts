import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase";
import type { CommunityPost, CommunityPostType } from "../typesCommunity";

export interface CommunityPostInput {
  type: CommunityPostType;
  title: string;
  body: string;
  tags: string[];
  imageUrl?: string;
  linkUrl?: string;
}

interface UseCommunityPostsOptions {
  user: User | null;
  getAuthorIdentity: () => {
    authorName: string;
    authorAvatar: string;
    authorHandle: string;
  };
  onNotification: (message: string, type?: "success" | "info") => void;
}

function mapCommunityPostDoc<T extends { id: string; data: () => unknown }>(docSnap: T): CommunityPost {
  const data = docSnap.data() as Partial<CommunityPost>;
  return {
    id: docSnap.id,
    type: data.type || "idea",
    title: data.title || "",
    body: data.body || "",
    tags: data.tags || [],
    imageUrl: data.imageUrl || "",
    linkUrl: data.linkUrl || "",
    authorUid: data.authorUid || "",
    authorName: data.authorName || "Creador",
    authorHandle: data.authorHandle || "",
    authorAvatar: data.authorAvatar || "",
    likesCount: data.likesCount || 0,
    likedBy: data.likedBy || [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

export function useCommunityPosts({ user, getAuthorIdentity, onNotification }: UseCommunityPostsOptions) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    setLoadingPosts(true);
    const postsQuery = query(collection(db, "communityPosts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        setPosts(snapshot.docs.map(mapCommunityPostDoc));
        setLoadingPosts(false);
      },
      (error) => {
        console.error("Error subscribing to community posts:", error);
        setLoadingPosts(false);
      }
    );

    return unsubscribe;
  }, []);

  const savePost = async (input: CommunityPostInput, editingPost?: CommunityPost | null) => {
    if (!user) {
      onNotification("Inicia sesion para publicar en la comunidad.", "info");
      return false;
    }

    const cleanInput = {
      type: input.type,
      title: input.title.trim(),
      body: input.body.trim(),
      tags: input.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 12),
      imageUrl: input.imageUrl?.trim() || "",
      linkUrl: input.linkUrl?.trim() || ""
    };

    if (!cleanInput.title || !cleanInput.body) {
      onNotification("Agrega titulo y contenido para publicar.", "info");
      return false;
    }

    try {
      if (editingPost) {
        if (editingPost.authorUid !== user.uid) {
          onNotification("Solo puedes editar tus propias publicaciones.", "info");
          return false;
        }

        await updateDoc(doc(db, "communityPosts", editingPost.id), {
          ...cleanInput,
          updatedAt: serverTimestamp()
        });
        onNotification("Publicacion actualizada.", "success");
        return true;
      }

      const author = getAuthorIdentity();
      await addDoc(collection(db, "communityPosts"), {
        ...cleanInput,
        authorUid: user.uid,
        authorName: author.authorName,
        authorHandle: author.authorHandle,
        authorAvatar: author.authorAvatar,
        likesCount: 0,
        likedBy: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      onNotification("Publicado en la comunidad.", "success");
      return true;
    } catch (error) {
      console.error("Error saving community post:", error);
      onNotification("No se pudo guardar la publicacion.", "info");
      return false;
    }
  };

  const deletePost = async (post: CommunityPost) => {
    if (!user || post.authorUid !== user.uid) {
      onNotification("Solo puedes borrar tus propias publicaciones.", "info");
      return;
    }

    try {
      await deleteDoc(doc(db, "communityPosts", post.id));
      onNotification("Publicacion eliminada.", "info");
    } catch (error) {
      console.error("Error deleting community post:", error);
      onNotification("No se pudo eliminar la publicacion.", "info");
    }
  };

  const togglePostLike = async (post: CommunityPost) => {
    if (!user) {
      onNotification("Inicia sesion para reaccionar.", "info");
      return;
    }

    const isLiked = post.likedBy.includes(user.uid);

    try {
      await updateDoc(doc(db, "communityPosts", post.id), {
        likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likesCount: increment(isLiked ? -1 : 1),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error toggling post like:", error);
      onNotification("No se pudo registrar la reaccion.", "info");
    }
  };

  return {
    posts,
    loadingPosts,
    savePost,
    deletePost,
    togglePostLike
  };
}
