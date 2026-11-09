"use client";

import { useTransition } from "react";
import { ChevronDownIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocalization } from "./provider";
import { setLocale } from "./actions";
import type { Locale } from "./locale";

const flags: Record<Locale, string> = { en: "🇬🇧", nl: "🇳🇱" };
const MENU_ALIGN = "end" as const;

export function LanguagePicker() {
  const { locale, dictionary: t } = useLocalization();
  const [pending, startTransition] = useTransition();
  function choose(value: string) {
    if ((value !== "en" && value !== "nl") || value === locale) return;
    const formData = new FormData();
    formData.set("locale", value);
    startTransition(() => setLocale(formData));
  }
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" disabled={pending} aria-label={`${t.languageLabel}: ${locale === "en" ? t.english : t.dutch}`} className="flex items-center gap-1.5 rounded-md border border-stone-200 px-2.5 py-2 text-sm font-medium hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:opacity-50">
        <span aria-hidden="true">{flags[locale]}</span>
        <span>{locale.toUpperCase()}</span>
        <ChevronDownIcon aria-hidden={true} className="size-4 text-stone-600" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align={MENU_ALIGN}>
      <DropdownMenuGroup>
        <DropdownMenuRadioGroup value={locale} onValueChange={choose}>
          <DropdownMenuRadioItem value="en"><span aria-hidden="true">{flags.en}</span>{t.english}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="nl"><span aria-hidden="true">{flags.nl}</span>{t.dutch}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}
