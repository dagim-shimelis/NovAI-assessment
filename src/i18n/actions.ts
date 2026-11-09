"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, parseLocale } from "./locale";

export async function setLocale(formData: FormData): Promise<void> {
  const value = formData.get("locale");
  if (value !== "en" && value !== "nl") return;

  (await cookies()).set(LOCALE_COOKIE, parseLocale(value), {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  // Server Actions re-render the current route and its layouts after a cookie write.
}
