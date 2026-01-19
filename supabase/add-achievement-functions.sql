-- Add database function to increment player stats atomically
-- Run this after the main migration

-- Function to increment player statistics
CREATE OR REPLACE FUNCTION increment_player_stats(
  p_user_id uuid,
  p_is_winner boolean
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Increment total_games for all players
  -- Increment win_count only for winner
  UPDATE profiles
  SET 
    total_games = COALESCE(total_games, 0) + 1,
    win_count = CASE 
      WHEN p_is_winner THEN COALESCE(win_count, 0) + 1
      ELSE COALESCE(win_count, 0)
    END,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_player_stats(uuid, boolean) TO authenticated;
