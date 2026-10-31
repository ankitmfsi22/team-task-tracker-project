import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../errors.js';

interface Schemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

// Validates body, params and query with Zod schemas from packages/shared before the handler runs.
// The parsed body replaces req.body; params and query are only checked (Express 5 makes req.query read-only).
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    const issues: Record<string, unknown> = {};
    for (const part of ['body', 'params', 'query'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part]);
      if (!result.success) {
        issues[part] = result.error.issues;
      } else if (part === 'body') {
        req.body = result.data;
      }
    }
    if (Object.keys(issues).length > 0) {
      next(new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', issues));
      return;
    }
    next();
  };
}
