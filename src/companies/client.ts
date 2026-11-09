import type {
  ApiErrorBody, ApiErrorCode, ApiErrorDetails, Company, CompanyStatus, CreateCompanyRequest,
  ListCompaniesParams, ListCompaniesResponse, UpdateCompanyRequest,
} from "./contracts";
import { normalizeListParams } from "./validation";

type ClientConfig = {
  getToken: () => string | null | undefined;
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
};

export class ApiHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode | "http_error",
    message: string,
    public readonly details?: ApiErrorDetails,
  ) {
    super(message);
    this.name = "ApiHttpError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCode(value: unknown): value is ApiErrorCode {
  return value === "unauthorized" || value === "validation_error" || value === "malformed_json"
    || value === "not_found" || value === "conflict" || value === "internal_error";
}

function isCompanyStatus(value: unknown): value is CompanyStatus {
  return value === "new" || value === "researching" || value === "contacted" || value === "qualified" || value === "rejected";
}

function parseError(value: unknown): ApiErrorBody["error"] | undefined {
  if (!isRecord(value) || !isRecord(value.error) || !isCode(value.error.code) || typeof value.error.message !== "string") return;
  const details = value.error.details;
  let parsedDetails: ApiErrorDetails | undefined;
  if (isRecord(details)) {
    const fields = details.fields;
    const current = details.current;
    const parsedFields = isRecord(fields) && Object.values(fields).every((entry) => typeof entry === "string")
      ? Object.fromEntries(Object.entries(fields).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : undefined;
    const parsedCurrent = isRecord(current) && typeof current.id === "string" && typeof current.name === "string"
      && typeof current.version === "number" && Number.isSafeInteger(current.version) && (typeof current.domain === "string" || current.domain === null)
      && isCompanyStatus(current.status)
      && typeof current.created_at === "string" && typeof current.updated_at === "string"
      ? {
          id: current.id, name: current.name, domain: current.domain, status: current.status,
          version: current.version, created_at: current.created_at, updated_at: current.updated_at,
        } : undefined;
    parsedDetails = { ...(parsedFields ? { fields: parsedFields } : {}), ...(parsedCurrent ? { current: parsedCurrent } : {}) };
  }
  return { code: value.error.code, message: value.error.message, ...(parsedDetails ? { details: parsedDetails } : {}) };
}

export function createCompaniesClient({ getToken, onUnauthorized, fetchImpl = fetch, baseUrl = "" }: ClientConfig) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers = new Headers(init.headers);
    if (token?.trim()) headers.set("Authorization", `Bearer ${token.trim()}`);
    if (init.body !== undefined) headers.set("Content-Type", "application/json");
    const response = await fetchImpl(`${baseUrl}/api/v1/companies${path}`, {
      ...init, headers, cache: "no-store",
    });
    if (!response.ok) {
      let raw: unknown;
      try { raw = await response.json(); } catch { raw = undefined; }
      const error = parseError(raw);
      if (response.status === 401) onUnauthorized?.();
      throw new ApiHttpError(response.status, error?.code ?? "http_error", error?.message ?? `HTTP ${response.status}`, error?.details);
    }
    // Successful API responses are typed contracts; validation belongs at the server boundary.
    return response.json() as Promise<T>;
  }

  return {
    listCompanies(params: ListCompaniesParams = {}, signal?: AbortSignal): Promise<ListCompaniesResponse> {
      const normalized = normalizeListParams(params);
      const search = new URLSearchParams({ limit: String(normalized.limit), offset: String(normalized.offset), sort: normalized.sort });
      if (normalized.q) search.set("q", normalized.q);
      if (normalized.status) search.set("status", normalized.status);
      return request(`?${search}`, { signal });
    },
    getCompany(id: string, signal?: AbortSignal): Promise<Company> {
      return request(`/${encodeURIComponent(id)}`, { signal });
    },
    createCompany(body: CreateCompanyRequest): Promise<Company> {
      return request("", { method: "POST", body: JSON.stringify(body) });
    },
    updateCompany(id: string, body: UpdateCompanyRequest): Promise<Company> {
      return request(`/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
    },
  };
}

export type CompaniesClient = ReturnType<typeof createCompaniesClient>;
