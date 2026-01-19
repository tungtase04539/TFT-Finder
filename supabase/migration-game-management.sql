-- Migration: Game Management and Moderation System
-- Date: 2026-01-19
-- Description: Add tables and columns for copy tracking, reports, bans, and achievements

-- ============================================
-- 1. ADD COLUMNS TO PROFILES TABLE
-- ============================================

-- Add role column (user, admin)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Add ban tracking columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;

-- Add achievement tracking columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS win_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_games INTEGER DEFAULT 0;

-- Create index for admin role queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE role = 'admin';

-- Create index for banned users
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON profiles(banned_until) WHERE banned_until IS NOT NULL;

-- ============================================
-- 2. ADD COLUMNS TO ROOMS TABLE
-- ============================================

-- Add copy action tracking
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_copy_action TIMESTAMPTZ;

-- Add game detection tracking
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS game_detected_at TIMESTAMPTZ;

-- Add scheduled match result check
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS scheduled_result_check_at TIMESTAMPTZ;

-- Create index for scheduled checks
CREATE INDEX IF NOT EXISTS idx_rooms_scheduled_check ON rooms(scheduled_result_check_at) WHERE scheduled_result_check_at IS NOT NULL;

-- ============================================
-- 3. CREATE REPORTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  violation_types TEXT[] NOT NULL CHECK (array_length(violation_types, 1) > 0),
  description TEXT,
  evidence_urls TEXT[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_no_self_report CHECK (reporter_id != reported_user_id)
);

-- Create indexes for reports
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_pending ON reports(status, created_at DESC) WHERE status = 'pending';

-- ============================================
-- 4. CREATE BANS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS bans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  ban_type TEXT NOT NULL CHECK (ban_type IN ('temporary', 'permanent')),
  reason TEXT NOT NULL,
  banned_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  banned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  CONSTRAINT check_ban_expiry CHECK (
    (ban_type = 'temporary' AND expires_at IS NOT NULL) OR
    (ban_type = 'permanent' AND expires_at IS NULL)
  )
);

-- Create indexes for bans
CREATE INDEX IF NOT EXISTS idx_bans_user_id ON bans(user_id);
CREATE INDEX IF NOT EXISTS idx_bans_active ON bans(is_active, user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_bans_expires_at ON bans(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- 5. CREATE BANNED_RIOT_IDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS banned_riot_ids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  riot_id TEXT UNIQUE NOT NULL,
  puuid TEXT,
  reason TEXT NOT NULL,
  banned_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  banned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for banned Riot IDs
CREATE INDEX IF NOT EXISTS idx_banned_riot_ids_riot_id ON banned_riot_ids(riot_id);
CREATE INDEX IF NOT EXISTS idx_banned_riot_ids_puuid ON banned_riot_ids(puuid) WHERE puuid IS NOT NULL;

-- ============================================
-- 6. CREATE MATCH_RESULTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS match_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  match_id TEXT NOT NULL,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  placement INTEGER NOT NULL CHECK (placement >= 1 AND placement <= 8),
  level INTEGER,
  gold_left INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(match_id, player_id)
);

-- Create indexes for match results
CREATE INDEX IF NOT EXISTS idx_match_results_room_id ON match_results(room_id);
CREATE INDEX IF NOT EXISTS idx_match_results_player_id ON match_results(player_id);
CREATE INDEX IF NOT EXISTS idx_match_results_match_id ON match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_winner ON match_results(player_id, placement) WHERE placement = 1;

-- ============================================
-- 7. CREATE STORAGE BUCKET FOR REPORT EVIDENCE
-- ============================================

-- Insert storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-evidence',
  'report-evidence',
  false,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_riot_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

-- Reports policies
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" ON reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR auth.uid() = reported_user_id);

CREATE POLICY "Admins can view all reports" ON reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update reports" ON reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Bans policies
CREATE POLICY "Users can view their own bans" ON bans
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bans" ON bans
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create bans" ON bans
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update bans" ON bans
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Banned Riot IDs policies
CREATE POLICY "Anyone can check if Riot ID is banned" ON banned_riot_ids
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage banned Riot IDs" ON banned_riot_ids
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Match results policies
CREATE POLICY "Users can view their own match results" ON match_results
  FOR SELECT TO authenticated
  USING (auth.uid() = player_id);

CREATE POLICY "Users can view match results from their rooms" ON match_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = match_results.room_id
      AND auth.uid() = ANY(rooms.players)
    )
  );

