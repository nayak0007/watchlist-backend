import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { sendError } from '../utils/helpers';

/**
 * Custom application error with HTTP status code.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: Record<string, unknown>;

  constructor(message: string, statusCode = 400, code = 'APP_ERROR', details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Global error handler middleware.
 * Must have 4 parameters for Express to recognize it as an error handler.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    sendError(res, 'VALIDATION_ERROR', 'Request validation failed', 400, { errors: details });
    return;
  }

  // Custom application errors
  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  // Unknown errors
  logger.error('Unhandled error:', { error: err.message, stack: err.stack });
  sendError(
    res,
    'INTERNAL_ERROR',
    'An unexpected error occurred',
    500
  );
}
