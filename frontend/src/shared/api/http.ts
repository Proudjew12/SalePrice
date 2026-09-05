import { env } from "@/shared/config/env";

export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

export interface RequestJsonOptions extends RequestInit {
  timeoutMs?: number;
}

export class HttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

function buildUrl(path: string): string {
  const baseUrl = env.apiBaseUrl === "/" ? "" : env.apiBaseUrl;
  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
}

function requestSignal(
  callerSignal: AbortSignal | null | undefined,
  timeoutMs: number,
): { signal: AbortSignal; dispose: () => void } {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("HTTP request timeout must be a positive finite number.");
  }

  const controller = new AbortController();
  const forwardCallerAbort = () => {
    controller.abort(callerSignal?.reason);
  };
  if (callerSignal?.aborted) {
    forwardCallerAbort();
  } else {
    callerSignal?.addEventListener("abort", forwardCallerAbort, { once: true });
  }
  const timeout = setTimeout(() => {
    const error = new Error("The request timed out.");
    error.name = "TimeoutError";
    controller.abort(error);
  }, timeoutMs);

  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", forwardCallerAbort);
    },
  };
}

export async function requestJson(
  path: string,
  options: RequestJsonOptions = {},
): Promise<unknown> {
  const { signal: callerSignal, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, ...init } = options;
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  const { signal, dispose } = requestSignal(callerSignal, timeoutMs);
  try {
    const response = await fetch(buildUrl(path), {
      ...init,
      headers,
      signal,
    });
    const body = await readResponseBody(response);

    if (!response.ok) {
      throw new HttpError(response.status, `Request failed with status ${response.status}`, body);
    }
    return body;
  } finally {
    dispose();
  }
}
