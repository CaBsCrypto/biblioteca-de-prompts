import { useEffect, useMemo, useState } from "react";
import { collection, collectionGroup, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { Folder, Prompt, UserConnection, UserProfile } from "../types";
import type { Briefing, CommunityPost, HackathonOpportunity } from "../typesCommunity";
import { mapFolderDoc, mapPromptDoc } from "../utils/firestoreMappers";

export interface AdminUserMetric {
  uid: string;
  displayName: string;
  handle: string;
  photoURL?: string;
  role?: UserProfile["role"];
  status?: UserProfile["status"];
  createdAt: any;
  promptsCount: number;
  publicPromptsCount: number;
  privatePromptsCount: number;
  remixesCount: number;
  foldersCount: number;
  publicFoldersCount: number;
  postsCount: number;
  showcasePostsCount: number;
  briefingsCount: number;
  publicBriefingsCount: number;
  hackathonsCount: number;
  connectionsCount: number;
  lastActivityAt: any;
}

function mapUserDoc<T extends { id: string; data: () => unknown }>(docSnap: T): UserProfile {
  const data = docSnap.data() as Partial<UserProfile>;
  return {
    uid: data.uid || docSnap.id,
    displayName: data.displayName || "Usuario",
    photoURL: data.photoURL || "",
    handle: data.handle || "",
    bio: data.bio || "",
    role: data.role || "member",
    status: data.status || "active",
    stats: data.stats || {},
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

function mapPostDoc<T extends { id: string; data: () => unknown }>(docSnap: T): CommunityPost {
  return {
    id: docSnap.id,
    ...(docSnap.data() as Record<string, unknown>)
  } as CommunityPost;
}

function mapBriefingDoc<T extends { id: string; data: () => unknown }>(docSnap: T): Briefing {
  return {
    id: docSnap.id,
    ...(docSnap.data() as Record<string, unknown>)
  } as Briefing;
}

function mapHackathonDoc<T extends { id: string; data: () => unknown }>(docSnap: T): HackathonOpportunity {
  return {
    id: docSnap.id,
    ...(docSnap.data() as Record<string, unknown>)
  } as HackathonOpportunity;
}

function mapConnectionDoc<T extends { id: string; data: () => unknown }>(docSnap: T): UserConnection {
  return {
    id: docSnap.id,
    ...(docSnap.data() as Record<string, unknown>)
  } as UserConnection;
}

function getTime(value: any) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function latestTimestamp(values: any[]) {
  return values.reduce((latest, value) => (getTime(value) > getTime(latest) ? value : latest), null as any);
}

export function useAdminDashboard(isFounder: boolean) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [hackathons, setHackathons] = useState<HackathonOpportunity[]>([]);
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionIssue, setPermissionIssue] = useState(false);

  useEffect(() => {
    if (!isFounder) {
      setUsers([]);
      setPrompts([]);
      setFolders([]);
      setPosts([]);
      setBriefings([]);
      setHackathons([]);
      setConnections([]);
      setLoading(false);
      setPermissionIssue(false);
      return;
    }

    setLoading(true);
    setPermissionIssue(false);
    let pending = 7;
    const markLoaded = () => {
      pending -= 1;
      if (pending <= 0) setLoading(false);
    };
    const handleError = (label: string) => (error: unknown) => {
      console.error(`Error loading admin ${label}:`, error);
      setPermissionIssue(true);
      markLoaded();
    };

    const unsubscribers = [
      onSnapshot(collection(db, "users"), (snapshot) => {
        setUsers(snapshot.docs.map(mapUserDoc));
        markLoaded();
      }, handleError("users")),
      onSnapshot(collection(db, "prompts"), (snapshot) => {
        setPrompts(snapshot.docs.map(mapPromptDoc));
        markLoaded();
      }, handleError("prompts")),
      onSnapshot(collection(db, "folders"), (snapshot) => {
        setFolders(snapshot.docs.map(mapFolderDoc));
        markLoaded();
      }, handleError("folders")),
      onSnapshot(collection(db, "communityPosts"), (snapshot) => {
        setPosts(snapshot.docs.map(mapPostDoc));
        markLoaded();
      }, handleError("posts")),
      onSnapshot(collection(db, "briefings"), (snapshot) => {
        setBriefings(snapshot.docs.map(mapBriefingDoc));
        markLoaded();
      }, handleError("briefings")),
      onSnapshot(collection(db, "hackathons"), (snapshot) => {
        setHackathons(snapshot.docs.map(mapHackathonDoc));
        markLoaded();
      }, handleError("hackathons")),
      onSnapshot(collectionGroup(db, "connections"), (snapshot) => {
        setConnections(snapshot.docs.map(mapConnectionDoc));
        markLoaded();
      }, handleError("connections"))
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [isFounder]);

  const userMetrics = useMemo<AdminUserMetric[]>(() => {
    return users
      .map((profile) => {
        const userPrompts = prompts.filter((prompt) => prompt.userId === profile.uid);
        const userFolders = folders.filter((folder) => folder.userId === profile.uid);
        const userPosts = posts.filter((post) => post.authorUid === profile.uid);
        const userBriefings = briefings.filter((briefing) => briefing.authorUid === profile.uid);
        const userHackathons = hackathons.filter((hackathon) => hackathon.authorUid === profile.uid);
        const userConnections = connections.filter((connection) => connection.ownerUid === profile.uid && connection.status === "connected");

        return {
          uid: profile.uid,
          displayName: profile.displayName,
          handle: profile.handle,
          photoURL: profile.photoURL,
          role: profile.role,
          status: profile.status,
          createdAt: profile.createdAt,
          promptsCount: userPrompts.length,
          publicPromptsCount: userPrompts.filter((prompt) => prompt.isShared).length,
          privatePromptsCount: userPrompts.filter((prompt) => !prompt.isShared).length,
          remixesCount: userPrompts.filter((prompt) => Boolean(prompt.forkedFromPromptId || prompt.forkedFrom)).length,
          foldersCount: userFolders.length,
          publicFoldersCount: userFolders.filter((folder) => folder.isShared).length,
          postsCount: userPosts.filter((post) => post.type !== "showcase").length,
          showcasePostsCount: userPosts.filter((post) => post.type === "showcase").length,
          briefingsCount: userBriefings.length,
          publicBriefingsCount: userBriefings.filter((briefing) => briefing.isPublished).length,
          hackathonsCount: userHackathons.length,
          connectionsCount: userConnections.length,
          lastActivityAt: latestTimestamp([
            profile.updatedAt,
            ...userPrompts.map((prompt) => prompt.updatedAt || prompt.createdAt),
            ...userPosts.map((post) => post.updatedAt || post.createdAt),
            ...userBriefings.map((briefing) => briefing.updatedAt || briefing.createdAt),
            ...userHackathons.map((hackathon) => hackathon.updatedAt || hackathon.createdAt)
          ])
        };
      })
      .sort((a, b) => getTime(b.lastActivityAt || b.createdAt) - getTime(a.lastActivityAt || a.createdAt));
  }, [briefings, connections, folders, hackathons, posts, prompts, users]);

  const totals = useMemo(() => ({
    users: users.length,
    prompts: prompts.length,
    publicPrompts: prompts.filter((prompt) => prompt.isShared).length,
    remixes: prompts.filter((prompt) => Boolean(prompt.forkedFromPromptId || prompt.forkedFrom)).length,
    posts: posts.filter((post) => post.type !== "showcase").length,
    showcases: posts.filter((post) => post.type === "showcase").length,
    briefings: briefings.length,
    publicBriefings: briefings.filter((briefing) => briefing.isPublished).length,
    hackathons: hackathons.length,
    connections: connections.filter((connection) => connection.status === "connected").length / 2
  }), [briefings, connections, hackathons, posts, prompts, users]);

  return {
    loading,
    permissionIssue,
    userMetrics,
    totals
  };
}
