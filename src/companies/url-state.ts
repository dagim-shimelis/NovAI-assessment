import { COMPANY_SORTS, COMPANY_STATUSES, type CompanySort, type CompanyStatus, type ListCompaniesParams } from "./contracts";

type ListState = { q: string; status: CompanyStatus | null; sort: CompanySort; page: number; drawer: string | null };
export const PAGE_SIZE = 20;
const MAX_PAGE = Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE);

export function normalizeListUrl(search: URLSearchParams): ListState {
  const rawStatus = search.get("status");
  const rawSort = search.get("sort");
  const rawPage = search.get("page") ?? "1";
  const page = Number(rawPage);
  return {
    q: search.get("q")?.trim() ?? "",
    status: COMPANY_STATUSES.find((value) => value === rawStatus) ?? null,
    sort: COMPANY_SORTS.find((value) => value === rawSort) ?? "-created_at",
    page: /^[1-9]\d*$/.test(rawPage) && Number.isSafeInteger(page) && page <= MAX_PAGE ? page : 1,
    drawer: search.get("drawer") || null,
  };
}

export function listApiParams(state: ListState): ListCompaniesParams {
  return { q: state.q, status: state.status, sort: state.sort, limit: PAGE_SIZE, offset: (state.page - 1) * PAGE_SIZE };
}

export function updateListUrl(current: URLSearchParams, changes: Partial<ListState>): string {
  const next = new URLSearchParams(current.toString());
  if (changes.drawer !== undefined) {
    if (changes.drawer) next.set("drawer", changes.drawer); else next.delete("drawer");
  }
  if (changes.q !== undefined) {
    if (changes.q.trim()) next.set("q", changes.q.trim()); else next.delete("q");
  }
  if (changes.status !== undefined) {
    if (changes.status) next.set("status", changes.status); else next.delete("status");
  }
  if (changes.sort !== undefined) {
    if (changes.sort === "-created_at") next.delete("sort"); else next.set("sort", changes.sort);
  }
  if (changes.page !== undefined) {
    if (changes.page === 1) next.delete("page"); else next.set("page", String(changes.page));
  }
  const query = next.toString();
  return `/companies${query ? `?${query}` : ""}`;
}
