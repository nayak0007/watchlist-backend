-- 002_create_watchlists.sql
-- Creates the watchlists table for storing user watchlist groups
-- Run this second in the Supabase SQL Editor

-- ============================================
-- Watchlists table
-- ============================================
CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user-specific queries
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);

-- Enable Row Level Security
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- Users can only view their own watchlists
CREATE POLICY "Users can view own watchlists"
  ON public.watchlists FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own watchlists
CREATE POLICY "Users can create own watchlists"
  ON public.watchlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own watchlists
CREATE POLICY "Users can update own watchlists"
  ON public.watchlists FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own watchlists
CREATE POLICY "Users can delete own watchlists"
  ON public.watchlists FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Auto-update timestamp trigger
-- ============================================
CREATE OR REPLACE TRIGGER on_watchlist_updated
  BEFORE UPDATE ON public.watchlists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
