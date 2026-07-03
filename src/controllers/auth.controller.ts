import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { sendSuccess } from '../utils/helpers';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Zod schemas for auth request validation.
 */
export const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(50),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * POST /api/auth/signup
 * Create a new user account.
 */
export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.signupUser(req.body);
    sendSuccess(res, result, undefined, 201);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Sign in an existing user.
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.loginUser(req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Sign out the current user.
 */
export async function logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await authService.logoutUser(token);
    }
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 * Refresh an expired access token.
 */
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.refreshToken(req.body.refreshToken);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Get the currently authenticated user's profile.
 */
export async function getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await authService.getUserProfile(req.user!.id);
    sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
}
