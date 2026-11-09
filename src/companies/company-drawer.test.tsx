import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useState, useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { SESSION_KEY } from "@/auth/session";
import { LocalizationProvider } from "@/i18n/provider";
import { en, nl } from "@/i18n/dictionaries";
import { companyKeys } from "./queries";
import { CompaniesList } from "./companies-list";
import type { Company } from "./contracts";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: (path: string) => window.history.replaceState(null, "", path) }),
  useSearchParams: () => {
    const search = useSyncExternalStore(
      (listener) => { window.addEventListener("test-navigation", listener); window.addEventListener("popstate", listener); return () => { window.removeEventListener("test-navigation", listener); window.removeEventListener("popstate", listener); }; },
      () => window.location.search, () => "",
    );
    return new URLSearchParams(search);
  },
}));

const initial: Company[] = [
  { id: "company-1", name: "Alpha Labs", domain: "alpha.example", status: "new", version: 1, created_at: "2024-01-01T00:00:00.000Z", updated_at: "2024-01-01T00:00:00.000Z" },
  { id: "company-2", name: "Beta Labs", domain: null, status: "qualified", version: 1, created_at: "2024-01-02T00:00:00.000Z", updated_at: "2024-01-02T00:00:00.000Z" },
];
const originalPush = window.history.pushState;
const originalReplace = window.history.replaceState;
let records: Map<string, Company>;
let calls: { method: string; url: URL; body: unknown }[];
let intercept: ((method: string, url: URL, body: unknown) => Response | Promise<Response> | undefined) | null;

function mockResponse(input: RequestInfo | URL, init?: RequestInit): Response | Promise<Response> {
  const url = new URL(String(input), window.location.origin);
  const method = init?.method ?? "GET";
  const body: unknown = init?.body ? JSON.parse(String(init.body)) : null;
  calls.push({ method, url, body });
  const overridden = intercept?.(method, url, body);
  if (overridden) return overridden;
  if (method === "POST") {
    const value = body as { name: string; domain: string | null; status: Company["status"] };
    const company: Company = { ...initial[0], ...value, id: "company-3", version: 1 };
    records.set(company.id, company);
    return Response.json(company, { status: 201 });
  }
  if (method === "PATCH") {
    const current = records.get(url.pathname.split("/").at(-1) ?? "");
    if (!current) return Response.json({ error: { code: "not_found", message: "Missing" } }, { status: 404 });
    const value = body as { name: string; domain: string | null; status: Company["status"]; if_version: number };
    if (value.if_version !== current.version) return Response.json({ error: { code: "conflict", message: "Stale", details: { current } } }, { status: 409 });
    const company = { ...current, name: value.name, domain: value.domain, status: value.status, version: current.version + 1 };
    records.set(company.id, company);
    return Response.json(company);
  }
  if (url.pathname === "/api/v1/companies") {
    const q = url.searchParams.get("q")?.toLowerCase() ?? "";
    const status = url.searchParams.get("status");
    const items = [...records.values()].filter((item) => (!q || item.name.toLowerCase().includes(q)) && (!status || item.status === status));
    return Response.json({ items, total: items.length, limit: 20, offset: 0 });
  }
  const company = records.get(url.pathname.split("/").at(-1) ?? "");
  return company ? Response.json(company) : Response.json({ error: { code: "not_found", message: "Missing" } }, { status: 404 });
}

