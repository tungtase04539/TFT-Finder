-- TFT Finder Database Schema v2
-- Run this in Supabase SQL Editor
-- Added: TFT Rank columns and smart refresh tracking

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  riot_id TEXT,
  puuid TEXT,
  summoner_id TEXT,
  summoner_name TEXT,
  profile_icon_id INTEGER,
  summoner_level INTEGER,
  verified BOOLEAN DEFAULT false,
  verification_code TEXT,
  verified_at TIMESTAMPTZ,
  -- TFT Rank data
  tft_tier TEXT DEFAULT 'UNRANKED',
  tft_rank TEXT DEFAULT '',
  tft_lp INTEGER DEFAULT 0,
  tft_wins INTEGER DEFAULT 0,
  tft_losses INTEGER DEFAULT 0,
  tft_rank_updated_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Queue table
CREATE TABLE IF NOT EXISTS public.queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  room_id UUID,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, status) -- Prevent duplicate queue entries
);

-- Rooms table (with text-based custom rules)
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  status TEXT DEFAULT 'forming' CHECK (status IN ('forming', 'ready', 'playing', 'completed', 'expired', 'cancelled')),
  players UUID[] DEFAULT '{}',
  players_agreed UUID[] DEFAULT '{}',  -- Players who agreed to rules
  lobby_code TEXT,
  host_id UUID REFERENCES public.profiles(id),
  
  -- Custom Rules (text-based, each line = 1 rule)
  rules_text TEXT,                     -- Host writes rules, newline separated
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,              -- When all players agreed
  completed_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ
);

-- Reports table (for rule violations)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  match_id TEXT,
  reporter_id UUID REFERENCES public.profiles(id),
  accused_id UUID REFERENCES public.profiles(id),
  rule_violated TEXT,                  -- Rule ID that was violated
  description TEXT,
  evidence JSONB,                      -- Match data excerpt
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'dismissed')),
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Queue policies
CREATE POLICY "Users can view queue" 
  ON public.queue FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can join queue" 
  ON public.queue FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave their own queue" 
  ON public.queue FOR DELETE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue entry" 
  ON public.queue FOR UPDATE 
  USING (auth.uid() = user_id);

-- Rooms policies
CREATE POLICY "Users can view rooms they are in" 
  ON public.rooms FOR SELECT 
  USING (true);

CREATE POLICY "System can create rooms" 
  ON public.rooms FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Host can update room" 
  ON public.rooms FOR UPDATE 
  USING (auth.uid() = host_id);

-- Enable Realtime for queue and rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Index for faster queue lookups
CREATE INDEX IF NOT EXISTS idx_queue_status ON public.queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_joined_at ON public.queue(joined_at);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON public.profiles(verified);
CREATE INDEX IF NOT EXISTS idx_profiles_rank_updated ON public.profiles(tft_rank_updated_at);

-- ============================================
-- MIGRATION FOR EXISTING DATABASES
-- Run these if you already have the old schema
-- ============================================

-- Add new columns to existing profiles table
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS summoner_id TEXT;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_icon_id INTEGER;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS summoner_level INTEGER;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tft_tier TEXT DEFAULT 'UNRANKED';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tft_rank TEXT DEFAULT '';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tft_lp INTEGER DEFAULT 0;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tft_wins INTEGER DEFAULT 0;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tft_losses INTEGER DEFAULT 0;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tft_rank_updated_at TIMESTAMPTZ;
