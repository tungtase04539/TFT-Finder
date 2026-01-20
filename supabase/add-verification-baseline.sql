-- Add verification_baseline_icon column to profiles table
-- This stores the icon ID when user first enters verification flow
-- Used to compare against when they click "Verify" button

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verification_baseline_icon INTEGER;

COMMENT ON COLUMN profiles.verification_baseline_icon IS 'Baseline icon ID captured when user enters verification flow, used for comparison during verification';
