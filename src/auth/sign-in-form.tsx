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

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!name.trim() || !password.trim()) {
      document.getElementById(!name.trim() ? "demo-name" : "demo-password")?.focus();
      return;
    }
    setSubmitted(false);
    setPassword("");
    signIn(`demo-${crypto.randomUUID()}`, destination, name);
  }

  useEffect(() => {
    if (state === "authenticated") router.replace(destination);
  }, [state, router, destination]);

  return (
    <section className="mx-auto mt-12 max-w-md rounded-lg border border-stone-200 bg-white p-7 sm:mt-20" aria-labelledby="sign-in-title">
      <h1 id="sign-in-title" className="text-2xl font-medium">{t.signInTitle}</h1>
      <p className="mt-3 text-sm leading-6 text-stone-600">{t.signInDescription}</p>
      <form onSubmit={submit} noValidate className="mt-7 space-y-5">
        <div>
          <label htmlFor="demo-name" className="mb-2 block text-sm font-medium">{t.demoNameLabel}</label>
          <input id="demo-name" autoComplete="nickname" required value={name} onChange={(event) => setName(event.target.value)} placeholder={t.demoNamePlaceholder} aria-invalid={submitted && !name.trim()} aria-describedby={submitted && !name.trim() ? "demo-name-error" : undefined} className="w-full rounded-md border border-stone-400 px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2" />
          {submitted && !name.trim() && <p id="demo-name-error" role="alert" className="mt-2 text-sm text-red-800">{t.demoNameRequired}</p>}
        </div>
        <div>
          <label htmlFor="demo-password" className="mb-2 block text-sm font-medium">{t.demoPasswordLabel}</label>
          <input id="demo-password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t.demoPasswordPlaceholder} aria-invalid={submitted && !password.trim()} aria-describedby={submitted && !password.trim() ? "demo-password-error" : undefined} className="w-full rounded-md border border-stone-400 px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2" />
          {submitted && !password.trim() && <p id="demo-password-error" role="alert" className="mt-2 text-sm text-red-800">{t.demoPasswordRequired}</p>}
        </div>
        <button type="submit" className="w-full rounded-md bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900">{t.signInAction}</button>
      </form>
    </section>
  );
}
