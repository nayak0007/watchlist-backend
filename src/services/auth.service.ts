import { getSupabaseAdmin } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthSession, SignupRequest, LoginRequest } from '../models/user';
import { logger } from '../utils/logger';

/**
 * Create a new user account via Supabase Auth.
 */
export async function signupUser(request: SignupRequest): Promise<AuthSession> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.auth.admin.createUser({
    email: request.email,
    password: request.password,
    email_confirm: true, // Auto-confirm email for dev; change in production
    user_metadata: {
      displayName: request.displayName,
    },
  });

  if (error) {
    logger.error('Signup error:', error);
    throw new AppError(error.message, 400, 'SIGNUP_FAILED');
  }

  if (!data.user) {
    throw new AppError('Failed to create user', 500, 'SIGNUP_FAILED');
  }

  // Sign the user in to generate a session
  const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
    email: request.email,
    password: request.password,
  });

  if (sessionError || !sessionData.session) {
    throw new AppError('Account created but failed to sign in', 500, 'SESSION_ERROR');
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? '',
      displayName: request.displayName,
    },
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
  };
}

/**
 * Sign in an existing user.
 */
export async function loginUser(request: LoginRequest): Promise<AuthSession> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: request.email,
    password: request.password,
  });

  if (error) {
    logger.error('Login error:', error);
    throw new AppError('Invalid email or password', 401, 'LOGIN_FAILED');
  }

  if (!data.session || !data.user) {
    throw new AppError('Failed to create session', 500, 'SESSION_ERROR');
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? '',
      displayName: data.user.user_metadata?.displayName ?? '',
    },
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

/**
 * Refresh an expired access token.
 */
export async function refreshToken(refreshToken: string): Promise<AuthSession> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session || !data.user) {
    throw new AppError('Failed to refresh token', 401, 'REFRESH_FAILED');
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? '',
      displayName: data.user.user_metadata?.displayName ?? '',
    },
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

/**
 * Sign out a user by revoking their session.
 */
export async function logoutUser(accessToken: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.auth.admin.signOut(accessToken);

  if (error) {
    logger.error('Logout error:', error);
    throw new AppError('Failed to logout', 500, 'LOGOUT_FAILED');
  }
}

/**
 * Get user profile by ID.
 */
export async function getUserProfile(userId: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new AppError('User profile not found', 404, 'USER_NOT_FOUND');
  }

  return {
    id: data.id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
