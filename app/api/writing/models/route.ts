import { validateExternalApiURL } from "@/lib/ai/models";

export const runtime = "nodejs";

interface ModelsResponse {
  data?: Array<{ id?: string }>;
}

/**
 * Fetches an OpenAI-compatible model list without persisting the submitted
 * key. The browser uses this to choose a model for its own local settings.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    baseURL?: unknown;
    apiKey?: unknown;
  } | null;
  const baseURL = typeof body?.baseURL === "string" ? body.baseURL.trim().replace(/\/+$/, "") : "";
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";

  if (!baseURL || !apiKey || !validateExternalApiURL(baseURL)) {
    return Response.json({ error: "A public HTTPS API URL and API key are required." }, { status: 400 });
  }

  try {
    const response = await fetch(`${baseURL}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null) as ModelsResponse | null;
    if (!response.ok) {
      return Response.json({ error: `Model list request failed (${response.status}).` }, { status: 502 });
    }

    const models = (payload?.data ?? [])
      .map((item) => item.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .sort((left, right) => left.localeCompare(right));
    return Response.json({ models });
  } catch {
    return Response.json({ error: "Unable to reach the model API." }, { status: 502 });
  }
}
