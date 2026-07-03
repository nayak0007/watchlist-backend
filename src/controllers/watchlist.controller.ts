import { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as watchlistService from '../services/watchlist.service';
import { sendSuccess } from '../utils/helpers';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Zod schemas for watchlist validation.
 */
export const createWatchlistSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().default(''),
});

export const updateWatchlistSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const addItemSchema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string().min(1, 'Title is required'),
  posterPath: z.string().optional(),
  backdropPath: z.string().optional(),
  voteAverage: z.number().min(0).max(10).optional(),
  releaseDate: z.string().optional(),
  providers: z.array(z.number()).optional(),
  notes: z.string().max(1000).optional().default(''),
});

export const updateItemSchema = z.object({
  notes: z.string().max(1000),
});

/**
 * GET /api/watchlists
 * Get all watchlists for the authenticated user.
 */
export async function getWatchlists(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const includeItems = (req.query.includeItems as string) === 'true';
    const watchlists = await watchlistService.getWatchlists(req.user!.id, includeItems);
    sendSuccess(res, watchlists);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/watchlists
 * Create a new watchlist.
 */
export async function createWatchlist(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const watchlist = await watchlistService.createWatchlist(req.user!.id, req.body);
    sendSuccess(res, watchlist, undefined, 201);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/watchlists/:id
 * Get a single watchlist with all its items.
 */
export async function getWatchlistDetail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const detail = await watchlistService.getWatchlistDetail(req.params.id as string, req.user!.id);
    sendSuccess(res, detail);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/watchlists/:id
 * Update a watchlist's name or description.
 */
export async function updateWatchlist(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const watchlist = await watchlistService.updateWatchlist(req.params.id as string, req.user!.id, req.body);
    sendSuccess(res, watchlist);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/watchlists/:id
 * Delete a watchlist and all its items.
 */
export async function deleteWatchlist(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await watchlistService.deleteWatchlist(req.params.id as string, req.user!.id);
    sendSuccess(res, { message: 'Watchlist deleted' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/watchlists/:id/items
 * Add an item to a watchlist.
 */
export async function addItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const item = await watchlistService.addWatchlistItem(req.params.id as string, req.user!.id, req.body);
    sendSuccess(res, item, undefined, 201);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/watchlists/:id/items/:itemId
 * Remove an item from a watchlist.
 */
export async function removeItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await watchlistService.removeWatchlistItem(req.params.id as string, req.params.itemId as string, req.user!.id);
    sendSuccess(res, { message: 'Item removed from watchlist' });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/watchlists/:id/items/:itemId
 * Update notes on a watchlist item.
 */
export async function updateItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const item = await watchlistService.updateWatchlistItem(
      req.params.id as string,
      req.params.itemId as string,
      req.user!.id,
      req.body
    );
    sendSuccess(res, item);
  } catch (error) {
    next(error);
  }
}