CREATE POLICY "System can insert match results" ON match_results
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Storage policies for report evidence
CREATE POLICY "Users can upload evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'report-evidence' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own evidence" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'report-evidence' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all evidence" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'report-evidence' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to check if user is currently banned
CREATE OR REPLACE FUNCTION is_user_banned(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id_param
    AND (
      (banned_until IS NOT NULL AND banned_until > NOW()) OR
      (ban_count >= 2) -- Permanent ban
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if Riot ID is banned
CREATE OR REPLACE FUNCTION is_riot_id_banned(riot_id_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM banned_riot_ids
    WHERE riot_id = riot_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-expire temporary bans
CREATE OR REPLACE FUNCTION expire_temporary_bans()
RETURNS void AS $$
BEGIN
  -- Deactivate expired bans
  UPDATE bans
  SET is_active = FALSE
  WHERE ban_type = 'temporary'
  AND expires_at < NOW()
  AND is_active = TRUE;

  -- Clear banned_until for users with expired bans
  UPDATE profiles
  SET banned_until = NULL
  WHERE banned_until < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. VERIFICATION CHECKS
-- ============================================

DO $$
DECLARE
  profiles_columns_count INTEGER;
  rooms_columns_count INTEGER;
  reports_count INTEGER;
  bans_count INTEGER;
  banned_riot_ids_count INTEGER;
  match_results_count INTEGER;
  bucket_exists BOOLEAN;
BEGIN
  -- Check profiles columns
  SELECT COUNT(*) INTO profiles_columns_count
  FROM information_schema.columns
  WHERE table_name = 'profiles'
  AND column_name IN ('role', 'ban_count', 'banned_until', 'win_count', 'total_games');

  -- Check rooms columns
  SELECT COUNT(*) INTO rooms_columns_count
  FROM information_schema.columns
  WHERE table_name = 'rooms'
  AND column_name IN ('last_copy_action', 'game_detected_at', 'scheduled_result_check_at');

  -- Check tables exist
  SELECT COUNT(*) INTO reports_count FROM information_schema.tables WHERE table_name = 'reports';
  SELECT COUNT(*) INTO bans_count FROM information_schema.tables WHERE table_name = 'bans';
  SELECT COUNT(*) INTO banned_riot_ids_count FROM information_schema.tables WHERE table_name = 'banned_riot_ids';
  SELECT COUNT(*) INTO match_results_count FROM information_schema.tables WHERE table_name = 'match_results';

  -- Check storage bucket
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'report-evidence') INTO bucket_exists;

  -- Report results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Profiles columns added: % / 5', profiles_columns_count;
  RAISE NOTICE 'Rooms columns added: % / 3', rooms_columns_count;
  RAISE NOTICE 'Reports table: %', CASE WHEN reports_count > 0 THEN '✓ Created' ELSE '✗ Missing' END;
  RAISE NOTICE 'Bans table: %', CASE WHEN bans_count > 0 THEN '✓ Created' ELSE '✗ Missing' END;
  RAISE NOTICE 'Banned Riot IDs table: %', CASE WHEN banned_riot_ids_count > 0 THEN '✓ Created' ELSE '✗ Missing' END;
  RAISE NOTICE 'Match Results table: %', CASE WHEN match_results_count > 0 THEN '✓ Created' ELSE '✗ Missing' END;
  RAISE NOTICE 'Storage bucket: %', CASE WHEN bucket_exists THEN '✓ Created' ELSE '✗ Missing' END;
  RAISE NOTICE '========================================';

  IF profiles_columns_count = 5 AND rooms_columns_count = 3 AND
     reports_count > 0 AND bans_count > 0 AND banned_riot_ids_count > 0 AND
     match_results_count > 0 AND bucket_exists THEN
    RAISE NOTICE '✓ MIGRATION COMPLETED SUCCESSFULLY';
  ELSE
    RAISE WARNING '⚠ MIGRATION INCOMPLETE - Please check the errors above';
  END IF;
END $$;
