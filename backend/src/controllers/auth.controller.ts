import type { Request, RequestHandler, Response } from 'express';
import type { AuthTokenResponse, LoginRequest, RegisterRequest } from '@team-task-tracker/shared';
import { AppError } from '../errors.js';
import type { AuthService } from '../services/auth.service.js';
import { REFRESH_TOKEN_TTL_SECONDS } from '../services/token.service.js';

export const REFRESH_COOKIE = 'refresh_token';
const COOKIE_PATH = '/api/v1/auth';

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: COOKIE_PATH,
  });
}

export const readRefreshCookie = (req: Request): string | undefined => {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' && value !== '' ? value : undefined;
};

export function createAuthController(
  service: AuthService,
): Record<'register' | 'login' | 'me', RequestHandler> {
  return {
    register: async (req, res) => {
      const user = await service.register(req.body as RegisterRequest);
      res.status(201).json(user);
    },
    login: async (req, res) => {
      const { accessToken, refreshToken } = await service.login(req.body as LoginRequest);
      setRefreshCookie(res, refreshToken);
      const body: AuthTokenResponse = { accessToken };
      res.status(200).json(body);
    },
    me: async (_req, res) => {
      const userId: unknown = res.locals['userId'];
      if (typeof userId !== 'string') {
        throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
      }
      res.status(200).json(await service.getUser(userId));
    },
  };
}
