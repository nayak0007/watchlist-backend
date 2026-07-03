import { getSupabaseAdmin } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import {
  Watchlist,
  WatchlistDetail,
  WatchlistItem,
  CreateWatchlistRequest,
  UpdateWatchlistRequest,
  AddWatchlistItemRequest,
  UpdateWatchlistItemRequest,
} from '../models/watchlist';
import { logger } from '../utils/logger';

/**
 * Get all watchlists for a user with item counts and preview thumbnails.
 */
export async function getWatchlists(userId: string, includeItems = false): Promise<Watchlist[]> {
  const supabase = getSupabaseAdmin();

  const { data: watchlists, error } = await supabase
    .from('watchlists')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch watchlists:', error);
    throw new AppError('Failed to fetch watchlists', 500, 'DB_ERROR');
  }

  const result: Watchlist[] = [];

  for (const w of watchlists) {
    // Get item count
    const { count, error: countError } = await supabase
      .from('watchlist_items')
      .select('*', { count: 'exact', head: true })
      .eq('watchlist_id', w.id);

    const itemCount = countError ? 0 : (count || 0);

    let previewItems: Watchlist['previewItems'] = [];

    if (includeItems && itemCount > 0) {
      const { data: items } = await supabase
        .from('watchlist_items')
        .select('tmdb_id, poster_path, media_type')
        .eq('watchlist_id', w.id)
        .order('added_at', { ascending: false })
        .limit(3);

      previewItems = (items || []).map((i) => ({
        tmdbId: i.tmdb_id,
        posterPath: i.poster_path,
        mediaType: i.media_type as 'movie' | 'tv',
      }));
    }

    result.push({
      id: w.id,
      userId: w.user_id,
      name: w.name,
      description: w.description || '',
      itemCount,
      previewItems,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
    });
  }

  return result;
}

/**
 * Get a single watchlist with all its items.
 */
export async function getWatchlistDetail(watchlistId: string, userId: string): Promise<WatchlistDetail> {
  const supabase = getSupabaseAdmin();

  // Verify ownership
  const { data: watchlist, error: fetchError } = await supabase
    .from('watchlists')
    .select('*')
    .eq('id', watchlistId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !watchlist) {
    throw new AppError('Watchlist not found', 404, 'WATCHLIST_NOT_FOUND');
  }

  const { data: items, error: itemsError } = await supabase
    .from('watchlist_items')
    .select('*')
    .eq('watchlist_id', watchlistId)
    .order('added_at', { ascending: false });

  if (itemsError) {
    logger.error('Failed to fetch watchlist items:', itemsError);
    throw new AppError('Failed to fetch watchlist items', 500, 'DB_ERROR');
  }

  const mappedItems: WatchlistItem[] = (items || []).map((item) => ({
    id: item.id,
    watchlistId: item.watchlist_id,
    tmdbId: item.tmdb_id,
    mediaType: item.media_type as 'movie' | 'tv',
    title: item.title,
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    voteAverage: item.vote_average,
    releaseDate: item.release_date,
    providers: item.providers || [],
    notes: item.notes || '',
    addedAt: item.added_at,
  }));

  return {
    id: watchlist.id,
    name: watchlist.name,
    description: watchlist.description || '',
    itemCount: mappedItems.length,
    items: mappedItems,
    createdAt: watchlist.created_at,
    updatedAt: watchlist.updated_at,
  };
}

/**
 * Create a new watchlist.
 */
export async function createWatchlist(userId: string, request: CreateWatchlistRequest): Promise<Watchlist> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('watchlists')
    .insert({
      user_id: userId,
      name: request.name,
      description: request.description || '',
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create watchlist:', error);
    throw new AppError('Failed to create watchlist', 500, 'DB_ERROR');
  }

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    description: data.description || '',
    itemCount: 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Update a watchlist's name or description.
 */
export async function updateWatchlist(
  watchlistId: string,
  userId: string,
  request: UpdateWatchlistRequest
): Promise<Watchlist> {
  const supabase = getSupabaseAdmin();

  // Verify ownership
  const { data: existing } = await supabase
    .from('watchlists')
    .select('*')
    .eq('id', watchlistId)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    throw new AppError('Watchlist not found', 404, 'WATCHLIST_NOT_FOUND');
  }

  const updates: Record<string, string> = {};
  if (request.name !== undefined) updates.name = request.name;
  if (request.description !== undefined) updates.description = request.description;

  if (Object.keys(updates).length === 0) {
    throw new AppError('No fields to update', 400, 'NO_UPDATES');
  }

  const { data, error } = await supabase
    .from('watchlists')
    .update(updates)
    .eq('id', watchlistId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update watchlist:', error);
    throw new AppError('Failed to update watchlist', 500, 'DB_ERROR');
  }

  // Get item count
  const { count } = await supabase
    .from('watchlist_items')
    .select('*', { count: 'exact', head: true })
    .eq('watchlist_id', watchlistId);

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    description: data.description || '',
    itemCount: count || 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Delete a watchlist and all its items.
 */
export async function deleteWatchlist(watchlistId: string, userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Verify ownership
  const { data: existing } = await supabase
    .from('watchlists')
    .select('id')
    .eq('id', watchlistId)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    throw new AppError('Watchlist not found', 404, 'WATCHLIST_NOT_FOUND');
  }

  // Delete items first (cascade should handle this, but explicit is safer)
  await supabase
    .from('watchlist_items')
    .delete()
    .eq('watchlist_id', watchlistId);

  const { error } = await supabase
    .from('watchlists')
    .delete()
    .eq('id', watchlistId)
    .eq('user_id', userId);

  if (error) {
    logger.error('Failed to delete watchlist:', error);
    throw new AppError('Failed to delete watchlist', 500, 'DB_ERROR');
  }
}

