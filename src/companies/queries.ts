import { queryOptions } from "@tanstack/react-query";
import type { CompaniesClient } from "./client";
import type { ListCompaniesParams } from "./contracts";
import { normalizeListParams } from "./validation";

export const companyKeys = {
  all: ["companies"] as const,
  lists: () => [...companyKeys.all, "list"] as const,
  list: (params: ListCompaniesParams = {}) => [...companyKeys.lists(), normalizeListParams(params)] as const,
  details: () => [...companyKeys.all, "detail"] as const,
  detail: (id: string) => [...companyKeys.details(), id] as const,
};

export function createCompanyQueries(client: CompaniesClient) {
  return {
    listCompaniesOptions(params: ListCompaniesParams = {}) {
      const normalized = normalizeListParams(params);
      return queryOptions({
        queryKey: companyKeys.list(normalized),
        queryFn: ({ signal }) => client.listCompanies(normalized, signal),
      });
    },
    companyOptions(id: string) {
      return queryOptions({
        queryKey: companyKeys.detail(id),
        queryFn: ({ signal }) => client.getCompany(id, signal),
      });
    },
  };
}
