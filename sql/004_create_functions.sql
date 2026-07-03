-- 004_create_functions.sql
-- Helper functions for the WatchList application
-- Run this fourth in the Supabase SQL Editor

-- ============================================
-- Get watchlists with item counts
-- ============================================
CREATE OR REPLACE FUNCTION public.get_watchlists_with_counts(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  item_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.name,
    w.description,
    COUNT(wi.id)::BIGINT AS item_count,
    w.created_at,
    w.updated_at
  FROM public.watchlists w
  LEFT JOIN public.watchlist_items wi ON wi.watchlist_id = w.id
  WHERE w.user_id = p_user_id
  GROUP BY w.id, w.name, w.description, w.created_at, w.updated_at
  ORDER BY w.updated_at DESC;
END;
$$;

-- ============================================
-- Get watchlist with all items (with media preview data)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_watchlist_detail(p_watchlist_id UUID, p_user_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  item_count BIGINT,
  items JSON,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.watchlists
    WHERE watchlists.id = p_watchlist_id
      AND watchlists.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Watchlist not found or access denied' USING HINT = 'Check watchlist ownership';
  END IF;

  RETURN QUERY
  SELECT
    w.id,
    w.name,
    w.description,
    COUNT(wi.id)::BIGINT AS item_count,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', wi.id,
          'tmdbId', wi.tmdb_id,
          'mediaType', wi.media_type,
          'title', wi.title,
          'posterPath', wi.poster_path,
          'backdropPath', wi.backdrop_path,
          'voteAverage', wi.vote_average,
          'releaseDate', wi.release_date,
          'providers', wi.providers,
          'notes', wi.notes,
          'addedAt', wi.added_at
        ) ORDER BY wi.added_at DESC
      ) FILTER (WHERE wi.id IS NOT NULL),
      '[]'::JSON
    ) AS items,
    w.created_at,
    w.updated_at
  FROM public.watchlists w
  LEFT JOIN public.watchlist_items wi ON wi.watchlist_id = w.id
  WHERE w.id = p_watchlist_id AND w.user_id = p_user_id
  GROUP BY w.id, w.name, w.description, w.created_at, w.updated_at;
END;
$$;
