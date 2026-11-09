"use client";

import { isServer, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { LocalizationProvider } from "@/i18n/provider";
import { SessionProvider } from "@/auth/provider";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/locale";

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });
}

let browserClient: QueryClient | undefined;
function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserClient ??= makeQueryClient();
  return browserClient;
}

export function Providers({
  children,
  locale,
  dictionary,
}: { children: ReactNode; locale: Locale; dictionary: Dictionary }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <LocalizationProvider locale={locale} dictionary={dictionary}>
        <SessionProvider>{children}</SessionProvider>
      </LocalizationProvider>
    </QueryClientProvider>
  );
}
