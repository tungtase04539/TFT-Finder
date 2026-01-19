import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CopyRiotIdButton from '../CopyRiotIdButton';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn()
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn()
  }
});

describe('CopyRiotIdButton', () => {
  const mockRiotId = 'TestPlayer#1234';
  const mockRoomId = 'test-room-id';
  const mockUpdate = jest.fn();
  const mockEq = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Supabase mock
    mockEq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    mockUpdate.mockReturnValue({ eq: mockEq });
    
    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        update: mockUpdate
      })
    });

    // Setup clipboard mock
    (navigator.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);
  });

  test('renders copy button with correct text', () => {
    render(<CopyRiotIdButton riotId={mockRiotId} roomId={mockRoomId} />);
    
    expect(screen.getByText('Copy ID')).toBeInTheDocument();
    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  test('copies Riot ID to clipboard when clicked', async () => {
    render(<CopyRiotIdButton riotId={mockRiotId} roomId={mockRoomId} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockRiotId);
    });
  });

  test('updates room last_copy_action timestamp', async () => {
    render(<CopyRiotIdButton riotId={mockRiotId} roomId={mockRoomId} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          last_copy_action: expect.any(String)
        })
      );
      expect(mockEq).toHaveBeenCalledWith('id', mockRoomId);
    });
  });

  test('shows loading state while copying', async () => {
    render(<CopyRiotIdButton riotId={mockRiotId} roomId={mockRoomId} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('Đang copy...')).toBeInTheDocument();
  });

  test('shows success state after copying', async () => {
    render(<CopyRiotIdButton riotId={mockRiotId} roomId={mockRoomId} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Đã copy!')).toBeInTheDocument();
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  test('resets to initial state after 2 seconds', async () => {
    jest.useFakeTimers();
    
    render(<CopyRiotIdButton riotId={mockRiotId} roomId={mockRoomId} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Đã copy!')).toBeInTheDocument();
    });

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(screen.getByText('Copy ID')).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  test('calls onCopy callback when provided', async () => {
    const mockOnCopy = jest.fn();
    
    render(
      <CopyRiotIdButton 
        riotId={mockRiotId} 
        roomId={mockRoomId} 
        onCopy={mockOnCopy}
      />
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnCopy).toHaveBeenCalled();
    });
  });

  test('handles copy error gracefully', async () => {
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation();
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('Copy failed'));
    
    render(<CopyRiotIdButton riotId={mockRiotId} roomId={mockRoomId} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Không thể copy. Vui lòng thử lại.');
    });

    mockAlert.mockRestore();
  });

  test('prevents multiple simultaneous copy actions', async () => {
    render(<CopyRiotIdButton riotId={mockRiotId} roomId={mockRoomId} />);
    
    const button = screen.getByRole('button');
    
    // Click multiple times rapidly
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      // Should only be called once
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    });
  });

  test('button is disabled while copying', async () => {
    render(<CopyRiotIdButton riotId={mockRiotId} roomId={mockRoomId} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(button).toBeDisabled();

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });
});