/**
 * Add an item to a watchlist.
 */
export async function addWatchlistItem(
  watchlistId: string,
  userId: string,
  request: AddWatchlistItemRequest
): Promise<WatchlistItem> {
  const supabase = getSupabaseAdmin();

  // Verify ownership
  const { data: existing } = await supabase
    .from('watchlists')
    .select('id')
    .eq('id', watchlistId)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    throw new AppError('Watchlist not found', 404, 'WATCHLIST_NOT_FOUND');
  }

  const { data, error } = await supabase
    .from('watchlist_items')
    .insert({
      watchlist_id: watchlistId,
      tmdb_id: request.tmdbId,
      media_type: request.mediaType,
      title: request.title,
      poster_path: request.posterPath || null,
      backdrop_path: request.backdropPath || null,
      vote_average: request.voteAverage || null,
      release_date: request.releaseDate || null,
      providers: request.providers || [],
      notes: request.notes || '',
    })
    .select()
    .single();

  if (error) {
    // Handle duplicate
    if (error.code === '23505') {
      throw new AppError('Item already exists in this watchlist', 409, 'DUPLICATE_ITEM');
    }
    logger.error('Failed to add watchlist item:', error);
    throw new AppError('Failed to add item to watchlist', 500, 'DB_ERROR');
  }

  return {
    id: data.id,
    watchlistId: data.watchlist_id,
    tmdbId: data.tmdb_id,
    mediaType: data.media_type as 'movie' | 'tv',
    title: data.title,
    posterPath: data.poster_path,
    backdropPath: data.backdrop_path,
    voteAverage: data.vote_average,
    releaseDate: data.release_date,
    providers: data.providers || [],
    notes: data.notes || '',
    addedAt: data.added_at,
  };
}

/**
 * Remove an item from a watchlist.
 */
export async function removeWatchlistItem(
  watchlistId: string,
  itemId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Verify ownership via watchlist
  const { data: existing } = await supabase
    .from('watchlists')
    .select('id')
    .eq('id', watchlistId)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    throw new AppError('Watchlist not found', 404, 'WATCHLIST_NOT_FOUND');
  }

  const { error } = await supabase
    .from('watchlist_items')
    .delete()
    .eq('id', itemId)
    .eq('watchlist_id', watchlistId);

  if (error) {
    logger.error('Failed to remove watchlist item:', error);
    throw new AppError('Failed to remove item from watchlist', 500, 'DB_ERROR');
  }
}

/**
 * Update notes on a watchlist item.
 */
export async function updateWatchlistItem(
  watchlistId: string,
  itemId: string,
  userId: string,
  request: UpdateWatchlistItemRequest
): Promise<WatchlistItem> {
  const supabase = getSupabaseAdmin();

  // Verify ownership via watchlist
  const { data: existing } = await supabase
    .from('watchlists')
    .select('id')
    .eq('id', watchlistId)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    throw new AppError('Watchlist not found', 404, 'WATCHLIST_NOT_FOUND');
  }

  const { data, error } = await supabase
    .from('watchlist_items')
    .update({ notes: request.notes || '' })
    .eq('id', itemId)
    .eq('watchlist_id', watchlistId)
    .select()
    .single();

  if (error || !data) {
    logger.error('Failed to update watchlist item:', error);
    throw new AppError('Failed to update watchlist item', 500, 'DB_ERROR');
  }

  return {
    id: data.id,
    watchlistId: data.watchlist_id,
    tmdbId: data.tmdb_id,
    mediaType: data.media_type as 'movie' | 'tv',
    title: data.title,
    posterPath: data.poster_path,
    backdropPath: data.backdrop_path,
    voteAverage: data.vote_average,
    releaseDate: data.release_date,
    providers: data.providers || [],
    notes: data.notes || '',
    addedAt: data.added_at,
  };
}
