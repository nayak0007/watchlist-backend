/**
 * Watchlist-related type definitions.
 */

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  description: string;
  itemCount: number;
  previewItems?: WatchlistItemPreview[];
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistItemPreview {
  tmdbId: number;
  posterPath: string | null;
  mediaType: 'movie' | 'tv';
}

export interface WatchlistItem {
  id: string;
  watchlistId: string;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number | null;
  releaseDate: string | null;
  providers: number[];
  notes: string;
  addedAt: string;
}

export interface WatchlistDetail {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  items: WatchlistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWatchlistRequest {
  name: string;
  description?: string;
}

export interface UpdateWatchlistRequest {
  name?: string;
  description?: string;
}

export interface AddWatchlistItemRequest {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath?: string;
  backdropPath?: string;
  voteAverage?: number;
  releaseDate?: string;
  providers?: number[];
  notes?: string;
}

export interface UpdateWatchlistItemRequest {
  notes?: string;
}
