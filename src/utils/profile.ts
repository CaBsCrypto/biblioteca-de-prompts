import type { User } from "firebase/auth";
import type { UserProfile } from "../types";

export function normalizeProfileHandle(source: string, fallback = "creator") {
  const normalized = source
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  return normalized || fallback;
}

export function buildProfileHandle(currentUser: User) {
  const source = currentUser.email?.split("@")[0] || currentUser.displayName || currentUser.uid;
  return normalizeProfileHandle(source, `user-${currentUser.uid.slice(0, 8)}`);
}

export function getAuthorIdentity(currentUserProfile: UserProfile | null, user: User | null) {
  return {
    authorName: currentUserProfile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Miembro de la comunidad",
    authorAvatar: currentUserProfile?.photoURL || user?.photoURL || "",
    authorHandle: currentUserProfile?.handle || (user ? buildProfileHandle(user) : "")
  };
}
