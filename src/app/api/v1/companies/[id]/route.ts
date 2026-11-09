import { authenticated, errorResponse, jsonResponse, parseJson } from "@/companies/http";
import { companiesStore } from "@/companies/store";
import { validateUpdate } from "@/companies/validation";

type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: Context): Promise<Response> {
  return authenticated(request, async () => {
    const { id } = await params;
    const company = companiesStore.get(id);
    return company ? jsonResponse(company) : errorResponse(404, "not_found", "Company not found");
  });
}

export async function PATCH(request: Request, { params }: Context): Promise<Response> {
  return authenticated(request, async () => {
    const { id } = await params;
    // A missing resource takes precedence over body validation.
    if (!companiesStore.get(id)) return errorResponse(404, "not_found", "Company not found");
    const body = await parseJson(request);
    if (!body.ok) return body.response;
    const parsed = validateUpdate(body.value);
    if (!parsed.ok) return errorResponse(422, "validation_error", "Invalid company", { fields: parsed.fields });
    const result = companiesStore.update(id, parsed.value);
    if (result.kind === "not_found") return errorResponse(404, "not_found", "Company not found");
    if (result.kind === "conflict") return errorResponse(409, "conflict", "Company has changed", { current: result.current });
    return jsonResponse(result.company);
  });
}
