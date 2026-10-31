import type { RequestHandler } from 'express';
import { AppError } from '../errors.js';
import { verifyAccessToken, type TokenSecrets } from '../services/token.service.js';

const unauthenticated = (): AppError =>
  new AppError(401, 'UNAUTHENTICATED', 'Authentication required');

// Requires `Authorization: Bearer <access token>`; sets res.locals.userId.
export function authenticate(secrets: TokenSecrets): RequestHandler {
  return async (req, res, next) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    const userId = token ? await verifyAccessToken(token, secrets) : null;
    if (!userId) {
      next(unauthenticated());
      return;
    }
    res.locals['userId'] = userId;
    next();
  };
}
