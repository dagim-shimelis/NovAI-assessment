export const COMPANY_STATUSES = ["new", "researching", "contacted", "qualified", "rejected"] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];
export const COMPANY_SORTS = ["name", "-name", "created_at", "-created_at"] as const;
export type CompanySort = (typeof COMPANY_SORTS)[number];

export type Company = {
  id: string;
  name: string;
  domain: string | null;
  status: CompanyStatus;
  version: number;
  created_at: string;
  updated_at: string;
};

export type ListCompaniesParams = {
  limit?: number;
  offset?: number;
  q?: string;
  status?: CompanyStatus | null;
  sort?: CompanySort;
};
export type NormalizedListCompaniesParams = {
  limit: number;
  offset: number;
  q: string;
  status: CompanyStatus | null;
  sort: CompanySort;
};
export type ListCompaniesResponse = { items: Company[]; total: number; limit: number; offset: number };
export type CreateCompanyRequest = { name: string; domain?: string | null; status?: CompanyStatus };
export type UpdateCompanyRequest = { if_version: number; name?: string; domain?: string | null; status?: CompanyStatus };

export type ApiErrorCode = "unauthorized" | "validation_error" | "malformed_json" | "not_found" | "conflict" | "internal_error";
export type ApiErrorDetails = { fields?: Record<string, string>; current?: Company };
export type ApiErrorBody = { error: { code: ApiErrorCode; message: string; details?: ApiErrorDetails } };
