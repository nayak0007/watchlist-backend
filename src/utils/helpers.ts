import { Response } from 'express';

/**
 * Send a success response with optional metadata.
 */
export function sendSuccess<T>(res: Response, data: T, meta?: Record<string, unknown>, statusCode = 200) {
  const response: Record<string, unknown> = {
    success: true,
    data,
  };
  if (meta) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
}

/**
 * Send an error response.
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details: Record<string, unknown> = {}
) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
}

/**
 * Extract pagination params from query string with defaults.
 */
export function getPaginationParams(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || 20));
  return { page, limit };
}

/**
 * A safe JSON parse that won't throw.
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate text to a maximum length.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
