import type { Metadata } from "next";
import Image from "next/image";
import { GeistSans } from "geist/font/sans";
import type { ReactNode } from "react";
import { getDictionary, getLocale } from "@/i18n/server";
import { LanguagePicker } from "@/i18n/language-picker";
import { Providers } from "./providers";
import { SessionAction } from "@/auth/session-action";
import "./globals.css";

const BRAND_ICON = "/novai-mark.svg";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getDictionary(await getLocale());
  return { title: `${dictionary.title} | NovAI`, icons: { icon: BRAND_ICON } };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);

  return (
    <html lang={locale}>
      <body className={`${GeistSans.className} min-h-screen bg-stone-50 text-stone-900 antialiased`}>
        <Providers locale={locale} dictionary={dictionary}>
          <header className="border-b border-stone-200 bg-white">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-1.5">
                <Image src={BRAND_ICON} alt="" width={24} height={24} className="shrink-0" />
                {/* Brand name is a proper noun, shared across locales. */}
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <span className="font-semibold">NovAI</span>
              </div>
              <div className="flex items-center gap-3">
                <LanguagePicker />
                <SessionAction />
              </div>
            </div>
          </header>
          <main id="main-content" className="mx-auto max-w-6xl px-5 py-8 sm:px-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
