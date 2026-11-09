export const LOCALE_COOKIE = "locale";
export const DEFAULT_LOCALE = "en" as const;

export type Locale = "en" | "nl";

export function parseLocale(value: string | undefined): Locale {
  return value === "nl" ? "nl" : DEFAULT_LOCALE;
}

export function formatDate(date: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : "en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(typeof date === "string" ? new Date(date) : date);
}
