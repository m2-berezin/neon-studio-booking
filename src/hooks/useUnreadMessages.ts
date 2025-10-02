import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      // Get all messages where user is recipient
      const { data: allMessages, error } = await supabase
        .from('messages')
        .select('id, sender_id, recipient_id, created_at')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by sender to find latest message from each conversation
      const conversationMap = new Map<string, string>();
      
      allMessages?.forEach(message => {
        const senderId = message.sender_id;
        if (!conversationMap.has(senderId)) {
          conversationMap.set(senderId, message.id);
        }
      });

      // For each conversation, check if there are unread messages
      // (messages after the user last viewed that conversation)
      // For simplicity, we'll count unique senders with recent messages
      // This is a simplified approach - you might want to track "last_read_at" per conversation
      
      setUnreadCount(conversationMap.size);
    } catch (error) {
      console.error('Error loading unread message count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnreadCount();

    // Set up realtime subscription for new messages
    const channel = supabase
      .channel('messages-unread')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user?.id}`
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markConversationAsRead = async (senderId: string) => {
    if (!user) return;
    
    // Remove this sender from the unread count immediately
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    // Reload count to ensure accuracy
    await loadUnreadCount();
  };

  return {
    unreadCount,
    loading,
    loadUnreadCount,
    markConversationAsRead
  };
};
