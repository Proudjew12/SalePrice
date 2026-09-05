import type { HealthResponse } from "@/features/health/types";
import { requestJson } from "@/shared/api/http";

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.status === "ok" &&
    typeof record.service === "string" &&
    typeof record.version === "string"
  );
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const body = await requestJson("health", { signal });
  if (!isHealthResponse(body)) {
    throw new Error("The API returned an invalid health response.");
  }
  return body;
}
