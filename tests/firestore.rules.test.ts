import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";

let testEnv: RulesTestEnvironment;

const projectId = "biblioteca-rules-test";

const dbFor = (uid?: string) =>
  uid ? testEnv.authenticatedContext(uid).firestore() : testEnv.unauthenticatedContext().firestore();

const validProfile = (uid: string, overrides = {}) => ({
  uid,
  displayName: `Usuario ${uid}`,
  handle: `${uid}_handle`,
  bio: "Perfil de prueba",
  role: "creator",
  status: "active",
  stats: {
    prompts: 0,
    shared: 0,
    followers: 0
  },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides
});

const validFolder = (uid: string, overrides = {}) => ({
  userId: uid,
  name: "Coleccion principal",
  description: "Carpeta de prueba",
  isShared: false,
  authorName: `Usuario ${uid}`,
  createdAt: serverTimestamp(),
  ...overrides
});

const validPrompt = (uid: string, overrides = {}) => ({
  userId: uid,
  title: "Prompt de prueba",
  description: "Descripcion del prompt",
  promptText: "Escribe sobre {{tema}}",
  category: "General",
  tags: ["test"],
  isFavorite: false,
  isShared: false,
  likedBy: [],
  likesCount: 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides
});

const seedDoc = async (path: string, data: Record<string, unknown>) => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8")
    }
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("firestore.rules perfiles", () => {
  test("permite crear y editar solo el perfil propio", async () => {
    await assertSucceeds(setDoc(doc(dbFor("alice"), "users/alice"), validProfile("alice")));
    await assertFails(setDoc(doc(dbFor("bob"), "users/alice"), validProfile("alice")));
    await assertSucceeds(updateDoc(doc(dbFor("alice"), "users/alice"), {
      displayName: "Alice Editada",
      bio: "Nueva bio",
      updatedAt: serverTimestamp()
    }));
    await assertFails(updateDoc(doc(dbFor("bob"), "users/alice"), {
      displayName: "Intruso",
      updatedAt: serverTimestamp()
    }));
  });

  test("bloquea perfiles con rol fundador creado desde cliente", async () => {
    await assertFails(setDoc(doc(dbFor("alice"), "users/alice"), validProfile("alice", { role: "founder" })));
  });
});

describe("firestore.rules follows y eventos", () => {
  test("un usuario administra solo sus follows", async () => {
    await assertSucceeds(setDoc(doc(dbFor("alice"), "users/alice/following/bob"), {
      targetUid: "bob",
      targetName: "Bob",
      createdAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor("bob"), "users/alice/following/carla"), {
      targetUid: "carla",
      targetName: "Carla",
      createdAt: serverTimestamp()
    }));
    await assertFails(updateDoc(doc(dbFor("alice"), "users/alice/following/bob"), { targetName: "Otro" }));
    await assertSucceeds(deleteDoc(doc(dbFor("alice"), "users/alice/following/bob")));
  });

  test("un usuario crea solo sus eventos y no puede editarlos", async () => {
    await assertSucceeds(setDoc(doc(dbFor("alice"), "users/alice/events/event-1"), {
      type: "use",
      promptId: "prompt-1",
      promptTitle: "Prompt",
      category: "General",
      tags: ["test"],
      metadata: { source: "rules-test" },
      createdAt: serverTimestamp()
    }));
    await assertFails(setDoc(doc(dbFor("bob"), "users/alice/events/event-2"), {
      type: "copy",
      createdAt: serverTimestamp()
    }));
    await assertFails(updateDoc(doc(dbFor("alice"), "users/alice/events/event-1"), { type: "edit" }));
  });
});

