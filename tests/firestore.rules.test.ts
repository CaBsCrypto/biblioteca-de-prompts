import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc
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

  test("un prompt publico puede ser leido por visitantes", async () => {
    await seedDoc("prompts/public-prompt", validPrompt("alice", { isShared: true }));
    await assertSucceeds(getDoc(doc(dbFor(), "prompts/public-prompt")));
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
});

describe("firestore.rules likes", () => {
  test("un usuario puede agregar y quitar solo su propio like", async () => {
    await seedDoc("prompts/shared-prompt", validPrompt("alice", { isShared: true }));
    await assertSucceeds(updateDoc(doc(dbFor("bob"), "prompts/shared-prompt"), {
      likedBy: ["bob"],
      likesCount: 1,
      updatedAt: serverTimestamp()
    }));
    await assertSucceeds(updateDoc(doc(dbFor("bob"), "prompts/shared-prompt"), {
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
