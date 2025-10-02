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
  sender_profile?: {
    full_name: string;
    email: string;
  };
  receiver_profile?: {
    full_name: string;
    email: string;
  };
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

  // Check if current user is admin
  const isAdmin = async () => {
    if (!user) return false;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    return !!data;
  };

  // Load all threads for current user
  const loadThreads = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const isUserAdmin = await isAdmin();

      // Get all messages involving current user
      const { data: allMessages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Group messages by thread and get user names
      const threadMap = new Map<string, Thread>();

      for (const msg of allMessages || []) {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        
        // Get other user's profile
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', otherUserId)
          .single();

        let displayName = otherProfile?.full_name || 'Usuário';

        // For users (not admins), check if the other person is an admin and show admin name
        if (!isUserAdmin && msg.sender_id !== user.id) {
          const { data: senderRoles } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', msg.sender_id)
            .eq('role', 'admin')
            .maybeSingle();
          
          if (senderRoles) {
            // Get sender email to determine which admin
            const { data: { user: authUser } } = await supabase.auth.admin.getUserById(msg.sender_id);
            if (authUser?.email === 'ghostwayne777@hotmail.com') {
              displayName = 'Ghost Wayne';
            } else if (authUser?.email === 'maximberezin.pro@outlook.com') {
              displayName = 'MAX.I.M';
            }
          }
        }

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
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
      setSelectedThreadId(threadId);

      // Mark messages as read
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
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('Message update:', payload);
          
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
