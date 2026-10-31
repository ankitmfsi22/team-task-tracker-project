import { Router } from 'express';
import { LoginRequestSchema, RegisterRequestSchema } from '@team-task-tracker/shared';
import { createAuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import type { AuthService } from '../services/auth.service.js';
import type { TokenSecrets } from '../services/token.service.js';

export function createAuthRouter(service: AuthService, secrets: TokenSecrets): Router {
  const controller = createAuthController(service);
  const router = Router();
  router.post('/register', validate({ body: RegisterRequestSchema }), controller.register);
  router.post('/login', validate({ body: LoginRequestSchema }), controller.login);
  router.get('/me', authenticate(secrets), controller.me);
  return router;
}
