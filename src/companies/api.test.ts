import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./delay", () => ({ requestDelay: vi.fn(async () => {}) }));

import { GET as list, POST } from "@/app/api/v1/companies/route";
import { GET as detail, PATCH } from "@/app/api/v1/companies/[id]/route";
import { companiesStore, CompanyStore } from "./store";
import { requestDelay } from "./delay";

const base = "http://localhost/api/v1/companies";
const auth = { Authorization: "Bearer test-token" };
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (path = "", init: RequestInit = {}) => new Request(`${base}${path}`, { headers: auth, ...init });
const body = (value: unknown, method = "POST") => ({ method, headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(value) });

beforeEach(() => {
  companiesStore.reset();
  vi.mocked(requestDelay).mockClear();
});

describe("companies HTTP contracts", () => {
  it("shares exactly 40 deterministic seeds and filters, sorts, then paginates", async () => {
    const isolated = new CompanyStore();
    expect(isolated.list({ limit: 100, offset: 0, q: "", status: null, sort: "name" }).total).toBe(40);
    const first = await list(req());
    expect(first.status).toBe(200);
    expect(first.headers.get("Cache-Control")).toContain("no-store");
    const page = await first.json();
    expect(page).toMatchObject({ total: 40, limit: 20, offset: 0 });
    expect(page.items).toHaveLength(20);
    const response = await list(req("?q=EXAMPLE&status=contacted&sort=-name&limit=2&offset=1"));
    const filtered = await response.json();
    const all = await (await list(req("?q=EXAMPLE&status=contacted&sort=-name&limit=100"))).json();
    expect(filtered.total).toBe(all.total);
    expect(filtered.items).toEqual(all.items.slice(1, 3));
    expect(all.items.every((item: { status: string; domain: string }) => item.status === "contacted" && item.domain.includes("example"))).toBe(true);
    expect(all.items.map((item: { name: string }) => item.name)).toEqual([...all.items.map((item: { name: string }) => item.name)].sort((a, b) => b.localeCompare(a, "en")));
    const byDate = await (await list(req("?sort=created_at&limit=2"))).json();
    expect(byDate.items.map((item: { id: string }) => item.id)).toEqual(["company-001", "company-002"]);
    expect((await (await list(req("?q=ATLAS"))).json()).total).toBe(1);
    expect((await (await list(req("?q=atlas.example"))).json()).total).toBe(0); // Atlas has no domain.
    expect((await (await list(req("?q=beacon.example"))).json()).total).toBe(1);
    const byName = await (await list(req("?sort=name&limit=2"))).json();
    expect(byName.items.map((item: { name: string }) => item.name)).toEqual(["Amber Group", "Atlas Group"]);
  });

  it("requires a well-formed bearer token on every handler, including errors", async () => {
    const noAuth = { headers: {} };
    const calls = [
      list(req("?limit=0", noAuth)), detail(req("/missing", noAuth), context("missing")),
      POST(req("", { ...noAuth, method: "POST", body: "{" })),
      PATCH(req("/missing", { ...noAuth, method: "PATCH", body: "{" }), context("missing")),
    ];
    for (const response of await Promise.all(calls)) {
      expect(response.status).toBe(401);
      expect(response.headers.get("Cache-Control")).toContain("no-store");
      expect(await response.json()).toMatchObject({ error: { code: "unauthorized" } });
    }
    expect((await list(req("", { headers: { Authorization: "Bearer " } }))).status).toBe(401);
    expect((await list(req("", { headers: { Authorization: "Basic abc" } }))).status).toBe(401);
    expect((await list(req("", { headers: { Authorization: "Bearer demo token" } }))).status).toBe(200);
    expect(vi.mocked(requestDelay)).toHaveBeenCalledTimes(7);
  });

  it("validates query bounds and body fields and handles malformed JSON", async () => {
    const invalid = await list(req("?limit=0&offset=-1&status=oops&sort=other"));
    expect(invalid.status).toBe(422);
    expect((await invalid.json()).error.details.fields).toMatchObject({ limit: expect.any(String), offset: expect.any(String), status: expect.any(String), sort: expect.any(String) });
    const empty = await POST(req("", body({ name: "   " })));
    expect(empty.status).toBe(422);
    expect((await empty.json()).error.details.fields.name).toBeDefined();
    const bad = await POST(req("", body({ name: "Valid", domain: 42, status: "unknown" })));
    expect((await bad.json()).error.details.fields).toMatchObject({ domain: expect.any(String), status: expect.any(String) });
    const malformed = await POST(req("", { method: "POST", body: "{", headers: auth }));
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toMatchObject({ error: { code: "malformed_json" } });
  });

  it("creates with defaults, updates atomically, and keeps stale drafts from writing", async () => {
    const createdResponse = await POST(req("", body({ name: "  New Firm  " })));
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json();
    expect(created).toMatchObject({ name: "New Firm", domain: null, status: "new", version: 1 });
    expect(Date.parse(created.created_at)).not.toBeNaN();
    expect(await (await detail(req(`/${created.id}`), context(created.id))).json()).toEqual(created);
    const updatedResponse = await PATCH(req(`/${created.id}`, body({ if_version: 1, domain: "example.org", status: "qualified" }, "PATCH")), context(created.id));
    expect(updatedResponse.status).toBe(200);
    const updated = await updatedResponse.json();
    expect(updated).toMatchObject({ name: "New Firm", domain: "example.org", status: "qualified", version: 2 });
    expect(updated.created_at).toBe(created.created_at);
    expect(Date.parse(updated.updated_at)).toBeGreaterThan(Date.parse(created.updated_at));
    const conflict = await PATCH(req(`/${created.id}`, body({ if_version: 1, name: "Stale" }, "PATCH")), context(created.id));
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ error: { code: "conflict", details: { current: updated } } });
    expect(companiesStore.get(created.id)).toEqual(updated);
    const cleared = await PATCH(req(`/${created.id}`, body({ if_version: 2, domain: null }, "PATCH")), context(created.id));
    expect(await cleared.json()).toMatchObject({ domain: null, version: 3 });
  });

  it("returns 404 for missing records and 422 for invalid versions", async () => {
    expect((await detail(req("/missing"), context("missing"))).status).toBe(404);
    expect((await PATCH(req("/missing", body({ if_version: 1 }, "PATCH")), context("missing"))).status).toBe(404);
    const invalid = await PATCH(req("/company-001", body({ if_version: 0 }, "PATCH")), context("company-001"));
    expect(invalid.status).toBe(422);
    expect((await invalid.json()).error.details.fields.if_version).toBeDefined();
    const emptyName = await PATCH(req("/company-001", body({ if_version: 1, name: "   " }, "PATCH")), context("company-001"));
    expect(emptyName.status).toBe(422);
    expect((await emptyName.json()).error.details.fields.name).toBeDefined();
  });
});
