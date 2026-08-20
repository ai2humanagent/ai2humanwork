import { listPolicies } from "../../../../lib/verify-engine/engine";
import { policies } from "../../../../lib/verify-engine/policies";
import { apiJson, requireApiKey } from "../../../../lib/verifyApiAuth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = requireApiKey(request);
  if (!auth.ok) return auth.response;
  return apiJson({ policies: listPolicies(policies) });
}
