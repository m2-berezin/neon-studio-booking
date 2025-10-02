import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  thread_id: string;
  message: string;
  timestamp: string;
  is_read: boolean;
  sender_display_name: string;
  receiver_display_name: string;
}

export interface Thread {
  thread_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_email: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export const useMessaging = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load all threads for current user
  const loadThreads = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get all messages from view (includes display names)
      const { data: allMessages, error } = await supabase
        .from('v_messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Group messages by thread
      const threadMap = new Map<string, Thread>();

      for (const msg of allMessages || []) {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const displayName = msg.sender_id === user.id ? msg.receiver_display_name : msg.sender_display_name;

        if (!threadMap.has(msg.thread_id)) {
          const unreadCount = (allMessages || []).filter(
            m => m.thread_id === msg.thread_id && 
            m.receiver_id === user.id && 
            !m.is_read
          ).length;

          threadMap.set(msg.thread_id, {
            thread_id: msg.thread_id,
            other_user_id: otherUserId,
            other_user_name: displayName,
            other_user_email: '',
            last_message: msg.message,
            last_message_time: msg.timestamp,
            unread_count: unreadCount,
          });
        }
      }

      setThreads(Array.from(threadMap.values()));
    } catch (error: any) {
      console.error('Error loading threads:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  // Load messages for specific thread
  const loadMessages = async (threadId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // Load from view to get display names
      const { data, error } = await supabase
        .from('v_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
      setSelectedThreadId(threadId);

      // Mark messages as read (update on actual table)
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('thread_id', threadId)
        .eq('receiver_id', user.id);

    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  // Send a new message
  const sendMessage = async (threadId: string, receiverId: string, messageText: string) => {
    if (!user || !messageText.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          thread_id: threadId,
          message: messageText.trim(),
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Mensagem enviada');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  // Create new thread (for admins starting conversation)
  const createThread = async (receiverId: string, messageText: string) => {
    if (!user || !messageText.trim()) return null;

    try {
      const newThreadId = crypto.randomUUID();

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          thread_id: newThreadId,
          message: messageText.trim(),
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Conversa iniciada');
      return newThreadId;
    } catch (error: any) {
      console.error('Error creating thread:', error);
      toast.error('Erro ao criar conversa');
      return null;
    }
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`messages-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id},receiver_id=eq.${user.id}`,
        },
        () => {
          // Reload threads and messages
          loadThreads();
          if (selectedThreadId) {
            loadMessages(selectedThreadId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedThreadId]);

  // Load threads on mount
  useEffect(() => {
    if (user) {
      loadThreads();
    }
  }, [user]);

  return {
    threads,
    messages,
    selectedThreadId,
    loading,
    loadThreads,
    loadMessages,
    sendMessage,
    createThread,
    setSelectedThreadId,
  };
};
