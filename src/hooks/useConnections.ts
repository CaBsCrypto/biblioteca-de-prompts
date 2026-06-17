import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase";
import type { UserConnection } from "../types";

export type ConnectionTarget = {
  uid: string;
  name: string;
  avatar?: string;
  handle?: string;
};

interface UseConnectionsOptions {
  user: User | null;
  currentUserIdentity: () => {
    authorName: string;
    authorAvatar: string;
    authorHandle: string;
  };
  onNotification: (message: string, type?: "success" | "info") => void;
}

function mapConnectionDoc<T extends { id: string; data: () => unknown }>(docSnap: T): UserConnection {
  const data = docSnap.data() as Partial<UserConnection>;
  return {
    id: docSnap.id,
    ownerUid: data.ownerUid || "",
    targetUid: data.targetUid || docSnap.id,
    targetName: data.targetName || "Miembro",
    targetAvatar: data.targetAvatar || "",
    targetHandle: data.targetHandle || "",
    status: data.status || "pending_sent",
    requestedBy: data.requestedBy || "",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

export function useConnections({ user, currentUserIdentity, onNotification }: UseConnectionsOptions) {
  const [connections, setConnections] = useState<UserConnection[]>([]);

  useEffect(() => {
    if (!user) {
      setConnections([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "connections"),
      (snapshot) => {
        setConnections(snapshot.docs.map(mapConnectionDoc));
      },
      (error) => {
        console.error("Error subscribing to user connections:", error);
      }
    );

    return unsubscribe;
  }, [user]);

  const connectionByTargetUid = useMemo(() => {
    return connections.reduce((map, connection) => {
      map.set(connection.targetUid, connection);
      return map;
    }, new Map<string, UserConnection>());
  }, [connections]);

  const sendConnectionRequest = async (target: ConnectionTarget) => {
    if (!user) {
      onNotification("Inicia sesion para conectar con otros creadores.", "info");
      return;
    }
    if (target.uid === user.uid) {
      onNotification("Este es tu propio perfil.", "info");
      return;
    }

    const existing = connectionByTargetUid.get(target.uid);
    if (existing?.status === "connected") {
      onNotification("Ya tienes conexion con este creador.", "info");
      return;
    }
    if (existing?.status === "pending_sent") {
      onNotification("La solicitud ya esta pendiente.", "info");
      return;
    }
    if (existing?.status === "pending_received") {
      await acceptConnection(target.uid);
      return;
    }

    const ownIdentity = currentUserIdentity();
    const now = serverTimestamp();
    const batch = writeBatch(db);
    const myRef = doc(db, "users", user.uid, "connections", target.uid);
    const targetRef = doc(db, "users", target.uid, "connections", user.uid);

    batch.set(myRef, {
      ownerUid: user.uid,
      targetUid: target.uid,
      targetName: target.name,
      targetAvatar: target.avatar || "",
      targetHandle: target.handle || "",
      status: "pending_sent",
      requestedBy: user.uid,
      createdAt: now,
      updatedAt: now
    });

    batch.set(targetRef, {
      ownerUid: target.uid,
      targetUid: user.uid,
      targetName: ownIdentity.authorName,
      targetAvatar: ownIdentity.authorAvatar,
      targetHandle: ownIdentity.authorHandle,
      status: "pending_received",
      requestedBy: user.uid,
      createdAt: now,
      updatedAt: now
    });

    try {
      await batch.commit();
      onNotification("Solicitud de conexion enviada.", "success");
    } catch (error) {
      console.error("Error sending connection request:", error);
      onNotification("No se pudo enviar la solicitud de conexion.", "info");
    }
  };

  const acceptConnection = async (targetUid: string) => {
    if (!user) {
      onNotification("Inicia sesion para aceptar conexiones.", "info");
      return;
    }

    const current = connectionByTargetUid.get(targetUid);
    if (!current || current.status !== "pending_received") {
      onNotification("No hay una solicitud pendiente de este usuario.", "info");
      return;
    }

    const now = serverTimestamp();
    const batch = writeBatch(db);
    batch.update(doc(db, "users", user.uid, "connections", targetUid), {
      status: "connected",
      updatedAt: now
    });
    batch.update(doc(db, "users", targetUid, "connections", user.uid), {
      status: "connected",
      updatedAt: now
    });

    try {
      await batch.commit();
      onNotification("Conexion aceptada.", "success");
    } catch (error) {
      console.error("Error accepting connection:", error);
      onNotification("No se pudo aceptar la conexion.", "info");
    }
  };

  const removeConnection = async (targetUid: string) => {
    if (!user) {
      onNotification("Inicia sesion para gestionar conexiones.", "info");
      return;
    }

    const batch = writeBatch(db);
    batch.delete(doc(db, "users", user.uid, "connections", targetUid));
    batch.delete(doc(db, "users", targetUid, "connections", user.uid));

    try {
      await batch.commit();
      onNotification("Conexion actualizada.", "info");
    } catch (error) {
      console.error("Error removing connection:", error);
      onNotification("No se pudo actualizar la conexion.", "info");
    }
  };

  return {
    connections,
    connectionByTargetUid,
    sendConnectionRequest,
    acceptConnection,
    removeConnection,
    connectedConnections: connections.filter((connection) => connection.status === "connected"),
    incomingConnectionRequests: connections.filter((connection) => connection.status === "pending_received"),
    outgoingConnectionRequests: connections.filter((connection) => connection.status === "pending_sent")
  };
}
