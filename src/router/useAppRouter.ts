import { useCallback, useEffect, useState, type SetStateAction } from "react";
import type { AppRouterState } from "../store/appStore";

export type DeepLinkKey = keyof AppRouterState;

const VALID_KEYS: DeepLinkKey[] = ["share", "folder", "profile", "briefing"];

export function parseSearchParams(search: string): AppRouterState {
  const params = new URLSearchParams(search);
  const result: AppRouterState = {};
  for (const key of VALID_KEYS) {
    const value = params.get(key);
    if (typeof value === "string" && value.length > 0 && value.length <= 200) {
      result[key] = value;
    }
  }
  return result;
}

export function serializeRouterState(state: AppRouterState): string {
  const params = new URLSearchParams();
  for (const key of VALID_KEYS) {
    const value = state[key];
    if (typeof value === "string" && value.length > 0) {
      params.set(key, value);
    }
  }
  return params.toString();
}

export interface AppRouter {
  state: AppRouterState;
  setRouter: (next: SetStateAction<AppRouterState>) => void;
  clearDeepLink: (key: DeepLinkKey) => void;
  clearAll: () => void;
}

export function useAppRouter(initialSearch?: string): AppRouter {
  const initial = initialSearch !== undefined ? parseSearchParams(initialSearch) : parseSearchParams(window.location.search);
  const [state, setState] = useState<AppRouterState>(initial);

  useEffect(() => {
    const qs = serializeRouterState(state);
    const nextSearch = qs.length > 0 ? `?${qs}` : window.location.pathname + window.location.hash;
    const desired = qs.length > 0
      ? `${window.location.pathname}?${qs}${window.location.hash}`
      : `${window.location.pathname}${window.location.hash}`;
    if (nextSearch !== window.location.search && `${window.location.pathname}${window.location.search}${window.location.hash}` !== desired) {
      window.history.replaceState(null, "", desired);
    }
  }, [state]);

  useEffect(() => {
    const onPop = () => {
      setState(parseSearchParams(window.location.search));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setRouter = useCallback((next: SetStateAction<AppRouterState>) => {
    setState(next);
  }, []);

  const clearDeepLink = useCallback((key: DeepLinkKey) => {
    setState((prev) => {
      if (prev[key] === undefined) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }, []);

  const clearAll = useCallback(() => {
    setState({});
  }, []);

  return { state, setRouter, clearDeepLink, clearAll };
}