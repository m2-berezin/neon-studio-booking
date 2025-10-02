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
        .select('id, sender_id')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!allMessages || allMessages.length === 0) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // Get read status for all messages
      const { data: readMessages, error: readError } = await supabase
        .from('message_reads')
        .select('message_id')
        .eq('user_id', user.id);

      if (readError) throw readError;

      const readMessageIds = new Set(readMessages?.map(r => r.message_id) || []);

      // Count total unread messages (not conversations)
      const unreadMessages = allMessages.filter(msg => !readMessageIds.has(msg.id));
      
      setUnreadCount(unreadMessages.length);
      console.log('📬 Unread count updated:', unreadMessages.length);
    } catch (error) {
      console.error('Error loading unread message count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnreadCount();

    if (!user) return;

    // Set up realtime subscription for new messages
    const messagesChannel = supabase
      .channel('messages-unread')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    // Set up realtime subscription for message reads
    const readsChannel = supabase
      .channel('message-reads-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(readsChannel);
    };
  }, [user]);

  const markConversationAsRead = async (senderId: string) => {
    if (!user) return;
    
    try {
      // Get all messages from this sender that haven't been read
      const { data: unreadMessages, error: fetchError } = await supabase
        .from('messages')
        .select('id')
        .eq('recipient_id', user.id)
        .eq('sender_id', senderId);

      if (fetchError) throw fetchError;

      if (unreadMessages && unreadMessages.length > 0) {
        // Get already read messages
        const { data: alreadyRead, error: readFetchError } = await supabase
          .from('message_reads')
          .select('message_id')
          .eq('user_id', user.id)
          .in('message_id', unreadMessages.map(m => m.id));

        if (readFetchError) throw readFetchError;

        const alreadyReadIds = new Set(alreadyRead?.map(r => r.message_id) || []);
        
        // Mark unread messages as read
        const messagesToMark = unreadMessages
          .filter(m => !alreadyReadIds.has(m.id))
          .map(m => ({
            user_id: user.id,
            message_id: m.id
          }));

        if (messagesToMark.length > 0) {
          const { error: insertError } = await supabase
            .from('message_reads')
            .insert(messagesToMark);

          if (insertError && !insertError.message.includes('duplicate')) {
            throw insertError;
          }
        }
      }
      
      // Reload count
      await loadUnreadCount();
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      // Still reload count to ensure accuracy
      await loadUnreadCount();
    }
  };

  return {
    unreadCount,
    loading,
    loadUnreadCount,
    markConversationAsRead
  };
};
