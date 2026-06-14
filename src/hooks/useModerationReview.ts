import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { Prompt } from "../types";

export interface ModerationReportSummary {
  prompt: Prompt;
  reportsCount: number;
}

export function useModerationReview(user: User | null, prompts: Prompt[]) {
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [hasPermissionIssue, setHasPermissionIssue] = useState(false);

  const publicOwnPrompts = useMemo(() => {
    if (!user) return [];
    return prompts
      .filter((prompt) => prompt.userId === user.uid && prompt.isShared)
      .sort((a, b) => (b.updatedAt?.seconds || b.createdAt?.seconds || 0) - (a.updatedAt?.seconds || a.createdAt?.seconds || 0))
      .slice(0, 24);
  }, [prompts, user]);

  useEffect(() => {
    if (!user || publicOwnPrompts.length === 0) {
      setReportCounts({});
      setHasPermissionIssue(false);
      return;
    }

    setHasPermissionIssue(false);
    const unsubscribers = publicOwnPrompts.map((prompt) =>
      onSnapshot(
        collection(db, "prompts", prompt.id, "reports"),
        (snapshot) => {
          setReportCounts((current) => ({
            ...current,
            [prompt.id]: snapshot.size
          }));
        },
        (error) => {
          console.error("Error subscribing to prompt reports:", error);
          setHasPermissionIssue(true);
        }
      )
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [publicOwnPrompts, user]);

  const reportedPrompts = useMemo<ModerationReportSummary[]>(() => {
    return publicOwnPrompts
      .map((prompt) => ({
        prompt,
        reportsCount: reportCounts[prompt.id] || 0
      }))
      .filter((item) => item.reportsCount > 0)
      .sort((a, b) => b.reportsCount - a.reportsCount);
  }, [publicOwnPrompts, reportCounts]);

  return {
    publicOwnPrompts,
    reportedPrompts,
    totalReportsCount: reportedPrompts.reduce((sum, item) => sum + item.reportsCount, 0),
    hasPermissionIssue
  };
}
