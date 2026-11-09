import "server-only";

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, parseLocale, type Locale } from "./locale";
import type { Dictionary } from "./dictionaries";

export async function getLocale(): Promise<Locale> {
  return parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  if (locale === DEFAULT_LOCALE) {
    return (await import("./dictionaries")).en;
  }
  return (await import("./dictionaries")).nl;
}