beforeEach(() => {
  records = new Map(initial.map((record) => [record.id, { ...record }]));
  calls = [];
  intercept = null;
  window.sessionStorage.clear();
  window.sessionStorage.setItem(SESSION_KEY, "test-token");
  originalReplace.call(window.history, null, "", "/companies");
  window.history.pushState = function (...args) { originalPush.apply(this, args); window.dispatchEvent(new Event("test-navigation")); };
  window.history.replaceState = function (...args) { originalReplace.apply(this, args); window.dispatchEvent(new Event("test-navigation")); };
  vi.stubGlobal("fetch", vi.fn(mockResponse));
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
const patches = () => calls.filter((call) => call.method === "PATCH");
const details = (id: string) => calls.filter((call) => call.method === "GET" && call.url.pathname.endsWith(`/${id}`));

async function editAlpha() {
  open("/companies?drawer=company-1");
  await screen.findByRole("textbox", { name: "Company name" });
}

describe("company drawer", () => {
  it("opens from the table, closes without losing list parameters and restores focus", async () => {
    open("/companies?q=Alpha&status=new&page=2");
    const opener = await screen.findByRole("button", { name: "Alpha Labs" });
    fireEvent.click(opener);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(window.location.search).toContain("drawer=company-1");
    fireEvent.click(screen.getByRole("button", { name: "Close drawer" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(window.location.search).toContain("q=Alpha");
    expect(window.location.search).toContain("status=new");
    expect(window.location.search).toContain("page=2");
    expect(document.activeElement).toBe(opener);
  });

  it("restores direct links and create mode; Escape returns focus to a fallback control", async () => {
    open("/companies?drawer=new&sort=name");
    expect(await screen.findByRole("dialog", { name: "New company" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Company name" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Create company" })).toHaveFocus();
    expect(window.location.search).toBe("?sort=name");
    act(() => window.history.pushState(null, "", "/companies?drawer=company-2&sort=name"));
    expect(await screen.findByRole("textbox", { name: "Company name" })).toHaveValue("Beta Labs");
  });

  it("validates create, maps API 422 and replaces create URL with detail after success", async () => {
    intercept = (method) => method === "POST" ? Response.json({ error: { code: "validation_error", message: "Invalid", details: { fields: { name: "Name is required" } } } }, { status: 422 }) : undefined;
    open("/companies?drawer=new&status=qualified");
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Create company" }));
    expect(screen.getByRole("textbox", { name: "Company name" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("textbox", { name: "Company name" })).toHaveFocus();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    fireEvent.change(screen.getByRole("textbox", { name: "Company name" }), { target: { value: "Gamma" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create company" }));
    expect(await screen.findByText("Enter a company name.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Company name" })).toHaveAttribute("aria-describedby", "drawer-name-error");
    intercept = null;
    fireEvent.click(within(dialog).getByRole("combobox", { name: "Status" }));
    fireEvent.click(await screen.findByRole("option", { name: "Qualified" }));
    expect(within(dialog).getByRole("combobox", { name: "Status" })).toHaveTextContent("Qualified");
    fireEvent.click(within(dialog).getByRole("button", { name: "Create company" }));
    await waitFor(() => expect(window.location.search).toContain("drawer=company-3"));
    expect(await screen.findByText(/may not appear under the current filters/)).toBeInTheDocument();
    expect((calls.find((call) => call.method === "POST")?.body as { domain: string | null }).domain).toBeNull();
    expect((calls.filter((call) => call.method === "POST").at(-1)?.body as { status: string }).status).toBe("qualified");
  });

  it("captures the opening record before any edit and ignores a pre-typing refetch", async () => {
    const view = open("/companies?drawer=company-1");
    const name = await screen.findByRole("textbox", { name: "Company name" });
    expect(name).toHaveValue("Alpha Labs");
    const current = records.get("company-1")!;
    records.set(current.id, { ...current, version: 2, name: "Background change" });
    await act(async () => { await view.queryClient.invalidateQueries({ queryKey: companyKeys.detail("company-1") }); });
    expect(details("company-1")).toHaveLength(2);
    expect(name).toHaveValue("Alpha Labs");
    expect(screen.getByRole("dialog")).toHaveTextContent("Version 1");
    fireEvent.change(name, { target: { value: "First typed edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect((patches()[0].body as { if_version: number }).if_version).toBe(1);
    expect(await screen.findByText(/changed elsewhere/)).toBeInTheDocument();
    expect(name).toHaveValue("First typed edit");
  });

  it("saves the captured base version while background refetch keeps unsaved edits", async () => {
    const view = open("/companies?drawer=company-1");
    const name = await screen.findByRole("textbox", { name: "Company name" });
    fireEvent.change(name, { target: { value: "My draft" } });
    const current = records.get("company-1")!;
    records.set(current.id, { ...current, version: 2, name: "Background change" });
    await act(async () => { await view.queryClient.invalidateQueries({ queryKey: companyKeys.detail("company-1") }); });
    expect(name).toHaveValue("My draft");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(patches().length).toBe(1));
    expect((patches()[0].body as { if_version: number }).if_version).toBe(1);
    expect(await screen.findByText(/changed elsewhere/)).toBeInTheDocument();
    expect(name).toHaveValue("My draft");
  });

  it("loads fresh values, preserves draft, requires explicit reconciliation and recovers a second conflict", async () => {
    await editAlpha();
    const name = screen.getByRole("textbox", { name: "Company name" });
    fireEvent.change(name, { target: { value: "My typed value" } });
    records.set("company-1", { ...records.get("company-1")!, name: "Other editor", version: 2 });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/changed elsewhere/)).toBeInTheDocument();
    const beforeReload = details("company-1").length;
    fireEvent.click(screen.getByRole("button", { name: "Load latest version" }));
    expect(await screen.findByRole("region", { name: "Review changes" })).toBeInTheDocument();
    expect(details("company-1").length).toBeGreaterThan(beforeReload);
    const review = screen.getByRole("region", { name: "Review changes" });
    expect(within(review).getByText("Other editor")).toBeInTheDocument();
    expect(within(review).getByText("My typed value")).toBeInTheDocument();
    expect(name).toHaveValue("My typed value");
    expect(patches()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Keep my draft" }));
    records.set("company-1", { ...records.get("company-1")!, name: "Another editor", version: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Save reviewed draft" }));
    expect(await screen.findByText(/changed elsewhere/)).toBeInTheDocument();
    expect((patches()[1].body as { if_version: number }).if_version).toBe(2);
    expect(name).toHaveValue("My typed value");
    fireEvent.click(screen.getByRole("button", { name: "Load latest version" }));
    expect(await screen.findByText("Another editor")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep my draft" }));
    fireEvent.click(screen.getByRole("button", { name: "Save reviewed draft" }));
    await screen.findByText("Changes saved.");
    expect((patches()[2].body as { if_version: number }).if_version).toBe(3);
    expect(records.get("company-1")?.name).toBe("My typed value");
  });

  it("translates existing client and API field errors after switching language", async () => {
    function LocaleHarness() {
      const [locale, setLocale] = useState<"en" | "nl">("en");
      return <LocalizationProvider locale={locale} dictionary={locale === "en" ? en : nl}>
        <button type="button" onClick={() => setLocale((previous) => previous === "en" ? "nl" : "en")}>Toggle locale</button>
        <CompaniesList />
      </LocalizationProvider>;
    }
    window.history.replaceState(null, "", "/companies?drawer=new");
    renderWithProviders(<LocaleHarness />, { session: true });
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Create company" }));
    expect(screen.getByText("Enter a company name.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Toggle locale"));
    expect(screen.getByText("Voer een bedrijfsnaam in.")).toBeInTheDocument();
    expect(screen.queryByText("Enter a company name.")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Bedrijfsnaam" }), { target: { value: "Gamma" } });
    intercept = (method) => method === "POST" ? Response.json({ error: { code: "validation_error", message: "Invalid", details: { fields: { domain: "Must be a string or null" } } } }, { status: 422 }) : undefined;
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Bedrijf aanmaken" }));
    expect(await screen.findByText("Voer een geldig domein in.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Toggle locale"));
    expect(screen.getByText("Enter a valid domain value.")).toBeInTheDocument();
    expect(screen.queryByText("Voer een geldig domein in.")).not.toBeInTheDocument();
  });

  it("failed reload preserves the draft, retry succeeds, and using latest discards it explicitly", async () => {
    await editAlpha();
    fireEvent.change(screen.getByRole("textbox", { name: "Company name" }), { target: { value: "Draft" } });
    records.set("company-1", { ...records.get("company-1")!, name: "External", version: 2 });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText(/changed elsewhere/);
    intercept = (method, url) => method === "GET" && url.pathname.endsWith("/company-1") ? Response.json({ error: { code: "internal_error", message: "Down" } }, { status: 500 }) : undefined;
    fireEvent.click(screen.getByRole("button", { name: "Load latest version" }));
    expect(await screen.findByText(/Could not load the latest/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Company name" })).toHaveValue("Draft");
    intercept = null;
    fireEvent.click(screen.getByRole("button", { name: "Load latest version" }));
    await screen.findByRole("region", { name: "Review changes" });
    fireEvent.click(screen.getByRole("button", { name: "Use latest saved values" }));
    expect(screen.getByRole("textbox", { name: "Company name" })).toHaveValue("External");
  });

  it("a late create response fills the cache but cannot reopen a closed drawer", async () => {
    let resolveCreate: ((response: Response) => void) | undefined;
    intercept = (method) => method === "POST" ? new Promise<Response>((resolve) => { resolveCreate = resolve; }) : undefined;
    const view = open("/companies?drawer=new&q=Alpha");
    fireEvent.change(await screen.findByRole("textbox", { name: "Company name" }), { target: { value: "Delayed company" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create company" }));
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Saving…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Close drawer" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await act(async () => { resolveCreate?.(Response.json({ ...initial[0], id: "company-3", name: "Delayed company" }, { status: 201 })); });
    expect(window.location.search).toBe("?q=Alpha");
    expect(view.queryClient.getQueryData<Company>(companyKeys.detail("company-3"))?.name).toBe("Delayed company");
  });

  it("switching records isolates drafts and late responses cannot reopen the old drawer", async () => {
    let resolvePatch: ((response: Response) => void) | undefined;
    intercept = (method) => method === "PATCH" ? new Promise<Response>((resolve) => { resolvePatch = resolve; }) : undefined;
    await editAlpha();
    fireEvent.change(screen.getByRole("textbox", { name: "Company name" }), { target: { value: "Old draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    act(() => window.history.pushState(null, "", "/companies?drawer=company-2"));
    expect(await screen.findByRole("textbox", { name: "Company name" })).toHaveValue("Beta Labs");
    await act(async () => { resolvePatch?.(Response.json({ ...initial[0], name: "Old draft", version: 2 })); });
    expect(screen.getByRole("textbox", { name: "Company name" })).toHaveValue("Beta Labs");
    expect(window.location.search).toContain("drawer=company-2");
  });

  it("shows missing records and retryable detail failures", async () => {
    intercept = (method, url) => method === "GET" && url.pathname.endsWith("/company-9") ? Response.json({ error: { code: "internal_error", message: "Down" } }, { status: 500 }) : undefined;
    open("/companies?drawer=company-9");
    expect(await screen.findByText("Could not load this company.")).toBeInTheDocument();
    intercept = null;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("This company was not found.")).toBeInTheDocument();
  });
});
