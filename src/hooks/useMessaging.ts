import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ADMIN_ID = '6d9d1dc1-e16f-4f3d-a817-1591a1b27477';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  thread_id: string;
  message: string;
  timestamp: string;
  is_read: boolean;
}

export const useMessaging = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const getThreadId = (userId: string, otherUserId: string) => {
    const ids = [userId, otherUserId].sort();
    return `${ids[0]}-${ids[1]}`;
  };

  const loadMessages = async (otherUserId?: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const targetUserId = otherUserId || ADMIN_ID;
      const threadId = getThreadId(user.id, targetUserId);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (receiverId: string, messageText: string) => {
    if (!user || !messageText.trim()) return;

    try {
      const threadId = getThreadId(user.id, receiverId);
      
      const { error } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          receiver_id: receiverId,
          message: messageText.trim(),
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success('Mensagem enviada');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const subscribeToMessages = (otherUserId?: string) => {
    if (!user) return;

    const targetUserId = otherUserId || ADMIN_ID;
    const threadId = getThreadId(user.id, targetUserId);

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          loadMessages(targetUserId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return {
    messages,
    loading,
    loadMessages,
    sendMessage,
    subscribeToMessages,
    ADMIN_ID,
  };
};
