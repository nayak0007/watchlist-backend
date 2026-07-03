import dotenv from 'dotenv';
import path from 'path';

// Load .env file from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
  // Server
  port: number;
  nodeEnv: string;

  // Supabase
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseAnonKey: string;

  // TMDB
  tmdbApiKey: string;
  tmdbBearerToken: string;
  tmdbBaseUrl: string;
  tmdbImageBaseUrl: string;

  // Gemini
  geminiApiKey: string;
  geminiModel: string;

  // CORS
  corsOrigin: string;

  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMax: number;

  // Logging
  logLevel: string;
}

function getEnvVar(key: string, required = true): string {
  const value = process.env[key];
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ?? '';
}

export const env: EnvConfig = {
  // Server
  port: parseInt(getEnvVar('PORT', false) || '3000', 10),
  nodeEnv: getEnvVar('NODE_ENV', false) || 'development',

  // Supabase
  supabaseUrl: getEnvVar('SUPABASE_URL'),
  supabaseServiceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseAnonKey: getEnvVar('SUPABASE_ANON_KEY', false) || '',

  // TMDB
  tmdbApiKey: getEnvVar('TMDB_API_KEY'),
  tmdbBearerToken: getEnvVar('TMDB_BEARER_TOKEN', false) || '',
  tmdbBaseUrl: getEnvVar('TMDB_BASE_URL', false) || 'https://api.themoviedb.org/3',
  tmdbImageBaseUrl: getEnvVar('TMDB_IMAGE_BASE_URL', false) || 'https://image.tmdb.org/t/p',

  // Gemini
  geminiApiKey: getEnvVar('GEMINI_API_KEY', false) || '',
  geminiModel: getEnvVar('GEMINI_MODEL', false) || 'gemini-2.0-flash',

  // CORS
  corsOrigin: getEnvVar('CORS_ORIGIN', false) || '*',

  // Rate Limiting
  rateLimitWindowMs: parseInt(getEnvVar('RATE_LIMIT_WINDOW_MS', false) || '900000', 10),
  rateLimitMax: parseInt(getEnvVar('RATE_LIMIT_MAX', false) || '100', 10),

  // Logging
  logLevel: getEnvVar('LOG_LEVEL', false) || 'info',
};
