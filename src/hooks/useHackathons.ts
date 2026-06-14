import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase";
import type { HackathonOpportunity, HackathonRole } from "../typesCommunity";

export interface HackathonInput {
  title: string;
  description: string;
  url: string;
  deadline: string;
  mode: string;
  tags: string[];
  rolesNeeded: HackathonRole[];
}

interface UseHackathonsOptions {
  user: User | null;
  getAuthorIdentity: () => {
    authorName: string;
    authorAvatar: string;
    authorHandle: string;
  };
  onNotification: (message: string, type?: "success" | "info") => void;
}

function mapHackathonDoc<T extends { id: string; data: () => unknown }>(docSnap: T): HackathonOpportunity {
  const data = docSnap.data() as Partial<HackathonOpportunity>;
  return {
    id: docSnap.id,
    title: data.title || "",
    description: data.description || "",
    url: data.url || "",
    deadline: data.deadline || "",
    mode: data.mode || "online",
    tags: data.tags || [],
    rolesNeeded: data.rolesNeeded || [],
    authorUid: data.authorUid || "",
    authorName: data.authorName || "Creador",
    authorHandle: data.authorHandle || "",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

export function useHackathons({ user, getAuthorIdentity, onNotification }: UseHackathonsOptions) {
  const [hackathons, setHackathons] = useState<HackathonOpportunity[]>([]);
  const [loadingHackathons, setLoadingHackathons] = useState(false);

  useEffect(() => {
    setLoadingHackathons(true);
    const hackathonsQuery = query(collection(db, "hackathons"), orderBy("deadline", "asc"));
    const unsubscribe = onSnapshot(
      hackathonsQuery,
      (snapshot) => {
        setHackathons(snapshot.docs.map(mapHackathonDoc));
        setLoadingHackathons(false);
      },
      (error) => {
        console.error("Error subscribing to hackathons:", error);
        setLoadingHackathons(false);
      }
    );

    return unsubscribe;
  }, []);

  const saveHackathon = async (input: HackathonInput, editingHackathon?: HackathonOpportunity | null) => {
    if (!user) {
      onNotification("Inicia sesion para publicar oportunidades.", "info");
      return false;
    }

    const cleanInput = {
      title: input.title.trim(),
      description: input.description.trim(),
      url: input.url.trim(),
      deadline: input.deadline,
      mode: input.mode.trim() || "online",
      tags: input.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 12),
      rolesNeeded: input.rolesNeeded.slice(0, 8)
    };

    if (!cleanInput.title || !cleanInput.description || !cleanInput.url) {
      onNotification("Agrega titulo, descripcion y link de la oportunidad.", "info");
      return false;
    }

    try {
      if (editingHackathon) {
        if (editingHackathon.authorUid !== user.uid) {
          onNotification("Solo puedes editar tus propias oportunidades.", "info");
          return false;
        }

        await updateDoc(doc(db, "hackathons", editingHackathon.id), {
          ...cleanInput,
          updatedAt: serverTimestamp()
        });
        onNotification("Hackathon actualizado.", "success");
        return true;
      }

      const author = getAuthorIdentity();
      await addDoc(collection(db, "hackathons"), {
        ...cleanInput,
        authorUid: user.uid,
        authorName: author.authorName,
        authorHandle: author.authorHandle,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      onNotification("Oportunidad publicada.", "success");
      return true;
    } catch (error) {
      console.error("Error saving hackathon:", error);
      onNotification("No se pudo guardar la oportunidad.", "info");
      return false;
    }
  };

  const deleteHackathon = async (hackathon: HackathonOpportunity) => {
    if (!user || hackathon.authorUid !== user.uid) {
      onNotification("Solo puedes borrar tus propias oportunidades.", "info");
      return;
    }

    try {
      await deleteDoc(doc(db, "hackathons", hackathon.id));
      onNotification("Oportunidad eliminada.", "info");
    } catch (error) {
      console.error("Error deleting hackathon:", error);
      onNotification("No se pudo eliminar la oportunidad.", "info");
    }
  };

  return {
    hackathons,
    loadingHackathons,
    saveHackathon,
    deleteHackathon
  };
}
