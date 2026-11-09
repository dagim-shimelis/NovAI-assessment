import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getDictionary, getLocale } from "@/i18n/server";
import { setLocale } from "@/i18n/actions";
import { Providers } from "./providers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getDictionary(await getLocale());
  return { title: `${dictionary.title} | NovAI` };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <Providers locale={locale} dictionary={dictionary}>
          <header className="border-b border-stone-200 bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
              {/* Brand name is a proper noun, shared across locales. */}
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <span className="font-semibold">NovAI</span>
              <form action={setLocale} aria-label={dictionary.languageLabel} className="flex items-center gap-2 text-sm">
                <span>{dictionary.languageLabel}</span>
                <button type="submit" name="locale" value="en" aria-label={dictionary.english} aria-pressed={locale === "en"} className="rounded px-2 py-1 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900">EN</button>
                <button type="submit" name="locale" value="nl" aria-label={dictionary.dutch} aria-pressed={locale === "nl"} className="rounded px-2 py-1 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900">NL</button>
              </form>
            </div>
          </header>
          <main id="main-content" className="mx-auto max-w-5xl px-6 py-12">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
