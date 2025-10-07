import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

let globalRefetchFunction: (() => void) | null = null;

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      console.log('Unread messages count:', count);
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    globalRefetchFunction = fetchUnreadCount;
    fetchUnreadCount();

    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user?.id}`,
        },
        () => {
          console.log('Messages changed, refetching count');
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      globalRefetchFunction = null;
    };
  }, [user?.id]);

  return { unreadCount, refetch: fetchUnreadCount };
};

// Export function to trigger refetch from anywhere
export const refetchUnreadMessages = () => {
  if (globalRefetchFunction) {
    console.log('Manually triggering unread messages refetch');
    globalRefetchFunction();
  }
};
