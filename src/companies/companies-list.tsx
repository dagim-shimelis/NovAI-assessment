"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { LoaderCircleIcon, PlusIcon, SearchIcon } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocalization } from "@/i18n/provider";
import { formatDate } from "@/i18n/locale";
import { useSession } from "@/auth/provider";
import { COMPANY_STATUSES, type CompanyStatus, type CompanySort } from "./contracts";
import { createCompanyQueries } from "./queries";
import { HighlightMatch } from "./highlight-match";
import { CompanyDrawer } from "./company-drawer";
import { listApiParams, normalizeListUrl, PAGE_SIZE, updateListUrl } from "./url-state";

export function CompaniesList() {
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const state = normalizeListUrl(new URLSearchParams(searchString));
  const { locale, dictionary: t } = useLocalization();
  const session = useSession();
  const [draftState, setDraftState] = useState({ urlQ: state.q, value: state.q });
  const draft = draftState.urlQ === state.q ? draftState.value : state.q;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const createButton = useRef<HTMLButtonElement>(null);

  const cancelSearch = useCallback(() => {
    if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; }
  }, []);

  useEffect(() => {
    function onPopState() {
      cancelSearch();
      const q = normalizeListUrl(new URLSearchParams(window.location.search)).q;
      setDraftState({ urlQ: q, value: q });
    }
    window.addEventListener("popstate", onPopState);
    return () => { cancelSearch(); window.removeEventListener("popstate", onPopState); };
  }, [cancelSearch]);

  const { state: authState, redirectToSignIn } = session;
  useEffect(() => {
    if (authState === "unauthenticated") redirectToSignIn();
  }, [authState, redirectToSignIn]);

  function navigate(changes: Parameters<typeof updateListUrl>[1], replace = false) {
    cancelSearch();
    const currentQ = normalizeListUrl(new URLSearchParams(window.location.search)).q;
    setDraftState({ urlQ: currentQ, value: changes.q ?? currentQ });
    const url = updateListUrl(new URLSearchParams(window.location.search), changes);
    if (`${window.location.pathname}${window.location.search}` !== url) {
      if (replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
    }
  }

  function changeSearch(value: string) {
    setDraftState({ urlQ: state.q, value });
    cancelSearch();
    timer.current = setTimeout(() => {
      timer.current = null;
      const url = updateListUrl(new URLSearchParams(window.location.search), { q: value, page: 1 });
      if (`${window.location.pathname}${window.location.search}` !== url) window.history.replaceState(null, "", url);
    }, 350);
  }

  const params = listApiParams(state);
  const query = useQuery({
    ...createCompanyQueries(session.client).listCompaniesOptions(params),
    enabled: session.state === "authenticated",
    placeholderData: keepPreviousData,
    retry: false,
  });
  const data = query.data;
  const highlightQuery = query.isPlaceholderData ? "" : state.q;
  const isSearching = draft !== state.q || (Boolean(state.q) && query.isFetching);
  const isLoading = session.state === "loading" || session.state === "unauthenticated" || query.isPending;
  const statuses: Record<CompanyStatus, string> = {
    new: t.statusNew, researching: t.statusResearching, contacted: t.statusContacted,
    qualified: t.statusQualified, rejected: t.statusRejected,
  };
  const filtered = Boolean(state.q || state.status);
  const displayedPage = data ? Math.floor(data.offset / PAGE_SIZE) + 1 : state.page;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const boundsKnown = Boolean(data && !query.isPlaceholderData && !query.isError && !query.isFetching);
  const first = data && data.items.length ? data.offset + 1 : 0;
  const last = data && data.items.length ? data.offset + data.items.length : 0;
  const sortIndicator = (column: "name" | "created_at") => {
    const active = state.sort.replace("-", "") === column;
    return active ? state.sort.startsWith("-") ? t.sortDescending : t.sortAscending : "";
  };
  const nameIndicator = sortIndicator("name");
  const createdIndicator = sortIndicator("created_at");
  function nextSort(column: "name" | "created_at"): CompanySort {
    return state.sort === column ? `-${column}` : column;
  }
  const nameAction = nextSort("name").startsWith("-") ? t.sortDescending : t.sortAscending;
  const createdAction = nextSort("created_at").startsWith("-") ? t.sortDescending : t.sortAscending;
  function changeSort(column: "name" | "created_at") {
    navigate({ sort: nextSort(column), page: 1 });
  }

  return (
    <section aria-labelledby="companies-title" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 id="companies-title" className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <div className="flex items-center gap-4">
          {data && !query.isPlaceholderData && <p className="text-sm tabular-nums text-stone-600">{data.total} {t.results}</p>}
          <button ref={createButton} type="button" onClick={(event) => { opener.current = event.currentTarget; navigate({ drawer: "new" }); }} className="flex items-center gap-2 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"><PlusIcon aria-hidden={true} className="size-4" />{t.createCompany}</button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1 sm:max-w-sm">
          <label htmlFor="company-search" className="mb-1.5 block text-sm font-medium">{t.searchLabel}</label>
          <div className="relative">
            <input id="company-search" type="search" value={draft} placeholder={t.searchPlaceholder} onChange={(event) => changeSearch(event.target.value)} className="w-full rounded-md border border-stone-400 bg-white py-2 pl-10 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900" />
            {isSearching
              ? <LoaderCircleIcon aria-hidden={true} data-testid="search-spinner" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-600 motion-safe:animate-spin" />
              : <SearchIcon aria-hidden={true} data-testid="search-icon" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-600" />}
          </div>
        </div>
        <div className="min-w-44">
          <label htmlFor="company-status" className="mb-1.5 block text-sm font-medium">{t.statusFilter}</label>
          <Select value={state.status ?? "all"} onValueChange={(value) => {
            const status = COMPANY_STATUSES.find((item) => item === value) ?? null;
            navigate({ status, page: 1 });
          }}>
            <SelectTrigger id="company-status" aria-label={t.statusFilter}><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="all">{t.allStatuses}</SelectItem>
              {COMPANY_STATUSES.map((status) => <SelectItem key={status} value={status}>{statuses[status]}</SelectItem>)}
            </SelectGroup></SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <div role="status" aria-live="polite" className="min-h-6 px-4 pt-3 text-sm text-stone-600">
          {isLoading ? t.loading : query.isFetching ? t.updating : null}
        </div>
        {query.isError && session.state === "authenticated" && <div role="alert" className="flex items-center gap-3 px-4 py-3 text-sm text-red-800">
          <span>{t.listError}</span><button type="button" onClick={() => void query.refetch()} className="font-medium underline underline-offset-2 focus-visible:outline-2">{t.retry}</button>
        </div>}
        <div className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-stone-900" role="region" aria-label={t.tableRegion} tabIndex={0}>
          <table className="w-full min-w-[620px] table-fixed text-left text-sm">
            <thead className="text-stone-600">
              <tr>
                <th scope="col" aria-sort={state.sort === "name" ? "ascending" : state.sort === "-name" ? "descending" : "none"} className="sticky left-0 z-10 w-[36%] bg-white px-4 py-3 font-medium"><button type="button" onClick={() => changeSort("name")} aria-label={`${t.sortName}, ${nameAction}`} className="hover:text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900">{t.columnName}{nameIndicator && <span aria-hidden="true" className="ml-2">{state.sort.startsWith("-") ? "↓" : "↑"}</span>}</button></th>
                <th scope="col" className="w-[26%] px-4 py-3 font-medium">{t.columnDomain}</th>
                <th scope="col" className="w-[20%] px-4 py-3 font-medium">{t.columnStatus}</th>
                <th scope="col" aria-sort={state.sort === "created_at" ? "ascending" : state.sort === "-created_at" ? "descending" : "none"} className="w-[18%] px-4 py-3 font-medium"><button type="button" onClick={() => changeSort("created_at")} aria-label={`${t.sortCreated}, ${createdAction}`} className="hover:text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900">{t.columnCreated}{createdIndicator && <span aria-hidden="true" className="ml-2">{state.sort.startsWith("-") ? "↓" : "↑"}</span>}</button></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((company) => <tr key={company.id} onClick={(event) => { opener.current = event.currentTarget.querySelector("button"); navigate({ drawer: company.id }); }} className="group cursor-pointer border-t border-stone-100 hover:bg-stone-100 focus-within:bg-stone-100">
                <th scope="row" className="sticky left-0 z-10 truncate bg-white px-4 py-3 font-medium group-hover:bg-stone-100 group-focus-within:bg-stone-100"><button type="button" onClick={(event) => { event.stopPropagation(); opener.current = event.currentTarget; navigate({ drawer: company.id }); }} className="max-w-full truncate text-left hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"><HighlightMatch text={company.name} query={highlightQuery} /></button></th>
                <td className="truncate px-4 py-3 text-stone-600">{company.domain ? <HighlightMatch text={company.domain} query={highlightQuery} /> : t.missingDomain}</td>
                <td className="px-4 py-3 text-stone-700">{statuses[company.status]}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-stone-600">{formatDate(company.created_at, locale)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        {!isLoading && !query.isError && data?.items.length === 0 && <div className="px-4 py-8 text-sm text-stone-700">
          <p>{data.total === 0 ? filtered ? t.noMatches : t.emptyDataset : t.beyondResults}</p>
          {data.total === 0 && filtered && <button type="button" onClick={() => navigate({ q: "", status: null, page: 1 })} className="mt-3 font-medium underline underline-offset-2">{t.clearFilters}</button>}
          {data.total > 0 && <button type="button" onClick={() => navigate({ page: 1 })} className="mt-3 font-medium underline underline-offset-2">{t.backToFirst}</button>}
        </div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 px-4 py-3 text-sm text-stone-700">
          <p className="tabular-nums">{data && data.items.length ? `${t.showing} ${first}–${last} ${t.of} ${data.total}` : `${t.page} ${displayedPage} ${t.of} ${totalPages}`}</p>
          <div className="flex items-center gap-2">
            <span className="tabular-nums">{t.page} {displayedPage} {t.of} {totalPages}</span>
            <button type="button" disabled={!boundsKnown || state.page <= 1} onClick={() => navigate({ page: state.page - 1 })} className="rounded-md border border-stone-300 px-3 py-2 font-medium hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-500">{t.previous}</button>
            <button type="button" disabled={!boundsKnown || state.page >= totalPages} onClick={() => navigate({ page: state.page + 1 })} className="rounded-md border border-stone-300 px-3 py-2 font-medium hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-500">{t.next}</button>
          </div>
        </div>
      </div>
      <CompanyDrawer drawer={state.drawer} onClose={() => navigate({ drawer: null })} onCreated={(id) => navigate({ drawer: id }, true)} openerRef={opener} fallbackRef={createButton} />
    </section>
  );
}
