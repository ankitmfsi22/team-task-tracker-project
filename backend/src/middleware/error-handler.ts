import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ErrorResponse } from '@team-task-tracker/shared';
import { AppError } from '../errors.js';

const body = (code: string, message: string, details?: unknown): ErrorResponse => ({
  error: details === undefined ? { code, message } : { code, message, details },
});

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(body('NOT_FOUND', 'Resource not found'));
};

// Malformed JSON bodies are raised by express.json() with a 400 status and type 'entity.parse.failed'.
const isBodyParseError = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  (err as { type?: unknown }).type === 'entity.parse.failed';

// Express identifies error handlers by their four parameters, so the unused `_next` must stay.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- DEV-1006
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json(body(err.code, err.message, err.details));
    return;
  }
  if (isBodyParseError(err)) {
    res.status(400).json(body('VALIDATION_ERROR', 'Malformed JSON body'));
    return;
  }
  res.status(500).json(body('INTERNAL_ERROR', 'Internal server error'));
};
