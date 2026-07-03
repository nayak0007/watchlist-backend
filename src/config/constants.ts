import { env } from './env';

/**
 * App-wide constants and helpers.
 */

export const API_PREFIX = '/api';

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const TMDB_IMAGE_SIZES = {
  poster: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    original: 'original',
  },
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original',
  },
  profile: {
    small: 'w45',
    medium: 'w185',
    large: 'h632',
    original: 'original',
  },
} as const;

/**
 * Build a full TMDB image URL from a path and size.
 */
export function buildTmdbImageUrl(path: string | null, size: string): string | null {
  if (!path) return null;
  return `${env.tmdbImageBaseUrl}/${size}${path}`;
}

/**
 * Indian streaming provider IDs as per TMDB watch provider IDs.
 * Used to filter providers to only those relevant for Indian users.
 */
export const INDIAN_PROVIDER_IDS = [
  8,    // Netflix
  119,  // Amazon Prime Video
  237,  // Disney+ Hotstar
  309,  // Zee5
  311,  // SonyLIV
  362,  // JioCinema
  350,  // Apple TV+
  529,  // MX Player
  542,  // Lionsgate Play
  540,  // Voot
] as const;

export const INDIAN_PROVIDER_NAMES: Record<number, string> = {
  8: 'Netflix',
  119: 'Amazon Prime Video',
  237: 'Disney+ Hotstar',
  309: 'Zee5',
  311: 'SonyLIV',
  362: 'JioCinema',
  350: 'Apple TV+',
  529: 'MX Player',
  542: 'Lionsgate Play',
  540: 'Voot',
};

export const CACHE_TTL = {
  TMDB_RESPONSE: 300,        // 5 minutes
  TRENDING: 600,             // 10 minutes
  PROVIDERS: 3600,           // 1 hour
} as const;
