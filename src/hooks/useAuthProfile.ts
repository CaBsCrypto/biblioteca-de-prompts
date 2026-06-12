import { FormEvent, useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { auth, db, googleProvider } from "../firebase";
import { UserProfile } from "../types";
import { buildProfileHandle, getAuthorIdentity, normalizeProfileHandle } from "../utils/profile";

interface UseAuthProfileOptions {
  onNotification: (message: string, type?: "success" | "info") => void;
  onAfterSignOut: () => void;
}

function getGoogleAuthErrorMessage(error: unknown) {
  const code = error instanceof FirebaseError
    ? error.code
    : typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  switch (code) {
    case "auth/unauthorized-domain":
      return `Dominio no autorizado en Firebase Auth. Agrega ${window.location.hostname} en Authentication > Settings > Authorized domains.`;
    case "auth/popup-blocked":
      return "El navegador bloqueó la ventana de Google. Permite popups para este sitio e inténtalo nuevamente.";
    case "auth/popup-closed-by-user":
      return "Cerraste la ventana de Google antes de terminar el inicio de sesión.";
    case "auth/operation-not-allowed":
      return "Google Auth no está habilitado en Firebase Authentication.";
    default:
      return "No se pudo iniciar sesión con Google. Revisa la consola o la configuración de Firebase Auth.";
  }
}

export function useAuthProfile({ onNotification, onAfterSignOut }: UseAuthProfileOptions) {
  const [user, setUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileHandleInput, setProfileHandleInput] = useState("");
  const [profileBioInput, setProfileBioInput] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const ensureUserProfile = async (currentUser: User) => {
    const profileRef = doc(db, "users", currentUser.uid);
    const displayName = currentUser.displayName || currentUser.email?.split("@")[0] || "Miembro de la comunidad";
    const photoURL = currentUser.photoURL || "";
    const existingProfile = await getDoc(profileRef);

    if (!existingProfile.exists()) {
      const profile: Omit<UserProfile, "id"> = {
        uid: currentUser.uid,
        displayName,
        photoURL,
        handle: buildProfileHandle(currentUser),
        bio: "",
        role: "creator",
        status: "active",
        stats: {
          publicPromptsCount: 0,
          followersCount: 0,
          followingCount: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(profileRef, profile);
      setCurrentUserProfile({ ...profile, createdAt: null, updatedAt: null });
      return;
    }

    await updateDoc(profileRef, {
      displayName,
      photoURL,
      updatedAt: serverTimestamp()
    });
    setCurrentUserProfile({
      id: existingProfile.id,
      ...existingProfile.data(),
      displayName,
      photoURL
    } as unknown as UserProfile);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        ensureUserProfile(currentUser).catch((error) => {
          console.error("Error ensuring user profile:", error);
        });
      } else {
        setCurrentUserProfile(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      onNotification("Sesión iniciada con éxito.", "success");
    } catch (error) {
      console.error("Error signing in with Google:", error);
      onNotification(getGoogleAuthErrorMessage(error), "info");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onAfterSignOut();
      onNotification("Se cerró la sesión con éxito.", "info");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleOpenProfileModal = () => {
    if (!user) return;
    setProfileNameInput(currentUserProfile?.displayName || user.displayName || user.email?.split("@")[0] || "");
    setProfileHandleInput(currentUserProfile?.handle || buildProfileHandle(user));
    setProfileBioInput(currentUserProfile?.bio || "");
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const displayName = profileNameInput.trim();
    const handle = normalizeProfileHandle(profileHandleInput, buildProfileHandle(user));
    const bio = profileBioInput.trim();

    if (!displayName) {
      onNotification("El nombre público es obligatorio.", "info");
      return;
    }

    setIsSavingProfile(true);
    try {
      const handleQuery = query(collection(db, "users"), where("handle", "==", handle));
      const handleSnapshot = await getDocs(handleQuery);
      const handleInUse = handleSnapshot.docs.some((profileDoc) => profileDoc.id !== user.uid);
      if (handleInUse) {
        onNotification("Ese handle ya esta en uso. Prueba con otro.", "info");
        return;
      }

      const profileRef = doc(db, "users", user.uid);
      await updateDoc(profileRef, {
        displayName,
        handle,
        bio,
        photoURL: currentUserProfile?.photoURL || user.photoURL || "",
        updatedAt: serverTimestamp()
      });

      setCurrentUserProfile((prev) => ({
        ...(prev || {
          uid: user.uid,
          createdAt: null,
          role: "creator",
          status: "active",
          stats: {
            publicPromptsCount: 0,
            followersCount: 0,
            followingCount: 0
          }
        }),
        displayName,
        handle,
        bio,
        photoURL: currentUserProfile?.photoURL || user.photoURL || "",
        updatedAt: null
      } as UserProfile));

      onNotification("Perfil público actualizado.", "success");
      setShowProfileModal(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      onNotification("No se pudo guardar el perfil.", "info");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return {
    user,
    currentUserProfile,
    authLoading,
    showProfileModal,
    setShowProfileModal,
    profileNameInput,
    setProfileNameInput,
    profileHandleInput,
    setProfileHandleInput,
    profileBioInput,
    setProfileBioInput,
    isSavingProfile,
    handleSignIn,
    handleSignOut,
    handleOpenProfileModal,
    handleSaveProfile,
    getAuthorIdentity: () => getAuthorIdentity(currentUserProfile, user),
    normalizeProfileHandle,
    buildProfileHandle
  };
}
