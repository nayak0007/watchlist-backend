import { Request, Response, NextFunction } from 'express';
import * as tmdbService from '../services/tmdb.service';
import * as geminiService from '../services/gemini.service';
import { sendSuccess } from '../utils/helpers';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { getSupabaseAdmin } from '../config/database';
import { AppError } from '../middleware/errorHandler';

/**
 * Zod schemas for Gemini endpoints.
 */
export const enrichSchema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string().min(1),
});

export const recommendSchema = z.object({
  watchlistId: z.string().uuid(),
});

/**
 * GET /api/providers
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

/**
 * POST /api/gemini/enrich
 * Get AI-powered enrichment for a piece of media.
 */
export async function enrichMedia(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, mediaType, tmdbId } = enrichSchema.parse(req.body);
    const enrichment = await geminiService.enrichMedia(title, mediaType, tmdbId);
    sendSuccess(res, enrichment);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/gemini/recommend
 * Get AI-powered recommendations based on a user's watchlist.
 */
export async function getRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { watchlistId } = recommendSchema.parse(req.body);

    // Fetch watchlist items
    const supabase = getSupabaseAdmin();
    const { data: items } = await supabase
      .from('watchlist_items')
      .select('title, media_type')
      .eq('watchlist_id', watchlistId);

    if (!items || items.length === 0) {
      throw new AppError('Watchlist is empty', 400, 'EMPTY_WATCHLIST');
    }

    const formattedItems = items.map((i) => ({
      title: i.title,
      mediaType: i.media_type as 'movie' | 'tv',
    }));

    const recommendations = await geminiService.getRecommendations(formattedItems);
    sendSuccess(res, { recommendations });
  } catch (error) {
    next(error);
  }
}
