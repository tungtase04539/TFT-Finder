import { createClient } from '@/lib/supabase/client';

/**
 * Remove players who are not in the game from the room
 * @param roomId - Room ID
 * @param playerPuuidsToRemove - Array of PUUIDs to remove
 * @returns Success status and message
 */
export async function removePlayersNotInGame(
  roomId: string,
  playerPuuidsToRemove: string[]
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createClient();

    // Get current room data
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, players, players_agreed')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      console.error('[REMOVE_PLAYERS] Room not found:', roomError);
      return {
        success: false,
        message: 'Không tìm thấy phòng'
      };
    }

    // Get profiles to map PUUIDs to user IDs
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, puuid')
      .in('puuid', playerPuuidsToRemove);

    if (!profiles || profiles.length === 0) {
      console.log('[REMOVE_PLAYERS] No players to remove');
      return {
        success: true,
        message: 'Không có người chơi nào cần loại'
      };
    }

    const userIdsToRemove = profiles.map(p => p.id);

    // Remove players from players array
    const newPlayers = room.players?.filter((id: string) => !userIdsToRemove.includes(id)) || [];
    
    // Remove players from players_agreed array
    const newPlayersAgreed = room.players_agreed?.filter((id: string) => !userIdsToRemove.includes(id)) || [];

    console.log('[REMOVE_PLAYERS] Removing', userIdsToRemove.length, 'players from room');
    console.log('[REMOVE_PLAYERS] Before:', room.players?.length, 'players');
    console.log('[REMOVE_PLAYERS] After:', newPlayers.length, 'players');

    // Update room in database
    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        players: newPlayers,
        players_agreed: newPlayersAgreed
      })
      .eq('id', roomId);

    if (updateError) {
      console.error('[REMOVE_PLAYERS] Failed to update room:', updateError);
      return {
        success: false,
        message: 'Lỗi khi cập nhật phòng'
      };
    }

    // If less than 2 players remain, cancel the room
    if (newPlayers.length < 2) {
      console.log('[REMOVE_PLAYERS] Less than 2 players remain, cancelling room');
      await supabase
        .from('rooms')
        .update({ status: 'cancelled' })
        .eq('id', roomId);

      return {
        success: true,
        message: `Đã loại ${userIdsToRemove.length} người chơi. Phòng bị hủy do không đủ người.`
      };
    }

    return {
      success: true,
      message: `Đã loại ${userIdsToRemove.length} người chơi không vào game. Còn ${newPlayers.length} người chơi.`
    };

  } catch (error) {
    console.error('[REMOVE_PLAYERS] Error:', error);
    return {
      success: false,
      message: 'Lỗi khi loại người chơi'
    };
  }
}
