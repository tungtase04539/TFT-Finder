import { removePlayersNotInGame } from '../game-detection';
import { createClient } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn()
}));

describe('removePlayersNotInGame', () => {
  const mockRoomId = 'test-room-id';
  const mockUpdate = jest.fn();
  const mockEq = jest.fn();
  const mockSelect = jest.fn();
  const mockSingle = jest.fn();
  const mockIn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('removes players not in game from room', async () => {
    const mockRoom = {
      id: mockRoomId,
      players: ['user1', 'user2', 'user3', 'user4'],
      players_agreed: ['user1', 'user2', 'user3', 'user4']
    };

    const mockProfiles = [
      { id: 'user2', puuid: 'puuid2' },
      { id: 'user4', puuid: 'puuid4' }
    ];

    mockSingle.mockResolvedValue({ data: mockRoom, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockEq.mockReturnValue({ select: mockSelect });

    mockIn.mockResolvedValue({ data: mockProfiles, error: null });
    mockSelect.mockReturnValue({ in: mockIn });

    mockEq.mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });

    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn((table) => {
        if (table === 'rooms') {
          return {
            select: mockSelect,
            update: mockUpdate
          };
        }
        if (table === 'profiles') {
          return {
            select: mockSelect
          };
        }
      })
    });

    const result = await removePlayersNotInGame(mockRoomId, ['puuid2', 'puuid4']);

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      players: ['user1', 'user3'],
      players_agreed: ['user1', 'user3']
    });
  });

  test('returns success message with correct player count', async () => {
    const mockRoom = {
      id: mockRoomId,
      players: ['user1', 'user2', 'user3'],
      players_agreed: ['user1', 'user2', 'user3']
    };

    const mockProfiles = [
      { id: 'user3', puuid: 'puuid3' }
    ];

    mockSingle.mockResolvedValue({ data: mockRoom, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockEq.mockReturnValue({ select: mockSelect });

    mockIn.mockResolvedValue({ data: mockProfiles, error: null });
    mockSelect.mockReturnValue({ in: mockIn });

    mockEq.mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });

    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn((table) => {
        if (table === 'rooms') {
          return {
            select: mockSelect,
            update: mockUpdate
          };
        }
        if (table === 'profiles') {
          return {
            select: mockSelect
          };
        }
      })
    });

    const result = await removePlayersNotInGame(mockRoomId, ['puuid3']);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Đã loại 1 người chơi');
    expect(result.message).toContain('Còn 2 người chơi');
  });

  test('cancels room if less than 2 players remain', async () => {
    const mockRoom = {
      id: mockRoomId,
      players: ['user1', 'user2'],
      players_agreed: ['user1', 'user2']
    };

    const mockProfiles = [
      { id: 'user2', puuid: 'puuid2' }
    ];

    mockSingle.mockResolvedValue({ data: mockRoom, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockEq.mockReturnValue({ select: mockSelect });

    mockIn.mockResolvedValue({ data: mockProfiles, error: null });
    mockSelect.mockReturnValue({ in: mockIn });

    mockEq.mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });

    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn((table) => {
        if (table === 'rooms') {
          return {
            select: mockSelect,
            update: mockUpdate
          };
        }
        if (table === 'profiles') {
          return {
            select: mockSelect
          };
        }
      })
    });

    const result = await removePlayersNotInGame(mockRoomId, ['puuid2']);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Phòng bị hủy do không đủ người');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'cancelled' });
  });

  test('returns error when room not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockEq.mockReturnValue({ select: mockSelect });

    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: mockSelect
      }))
    });

    const result = await removePlayersNotInGame(mockRoomId, ['puuid1']);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Không tìm thấy phòng');
  });

  test('returns success when no players to remove', async () => {
    const mockRoom = {
      id: mockRoomId,
      players: ['user1', 'user2'],
      players_agreed: ['user1', 'user2']
    };

    mockSingle.mockResolvedValue({ data: mockRoom, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockEq.mockReturnValue({ select: mockSelect });

    mockIn.mockResolvedValue({ data: [], error: null });
    mockSelect.mockReturnValue({ in: mockIn });

    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn((table) => {
        if (table === 'rooms') {
          return {
            select: mockSelect
          };
        }
        if (table === 'profiles') {
          return {
            select: mockSelect
          };
        }
      })
    });

    const result = await removePlayersNotInGame(mockRoomId, []);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Không có người chơi nào cần loại');
  });

  test('handles database update errors', async () => {
    const mockRoom = {
      id: mockRoomId,
      players: ['user1', 'user2'],
      players_agreed: ['user1', 'user2']
    };

    const mockProfiles = [
      { id: 'user2', puuid: 'puuid2' }
    ];

    mockSingle.mockResolvedValue({ data: mockRoom, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockEq.mockReturnValue({ select: mockSelect });

    mockIn.mockResolvedValue({ data: mockProfiles, error: null });
    mockSelect.mockReturnValue({ in: mockIn });

    mockEq.mockResolvedValue({ data: null, error: { message: 'Update failed' } });
    mockUpdate.mockReturnValue({ eq: mockEq });

    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn((table) => {
        if (table === 'rooms') {
          return {
            select: mockSelect,
            update: mockUpdate
          };
        }
        if (table === 'profiles') {
          return {
            select: mockSelect
          };
        }
      })
    });

    const result = await removePlayersNotInGame(mockRoomId, ['puuid2']);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Lỗi khi cập nhật phòng');
  });
});
