-- Migration: Game Management and Moderation System (Simplified)
-- Run this if the full migration fails

-- ============================================
-- PART 1: ADD COLUMNS TO EXISTING TABLES
-- ============================================

-- Add columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS win_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_games INTEGER DEFAULT 0;

-- Add columns to rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_copy_action TIMESTAMPTZ;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS game_detected_at TIMESTAMPTZ;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS scheduled_result_check_at TIMESTAMPTZ;

-- ============================================
-- PART 2: CREATE NEW TABLES
-- ============================================

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  violation_types TEXT[] NOT NULL,
  description TEXT,
  evidence_urls TEXT[],
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Bans table
CREATE TABLE IF NOT EXISTS bans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  ban_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  banned_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  banned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Banned Riot IDs table
CREATE TABLE IF NOT EXISTS banned_riot_ids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  riot_id TEXT UNIQUE NOT NULL,
  puuid TEXT,
  reason TEXT NOT NULL,
  banned_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  banned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Match results table
CREATE TABLE IF NOT EXISTS match_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  match_id TEXT NOT NULL,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  placement INTEGER NOT NULL,
  level INTEGER,
  gold_left INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(match_id, player_id)
);

-- ============================================
-- PART 3: CREATE INDEXES
-- ============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE role = 'admin';
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON profiles(banned_until) WHERE banned_until IS NOT NULL;

-- Rooms indexes
CREATE INDEX IF NOT EXISTS idx_rooms_scheduled_check ON rooms(scheduled_result_check_at) WHERE scheduled_result_check_at IS NOT NULL;

-- Reports indexes
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Bans indexes
CREATE INDEX IF NOT EXISTS idx_bans_user_id ON bans(user_id);
CREATE INDEX IF NOT EXISTS idx_bans_active ON bans(is_active, user_id) WHERE is_active = TRUE;

-- Banned Riot IDs indexes
CREATE INDEX IF NOT EXISTS idx_banned_riot_ids_riot_id ON banned_riot_ids(riot_id);

-- Match results indexes
CREATE INDEX IF NOT EXISTS idx_match_results_room_id ON match_results(room_id);
CREATE INDEX IF NOT EXISTS idx_match_results_player_id ON match_results(player_id);
CREATE INDEX IF NOT EXISTS idx_match_results_match_id ON match_results(match_id);

-- ============================================
-- PART 4: CREATE STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('report-evidence', 'report-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ MIGRATION COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next step: Enable RLS and create policies manually if needed';
END $$;