describe("firestore.rules carpetas y prompts", () => {
  test("isShared no expone carpetas legacy ni colaboradores y conserva accesos autorizados", async () => {
    const collaborators = { bob: { role: "editor", displayName: "Bob", email: "bob@example.invalid" } };
    await seedDoc("folders/legacy-shared", validFolder("alice", { isShared: true, collaborators }));
    await seedDoc("users/founder", validProfile("founder", { role: "founder" }));
    for (const uid of [undefined, "charlie"]) {
      await assertFails(getDoc(doc(dbFor(uid), "folders/legacy-shared")));
      await assertFails(getDocs(query(collection(dbFor(uid), "folders"), where("isShared", "==", true))));
    }
    expect((await assertSucceeds(getDoc(doc(dbFor("alice"), "folders/legacy-shared")))).data()?.collaborators).toEqual(collaborators);
    expect((await assertSucceeds(getDoc(doc(dbFor("bob"), "folders/legacy-shared")))).data()?.collaborators).toEqual(collaborators);
    await assertSucceeds(getDocs(query(collection(dbFor("alice"), "folders"), where("userId", "==", "alice"))));
    await assertSucceeds(getDocs(query(collection(dbFor("bob"), "folders"), where("collaborators.bob.role", "==", "editor"))));
    await assertSucceeds(getDoc(doc(dbFor("founder"), "folders/legacy-shared")));
    await assertSucceeds(getDocs(collection(dbFor("founder"), "folders")));
  });

  test("permite carpeta propia y bloquea prompt dentro de carpeta ajena", async () => {
    await assertSucceeds(setDoc(doc(dbFor("alice"), "folders/alice-folder"), validFolder("alice")));
    await seedDoc("folders/bob-folder", validFolder("bob"));
    await assertFails(setDoc(doc(dbFor("alice"), "prompts/alice-in-bob-folder"), validPrompt("alice", {
      folderId: "bob-folder"
    })));
  });

  test("un prompt privado no se expone aunque su carpeta sea compartida", async () => {
    await seedDoc("folders/shared-folder", validFolder("alice", { isShared: true }));
    await seedDoc("prompts/private-prompt", validPrompt("alice", {
      folderId: "shared-folder",
      isShared: false
    }));
    await assertSucceeds(getDoc(doc(dbFor("alice"), "prompts/private-prompt")));
    await assertFails(getDoc(doc(dbFor("bob"), "prompts/private-prompt")));
    await assertFails(getDoc(doc(dbFor(), "prompts/private-prompt")));
  });

  test("isShared no publica un prompt legacy sin revisión del catálogo", async () => {
    await seedDoc("prompts/public-prompt", validPrompt("alice", { isShared: true }));
    await assertFails(getDoc(doc(dbFor(), "prompts/public-prompt")));
    await assertFails(getDoc(doc(dbFor("bob"), "prompts/public-prompt")));
    await assertSucceeds(getDoc(doc(dbFor("alice"), "prompts/public-prompt")));
  });

  test("solo el dueno puede editar o borrar el prompt completo", async () => {
    await seedDoc("prompts/owned-prompt", validPrompt("alice"));
    await assertSucceeds(updateDoc(doc(dbFor("alice"), "prompts/owned-prompt"), {
      title: "Nuevo titulo",
      updatedAt: serverTimestamp()
    }));
    await assertFails(updateDoc(doc(dbFor("bob"), "prompts/owned-prompt"), {
      title: "Secuestro",
      updatedAt: serverTimestamp()
    }));
    await assertFails(deleteDoc(doc(dbFor("bob"), "prompts/owned-prompt")));
    await assertSucceeds(deleteDoc(doc(dbFor("alice"), "prompts/owned-prompt")));
  });

  test("el colaborador editor respeta tipos y límites sin cambiar propiedad y el viewer no escribe", async () => {
    await seedDoc("folders/team-folder", validFolder("alice", { collaborators: { bob: { role: "editor" }, carla: { role: "viewer" } } }));
    await seedDoc("prompts/team-prompt", validPrompt("alice", { folderId: "team-folder" }));
    await assertSucceeds(updateDoc(doc(dbFor("bob"), "prompts/team-prompt"), { title: "Editado por Bob", promptText: "Resume {{tema}}", description: "Texto colaborativo", tags: ["equipo"], suggestedVariables: [{ name: "tema", description: "Tema a resumir" }], updatedAt: serverTimestamp() }));
    const invalidChanges = [
      { title: 7 }, { title: "" }, { title: "x".repeat(151) },
      { promptText: { unexpected: "map" } }, { promptText: "" }, { promptText: "x".repeat(10001) },
      { category: 8 }, { category: "x".repeat(51) },
      { description: [] }, { description: "x".repeat(1001) },
      { tags: "texto" }, { tags: Array.from({ length: 11 }, (_, i) => `tag-${i}`) },
      { suggestedVariables: "texto" }, { userId: "bob" }, { folderId: null }, { authorName: "Bob" }
    ];
    for (const change of invalidChanges) await assertFails(updateDoc(doc(dbFor("bob"), "prompts/team-prompt"), { ...change, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(dbFor("carla"), "prompts/team-prompt"), { title: "Viewer no edita", updatedAt: serverTimestamp() }));
    expect((await getDoc(doc(dbFor("alice"), "prompts/team-prompt"))).data()?.userId).toBe("alice");
    expect((await getDoc(doc(dbFor("alice"), "prompts/team-prompt"))).data()?.title).toBe("Editado por Bob");
  });
});

describe("firestore.rules autoría comunitaria", () => {
  test("solo crea posts con su UID y conserva edición y likes legítimos", async () => {
    const post = { type: "idea", title: "Idea del autor", body: "Comparte un recurso", tags: ["idea"], imageUrl: "", linkUrl: "", authorUid: "alice", authorName: "Alice", authorHandle: "alice", authorAvatar: "", likesCount: 0, likedBy: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await assertFails(setDoc(doc(dbFor("bob"), "communityPosts/forged-author"), post));
    await assertFails(setDoc(doc(dbFor("alice"), "communityPosts/forged-founder"), { ...post, authorUid: "founder" }));
    await assertSucceeds(setDoc(doc(dbFor("alice"), "communityPosts/own-post"), post));
    await assertSucceeds(updateDoc(doc(dbFor("alice"), "communityPosts/own-post"), { title: "Idea actualizada", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(dbFor("alice"), "communityPosts/own-post"), { authorUid: "founder", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(dbFor("bob"), "communityPosts/own-post"), { body: "Contenido ajeno", updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(dbFor("bob"), "communityPosts/own-post"), { likedBy: ["bob"], likesCount: 1, updatedAt: serverTimestamp() }));
    await assertSucceeds(getDoc(doc(dbFor(), "communityPosts/own-post")));
  });
});

describe("firestore.rules chats", () => {
  test("vincula el ID a dos participantes únicos y conserva la conversación privada legítima", async () => {
    const thread = (participants: unknown[]) => ({ participants, participantNames: { alice: "Alice", bob: "Bob", charlie: "Charlie" }, participantHandles: {}, participantAvatars: {}, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    const message = (senderUid: string, recipientUid: string) => ({ chatId: "alice__bob", senderUid, senderName: senderUid, senderAvatar: "", recipientUid, text: "Mensaje privado", createdAt: serverTimestamp() });
    await seedDoc("users/charlie/connections/alice", { status: "connected" });
    await seedDoc("users/alice/connections/bob", { status: "connected" });
    await seedDoc("users/bob/connections/alice", { status: "connected" });
    await seedDoc("users/alice/connections/alice", { status: "connected" });
    await assertFails(setDoc(doc(dbFor("charlie"), "chats/alice__bob"), thread(["alice", "charlie"])));
    await assertFails(setDoc(doc(dbFor("alice"), "chats/alice__alice"), thread(["alice", "alice"])));
    await assertFails(setDoc(doc(dbFor("alice"), "chats/alice__7"), thread(["alice", 7])));
    await assertFails(getDoc(doc(dbFor(), "chats/alice__bob")));
    expect((await assertSucceeds(getDoc(doc(dbFor("alice"), "chats/alice__bob")))).exists()).toBe(false);
    await assertSucceeds(setDoc(doc(dbFor("alice"), "chats/alice__bob"), thread(["alice", "bob"])));
    await assertSucceeds(setDoc(doc(dbFor("bob"), "chats/bob__alice"), thread(["bob", "alice"])));
    await assertSucceeds(setDoc(doc(dbFor("alice"), "chats/alice__bob/messages/own-message"), message("alice", "bob")));
    await assertFails(setDoc(doc(dbFor("charlie"), "chats/alice__bob/messages/intruder-message"), message("charlie", "alice")));
    await assertFails(setDoc(doc(dbFor("bob"), "chats/alice__bob/messages/forged-message"), message("alice", "bob")));
    await assertSucceeds(getDoc(doc(dbFor("bob"), "chats/alice__bob/messages/own-message")));
    for (const uid of [undefined, "charlie"]) {
      await assertFails(getDoc(doc(dbFor(uid), "chats/alice__bob")));
      await assertFails(getDocs(collection(dbFor(uid), "chats/alice__bob/messages")));
    }
    await assertFails(updateDoc(doc(dbFor("alice"), "chats/alice__bob"), { participants: ["alice", "charlie"], lastMessageSenderUid: "alice", updatedAt: serverTimestamp() }));
  });
});

describe("firestore.rules likes", () => {
  test("los likes legacy no permiten escribir en el prompt privado de otro autor", async () => {
    await seedDoc("prompts/shared-prompt", validPrompt("alice", { isShared: true }));
    await assertFails(updateDoc(doc(dbFor("bob"), "prompts/shared-prompt"), {
      likedBy: ["bob"],
      likesCount: 1,
      updatedAt: serverTimestamp()
    }));
    await assertFails(updateDoc(doc(dbFor("bob"), "prompts/shared-prompt"), {
      likedBy: [],
      likesCount: 0,
      updatedAt: serverTimestamp()
    }));
  });

  test("bloquea likes falsificados o conteos inconsistentes", async () => {
    await seedDoc("prompts/shared-prompt", validPrompt("alice", { isShared: true }));
    await assertFails(updateDoc(doc(dbFor("bob"), "prompts/shared-prompt"), {
      likedBy: ["carla"],
      likesCount: 1,
      updatedAt: serverTimestamp()
    }));
    await assertFails(updateDoc(doc(dbFor("bob"), "prompts/shared-prompt"), {
      likedBy: ["bob"],
      likesCount: 2,
      updatedAt: serverTimestamp()
    }));
  });
});
