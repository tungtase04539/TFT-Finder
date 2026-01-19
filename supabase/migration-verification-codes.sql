-- Migration: Add verification_codes table and update profiles
-- Run this in Supabase SQL Editor

-- Create verification_codes table
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);

-- RLS Policies
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own codes" 
  ON public.verification_codes FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can manage codes" 
  ON public.verification_codes FOR ALL 
  USING (true);

-- Update profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS has_password BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_google BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Function to cleanup expired codes (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.verification_codes
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing profiles to set has_password and has_google based on auth identities
-- This is a one-time migration for existing users
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
      has_google = has_google_identity,
      has_password = has_email_identity,
      email = user_record.email,
      email_verified = true
    WHERE id = user_record.id;
  END LOOP;
END $$;
