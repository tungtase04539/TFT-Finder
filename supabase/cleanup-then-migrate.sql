-- Cleanup and Migration Script
-- This will drop existing tables and recreate them

-- ============================================
-- STEP 1: DROP EXISTING TABLES (if any)
-- ============================================

DROP TABLE IF EXISTS match_results CASCADE;
DROP TABLE IF EXISTS bans CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS banned_riot_ids CASCADE;

-- ============================================
-- STEP 2: ADD COLUMNS TO EXISTING TABLES
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
-- STEP 3: CREATE NEW TABLES
-- ============================================

-- Reports table
CREATE TABLE reports (
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
CREATE TABLE bans (
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
CREATE TABLE banned_riot_ids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  riot_id TEXT UNIQUE NOT NULL,
  puuid TEXT,
  reason TEXT NOT NULL,
  banned_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  banned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Match results table
CREATE TABLE match_results (
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
-- STEP 4: CREATE INDEXES
-- ============================================

-- Profiles indexes
CREATE INDEX idx_profiles_role ON profiles(role) WHERE role = 'admin';
CREATE INDEX idx_profiles_banned ON profiles(banned_until) WHERE banned_until IS NOT NULL;

-- Rooms indexes
CREATE INDEX idx_rooms_scheduled_check ON rooms(scheduled_result_check_at) WHERE scheduled_result_check_at IS NOT NULL;

-- Reports indexes
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- Bans indexes
CREATE INDEX idx_bans_user_id ON bans(user_id);
CREATE INDEX idx_bans_active ON bans(is_active, user_id) WHERE is_active = TRUE;

-- Banned Riot IDs indexes
CREATE INDEX idx_banned_riot_ids_riot_id ON banned_riot_ids(riot_id);

-- Match results indexes
CREATE INDEX idx_match_results_room_id ON match_results(room_id);
CREATE INDEX idx_match_results_player_id ON match_results(player_id);
CREATE INDEX idx_match_results_match_id ON match_results(match_id);

-- ============================================
-- STEP 5: CREATE STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('report-evidence', 'report-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 6: ENABLE RLS
-- ============================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_riot_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ MIGRATION COMPLETED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - reports';
  RAISE NOTICE '  - bans';
  RAISE NOTICE '  - banned_riot_ids';
  RAISE NOTICE '  - match_results';
  RAISE NOTICE '';
  RAISE NOTICE 'Columns added to profiles:';
  RAISE NOTICE '  - role, ban_count, banned_until, win_count, total_games';
  RAISE NOTICE '';
  RAISE NOTICE 'Columns added to rooms:';
  RAISE NOTICE '  - last_copy_action, game_detected_at, scheduled_result_check_at';
END $$;
