import {
  COMPANY_SORTS,
  COMPANY_STATUSES,
  type CompanySort,
  type CompanyStatus,
  type CreateCompanyRequest,
  type ListCompaniesParams,
  type NormalizedListCompaniesParams,
  type UpdateCompanyRequest,
} from "./contracts";

type Validation<T> = { ok: true; value: T } | { ok: false; fields: Record<string, string> };
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isStatus = (value: unknown): value is CompanyStatus =>
  typeof value === "string" && COMPANY_STATUSES.some((status) => status === value);
const isSort = (value: unknown): value is CompanySort =>
  typeof value === "string" && COMPANY_SORTS.some((sort) => sort === value);
const own = (value: Record<string, unknown>, key: string) => Object.hasOwn(value, key);

export function normalizeListParams(params: ListCompaniesParams = {}): NormalizedListCompaniesParams {
  return {
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
    q: params.q?.trim() ?? "",
    status: params.status ?? null,
    sort: params.sort ?? "-created_at",
  };
}

export function validateListParams(search: URLSearchParams): Validation<NormalizedListCompaniesParams> {
  const fields: Record<string, string> = {};
  const allowed = ["limit", "offset", "q", "status", "sort"];
  for (const key of search.keys()) {
    if (!allowed.includes(key)) fields[key] = "Unknown parameter";
    else if (search.getAll(key).length > 1) fields[key] = "Provide one value";
  }
  const limitValue = search.get("limit");
  const offsetValue = search.get("offset");
  const limit = limitValue === null ? 20 : Number(limitValue);
  const offset = offsetValue === null ? 0 : Number(offsetValue);
  if (limitValue !== null && (!/^[0-9]+$/.test(limitValue) || !Number.isSafeInteger(limit) || limit < 1 || limit > 100)) {
    fields.limit = "Must be an integer from 1 to 100";
  }
  if (offsetValue !== null && (!/^[0-9]+$/.test(offsetValue) || !Number.isSafeInteger(offset) || offset < 0)) {
    fields.offset = "Must be a non-negative safe integer";
  }
  const status = search.get("status");
  const sort = search.get("sort");
  if (status !== null && !isStatus(status)) fields.status = "Invalid status";
  if (sort !== null && !isSort(sort)) fields.sort = "Invalid sort";
  if (Object.keys(fields).length) return { ok: false, fields };
  return { ok: true, value: {
    limit, offset, q: search.get("q")?.trim() ?? "",
    status: isStatus(status) ? status : null,
    sort: isSort(sort) ? sort : "-created_at",
  } };
}

function validateEditable(input: unknown, updating: boolean): Validation<{ name?: string; domain?: string | null; status?: CompanyStatus }> {
  if (!isRecord(input)) return { ok: false, fields: { body: "Expected a JSON object" } };
  const fields: Record<string, string> = {};
  const allowed = updating ? ["if_version", "name", "domain", "status"] : ["name", "domain", "status"];
  for (const key of Object.keys(input)) if (!allowed.includes(key)) fields[key] = "Unknown field";
  if ((!updating || own(input, "name")) && (typeof input.name !== "string" || !input.name.trim())) {
    fields.name = "Name is required";
  }
  if (own(input, "domain") && input.domain !== null && typeof input.domain !== "string") {
    fields.domain = "Must be a string or null";
  }
  if (own(input, "status") && !isStatus(input.status)) fields.status = "Invalid status";
  if (updating && (typeof input.if_version !== "number" || !Number.isSafeInteger(input.if_version) || input.if_version < 1)) {
    fields.if_version = "Must be a positive integer";
  }
  if (Object.keys(fields).length) return { ok: false, fields };
  return { ok: true, value: {
    ...(typeof input.name === "string" ? { name: input.name.trim() } : {}),
    ...(own(input, "domain") ? { domain: typeof input.domain === "string" ? input.domain.trim() || null : null } : {}),
    ...(isStatus(input.status) ? { status: input.status } : {}),
  } };
}

export function validateCreate(input: unknown): Validation<CreateCompanyRequest> {
  const result = validateEditable(input, false);
  if (!result.ok) return result;
  // A missing or blank name was rejected by validateEditable.
  if (!result.value.name) return { ok: false, fields: { name: "Name is required" } };
  return { ok: true, value: { ...result.value, name: result.value.name } };
}

export function validateUpdate(input: unknown): Validation<UpdateCompanyRequest> {
  const result = validateEditable(input, true);
  if (!result.ok) return result;
  if (!isRecord(input) || typeof input.if_version !== "number" || !Number.isSafeInteger(input.if_version) || input.if_version < 1) {
    return { ok: false, fields: { if_version: "Must be a positive integer" } };
  }
  return { ok: true, value: { ...result.value, if_version: input.if_version } };
}
