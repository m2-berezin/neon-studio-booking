import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  receiver_role: string | null;
  body: string;
  created_at: string;
  attachments: any;
  sender_profile?: {
    full_name: string;
    role: string;
  };
}

export interface Thread {
  id: string;
  name: string;
  last_message: string;
  last_message_at: string;
  unread: number;
}

const GHOST_WAYNE_EMAIL = 'ghostwayne777@hotmail.com';

export const useMessaging = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!user) return;
    
    const checkAdmin = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      setIsAdmin(data?.role === 'admin');
    };
    
    checkAdmin();
  }, [user]);

  // Load threads
  const loadThreads = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      if (isAdmin) {
        // Admin: load all client conversations
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender_profile:profiles!messages_sender_id_fkey(full_name, role)
          `)
          .eq('receiver_role', 'admin')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Group by sender
        const threadMap = new Map<string, Thread>();
        data?.forEach((msg: any) => {
          const clientId = msg.sender_id;
          if (!threadMap.has(clientId)) {
            threadMap.set(clientId, {
              id: clientId,
              name: msg.sender_profile?.full_name || 'Utilizador Desconhecido',
              last_message: msg.body,
              last_message_at: msg.created_at,
              unread: 0
            });
          }
        });

        setThreads(Array.from(threadMap.values()));
      } else {
        // Client: only one thread with "Ghost Wayne"
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          setThreads([{
            id: 'ghost-wayne',
            name: 'Ghost Wayne',
            last_message: data[0].body,
            last_message_at: data[0].created_at,
            unread: 0
          }]);
        }
      }
    } catch (error) {
      console.error('Error loading threads:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  // Load messages for a thread
  const loadMessages = async (threadId: string) => {
    if (!user) return;
    
    setLoading(true);
    setSelectedThreadId(threadId);
    
    try {
      if (isAdmin) {
        // Admin viewing client thread
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender_profile:profiles!messages_sender_id_fkey(full_name, role)
          `)
          .or(`and(sender_id.eq.${threadId},receiver_role.eq.admin),and(recipient_id.eq.${threadId},sender_profile.role.eq.admin)`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } else {
        // Client viewing conversation with admins
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender_profile:profiles!messages_sender_id_fkey(full_name, role)
          `)
          .or(`and(sender_id.eq.${user.id},receiver_role.eq.admin),and(recipient_id.eq.${user.id},sender_profile.role.eq.admin)`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async (body: string, attachments?: any) => {
    if (!user || !body.trim()) return false;

    try {
      if (isAdmin) {
        // Admin sending: use Ghost Wayne's ID
        const { data: ghostWayne } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .single();

        if (!ghostWayne) {
          toast.error('Erro ao enviar mensagem');
          return false;
        }

        // Send directly to the selected client
        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: ghostWayne.id,
            recipient_id: selectedThreadId,
            receiver_role: null,
            body: body.trim(),
            thread_type: 'direct',
            attachments
          });

        if (error) throw error;
      } else {
        // Client sending: send to admin inbox
        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            recipient_id: null,
            receiver_role: 'admin',
            body: body.trim(),
            thread_type: 'direct',
            attachments
          });

        if (error) throw error;
      }

      toast.success('Mensagem enviada');
      
      // Reload messages
      if (selectedThreadId) {
        await loadMessages(selectedThreadId);
      }
      
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
      return false;
    }
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
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
  }, [user, selectedThreadId, isAdmin]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadThreads();
    }
  }, [user, isAdmin]);

  return {
    threads,
    messages,
    selectedThreadId,
    isAdmin,
    loading,
    loadMessages,
    sendMessage,
    loadThreads
  };
};
