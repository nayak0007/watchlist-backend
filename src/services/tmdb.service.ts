import axios, { AxiosInstance } from 'axios';
import NodeCache from 'node-cache';
import { env } from '../config/env';
import { CACHE_TTL, INDIAN_PROVIDER_IDS, INDIAN_PROVIDER_NAMES, buildTmdbImageUrl } from '../config/constants';
import { AppError } from '../middleware/errorHandler';
import {
  MediaItem,
  MediaDetail,
  Person,
  CastMember,
  Provider,
  TrendingQuery,
  SearchQuery,
} from '../models/media';
import { logger } from '../utils/logger';

// Cache for TMDB responses
const cache = new NodeCache({ stdTTL: CACHE_TTL.TMDB_RESPONSE, checkperiod: 60 });

/**
 * Axios instance configured for TMDB API.
 */
const tmdbClient: AxiosInstance = axios.create({
  baseURL: env.tmdbBaseUrl,
  headers: {
    Authorization: `Bearer ${env.tmdbBearerToken}`,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Helper to get cache key.
 */
function cacheKey(endpoint: string, params: Record<string, unknown>): string {
  return `${endpoint}:${JSON.stringify(params)}`;
}

/**
 * Make a TMDB API call with caching and error handling.
 */
async function tmdbGet<T>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
  const key = cacheKey(endpoint, params);
  const cached = cache.get<T>(key);
  if (cached) return cached;

  try {
    const response = await tmdbClient.get<T>(endpoint, {
      params: { ...params, api_key: env.tmdbApiKey },
    });
    cache.set(key, response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.status_message || error.message;
      logger.error(`TMDB API error [${status}]: ${message}`, { endpoint, params });

      if (status === 404) {
        throw new AppError('Resource not found in TMDB', 404, 'TMDB_NOT_FOUND');
      }
      if (status === 429) {
        throw new AppError('TMDB rate limit exceeded', 429, 'TMDB_RATE_LIMIT');
      }
      throw new AppError(`TMDB API error: ${message}`, status || 500, 'TMDB_ERROR');
    }
    throw new AppError('Failed to fetch from TMDB', 500, 'TMDB_ERROR');
  }
}

/**
 * Get streaming providers for a movie or TV show (filtered for Indian providers).
 */
async function getWatchProviders(mediaType: 'movie' | 'tv', tmdbId: number): Promise<Provider[]> {
  try {
    const endpoint = `/${mediaType}/${tmdbId}/watch/providers`;
    const data = await tmdbGet<Record<string, unknown>>(endpoint);
    const results = data.results as Record<string, unknown> | undefined;

    if (!results) return [];

    // Get Indian providers (TMDB region code for India is "IN")
    const indiaProviders = results.IN as Record<string, unknown[]> | undefined;
    if (!indiaProviders) return [];

    const providers: Provider[] = [];
    const providerTypes = ['flatrate', 'rent', 'buy', 'free'] as const;
    const typeMapping: Record<string, Provider['type']> = {
      flatrate: 'subscription',
      rent: 'rent',
      buy: 'buy',
      free: 'free',
    };

    const seenIds = new Set<number>();

    for (const pt of providerTypes) {
      const items = indiaProviders[pt] as Array<{ provider_id: number; provider_name: string; logo_path: string | null }> | undefined;
      if (!items) continue;

      for (const item of items) {
        if (seenIds.has(item.provider_id)) continue;
        seenIds.add(item.provider_id);

        // Only include Indian providers
        if ((INDIAN_PROVIDER_IDS as readonly number[]).includes(item.provider_id)) {
          providers.push({
            providerId: item.provider_id,
            providerName: INDIAN_PROVIDER_NAMES[item.provider_id] || item.provider_name,
            logoPath: buildTmdbImageUrl(item.logo_path, 'w45'),
            type: typeMapping[pt],
          });
        }
      }
    }

    return providers;
  } catch (error) {
    logger.warn(`Failed to fetch providers for ${mediaType}/${tmdbId}:`, error);
    return [];
  }
}

/**
 * Format TMDB movie/TV result into our MediaItem shape.
 */
function formatMediaItem(item: Record<string, unknown>, mediaType: 'movie' | 'tv'): MediaItem {
  const title = mediaType === 'movie' ? (item.title as string) : (item.name as string);
  const releaseDate = mediaType === 'movie' ? (item.release_date as string) : (item.first_air_date as string);

  return {
    id: item.id as number,
    tmdbId: item.id as number,
    title: title || 'Unknown',
    mediaType,
    posterPath: buildTmdbImageUrl(item.poster_path as string | null, 'w342'),
    backdropPath: buildTmdbImageUrl(item.backdrop_path as string | null, 'w780'),
    overview: (item.overview as string) || '',
    releaseDate: releaseDate || '',
    voteAverage: (item.vote_average as number) || 0,
    providers: [],
  };
}

/**
 * Get trending movies and TV shows.
 */
export async function getTrending(query: TrendingQuery) {
  const endpoint = `/trending/${query.mediaType}/${query.timeWindow}`;
  const data = await tmdbGet<{ results: Record<string, unknown>[]; total_pages: number; total_results: number; page: number }>(
    endpoint,
    { page: query.page }
  );

  const results = data.results.map((item) => {
    const mediaType = item.media_type === 'tv' ? 'tv' as const : 'movie' as const;
    return formatMediaItem(item, mediaType);
  });

  return {
    results,
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
  };
}

/**
 * Search for movies, TV shows, or people.
 */
export async function searchMedia(query: SearchQuery) {
  const endpoint = query.type === 'multi' ? '/search/multi' : `/search/${query.type}`;
  const data = await tmdbGet<{ results: Record<string, unknown>[]; total_pages: number; total_results: number; page: number }>(
    endpoint,
    { query: query.query, page: query.page, include_adult: false }
  );

  const results = data.results
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv' || item.media_type === 'person')
    .map((item) => {
      if (item.media_type === 'person') {
        return {
          id: item.id as number,
          tmdbId: item.id as number,
          title: (item.name as string) || 'Unknown',
          mediaType: 'person' as const,
          posterPath: buildTmdbImageUrl(item.profile_path as string | null, 'w185'),
          backdropPath: null,
          overview: (item.known_for_department as string) || '',
          releaseDate: '',
          voteAverage: (item.popularity as number) || 0,
          providers: [],
        };
      }
      const mediaType = item.media_type === 'tv' ? 'tv' as const : 'movie' as const;
      return formatMediaItem(item, mediaType);
    });

  return {
    results,
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
  };
}

/**
 * Get detailed information about a movie, including streaming providers.
 */
export async function getMovieDetail(movieId: number): Promise<MediaDetail> {
  const movie = await tmdbGet<Record<string, unknown>>(`/movie/${movieId}`, {
    append_to_response: 'credits,similar',
  });

  const credits = movie.credits as Record<string, unknown[]> || {};
  const similar = movie.similar as Record<string, unknown[]> || {};

  const cast: CastMember[] = (credits.cast as Record<string, unknown>[] || []).slice(0, 20).map((c: Record<string, unknown>) => ({
    id: c.id as number,
    name: c.name as string,
    character: c.character as string,
    profilePath: buildTmdbImageUrl(c.profile_path as string | null, 'w185'),
  }));

  const crewList = credits.crew as Record<string, unknown>[] || [];
  const director = crewList.find((c) => c.job === 'Director');

  const providers = await getWatchProviders('movie', movieId);

  const similarResults = (similar.results as Record<string, unknown>[] || []).slice(0, 10).map(
    (s: Record<string, unknown>) => formatMediaItem(s, 'movie')
  );

  return {
    id: movie.id as number,
    tmdbId: movie.id as number,
    title: (movie.title as string) || '',
    mediaType: 'movie',
    posterPath: buildTmdbImageUrl(movie.poster_path as string | null, 'w500'),
    backdropPath: buildTmdbImageUrl(movie.backdrop_path as string | null, 'w1280'),
    overview: (movie.overview as string) || '',
    releaseDate: (movie.release_date as string) || '',
    voteAverage: (movie.vote_average as number) || 0,
    tagline: movie.tagline as string,
    runtime: movie.runtime as number,
    genres: ((movie.genres as Array<{ name: string }>) || []).map((g) => g.name),
    director: director
      ? {
          id: director.id as number,
          tmdbId: director.id as number,
          name: director.name as string,
          biography: '',
          birthday: null,
          deathday: null,
          profilePath: buildTmdbImageUrl(director.profile_path as string | null, 'w185'),
          knownForDepartment: 'Directing',
          alsoKnownAs: [],
          filmography: [],
        }
      : null,
    cast,
    crew: crewList.slice(0, 20).map((c: Record<string, unknown>) => ({
      id: c.id as number,
      name: c.name as string,
      job: c.job as string,
      department: c.department as string,
      profilePath: buildTmdbImageUrl(c.profile_path as string | null, 'w185'),
    })),
    similar: similarResults,
    providers,
  };
}

/**
 * Get detailed information about a TV show, including streaming providers.
 */
export async function getTvDetail(tvId: number): Promise<MediaDetail> {
  const show = await tmdbGet<Record<string, unknown>>(`/tv/${tvId}`, {
    append_to_response: 'credits,similar',
  });

  const credits = show.credits as Record<string, unknown[]> || {};
  const similar = show.similar as Record<string, unknown[]> || {};

  const cast: CastMember[] = (credits.cast as Record<string, unknown>[] || []).slice(0, 20).map((c: Record<string, unknown>) => ({
    id: c.id as number,
    name: c.name as string,
    character: c.character as string,
    profilePath: buildTmdbImageUrl(c.profile_path as string | null, 'w185'),
  }));

  const crewList = credits.crew as Record<string, unknown>[] || [];
  const director = crewList.find((c) => c.job === 'Director' || c.job === 'Executive Producer');

  const providers = await getWatchProviders('tv', tvId);

  const similarResults = (similar.results as Record<string, unknown>[] || []).slice(0, 10).map(
    (s: Record<string, unknown>) => formatMediaItem(s, 'tv')
  );

  return {
    id: show.id as number,
    tmdbId: show.id as number,
    title: (show.name as string) || '',
    mediaType: 'tv',
    posterPath: buildTmdbImageUrl(show.poster_path as string | null, 'w500'),
    backdropPath: buildTmdbImageUrl(show.backdrop_path as string | null, 'w1280'),
    overview: (show.overview as string) || '',
    releaseDate: (show.first_air_date as string) || '',
    voteAverage: (show.vote_average as number) || 0,
    tagline: show.tagline as string,
    runtime: (show.episode_run_time as number[])?.[0] || 0,
    genres: ((show.genres as Array<{ name: string }>) || []).map((g) => g.name),
    director: director
      ? {
          id: director.id as number,
          tmdbId: director.id as number,
          name: director.name as string,
          biography: '',
          birthday: null,
          deathday: null,
          profilePath: buildTmdbImageUrl(director.profile_path as string | null, 'w185'),
          knownForDepartment: 'Directing',
          alsoKnownAs: [],
          filmography: [],
        }
      : null,
    cast,
    crew: crewList.slice(0, 20).map((c: Record<string, unknown>) => ({
      id: c.id as number,
      name: c.name as string,
      job: c.job as string,
      department: c.department as string,
      profilePath: buildTmdbImageUrl(c.profile_path as string | null, 'w185'),
    })),
    similar: similarResults,
    providers,
  };
}

/**
 * Get detailed information about a person (actor/director).
 */
export async function getPersonDetail(personId: number): Promise<Person> {
  const person = await tmdbGet<Record<string, unknown>>(`/person/${personId}`, {
    append_to_response: 'combined_credits',
  });

  const credits = person.combined_credits as Record<string, unknown[]> || {};
  const allCredits = credits.cast as Record<string, unknown>[] || [];

  // Sort by popularity and take top 20
  allCredits.sort((a, b) => ((b.popularity as number) || 0) - ((a.popularity as number) || 0));

  const filmography = allCredits.slice(0, 20).map((c: Record<string, unknown>) => {
    const mediaType = c.media_type === 'tv' ? 'tv' as const : 'movie' as const;
    const title = mediaType === 'movie' ? (c.title as string) : (c.name as string);
    const releaseDate = mediaType === 'movie' ? (c.release_date as string) : (c.first_air_date as string);

    return {
      id: c.id as number,
      tmdbId: c.id as number,
      title: title || 'Unknown',
      mediaType,
      posterPath: buildTmdbImageUrl(c.poster_path as string | null, 'w185'),
      backdropPath: null,
      overview: '',
      releaseDate: releaseDate || '',
      voteAverage: 0,
      providers: [],
    };
  });

  return {
    id: person.id as number,
    tmdbId: person.id as number,
    name: (person.name as string) || '',
    biography: (person.biography as string) || '',
    birthday: (person.birthday as string) || null,
    deathday: (person.deathday as string) || null,
    profilePath: buildTmdbImageUrl(person.profile_path as string | null, 'w500'),
    knownForDepartment: (person.known_for_department as string) || '',
    alsoKnownAs: (person.also_known_as as string[]) || [],
    filmography,
  };
}

/**
 * Get list of Indian streaming providers.
 */
export async function getProvidersList() {
  // Cache providers data more aggressively
  const cacheKey = 'providers_list';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const data = await tmdbGet<{ results: Array<{ provider_id: number; provider_name: string; logo_path: string | null; display_priority: number }> }>(
      '/watch/providers/movie',
      { watch_region: 'IN' }
    );

    const providers = data.results
      .filter((p) => (INDIAN_PROVIDER_IDS as readonly number[]).includes(p.provider_id))
      .map((p) => ({
        providerId: p.provider_id,
        providerName: INDIAN_PROVIDER_NAMES[p.provider_id] || p.provider_name,
        logoPath: buildTmdbImageUrl(p.logo_path, 'w45'),
        displayPriority: p.display_priority,
      }))
      .sort((a, b) => a.displayPriority - b.displayPriority);

    cache.set(cacheKey, providers, CACHE_TTL.PROVIDERS);
    return providers;
  } catch (error) {
    // Fallback if TMDB provider endpoint fails
    const fallback = (INDIAN_PROVIDER_IDS as readonly number[]).map((id) => ({
      providerId: id,
      providerName: INDIAN_PROVIDER_NAMES[id] || `Provider ${id}`,
      logoPath: null,
      displayPriority: id,
    }));
    cache.set(cacheKey, fallback, CACHE_TTL.PROVIDERS);
    return fallback;
  }
}

/**
 * Clear all cached TMDB data (useful for admin refresh).
 */
export function clearTmdbCache(): void {
  cache.flushAll();
  logger.info('TMDB cache cleared');
}
