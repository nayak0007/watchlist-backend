-- 003_create_watchlist_items.sql
-- Creates the watchlist_items table for storing individual media items within a watchlist
-- Run this third in the Supabase SQL Editor

-- ============================================
-- Watchlist Items table
-- ============================================
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON public.watchlist_items(watchlist_id);

-- Prevent duplicate items in the same watchlist
CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_items_unique
  ON public.watchlist_items(watchlist_id, tmdb_id, media_type);

-- Enable Row Level Security
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- Helper function to check if user owns the parent watchlist
-- Users can view items in their own watchlists
CREATE POLICY "Users can view own watchlist items"
  ON public.watchlist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.watchlists
      WHERE watchlists.id = watchlist_items.watchlist_id
        AND watchlists.user_id = auth.uid()
    )
  );

-- Users can add items to their own watchlists
CREATE POLICY "Users can insert own watchlist items"
  ON public.watchlist_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.watchlists
      WHERE watchlists.id = watchlist_items.watchlist_id
        AND watchlists.user_id = auth.uid()
    )
  );

-- Users can update items in their own watchlists
CREATE POLICY "Users can update own watchlist items"
  ON public.watchlist_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.watchlists
      WHERE watchlists.id = watchlist_items.watchlist_id
        AND watchlists.user_id = auth.uid()
    )
  );

-- Users can delete items from their own watchlists
CREATE POLICY "Users can delete own watchlist items"
  ON public.watchlist_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.watchlists
      WHERE watchlists.id = watchlist_items.watchlist_id
        AND watchlists.user_id = auth.uid()
    )
  );
