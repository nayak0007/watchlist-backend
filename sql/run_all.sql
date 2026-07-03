-- run_all.sql
-- Master migration script — run all SQL files in order
-- Execute this in the Supabase SQL Editor to set up the entire database schema
--
-- Usage: Copy and paste the entire file into Supabase SQL Editor and run.
-- Or run via psql: psql $DATABASE_URL -f run_all.sql

-- ============================================
-- Migration 001: Users & Profiles
-- ============================================
-- Extends auth.users with a public profiles table
-- Creates trigger to auto-create profile on signup
-- ============================================
-- BEGIN 001
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'displayName', split_part(NEW.email, '@', 1)),
    NULL
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
-- END 001

-- ============================================
-- Migration 002: Watchlists table
-- ============================================
-- BEGIN 002
CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);

ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watchlists_select_own" ON public.watchlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "watchlists_insert_own" ON public.watchlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlists_update_own" ON public.watchlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "watchlists_delete_own" ON public.watchlists FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE TRIGGER on_watchlist_updated
  BEFORE UPDATE ON public.watchlists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
-- END 002

-- ============================================
-- Migration 003: Watchlist Items table
-- ============================================
-- BEGIN 003
CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES public.watchlists(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  poster_path TEXT,
  backdrop_path TEXT,
  vote_average DECIMAL(3,1),
  release_date TEXT,
  providers INTEGER[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON public.watchlist_items(watchlist_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_items_unique ON public.watchlist_items(watchlist_id, tmdb_id, media_type);

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "items_select_own" ON public.watchlist_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND watchlists.user_id = auth.uid()));

CREATE POLICY "items_insert_own" ON public.watchlist_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND watchlists.user_id = auth.uid()));

CREATE POLICY "items_update_own" ON public.watchlist_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND watchlists.user_id = auth.uid()));

CREATE POLICY "items_delete_own" ON public.watchlist_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND watchlists.user_id = auth.uid()));
-- END 003

-- ============================================
-- Migration 004: Helper Functions
-- ============================================
-- BEGIN 004
CREATE OR REPLACE FUNCTION public.get_watchlists_with_counts(p_user_id UUID)
RETURNS TABLE(id UUID, name TEXT, description TEXT, item_count BIGINT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.name, w.description, COUNT(wi.id)::BIGINT AS item_count, w.created_at, w.updated_at
  FROM public.watchlists w
  LEFT JOIN public.watchlist_items wi ON wi.watchlist_id = w.id
  WHERE w.user_id = p_user_id
  GROUP BY w.id, w.name, w.description, w.created_at, w.updated_at
  ORDER BY w.updated_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_watchlist_detail(p_watchlist_id UUID, p_user_id UUID)
RETURNS TABLE(id UUID, name TEXT, description TEXT, item_count BIGINT, items JSON, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.watchlists WHERE watchlists.id = p_watchlist_id AND watchlists.user_id = p_user_id) THEN
    RAISE EXCEPTION 'Watchlist not found or access denied';
  END IF;

  RETURN QUERY
  SELECT w.id, w.name, w.description, COUNT(wi.id)::BIGINT AS item_count,
    COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
      'id', wi.id, 'tmdbId', wi.tmdb_id, 'mediaType', wi.media_type,
      'title', wi.title, 'posterPath', wi.poster_path, 'backdropPath', wi.backdrop_path,
      'voteAverage', wi.vote_average, 'releaseDate', wi.release_date,
      'providers', wi.providers, 'notes', wi.notes, 'addedAt', wi.added_at
    ) ORDER BY wi.added_at DESC) FILTER (WHERE wi.id IS NOT NULL), '[]'::JSON) AS items,
    w.created_at, w.updated_at
  FROM public.watchlists w
  LEFT JOIN public.watchlist_items wi ON wi.watchlist_id = w.id
  WHERE w.id = p_watchlist_id AND w.user_id = p_user_id
  GROUP BY w.id, w.name, w.description, w.created_at, w.updated_at;
END;
$$;
-- END 004

-- ============================================
-- Verify setup
-- ============================================
SELECT 'All migrations completed successfully!' AS status;
