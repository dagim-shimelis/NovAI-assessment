import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSyncExternalStore } from "react";
import { renderWithProviders } from "@/test/render";
import { CompaniesList } from "./companies-list";
import { SESSION_KEY } from "@/auth/session";
import type { Company, CompanyStatus } from "./contracts";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: (path: string) => window.history.replaceState(null, "", path) }),
  useSearchParams: () => {
    const search = useSyncExternalStore(
      (listener) => {
        window.addEventListener("test-navigation", listener);
        window.addEventListener("popstate", listener);
        return () => { window.removeEventListener("test-navigation", listener); window.removeEventListener("popstate", listener); };
      },
      () => window.location.search,
      () => "",
    );
    return new URLSearchParams(search);
  },
}));

const statuses: CompanyStatus[] = ["new", "researching", "contacted", "qualified", "rejected"];
const records: Company[] = Array.from({ length: 40 }, (_, i) => ({
  id: `company-${i + 1}`,
  name: `Firm ${String(i + 1).padStart(2, "0")}`,
  domain: `firm${i + 1}.example`,
  status: statuses[i % 5],
  version: 1,
  created_at: new Date(Date.UTC(2024, 0, i + 1)).toISOString(),
  updated_at: new Date(Date.UTC(2024, 0, i + 1)).toISOString(),
}));

const originalPush = window.history.pushState;
const originalReplace = window.history.replaceState;
const requests: URL[] = [];
let fetchMock: ReturnType<typeof vi.fn>;
function success(input: RequestInfo | URL): Response {
  const url = new URL(String(input), window.location.origin);
  requests.push(url);
  const q = url.searchParams.get("q")?.toLowerCase() ?? "";
  const status = url.searchParams.get("status");
  const sort = url.searchParams.get("sort");
  const filtered = records.filter((item) => (!status || item.status === status) && (!q || item.name.toLowerCase().includes(q) || item.domain?.includes(q)))
    .sort((a, b) => (sort?.includes("name") ? a.name.localeCompare(b.name) : a.created_at.localeCompare(b.created_at)) * (sort?.startsWith("-") ? -1 : 1));
  const offset = Number(url.searchParams.get("offset"));
  const limit = Number(url.searchParams.get("limit"));
  return Response.json({ items: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset });
}

