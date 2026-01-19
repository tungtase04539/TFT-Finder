-- Create Admin Account Script
-- Run this in Supabase SQL Editor to create the admin account
-- Email: admin@admin.com
-- Password: Anhtung1998

-- Step 1: Create the auth user
-- Note: You need to run this through Supabase Auth API or manually in Supabase Dashboard
-- This SQL creates the profile entry assuming the auth user already exists

-- First, let's check if admin user exists in auth.users
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Try to find existing admin user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@admin.com';

  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Admin user not found in auth.users. Please create user admin@admin.com with password Anhtung1998 in Supabase Dashboard first.';
    RAISE NOTICE 'Go to: Authentication > Users > Add User';
    RAISE NOTICE 'Email: admin@admin.com';
    RAISE NOTICE 'Password: Anhtung1998';
    RAISE NOTICE 'Auto Confirm User: YES';
  ELSE
    RAISE NOTICE 'Admin user found with ID: %', admin_user_id;
    
    -- Update or insert profile with admin role
    INSERT INTO public.profiles (
      id,
      riot_id,
      puuid,
      verified,
      role,
      ban_count,
      banned_until,
      win_count,
      total_games,
      created_at,
      updated_at
    )
    VALUES (
      admin_user_id,
      'Admin#ADMIN',
      'admin-puuid-placeholder',
      true,
      'admin',
      0,
      NULL,
      0,
      0,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET
      role = 'admin',
      verified = true,
      updated_at = NOW();
    
    RAISE NOTICE 'Admin profile created/updated successfully!';
    RAISE NOTICE 'Email: admin@admin.com';
    RAISE NOTICE 'Password: Anhtung1998';
    RAISE NOTICE 'Role: admin';
  END IF;
END $$;

-- Verify admin account
SELECT 
  u.email,
  p.riot_id,
  p.role,
  p.verified,
  p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'admin@admin.com';
