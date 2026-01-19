-- Complete Migration Script for TFT Finder
-- Run this in Supabase SQL Editor to add all missing columns

-- ============================================
-- 1. Add max_players to rooms table
-- ============================================
ALTER TABLE public.rooms 
  ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT 8 CHECK (max_players >= 2 AND max_players <= 8);

-- ============================================
-- 2. Add account linking columns to profiles
-- ============================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS has_password BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_google BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- ============================================
-- 3. Create verification_codes table
-- ============================================
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('create_password', 'link_google', 'register', 'reset_password')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for verification_codes
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);

-- RLS Policies for verification_codes
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own codes" ON public.verification_codes;
CREATE POLICY "Users can view own codes" 
  ON public.verification_codes FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Service role can manage codes" ON public.verification_codes;
CREATE POLICY "Service role can manage codes" 
  ON public.verification_codes FOR ALL 
  USING (true);

-- ============================================
-- 4. Cleanup function for expired codes
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.verification_codes
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Update existing profiles with auth flags
-- ============================================
DO $$
DECLARE
  user_record RECORD;
  has_google_identity BOOLEAN;
  has_email_identity BOOLEAN;
BEGIN
  FOR user_record IN 
    SELECT id, email FROM auth.users
  LOOP
    -- Check if user has Google identity
    SELECT EXISTS(
      SELECT 1 FROM auth.identities 
      WHERE user_id = user_record.id AND provider = 'google'
    ) INTO has_google_identity;
    
    -- Check if user has email identity
    SELECT EXISTS(
      SELECT 1 FROM auth.identities 
      WHERE user_id = user_record.id AND provider = 'email'
    ) INTO has_email_identity;
    
    -- Update profile
    UPDATE public.profiles
    SET 
      has_google = COALESCE(has_google, has_google_identity),
      has_password = COALESCE(has_password, has_email_identity),
      email = COALESCE(email, user_record.email),
      email_verified = COALESCE(email_verified, true)
    WHERE id = user_record.id;
  END LOOP;
END $$;

-- ============================================
-- 6. Verify migration completed
-- ============================================
DO $$
BEGIN
  -- Check if max_players column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'max_players'
  ) THEN
    RAISE NOTICE '✓ max_players column added to rooms';
  END IF;

  -- Check if account linking columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'has_password'
  ) THEN
    RAISE NOTICE '✓ Account linking columns added to profiles';
  END IF;

  -- Check if verification_codes table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'verification_codes'
  ) THEN
    RAISE NOTICE '✓ verification_codes table created';
  END IF;

  RAISE NOTICE '✓ Migration completed successfully!';
END $$;