beforeEach(() => {
  window.sessionStorage.clear();
  originalReplace.call(window.history, null, "", "/companies");
  window.sessionStorage.setItem(SESSION_KEY, "test-token");
  requests.length = 0;
  window.history.pushState = function (...args) { originalPush.apply(this, args); window.dispatchEvent(new Event("test-navigation")); };
  window.history.replaceState = function (...args) { originalReplace.apply(this, args); window.dispatchEvent(new Event("test-navigation")); };
  fetchMock = vi.fn(async (input: RequestInfo | URL) => success(input));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  window.history.pushState = originalPush;
  window.history.replaceState = originalReplace;
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

function open(path = "/companies") {
  window.history.replaceState(null, "", path);
  return renderWithProviders(<CompaniesList />, { session: true });
}

const lastRequest = () => requests.filter((request) => request.pathname === "/api/v1/companies").at(-1)?.searchParams;

async function chooseStatus(label: string) {
  fireEvent.click(screen.getByRole("combobox", { name: "Status" }));
  fireEvent.click(await screen.findByRole("option", { name: label }));
}

describe("companies list URL and data", () => {
  it("filters, resets pagination, sorts and navigates with actual URL-driven controls and requests", async () => {
    open("/companies?page=2&trace=company-1");
    await screen.findByText("Firm 20");
    expect(lastRequest()?.get("offset")).toBe("20");
    await chooseStatus("Qualified");
    expect(window.location.search).toContain("trace=company-1");
    expect(window.location.search).not.toContain("page=");
    await waitFor(() => expect(lastRequest()?.get("status")).toBe("qualified"));
    expect(lastRequest()?.get("offset")).toBe("0");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Qualified");
    expect(screen.getByRole("button", { name: "Sort by name, Ascending" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sort by creation date, Ascending" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sort by name, Ascending" }));
    await waitFor(() => expect(lastRequest()?.get("sort")).toBe("name"));
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getByRole("button", { name: "Sort by name, Descending" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sort by name, Descending" }));
    await waitFor(() => expect(lastRequest()?.get("sort")).toBe("-name"));
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("button", { name: "Sort by name, Ascending" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sort by creation date, Ascending" }));
    await waitFor(() => expect(lastRequest()?.get("sort")).toBe("created_at"));
    expect(screen.getByRole("columnheader", { name: /Created/ })).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getByRole("button", { name: "Sort by creation date, Descending" })).toBeInTheDocument();
    await chooseStatus("All statuses");
    await waitFor(() => expect(screen.getByRole("button", { name: "Next" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(lastRequest()?.get("offset")).toBe("20"));
    expect(window.location.search).toContain("page=2");
    expect(window.location.search).toContain("trace=company-1");
  });

  it("restores controls on browser navigation and cancels pending search when going Back", async () => {
    open("/companies?q=Firm&status=new&page=2");
    await waitFor(() => expect(lastRequest()?.get("offset")).toBe("20"));
    expect(screen.getByLabelText("Search companies")).toHaveValue("Firm");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("New");
    await chooseStatus("Contacted");
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Contacted"));
    fireEvent.change(screen.getByLabelText("Search companies"), { target: { value: "stale draft" } });
    // popstate represents a real history navigation; the controls and request must follow it.
    act(() => {
      window.history.replaceState(null, "", "/companies?q=Firm&status=new&page=2");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByLabelText("Search companies")).toHaveValue("Firm");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("New");
    await waitFor(() => expect(lastRequest()?.get("status")).toBe("new"));
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(window.location.search).toContain("q=Firm");
  });

  it("debounces search replacement and distinguishes empty results from out-of-range pages", async () => {
    open();
    await screen.findByText("Firm 40");
    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search companies"), { target: { value: "no match" } });
    expect(screen.getByTestId("search-spinner")).toBeInTheDocument();
    expect(window.location.search).toBe("");
    await waitFor(() => expect(window.location.search).toContain("q=no+match"));
    expect(await screen.findByText("No companies match these filters.")).toBeInTheDocument();
    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await screen.findByText("Firm 40");
    act(() => window.history.pushState(null, "", "/companies?page=99"));
    expect(await screen.findByText("This page has no results.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go to first page" }));
    await screen.findByText("Firm 40");
    expect(window.location.search).not.toContain("page=");
  });

  it("opens a detail drawer from the full row while keeping the name button keyboard-accessible", async () => {
    open();
    const name = await screen.findByRole("rowheader", { name: "Firm 40" });
    const row = name.closest("tr");
    expect(row).not.toBeNull();
    expect(row).toHaveClass("cursor-pointer", "hover:bg-stone-100");
    fireEvent.click(within(row!).getByRole("cell", { name: "firm40.example" }));
    expect(window.location.search).toContain("drawer=company-40");
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close drawer" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(within(row!).getByRole("button", { name: "Firm 40" }));
    expect(window.location.search).toContain("drawer=company-40");
  });

  it("highlights case-insensitive literal search matches in names and domains", async () => {
    open("/companies?q=firm");
    const name = await screen.findByRole("rowheader", { name: "Firm 40" });
    const row = name.closest("tr");
    expect(name.querySelector("mark")).toHaveTextContent("Firm");
    expect(row?.querySelector("td mark")).toHaveTextContent("firm");
    expect(row?.querySelector("td mark")).toHaveClass("bg-yellow-200");

    act(() => window.history.pushState(null, "", "/companies?q=firm40.example"));
    await waitFor(() => expect(lastRequest()?.get("q")).toBe("firm40.example"));
    const literalMatch = await screen.findByRole("rowheader", { name: "Firm 40" });
    await waitFor(() => expect(literalMatch.closest("tr")?.querySelector("td mark")).toHaveTextContent("firm40.example"));
    expect(literalMatch.querySelector("mark")).toBeNull();
  });

  it("keeps previous rows mounted and disables pagination while the new bounds are unknown", async () => {
    let resolveNext: ((value: Response) => void) | undefined;
    fetchMock.mockImplementationOnce(async (input: RequestInfo | URL) => success(input))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveNext = resolve; }));
    open();
    await screen.findByText("Firm 40");
    await chooseStatus("New");
    expect(screen.getByText("Firm 40")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Updating companies");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await waitFor(() => expect(resolveNext).toBeDefined());
    await act(async () => { resolveNext?.(success(new URL("/api/v1/companies?limit=20&offset=0&status=new&sort=-created_at", window.location.origin))); });
    await waitFor(() => expect(screen.queryByText("Firm 40")).not.toBeInTheDocument());
  });

  it("distinguishes an empty dataset from filtered no-match results", async () => {
    fetchMock.mockImplementationOnce(async () => Response.json({ items: [], total: 0, limit: 20, offset: 0 }));
    open();
    expect(await screen.findByText("No companies yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("shows initial loading, an actionable error, and a retry result", async () => {
    let resolveFirst: ((value: Response) => void) | undefined;
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirst = resolve; }));
    open();
    expect(screen.getByRole("status")).toHaveTextContent("Loading companies");
    await act(async () => { resolveFirst?.(Response.json({ error: { code: "internal_error", message: "Failed" } }, { status: 500 })); });
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load companies.");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Firm 40")).toBeInTheDocument();
  });

  it("clears the session and cache on 401 and returns to sign-in with the requested URL", async () => {
    fetchMock.mockImplementationOnce(async () => Response.json({ error: { code: "unauthorized", message: "Sign in" } }, { status: 401 }));
    const view = open("/companies?q=Firm&page=2");
    await waitFor(() => expect(window.location.pathname).toBe("/sign-in"));
    expect(new URLSearchParams(window.location.search).get("returnTo")).toBe("/companies?q=Firm&page=2");
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(view.queryClient.getQueryCache().findAll({ queryKey: ["companies"] }).every((query) => query.state.data === undefined)).toBe(true);
  });
});
