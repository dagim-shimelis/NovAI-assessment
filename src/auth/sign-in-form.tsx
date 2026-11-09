"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocalization } from "@/i18n/provider";
import { useSession } from "./provider";
import { safeReturnTo } from "./session";

export function SignInForm() {
  const { dictionary: t } = useLocalization();
  const { state, signIn } = useSession();
  const search = useSearchParams();
  const router = useRouter();
  const [destination] = useState(() => safeReturnTo(search.get("returnTo")));
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (state === "authenticated") router.replace(destination);
  }, [state, router, destination]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) { setError(true); return; }
    signIn(value, destination);
  }

  return (
    <section className="mx-auto mt-12 max-w-md rounded-lg border border-stone-200 bg-white p-7 sm:mt-20" aria-labelledby="sign-in-title">
      <h1 id="sign-in-title" className="text-2xl font-medium">{t.signInTitle}</h1>
      <p className="mt-3 text-sm leading-6 text-stone-600">{t.signInDescription}</p>
      <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
        <div>
          <label htmlFor="access-token" className="mb-2 block text-sm font-medium">{t.tokenLabel}</label>
          <input id="access-token" type="password" autoComplete="off" value={value} onChange={(event) => { setValue(event.target.value); setError(false); }} aria-invalid={error} aria-describedby={error ? "token-error" : undefined} className="w-full rounded-md border border-stone-400 px-3 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900" />
          {error && <p id="token-error" role="alert" className="mt-2 text-sm text-red-800">{t.tokenRequired}</p>}
        </div>
        <button type="submit" className="w-full rounded-md bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900">{t.signInAction}</button>
      </form>
    </section>
  );
}
