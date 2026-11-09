import { authenticated, errorResponse, jsonResponse, parseJson } from "@/companies/http";
import { companiesStore } from "@/companies/store";
import { validateCreate, validateListParams } from "@/companies/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return authenticated(request, () => {
    const result = validateListParams(new URL(request.url).searchParams);
    if (!result.ok) return errorResponse(422, "validation_error", "Invalid query parameters", { fields: result.fields });
    return jsonResponse(companiesStore.list(result.value));
  });
}

export async function POST(request: Request): Promise<Response> {
  return authenticated(request, async () => {
    const body = await parseJson(request);
    if (!body.ok) return body.response;
    const result = validateCreate(body.value);
    if (!result.ok) return errorResponse(422, "validation_error", "Invalid company", { fields: result.fields });
    return jsonResponse(companiesStore.create(result.value), 201);
  });
}
