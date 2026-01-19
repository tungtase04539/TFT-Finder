/**
 * Room utility functions
 * Ensures users can only be in one active room at a time
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Remove user from any active rooms before joining a new one
 * Active rooms: forming, editing, ready, playing
 */
export async function removeUserFromActiveRooms(userId: string): Promise<void> {
  const supabase = createClient();

  // Find all active rooms where user is a player
  const { data: activeRooms } = await supabase
    .from('rooms')
    .select('id, players, players_agreed, host_id')
    .contains('players', [userId])
    .in('status', ['forming', 'editing', 'ready', 'playing']);

  if (!activeRooms || activeRooms.length === 0) {
    return;
  }

  console.log(`[ROOM_UTILS] Removing user ${userId} from ${activeRooms.length} active room(s)`);

  // Remove user from each active room
  for (const room of activeRooms) {
    const newPlayers = room.players.filter((id: string) => id !== userId);
    const newAgreed = room.players_agreed?.filter((id: string) => id !== userId) || [];

    // If user was host, transfer to next player or cancel room
    if (room.host_id === userId) {
      if (newPlayers.length > 0) {
        // Transfer host to first remaining player
        await supabase
          .from('rooms')
          .update({
            host_id: newPlayers[0],
            players: newPlayers,
            players_agreed: newAgreed,
          })
          .eq('id', room.id);
      } else {
        // No players left - cancel room
        await supabase
          .from('rooms')
          .update({ status: 'cancelled' })
          .eq('id', room.id);
      }
    } else {
      // Regular player - just remove from lists
      await supabase
        .from('rooms')
        .update({
          players: newPlayers,
          players_agreed: newAgreed,
        })
        .eq('id', room.id);
    }
  }

  console.log(`[ROOM_UTILS] Successfully removed user from ${activeRooms.length} room(s)`);
}

/**
 * Check if user is already in an active room
 */
export async function getUserActiveRoom(userId: string): Promise<string | null> {
  const supabase = createClient();

  const { data: activeRoom } = await supabase
    .from('rooms')
    .select('id')
    .contains('players', [userId])
    .in('status', ['forming', 'editing', 'ready', 'playing'])
    .limit(1)
    .single();

  return activeRoom?.id || null;
}
