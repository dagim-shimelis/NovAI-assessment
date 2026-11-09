"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary } from "./dictionaries";
import type { Locale } from "./locale";

type Localization = { locale: Locale; dictionary: Dictionary };
const LocalizationContext = createContext<Localization | null>(null);

export function LocalizationProvider({
  locale,
  dictionary,
  children,
}: Localization & { children: ReactNode }) {
  return (
    <LocalizationContext.Provider value={{ locale, dictionary }}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization(): Localization {
  const context = useContext(LocalizationContext);
  if (!context) throw new Error("LocalizationProvider is required");
  return context;
}
