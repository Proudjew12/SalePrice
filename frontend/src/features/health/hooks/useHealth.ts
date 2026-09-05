import { useCallback, useEffect, useState } from "react";

import { getHealth } from "@/features/health/api/getHealth";
import type { HealthResponse } from "@/features/health/types";
import { HttpError } from "@/shared/api/http";
import { env } from "@/shared/config/env";

type HealthState =
  | { status: "unconfigured" }
  | { status: "loading" }
  | { status: "success"; data: HealthResponse }
  | { status: "error"; message: string };

export type UseHealthResult = HealthState & { refresh: () => void };

export function healthErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    return "The API responded, but its health check failed. Try again.";
  }
  return "The API health check did not complete. Confirm the service is running and try again.";
}

export function useHealth(): UseHealthResult {
  const [state, setState] = useState<HealthState>(
    env.apiEnabled ? { status: "loading" } : { status: "unconfigured" },
  );
  const [attempt, setAttempt] = useState(0);

  const refresh = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!env.apiEnabled) {
      return undefined;
    }

    const controller = new AbortController();

    void getHealth(controller.signal)
      .then((data) => {
        setState({ status: "success", data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({ status: "error", message: healthErrorMessage(error) });
      });

    return () => {
      controller.abort();
    };
  }, [attempt]);

  return { ...state, refresh };
}
