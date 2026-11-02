import { AuthTokenResponseSchema } from '@team-task-tracker/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { getAccessToken, setAccessToken } from '../auth/token';
import { ApiError, apiFetch, setSessionExpiredHandler } from './client';

const ItemSchema = z.object({ id: z.string(), name: z.string() });

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(status: number, code: string, message: string, details?: unknown): Response {
  return jsonResponse(status, { error: { code, message, details } });
}

function authHeader(init: RequestInit | undefined): string | null {
  return new Headers(init?.headers).get('Authorization');
}

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

function callsTo(path: string): Array<Parameters<typeof fetch>> {
  return fetchMock.mock.calls.filter(([url]) => String(url) === path);
}

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
  setAccessToken(null);
  setSessionExpiredHandler(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setSessionExpiredHandler(null);
  setAccessToken(null);
});

describe('apiFetch', () => {
  it('returns the parsed value when a 200 body matches the schema', async () => {
    setAccessToken('tok-1');
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: '1', name: 'Alpha' }));

    const result = await apiFetch('/api/v1/projects/1', { schema: ItemSchema });

    expect(result).toEqual({ id: '1', name: 'Alpha' });
    expect(authHeader(fetchMock.mock.calls[0]?.[1])).toBe('Bearer tok-1');
  });

  it('throws an ApiError with status, code, message and details for an error response', async () => {
    const details = [{ path: 'name', message: 'Required' }];
    fetchMock.mockResolvedValueOnce(
      errorResponse(400, 'VALIDATION_ERROR', 'Invalid input', details),
    );

    const error = await apiFetch('/api/v1/projects', {
      schema: ItemSchema,
      method: 'POST',
      body: {},
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(400);
    expect(apiError.code).toBe('VALIDATION_ERROR');
    expect(apiError.message).toBe('Invalid input');
    expect(apiError.details).toEqual(details);
  });

  it('rejects a 200 body that does not match the schema and returns no data', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 5, unexpected: true }));

    const outcome = await apiFetch('/api/v1/projects/1', { schema: ItemSchema }).then(
      (value) => ({ value, error: null }),
      (error: unknown) => ({ value: undefined, error }),
    );

    expect(outcome.error).toBeInstanceOf(Error);
    expect(outcome.value).toBeUndefined();
  });

  it('retries once with the new token after a 401 and a successful refresh', async () => {
    setAccessToken('old');
    fetchMock.mockImplementation((input, init) => {
      const url = String(input);
      if (url === '/api/v1/auth/refresh') {
        return Promise.resolve(jsonResponse(200, { accessToken: 'new' }));
      }
      return Promise.resolve(
        authHeader(init) === 'Bearer new'
          ? jsonResponse(200, { id: '1', name: 'Alpha' })
          : errorResponse(401, 'UNAUTHENTICATED', 'Expired'),
      );
    });

    const result = await apiFetch('/api/v1/projects/1', { schema: ItemSchema });

    expect(result).toEqual({ id: '1', name: 'Alpha' });
    expect(callsTo('/api/v1/auth/refresh')).toHaveLength(1);
    const protectedCalls = callsTo('/api/v1/projects/1');
    expect(protectedCalls).toHaveLength(2);
    expect(authHeader(protectedCalls[0]?.[1])).toBe('Bearer old');
    expect(authHeader(protectedCalls[1]?.[1])).toBe('Bearer new');
    expect(getAccessToken()).toBe('new');
  });

  it('clears the token and calls the session-expired handler once when refresh fails', async () => {
    setAccessToken('old');
    const handler = vi.fn();
    setSessionExpiredHandler(handler);
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      return Promise.resolve(
        url === '/api/v1/auth/refresh'
          ? errorResponse(401, 'UNAUTHENTICATED', 'Refresh invalid')
          : errorResponse(401, 'UNAUTHENTICATED', 'Expired'),
      );
    });

    await expect(apiFetch('/api/v1/projects/1', { schema: ItemSchema })).rejects.toBeInstanceOf(
      Error,
    );

    expect(getAccessToken()).toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(callsTo('/api/v1/projects/1')).toHaveLength(1);
    expect(callsTo('/api/v1/auth/refresh')).toHaveLength(1);
  });

  it('does not refresh again when the retried request returns 401', async () => {
    setAccessToken('old');
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      return Promise.resolve(
        url === '/api/v1/auth/refresh'
          ? jsonResponse(200, { accessToken: 'new' })
          : errorResponse(401, 'UNAUTHENTICATED', 'Still no'),
      );
    });

    const error = await apiFetch('/api/v1/projects/1', { schema: ItemSchema }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect(callsTo('/api/v1/auth/refresh')).toHaveLength(1);
    expect(callsTo('/api/v1/projects/1')).toHaveLength(2);
  });

  it('shares one refresh call among concurrent 401 responses', async () => {
    setAccessToken('old');
    fetchMock.mockImplementation((input, init) => {
      const url = String(input);
      if (url === '/api/v1/auth/refresh') {
        return new Promise<Response>((resolve) => {
          setTimeout(() => resolve(jsonResponse(200, { accessToken: 'new' })), 10);
        });
      }
      return Promise.resolve(
        authHeader(init) === 'Bearer new'
          ? jsonResponse(200, { id: url, name: 'ok' })
          : errorResponse(401, 'UNAUTHENTICATED', 'Expired'),
      );
    });

    const results = await Promise.all([
      apiFetch('/api/v1/a', { schema: ItemSchema }),
      apiFetch('/api/v1/b', { schema: ItemSchema }),
      apiFetch('/api/v1/c', { schema: ItemSchema }),
    ]);

    expect(results.map((r) => r.id)).toEqual(['/api/v1/a', '/api/v1/b', '/api/v1/c']);
    expect(callsTo('/api/v1/auth/refresh')).toHaveLength(1);
  });

  it('never refreshes or retries calls to /api/v1/auth/*', async () => {
    const handler = vi.fn();
    setSessionExpiredHandler(handler);
    fetchMock.mockResolvedValue(errorResponse(401, 'INVALID_CREDENTIALS', 'Bad login'));

    const error = await apiFetch('/api/v1/auth/login', {
      schema: AuthTokenResponseSchema,
      method: 'POST',
      body: { email: 'a@b.co', password: 'x' },
      skipAuth: true,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
  });
});
