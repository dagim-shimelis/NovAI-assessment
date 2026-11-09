import "server-only";

import type { Company, CreateCompanyRequest, ListCompaniesResponse, NormalizedListCompaniesParams, UpdateCompanyRequest } from "./contracts";

const statuses: Company["status"][] = ["new", "researching", "contacted", "qualified", "rejected"];
const names = ["Atlas", "Beacon", "Cedar", "Delta", "Elm", "Fjord", "Grove", "Harbor", "Iris", "Juniper", "Kite", "Lumen", "Maple", "North", "Oak", "Pine", "Quartz", "River", "Summit", "Terra", "Union", "Vista", "Willow", "Xenon", "Yellow", "Zenith", "Amber", "Birch", "Cobalt", "Dune", "Echo", "Flora", "Granite", "Horizon", "Indigo", "Jasper", "Lagoon", "Meadow", "Nimbus", "Orion"];

export function seedCompanies(): Company[] {
  return names.map((name, index) => {
    const created = new Date(Date.UTC(2024, 0, index + 1)).toISOString();
    return {
      id: `company-${String(index + 1).padStart(3, "0")}`,
      name: `${name} ${index % 2 ? "Labs" : "Group"}`,
      domain: index % 4 === 0 ? null : `${name.toLowerCase()}.example`,
      status: statuses[index % statuses.length],
      version: 1,
      created_at: created,
      updated_at: created,
    };
  });
}

export class CompanyStore {
  private records = new Map<string, Company>();
  private nextId = 41;

  constructor() { this.reset(); }

  reset() {
    this.records = new Map(seedCompanies().map((company) => [company.id, company]));
    this.nextId = 41;
  }

  list(params: NormalizedListCompaniesParams): ListCompaniesResponse {
    const q = params.q.toLocaleLowerCase();
    const items = [...this.records.values()]
      .filter((company) => (!params.status || company.status === params.status)
        && (!q || company.name.toLocaleLowerCase().includes(q) || company.domain?.toLocaleLowerCase().includes(q)))
      .sort((left, right) => {
        const direction = params.sort.startsWith("-") ? -1 : 1;
        const primary = params.sort.endsWith("name")
          ? left.name.localeCompare(right.name, "en")
          : left.created_at.localeCompare(right.created_at);
        return direction * primary || left.id.localeCompare(right.id);
      });
    return { items: items.slice(params.offset, params.offset + params.limit).map((item) => ({ ...item })), total: items.length, limit: params.limit, offset: params.offset };
  }

  get(id: string): Company | undefined {
    const record = this.records.get(id);
    return record ? { ...record } : undefined;
  }

  create(input: CreateCompanyRequest): Company {
    const now = new Date().toISOString();
    const company: Company = {
      id: `company-${String(this.nextId++).padStart(3, "0")}`,
      name: input.name,
      domain: input.domain ?? null,
      status: input.status ?? "new",
      version: 1,
      created_at: now,
      updated_at: now,
    };
    this.records.set(company.id, company);
    return { ...company };
  }

  update(id: string, input: UpdateCompanyRequest): { kind: "not_found" } | { kind: "conflict"; current: Company } | { kind: "updated"; company: Company } {
    const current = this.records.get(id);
    if (!current) return { kind: "not_found" };
    if (current.version !== input.if_version) return { kind: "conflict", current: { ...current } };
    // No await between the version check and write: this is atomic within one process.
    const company: Company = {
      ...current,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.domain !== undefined ? { domain: input.domain } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      version: current.version + 1,
      updated_at: new Date(Math.max(Date.now(), Date.parse(current.updated_at) + 1)).toISOString(),
    };
    this.records.set(id, company);
    return { kind: "updated", company: { ...company } };
  }
}

// Shared across route bundles and development module reloads in one Node process.
const scope = globalThis as typeof globalThis & { __novaiCompaniesStore?: CompanyStore };
export const companiesStore = scope.__novaiCompaniesStore ??= new CompanyStore();
