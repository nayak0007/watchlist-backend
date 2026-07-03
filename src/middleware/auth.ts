import { Request, Response, NextFunction } from 'express';
import { verifySupabaseToken } from '../config/database';
import { sendError } from '../utils/helpers';
import { logger } from '../utils/logger';

/**
 * Extends Express Request with authenticated user info.
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Authentication middleware that verifies the Supabase JWT from the Authorization header.
 * Attaches the authenticated user to req.user on success.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      sendError(res, 'AUTH_REQUIRED', 'Authentication required', 401);
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      sendError(res, 'INVALID_TOKEN', 'Invalid authorization header format', 401);
      return;
    }

    const token = parts[1];
    const user = await verifySupabaseToken(token);

    if (!user) {
      sendError(res, 'INVALID_TOKEN', 'Invalid or expired token', 401);
      return;
    }

    req.user = {
      id: user.id,
      email: user.email ?? '',
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    sendError(res, 'AUTH_ERROR', 'Authentication failed', 500);
  }
}

/**
 * Optional authentication middleware.
 * Attaches user info if a valid token is provided, but does not block unauthenticated requests.
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const user = await verifySupabaseToken(parts[1]);
        if (user) {
          req.user = {
            id: user.id,
            email: user.email ?? '',
          };
        }
      }
    }
  } catch {
    // Silently ignore auth errors for optional auth
  }

  next();
}
