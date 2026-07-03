import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as tmdbService from '../services/tmdb.service';
import { sendSuccess, sendError } from '../utils/helpers';

/**
 * Zod schemas for query parameter validation.
 */
export const trendingQuerySchema = z.object({
  mediaType: z.enum(['all', 'movie', 'tv', 'person']).default('all'),
  timeWindow: z.enum(['day', 'week']).default('week'),
  page: z.coerce.number().int().min(1).default(1),
});

export const searchQuerySchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200),
  type: z.enum(['movie', 'tv', 'person', 'multi']).default('multi'),
  page: z.coerce.number().int().min(1).default(1),
});

/**
 * GET /api/media/trending
 * Get trending movies and TV shows.
 */
export async function getTrending(req: Request, res: Response, next: NextFunction) {
  try {
    const query = trendingQuerySchema.parse(req.query);
    const result = await tmdbService.getTrending(query);
    sendSuccess(res, result.results, {
      page: result.page,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/media/search
 * Search for movies, TV shows, or people.
 */
export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const query = searchQuerySchema.parse(req.query);
    const result = await tmdbService.searchMedia(query);
    sendSuccess(res, result.results, {
      page: result.page,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/media/movie/:id
 * Get detailed movie information.
 */
export async function getMovieDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const movieId = parseInt(req.params.id as string, 10);
    if (isNaN(movieId)) {
      sendError(res, 'INVALID_ID', 'Invalid movie ID', 400);
      return;
    }
    const detail = await tmdbService.getMovieDetail(movieId);
    sendSuccess(res, detail);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/media/tv/:id
 * Get detailed TV show information.
 */
export async function getTvDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const tvId = parseInt(req.params.id as string, 10);
    if (isNaN(tvId)) {
      sendError(res, 'INVALID_ID', 'Invalid TV show ID', 400);
      return;
    }
    const detail = await tmdbService.getTvDetail(tvId);
    sendSuccess(res, detail);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/media/person/:id
 * Get detailed person (actor/director) information.
 */
export async function getPersonDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const personId = parseInt(req.params.id as string, 10);
    if (isNaN(personId)) {
      sendError(res, 'INVALID_ID', 'Invalid person ID', 400);
      return;
    }
    const detail = await tmdbService.getPersonDetail(personId);
    sendSuccess(res, detail);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/media/providers
 * Get list of Indian streaming providers.
 */
export async function getProviders(_req: Request, res: Response, next: NextFunction) {
  try {
    const providers = await tmdbService.getProvidersList();
    sendSuccess(res, providers);
  } catch (error) {
    next(error);
  }
}
