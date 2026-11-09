import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { Company } from "./contracts";
import { ApiHttpError, createCompaniesClient } from "./client";
import { companyKeys, createCompanyQueries } from "./queries";

const example: Company = { id: "company-001", name: "Atlas Group", domain: null, status: "new", version: 1, created_at: "2024-01-01T00:00:00.000Z", updated_at: "2024-01-01T00:00:00.000Z" };

describe("typed companies client and query keys", () => {
  it("normalizes equivalent params and distinguishes every result-changing dimension", () => {
    expect(companyKeys.list()).toEqual(companyKeys.list({ limit: 20, offset: 0, q: "  ", sort: "-created_at" }));
    const base = JSON.stringify(companyKeys.list());
    for (const params of [{ q: "atlas" }, { status: "new" as const }, { sort: "name" as const }, { limit: 10 }, { offset: 20 }]) {
      expect(JSON.stringify(companyKeys.list(params))).not.toBe(base);
    }
    expect(companyKeys.list({ q: " atlas " })).toEqual(companyKeys.list({ q: "atlas" }));
    expect(companyKeys.detail("company-001")).not.toEqual(companyKeys.list());
    expect(companyKeys.list({ q: "x" }).slice(0, 2)).toEqual(companyKeys.lists());
    expect(companyKeys.detail("a").slice(0, 2)).toEqual(companyKeys.details());
  });

  it("attaches the current token, serializes params, forwards signal, and supports writes", async () => {
    let token = "first";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input).toBeDefined();
      expect(init).toBeDefined();
      return Response.json(example);
    });
    const client = createCompaniesClient({ getToken: () => token, fetchImpl });
    const signal = new AbortController().signal;
    await client.listCompanies({ q: " A & B ", status: "new" }, signal);
    let [url, init] = fetchImpl.mock.calls[0];
    if (!init) throw new Error("Missing request options");
    expect(url).toContain("q=A+%26+B");
    expect(url).not.toContain(token);
    expect(init.signal).toBe(signal);
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer first");
    expect(init.cache).toBe("no-store");
    token = "second";
    await client.getCompany("company / id", signal);
    [url, init] = fetchImpl.mock.calls[1];
    expect(String(url)).toContain("company%20%2F%20id");
    if (!init) throw new Error("Missing request options");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer second");
    await client.createCompany({ name: "New" });
    expect(fetchImpl.mock.calls[2]?.[1]?.method).toBe("POST");
    await client.updateCompany("company-001", { if_version: 1, domain: null });
    expect(fetchImpl.mock.calls[3]?.[1]?.method).toBe("PATCH");
    expect(fetchImpl.mock.calls[3]?.[1]?.body).toBe('{"if_version":1,"domain":null}');
  });

  it("preserves validation/conflict errors and invokes unauthorized callback on 401", async () => {
    const onUnauthorized = vi.fn();
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({ error: { code: "validation_error", message: "Invalid", details: { fields: { name: "Required" } } } }, { status: 422 }))
      .mockResolvedValueOnce(Response.json({ error: { code: "conflict", message: "Changed", details: { current: example } } }, { status: 409 }))
      .mockResolvedValueOnce(Response.json({ error: { code: "unauthorized", message: "Sign in" } }, { status: 401 }));
    const client = createCompaniesClient({ getToken: () => null, onUnauthorized, fetchImpl });
    await expect(client.createCompany({ name: "" })).rejects.toMatchObject({ status: 422, code: "validation_error", details: { fields: { name: "Required" } } });
    await expect(client.updateCompany("company-001", { if_version: 1 })).rejects.toMatchObject({ status: 409, details: { current: example } });
    await expect(client.getCompany("company-001")).rejects.toBeInstanceOf(ApiHttpError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(new Headers(fetchImpl.mock.calls[2][1].headers).has("Authorization")).toBe(false);
  });

  it("query options forward the query signal to reads", async () => {
    const listCompanies = vi.fn(async () => ({ items: [], total: 0, limit: 20, offset: 0 }));
    const getCompany = vi.fn(async () => example);
    const client = { listCompanies, getCompany, createCompany: vi.fn(), updateCompany: vi.fn() };
    const options = createCompanyQueries(client);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await queryClient.fetchQuery(options.listCompaniesOptions({ q: " atlas " }));
    expect(listCompanies).toHaveBeenCalledWith(expect.objectContaining({ q: "atlas" }), expect.any(AbortSignal));
    await queryClient.fetchQuery(options.companyOptions("company-001"));
    expect(getCompany).toHaveBeenCalledWith("company-001", expect.any(AbortSignal));
    queryClient.clear();
  });
});
