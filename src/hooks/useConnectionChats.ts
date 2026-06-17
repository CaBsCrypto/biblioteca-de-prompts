import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase";
import type { ChatMessage, UserConnection } from "../types";

interface UseConnectionChatsOptions {
  user: User | null;
  connectedConnections: UserConnection[];
  getAuthorIdentity: () => {
    authorName: string;
    authorAvatar: string;
    authorHandle: string;
  };
  onNotification: (message: string, type?: "success" | "info") => void;
}

function getChatId(uidA: string, uidB: string) {
  return [uidA, uidB].sort().join("__");
}

function mapMessageDoc<T extends { id: string; data: () => unknown }>(docSnap: T): ChatMessage {
  const data = docSnap.data() as Partial<ChatMessage>;
  return {
    id: docSnap.id,
    chatId: data.chatId || "",
    senderUid: data.senderUid || "",
    senderName: data.senderName || "Miembro",
    senderAvatar: data.senderAvatar || "",
    recipientUid: data.recipientUid || "",
    text: data.text || "",
    createdAt: data.createdAt
  };
}

export function useConnectionChats({
  user,
  connectedConnections,
  getAuthorIdentity,
  onNotification
}: UseConnectionChatsOptions) {
  const [activeChatTargetUid, setActiveChatTargetUid] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [loadingChatMessages, setLoadingChatMessages] = useState(false);

  const connectionByUid = useMemo(() => {
    return connectedConnections.reduce((map, connection) => {
      map.set(connection.targetUid, connection);
      return map;
    }, new Map<string, UserConnection>());
  }, [connectedConnections]);

  const activeChatConnection = activeChatTargetUid ? connectionByUid.get(activeChatTargetUid) || null : null;
  const activeChatId = user && activeChatConnection ? getChatId(user.uid, activeChatConnection.targetUid) : null;

  useEffect(() => {
    if (!user || !activeChatConnection || !activeChatId) {
      setChatMessages([]);
      setLoadingChatMessages(false);
      return;
    }

    setLoadingChatMessages(true);
    const messagesQuery = query(
      collection(db, "chats", activeChatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(80)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        setChatMessages(snapshot.docs.map(mapMessageDoc));
        setLoadingChatMessages(false);
      },
      (error) => {
        console.error("Error subscribing to chat messages:", error);
        setLoadingChatMessages(false);
        onNotification("No se pudo cargar la conversacion.", "info");
      }
    );

    return unsubscribe;
  }, [activeChatConnection, activeChatId, onNotification, user]);

  const openChat = async (connection: UserConnection) => {
    if (!user) {
      onNotification("Inicia sesion para conversar con tus conexiones.", "info");
      return;
    }
    if (connection.status !== "connected") {
      onNotification("Solo puedes chatear con conexiones aceptadas.", "info");
      return;
    }

    const author = getAuthorIdentity();
    const chatId = getChatId(user.uid, connection.targetUid);
    const chatRef = doc(db, "chats", chatId);

    try {
      const chatExists = (await getDoc(chatRef)).exists();
      if (!chatExists) {
        const now = serverTimestamp();
        await setDoc(chatRef, {
          participants: [user.uid, connection.targetUid].sort(),
          participantNames: {
            [user.uid]: author.authorName,
            [connection.targetUid]: connection.targetName
          },
          participantHandles: {
            [user.uid]: author.authorHandle || "",
            [connection.targetUid]: connection.targetHandle || ""
          },
          participantAvatars: {
            [user.uid]: author.authorAvatar || "",
            [connection.targetUid]: connection.targetAvatar || ""
          },
          updatedAt: now,
          createdAt: now
        });
      }
      setActiveChatTargetUid(connection.targetUid);
    } catch (error) {
      console.error("Error opening chat:", error);
      onNotification("No se pudo abrir el chat.", "info");
    }
  };

  const closeChat = () => {
    setActiveChatTargetUid(null);
    setChatDraft("");
    setChatMessages([]);
  };

  const sendChatMessage = async () => {
    if (!user || !activeChatConnection || !activeChatId) {
      onNotification("Abre una conexion para enviar un mensaje.", "info");
      return;
    }

    const cleanText = chatDraft.trim();
    if (!cleanText) {
      onNotification("Escribe un mensaje antes de enviarlo.", "info");
      return;
    }
    if (cleanText.length > 1000) {
      onNotification("El mensaje debe tener menos de 1000 caracteres.", "info");
      return;
    }

    const author = getAuthorIdentity();
    const now = serverTimestamp();
    const chatRef = doc(db, "chats", activeChatId);
    const messageRef = doc(collection(db, "chats", activeChatId, "messages"));
    const batch = writeBatch(db);

    try {
      const chatExists = (await getDoc(chatRef)).exists();

      batch.set(chatRef, {
        participants: [user.uid, activeChatConnection.targetUid].sort(),
        participantNames: {
          [user.uid]: author.authorName,
          [activeChatConnection.targetUid]: activeChatConnection.targetName
        },
        participantHandles: {
          [user.uid]: author.authorHandle || "",
          [activeChatConnection.targetUid]: activeChatConnection.targetHandle || ""
        },
        participantAvatars: {
          [user.uid]: author.authorAvatar || "",
          [activeChatConnection.targetUid]: activeChatConnection.targetAvatar || ""
        },
        lastMessage: cleanText,
        lastMessageSenderUid: user.uid,
        lastMessageAt: now,
        updatedAt: now,
        ...(chatExists ? {} : { createdAt: now })
      }, { merge: true });

      batch.set(messageRef, {
        chatId: activeChatId,
        senderUid: user.uid,
        senderName: author.authorName,
        senderAvatar: author.authorAvatar || "",
        recipientUid: activeChatConnection.targetUid,
        text: cleanText,
        createdAt: now
      });

      await batch.commit();
      setChatDraft("");
    } catch (error) {
      console.error("Error sending chat message:", error);
      onNotification("No se pudo enviar el mensaje.", "info");
    }
  };

  return {
    activeChatConnection,
    activeChatId,
    chatMessages,
    chatDraft,
    setChatDraft,
    loadingChatMessages,
    openChat,
    closeChat,
    sendChatMessage
  };
}
