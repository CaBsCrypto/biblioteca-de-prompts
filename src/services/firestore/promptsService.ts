import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import type { Prompt } from "../../types";
import { mapPromptDoc, sortOwnPrompts } from "../../utils/firestoreMappers";

export type PromptSeed = Omit<Prompt, "id" | "userId" | "createdAt" | "updatedAt">;

export interface PromptAuthorIdentity {
  authorName: string;
  authorAvatar: string;
  authorHandle: string;
}

const PROMPTS_COLLECTION = "prompts";
const MAX_VERSIONS = 3;

function promptsCollection(db: Firestore) {
  return collection(db, PROMPTS_COLLECTION);
}

function promptDoc(db: Firestore, id: string) {
  return doc(db, PROMPTS_COLLECTION, id);
}

function versionsCollection(db: Firestore, promptId: string) {
  return collection(db, PROMPTS_COLLECTION, promptId, "versions");
}

export async function fetchUserPromptsOnce(db: Firestore, uid: string): Promise<Prompt[]> {
  const snapshot = await getDocs(query(promptsCollection(db), where("userId", "==", uid)));
  return sortOwnPrompts(snapshot.docs.map(mapPromptDoc));
}

export async function createPrompt(
  db: Firestore,
  uid: string,
  data: PromptSeed,
  identity: PromptAuthorIdentity
): Promise<string> {
  const ref = doc(promptsCollection(db));
  await setDoc(ref, {
    ...data,
    userId: uid,
    likedBy: [],
    likesCount: 0,
    ...identity,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePrompt(
  db: Firestore,
  promptId: string,
  changes: Partial<Prompt> & { promptText: string }
): Promise<void> {
  const ref = promptDoc(db, promptId);
  await updateDoc(ref, {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

export async function togglePromptFavorite(db: Firestore, promptId: string, next: boolean): Promise<void> {
  await updateDoc(promptDoc(db, promptId), {
    isFavorite: next,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePrompt(db: Firestore, promptId: string): Promise<void> {
  await deleteDoc(promptDoc(db, promptId));
}

export async function archivePromptVersion(
  db: Firestore,
  promptId: string,
  previousPromptText: string
): Promise<void> {
  try {
    const versionsRef = versionsCollection(db, promptId);
    await addDoc(versionsRef, {
      promptText: previousPromptText,
      createdAt: serverTimestamp(),
    });

    const snapshot = await getDocs(query(versionsRef, orderBy("createdAt", "desc")));
    if (snapshot.size > MAX_VERSIONS) {
      const toDelete = snapshot.docs.slice(MAX_VERSIONS);
      await Promise.all(toDelete.map((d) => deleteDoc(d.ref)));
    }
  } catch (error) {
    console.error("Error updating version subcollection in Firestore:", error);
  }
}

export async function seedPromptsForUser(
  db: Firestore,
  uid: string,
  prompts: PromptSeed[],
  identity: PromptAuthorIdentity,
  existingTitles: Set<string>
): Promise<number> {
  const toSeed = prompts.filter((p) => !existingTitles.has(p.title.trim().toLocaleLowerCase("es")));
  if (toSeed.length === 0) return 0;

  await Promise.all(
    toSeed.map((p) => {
      const ref = doc(promptsCollection(db));
      return setDoc(ref, {
        ...p,
        userId: uid,
        ...identity,
        likedBy: [],
        likesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    })
  );
  return toSeed.length;
}

export async function importPromptsFromJSON(
  db: Firestore,
  uid: string,
  parsed: unknown,
  identity: PromptAuthorIdentity
): Promise<number> {
  if (!Array.isArray(parsed)) {
    throw new Error("El archivo JSON debe contener una lista de prompts (array).");
  }

  const valid = (parsed as Array<Record<string, unknown>>).filter(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.title === "string" &&
      (item.title as string).trim().length > 0 &&
      typeof item.promptText === "string" &&
      (item.promptText as string).trim().length > 0
  );

  if (valid.length === 0) {
    throw new Error("No se encontraron prompts válidos en el archivo JSON (se requiere título y texto del prompt).");
  }

  await Promise.all(
    valid.map((p) => {
      const ref = doc(promptsCollection(db));
      const data = {
        title: String(p.title).slice(0, 150),
        description: typeof p.description === "string" ? p.description.slice(0, 1000) : "",
        promptText: String(p.promptText).slice(0, 10000),
        category: typeof p.category === "string" ? p.category.slice(0, 50) : "General",
        tags: Array.isArray(p.tags) ? p.tags.slice(0, 10).map((t) => String(t).slice(0, 50)) : [],
        isFavorite: Boolean(p.isFavorite),
        isShared: Boolean(p.isShared),
        notas: typeof p.notas === "string" ? p.notas.slice(0, 6000) : "",
        suggestedVariables: Array.isArray(p.suggestedVariables)
          ? p.suggestedVariables.map((v) => ({
              name: typeof v.name === "string" ? v.name.slice(0, 100) : "",
              description: typeof v.description === "string" ? v.description.slice(0, 500) : "",
              defaultValue: typeof v.defaultValue === "string" ? v.defaultValue.slice(0, 500) : "",
            }))
          : [],
        userId: uid,
        folderId: typeof p.folderId === "string" ? p.folderId.slice(0, 128) : null,
        ...identity,
        likedBy: [],
        likesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      return setDoc(ref, data);
    })
  );
  return valid.length;
}