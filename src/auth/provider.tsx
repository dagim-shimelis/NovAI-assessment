"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createCompaniesClient, type CompaniesClient } from "@/companies/client";
import { companyKeys } from "@/companies/queries";
import { SESSION_KEY, safeReturnTo, signInPath } from "./session";

type AuthState = "loading" | "authenticated" | "unauthenticated";
type Session = {
  state: AuthState;
  client: CompaniesClient;
  signIn: (token: string, destination: string | null) => void;
  signOut: () => void;
  redirectToSignIn: () => void;
};
const SessionContext = createContext<Session | null>(null);
const CHANGE_EVENT = "novai-session-change";

function subscribe(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
function sessionSnapshot(): AuthState {
  return window.sessionStorage.getItem(SESSION_KEY)?.trim() ? "authenticated" : "unauthenticated";
}
function notifySession() { window.dispatchEvent(new Event(CHANGE_EVENT)); }

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const state = useSyncExternalStore<AuthState>(subscribe, sessionSnapshot, () => "loading");

  const clearSession = useCallback(() => {
    window.sessionStorage.removeItem(SESSION_KEY);
    void queryClient.cancelQueries({ queryKey: companyKeys.all });
    queryClient.removeQueries({ queryKey: companyKeys.all });
    notifySession();
  }, [queryClient]);

  const redirectToSignIn = useCallback(() => {
    if (window.location.pathname !== "/sign-in") {
      router.replace(signInPath(`${window.location.pathname}${window.location.search}`));
    }
  }, [router]);

  const onUnauthorized = useCallback(() => {
    clearSession();
    redirectToSignIn();
  }, [clearSession, redirectToSignIn]);

  const client = useMemo(() => createCompaniesClient({
    getToken: () => window.sessionStorage.getItem(SESSION_KEY),
    onUnauthorized,
  }), [onUnauthorized]);

  const signIn = useCallback((value: string, destination: string | null) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    window.sessionStorage.setItem(SESSION_KEY, trimmed);
    notifySession();
    router.replace(safeReturnTo(destination));
  }, [router]);

  const signOut = useCallback(() => {
    clearSession();
    redirectToSignIn();
  }, [clearSession, redirectToSignIn]);

  return (
    <SessionContext.Provider value={{ state, client, signIn, signOut, redirectToSignIn }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("SessionProvider is required");
  return session;
}
