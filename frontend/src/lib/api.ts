import { useCallback, useEffect, useState } from "react";
import type { Catalog, ModelSummary, Patterns, Performance, Prediction } from "./types";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check that the backend is running.", 0);
  }
  if (!response.ok) {
    let message = `The server answered with an error (${response.status}).`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail) && body.detail[0]?.msg) message = body.detail[0].msg;
    } catch {
      // keep the generic message
    }
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}

const cache = new Map<string, Promise<unknown>>();

function cachedGet<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    const promise = request<T>(path).catch((error) => {
      cache.delete(path); // allow a retry after a failure
      throw error;
    });
    cache.set(path, promise);
  }
  return cache.get(path) as Promise<T>;
}

export const api = {
  catalog: () => cachedGet<Catalog>("/api/actions"),
  summary: () => cachedGet<ModelSummary>("/api/model"),
  patterns: () => cachedGet<Patterns>("/api/patterns"),
  performance: () => cachedGet<Performance>("/api/performance"),
  predict: (actions: string[]) =>
    request<Prediction>("/api/predict", { method: "POST", body: JSON.stringify({ actions }) }),
};

export interface Resource<T> {
  data: T | undefined;
  error: ApiError | undefined;
  loading: boolean;
  retry: () => void;
}

/** Load a cached GET resource, with loading and error states and a retry. */
export function useResource<T>(load: () => Promise<T>): Resource<T> {
  const [state, setState] = useState<{ data?: T; error?: ApiError; loading: boolean }>({ loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState((previous) => ({ data: previous.data, loading: true }));
    load()
      .then((data) => {
        if (active) setState({ data, loading: false });
      })
      .catch((error: ApiError) => {
        if (active) setState({ error, loading: false });
      });
    return () => {
      active = false;
    };
  }, [load, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { data: state.data, error: state.error, loading: state.loading, retry };
}
