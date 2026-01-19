'use client';

import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { throttle } from '@/lib/debounce';

interface Message {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  is_system: boolean;
  created_at: string;
  profile?: {
    riot_id: string;
    profile_icon_id: number;
  };
}

interface RoomChatProps {
  roomId: string;
  currentUserId: string;
}

function RoomChat({ roomId, currentUserId }: RoomChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Throttled scroll to avoid too many scroll operations
  const throttledScrollToBottom = useMemo(
    () => throttle(scrollToBottom, 300),
    [scrollToBottom]
  );

  const fetchMessages = useCallback(async () => {
    const supabase = createClient();
    
    const { data } = await supabase
      .from('room_messages')
      .select(`
        *,
        profile:profiles(riot_id, profile_icon_id)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) {
      setMessages(data);
      setTimeout(throttledScrollToBottom, 100);
    }
  }, [roomId, throttledScrollToBottom]);

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages
    const supabase = createClient();
    const channel = supabase
      .channel(`room_chat:${roomId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          // Fetch the new message with profile
          const { data } = await supabase
            .from('room_messages')
            .select(`
              *,
              profile:profiles(riot_id, profile_icon_id)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages(prev => [...prev, data]);
            setTimeout(throttledScrollToBottom, 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchMessages, throttledScrollToBottom]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const supabase = createClient();

    await supabase.from('room_messages').insert({
      room_id: roomId,
      user_id: currentUserId,
      message: newMessage.trim(),
      is_system: false,
    });

    setNewMessage('');
    setSending(false);
  }, [newMessage, sending, roomId, currentUserId]);

  const formatTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const getIconUrl = useCallback((iconId: number) =>
    `https://ddragon.leagueoflegends.com/cdn/15.1.1/img/profileicon/${iconId || 29}.png`, []);

  return (
    <div className="flex flex-col h-full bg-tft-dark rounded-lg border border-tft-gold/20 overflow-hidden">
      {/* Chat Header */}
      <div className="px-4 py-2 border-b border-tft-gold/20 bg-tft-dark-secondary">
        <h4 className="text-tft-teal font-semibold flex items-center gap-2">
          💬 Chat phòng
          <span className="text-xs text-tft-gold/60">({messages.length} tin nhắn)</span>
        </h4>
      </div>

      {/* Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[300px]"
      >
        {messages.length === 0 ? (
          <div className="text-center text-tft-gold/40 py-8">
            Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
          </div>
        ) : (
          <MessageList 
            messages={messages} 
            currentUserId={currentUserId}
            formatTime={formatTime}
            getIconUrl={getIconUrl}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-tft-gold/20 bg-tft-dark-secondary">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Nhập tin nhắn..."
            className="flex-1 bg-tft-dark border border-tft-gold/30 rounded-lg px-3 py-2 text-sm text-tft-gold-light placeholder-tft-gold/40 focus:outline-none focus:border-tft-teal"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-tft-teal text-tft-dark rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tft-teal/80 transition-colors"
          >
            {sending ? '...' : 'Gửi'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Memoized message list component
const MessageList = memo(({ 
  messages, 
  currentUserId, 
  formatTime, 
  getIconUrl 
}: { 
  messages: Message[];
  currentUserId: string;
  formatTime: (dateStr: string) => string;
  getIconUrl: (iconId: number) => string;
}) => {
  return (
    <>
      {messages.map((msg) => {
        const isSystem = msg.is_system;
        const isOwn = msg.user_id === currentUserId;

        if (isSystem) {
          return (
            <div key={msg.id} className="text-center text-xs text-tft-gold/50 italic">
              {msg.message}
            </div>
          );
        }

        return (
          <div
            key={msg.id}
            className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
          >
            <div className="w-8 h-8 flex-shrink-0">
              <Image
                src={getIconUrl(msg.profile?.profile_icon_id || 29)}
                alt="avatar"
                width={32}
                height={32}
                className="rounded-full w-full h-full object-cover"
                unoptimized
              />
            </div>
            <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
              <div className={`text-xs mb-1 ${isOwn ? 'text-tft-teal' : 'text-tft-gold/60'}`}>
                {msg.profile?.riot_id?.split('#')[0] || 'Unknown'}
                <span className="ml-2 text-tft-gold/40">{formatTime(msg.created_at)}</span>
              </div>
              <div className={`
                inline-block px-3 py-2 rounded-lg text-sm
                ${isOwn 
                  ? 'bg-tft-teal/20 text-tft-teal' 
                  : 'bg-tft-dark-secondary text-tft-gold-light'
                }
              `}>
                {msg.message}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
});

MessageList.displayName = 'MessageList';

export default memo(RoomChat);

// Helper function to send system message (join/leave)
export async function sendSystemMessage(roomId: string, message: string) {
  const supabase = createClient();
  
  // Get any user to attribute the system message (using a placeholder)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('room_messages').insert({
    room_id: roomId,
    user_id: user.id,
    message,
    is_system: true,
  });
}
