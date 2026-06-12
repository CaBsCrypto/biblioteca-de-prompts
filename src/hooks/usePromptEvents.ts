import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import type { Prompt, UserEvent } from "../types";

export function usePromptEvents(user: User | null) {
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);

  useEffect(() => {
    if (!user) {
      setUserEvents([]);
      return;
    }

    const eventsQuery = query(
      collection(db, "users", user.uid, "events"),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        setUserEvents(snapshot.docs.map((eventDoc) => ({
          id: eventDoc.id,
          ...eventDoc.data()
        } as UserEvent)));
      },
      (error) => {
        console.error("Error subscribing to user events:", error);
      }
    );

    return unsubscribe;
  }, [user]);

  const promptEventScores = useMemo(() => {
    const scoreMap = new Map<string, { score: number; uses: number; copies: number; edits: number }>();
    userEvents.forEach((event) => {
      if (!event.promptId) return;
      const current = scoreMap.get(event.promptId) || { score: 0, uses: 0, copies: 0, edits: 0 };
      if (event.type === "use" || event.type === "recommendation_use") {
        current.score += 6;
        current.uses += 1;
      } else if (event.type === "copy" || event.type === "recommendation_copy") {
        current.score += 4;
        current.copies += 1;
      } else if (event.type === "edit") {
        current.score += 2;
        current.edits += 1;
      }
      scoreMap.set(event.promptId, current);
    });
    return scoreMap;
  }, [userEvents]);

  const trackUserEvent = async (
    type: UserEvent["type"],
    prompt?: Prompt,
    metadata: Record<string, unknown> = {}
  ) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "users", user.uid, "events"), {
        type,
        promptId: prompt?.id || null,
        promptTitle: prompt?.title || null,
        category: prompt?.category || null,
        tags: prompt?.tags || [],
        metadata,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error tracking user event:", error);
    }
  };

  return { userEvents, promptEventScores, trackUserEvent };
}
