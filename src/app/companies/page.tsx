import { Suspense } from "react";
import { CompaniesList } from "@/companies/companies-list";
import { getDictionary, getLocale } from "@/i18n/server";

export default async function CompaniesPage() {
  const dictionary = await getDictionary(await getLocale());
  return <Suspense fallback={<p role="status" className="text-sm text-stone-600">{dictionary.loading}</p>}><CompaniesList /></Suspense>;
}
