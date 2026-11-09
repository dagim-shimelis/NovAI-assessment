import { getDictionary, getLocale } from "@/i18n/server";

export default async function CompaniesPage() {
  const dictionary = await getDictionary(await getLocale());

  return (
    <section aria-labelledby="page-title">
      <h1 id="page-title" className="text-3xl font-semibold tracking-tight">{dictionary.title}</h1>
      <p className="mt-4 text-stone-600">{dictionary.placeholder}</p>
    </section>
  );
}
