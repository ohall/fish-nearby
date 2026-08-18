export type HttpRequest = {
  url: string;
  /** Query parameters appended to the URL. */
  searchParams?: Record<string, string | number | boolean>;
  /** Per-attempt timeout in milliseconds. */
  timeoutMs: number;
};

export type HttpResponse = {
  status: number;
  json: unknown;
};

/** Transport seam so tests never touch the network. */
export type HttpClient = (request: HttpRequest) => Promise<HttpResponse>;

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export class HttpError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "HttpError";
    if (status !== undefined) {
      this.status = status;
    }
  }
}

/** Real fetch-backed client with a per-attempt timeout. */
export const fetchHttpClient: HttpClient = async ({
  url,
  searchParams,
  timeoutMs,
}) => {
  const target = new URL(url);
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    target.searchParams.set(key, String(value));
  }
  const response = await fetch(target, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: "application/json" },
  });
  const json = (await response.json()) as unknown;
  return { status: response.status, json };
};

export type FetchJsonOptions = {
  maxAttempts?: number;
  backoffBaseMs?: number;
  /** Injectable sleep for deterministic tests. */
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * GET a JSON document with bounded retry/backoff on retryable statuses and
 * network errors. Non-retryable HTTP statuses fail immediately.
 */
export async function fetchJson(
  client: HttpClient,
  request: HttpRequest,
  options: FetchJsonOptions = {},
): Promise<unknown> {
  const maxAttempts = options.maxAttempts ?? 4;
  const backoffBaseMs = options.backoffBaseMs ?? 250;
  const sleep = options.sleep ?? defaultSleep;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await client(request);
      if (response.status >= 200 && response.status < 300) {
        return response.json;
      }
      if (!RETRYABLE_STATUS.has(response.status)) {
        throw new HttpError(
          `HTTP ${response.status} for ${request.url}`,
          response.status,
        );
      }
      lastError = new HttpError(
        `HTTP ${response.status} for ${request.url}`,
        response.status,
      );
    } catch (error) {
      if (
        error instanceof HttpError &&
        error.status !== undefined &&
        !RETRYABLE_STATUS.has(error.status)
      ) {
        throw error;
      }
      lastError = error;
    }

    if (attempt < maxAttempts) {
      await sleep(backoffBaseMs * 2 ** (attempt - 1));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new HttpError(String(lastError));
}
