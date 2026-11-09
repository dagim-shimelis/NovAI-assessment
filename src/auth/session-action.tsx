"use client";

import { LogOutIcon } from "lucide-react";
import { useSession } from "./provider";
import { useLocalization } from "@/i18n/provider";

export function SessionAction() {
  const { state, displayName, signOut } = useSession();
  const { dictionary } = useLocalization();
  if (state !== "authenticated") return null;
  return <div className="flex items-center gap-2">{displayName && <span className="max-w-32 truncate text-sm" title={displayName}>{displayName}</span>}<button type="button" onClick={signOut} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"><LogOutIcon aria-hidden={true} className="size-4" />{dictionary.signOut}</button></div>;
}
