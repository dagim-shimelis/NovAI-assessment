import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { en, nl } from "@/i18n/dictionaries";
import { LocalizationProvider } from "@/i18n/provider";
import type { Locale } from "@/i18n/locale";

export function renderWithProviders(
  ui: ReactElement,
  { locale = "en", ...options }: Omit<RenderOptions, "wrapper"> & { locale?: Locale } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <LocalizationProvider locale={locale} dictionary={locale === "en" ? en : nl}>
          {children}
        </LocalizationProvider>
      </QueryClientProvider>
    );
  }

  return { ...render(ui, { ...options, wrapper: Wrapper }), queryClient };
}
