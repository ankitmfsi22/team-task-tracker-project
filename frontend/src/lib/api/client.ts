import { AuthTokenResponseSchema, ErrorResponseSchema } from '@team-task-tracker/shared';
import type { z } from 'zod';
import { getAccessToken, setAccessToken } from '../auth/token';

const AUTH_PATH_PREFIX = '/api/v1/auth/';
const REFRESH_PATH = '/api/v1/auth/refresh';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ApiFetchOptions<T> {
  schema: z.ZodType<T>;
  method?: string;
  body?: unknown;
  skipAuth?: boolean;
}

let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === '') return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

async function send(
  path: string,
  { method = 'GET', body, skipAuth = false }: Omit<ApiFetchOptions<unknown>, 'schema'>,
): Promise<Response> {
  const headers = new Headers();
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const token = getAccessToken();
  if (token !== null && !skipAuth) headers.set('Authorization', `Bearer ${token}`);
  return fetch(path, {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function toApiError(response: Response): Promise<ApiError> {
  const parsed = ErrorResponseSchema.safeParse(await readJson(response));
  if (parsed.success) {
    const { code, message, details } = parsed.data.error;
    return new ApiError(response.status, code, message, details);
  }
  return new ApiError(
    response.status,
    'UNKNOWN_ERROR',
    `Request failed with status ${response.status}`,
  );
}

async function parseResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  if (!response.ok) throw await toApiError(response);
  const result = schema.safeParse(response.status === 204 ? undefined : await readJson(response));
  if (!result.success) throw new Error('Unexpected response from the server');
  return result.data;
}

let inflightRefresh: Promise<string> | null = null;

// Concurrent callers share one refresh call: the refresh token is rotated on every use.
export function refreshSession(): Promise<string> {
  inflightRefresh ??= (async () => {
    try {
      const { accessToken } = await parseResponse(
        await send(REFRESH_PATH, { method: 'POST', skipAuth: true }),
        AuthTokenResponseSchema,
      );
      setAccessToken(accessToken);
      return accessToken;
    } finally {
      inflightRefresh = null;
    }
  })();
  return inflightRefresh;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions<T>): Promise<T> {
  const first = await send(path, options);
  if (first.status !== 401 || path.startsWith(AUTH_PATH_PREFIX)) {
    return parseResponse(first, options.schema);
  }

  try {
    await refreshSession();
  } catch {
    if (getAccessToken() !== null) {
      setAccessToken(null);
      sessionExpiredHandler?.();
    }
    throw await toApiError(first);
  }
  // One retry only: a second 401 is returned to the caller as an error.
  return parseResponse(await send(path, options), options.schema);
}
