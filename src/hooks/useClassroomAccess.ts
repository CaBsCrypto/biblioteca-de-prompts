import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { addDoc, collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { findClassroomByCode, findClassroomById } from "../data/classroomSeeds";
import type { Prompt } from "../types";
import type { Classroom, ClassroomMember } from "../typesCommunity";

interface UseClassroomAccessOptions {
  user: User | null;
  prompts: Prompt[];
  getAuthorIdentity: () => {
    authorName: string;
    authorAvatar: string;
    authorHandle: string;
  };
  onNotification: (message: string, type?: "success" | "info") => void;
}

const normalizeTextKey = (value: string) => value.trim().toLocaleLowerCase("es");

function mapClassMember<T extends { id: string; data: () => unknown }>(docSnap: T): ClassroomMember {
  return {
    id: docSnap.id,
    ...(docSnap.data() as Record<string, unknown>)
  } as ClassroomMember;
}

export function useClassroomAccess({
  user,
  prompts,
  getAuthorIdentity,
  onNotification
}: UseClassroomAccessOptions) {
  const [activeClassroom, setActiveClassroom] = useState<Classroom | null>(null);
  const [activeClassMembership, setActiveClassMembership] = useState<ClassroomMember | null>(null);
  const [classMembers, setClassMembers] = useState<ClassroomMember[]>([]);
  const [loadingClassroomAction, setLoadingClassroomAction] = useState(false);

  useEffect(() => {
    if (!activeClassroom || !user) {
      setActiveClassMembership(null);
      return;
    }

    const memberRef = doc(db, "classes", activeClassroom.id, "members", user.uid);
    return onSnapshot(
      memberRef,
      (snapshot) => {
        setActiveClassMembership(snapshot.exists() ? mapClassMember(snapshot) : null);
      },
      (error) => {
        console.error("Error loading classroom membership:", error);
        setActiveClassMembership(null);
      }
    );
  }, [activeClassroom, user]);

  // Load all members for instructors to track
  useEffect(() => {
    if (!activeClassroom) {
      setClassMembers([]);
      return;
    }
    const membersQuery = collection(db, "classes", activeClassroom.id, "members");
    return onSnapshot(
      membersQuery,
      (snapshot) => {
        setClassMembers(snapshot.docs.map(mapClassMember));
      },
      (error) => {
        console.error("Error loading class members: ", error);
        setClassMembers([]);
      }
    );
  }, [activeClassroom]);

  const classSavedPromptCount = useMemo(() => {
    if (!activeClassroom) return 0;
    const classTitles = new Set(activeClassroom.promptPack.map((prompt) => normalizeTextKey(prompt.title)));
    return prompts.filter((prompt) =>
      prompt.sourceClassId === activeClassroom.id || classTitles.has(normalizeTextKey(prompt.title))
    ).length;
  }, [activeClassroom, prompts]);

  const classMissingPromptCount = activeClassroom
    ? Math.max(activeClassroom.promptPack.length - classSavedPromptCount, 0)
    : 0;

  // Synchronize student progress back to membership doc so instructors can see in real-time
  useEffect(() => {
    if (!activeClassroom || !user || !activeClassMembership) return;
    if (activeClassMembership.savedPromptsCount !== classSavedPromptCount) {
      const memberRef = doc(db, "classes", activeClassroom.id, "members", user.uid);
      updateDoc(memberRef, {
        savedPromptsCount: classSavedPromptCount
      }).catch(err => console.error("Error updating savedPromptsCount:", err));
    }
  }, [activeClassroom, user, activeClassMembership, classSavedPromptCount]);

  const resolveClassroomCode = (code: string) => findClassroomByCode(code);
  const resolveClassroomId = (classId: string) => findClassroomById(classId);

  const openClassroom = (classroom: Classroom) => {
    setActiveClassroom(classroom);
  };

  const closeClassroom = () => {
    setActiveClassroom(null);
    setActiveClassMembership(null);
  };

  const joinClassroom = async (classroom: Classroom = activeClassroom!) => {
    if (!classroom || !user) {
      onNotification("Entra con Google para unirte a la clase y guardar el pack.", "info");
      return false;
    }

    setLoadingClassroomAction(true);
    try {
      const identity = getAuthorIdentity();
      const memberRef = doc(db, "classes", classroom.id, "members", user.uid);
      const existingMember = await getDoc(memberRef);
      if (existingMember.exists()) {
        onNotification("Ya estabas unido a esta clase.", "info");
        return true;
      }

      await setDoc(memberRef, {
        uid: user.uid,
        displayName: user.displayName || identity.authorName || "Alumno",
        handle: identity.authorHandle || "",
        photoURL: user.photoURL || identity.authorAvatar || "",
        joinedAt: serverTimestamp()
      });

      onNotification("Te uniste a la clase. Ya puedes guardar el pack privado.", "success");
      return true;
    } catch (error) {
      console.error("Error joining classroom:", error);
      onNotification("No pudimos unirte a la clase. Revisa la sesion e intenta de nuevo.", "info");
      return false;
    } finally {
      setLoadingClassroomAction(false);
    }
  };

  const saveClassroomPack = async (classroom: Classroom = activeClassroom!) => {
    if (!classroom || !user) {
      onNotification("Entra con Google para guardar este pack en tu biblioteca.", "info");
      return;
    }

    setLoadingClassroomAction(true);
    try {
      if (!activeClassMembership) {
        await joinClassroom(classroom);
      }

      const existingClassKeys = new Set(
        prompts.map((prompt) => `${prompt.sourceClassId || ""}:${normalizeTextKey(prompt.title)}`)
      );
      const existingTitles = new Set(prompts.map((prompt) => normalizeTextKey(prompt.title)));
      const promptsToSave = classroom.promptPack.filter((prompt) => {
        const titleKey = normalizeTextKey(prompt.title);
        return !existingClassKeys.has(`${classroom.id}:${titleKey}`) && !existingTitles.has(titleKey);
      });

      if (promptsToSave.length === 0) {
        await updateDoc(doc(db, "classes", classroom.id, "members", user.uid), {
          savedPackAt: serverTimestamp()
        });
        onNotification("Ya tenias guardado este pack de clase.", "info");
        return;
      }

      const identity = getAuthorIdentity();
      await Promise.all(promptsToSave.map((prompt) => addDoc(collection(db, "prompts"), {
        title: prompt.title,
        description: prompt.description,
        promptText: prompt.promptText,
        category: prompt.category,
        tags: prompt.tags || [],
        isFavorite: false,
        isShared: false,
        notas: "",
        suggestedVariables: prompt.suggestedVariables || [],
        userId: user.uid,
        ...identity,
        likedBy: [],
        likesCount: 0,
        sourceClassId: classroom.id,
        sourceClassTitle: classroom.title,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        folderId: null
      })));

      await updateDoc(doc(db, "classes", classroom.id, "members", user.uid), {
        savedPackAt: serverTimestamp()
      });

      onNotification(`Guardamos ${promptsToSave.length} prompts de la clase como privados.`, "success");
    } catch (error) {
      console.error("Error saving classroom pack:", error);
      onNotification("No pudimos guardar el pack de clase. Intenta nuevamente.", "info");
    } finally {
      setLoadingClassroomAction(false);
    }
  };

  return {
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
  };
}
