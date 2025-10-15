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
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
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

  const uploadAttachment = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erro ao enviar ficheiro');
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast.error('Erro ao enviar ficheiro');
      return null;
    }
  };

  const sendMessage = async (
    receiverId: string, 
    messageText: string, 
    attachment?: File
  ) => {
    if (!user || (!messageText.trim() && !attachment)) return;

    try {
      const threadId = getThreadId(user.id, receiverId);
      
      let attachmentUrl: string | null = null;
      let attachmentType: string | null = null;
      let attachmentName: string | null = null;

      if (attachment) {
        attachmentUrl = await uploadAttachment(attachment);
        if (attachmentUrl) {
          attachmentType = attachment.type;
          attachmentName = attachment.name;
        }
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          receiver_id: receiverId,
          message: messageText.trim() || '📎 Anexo',
          timestamp: new Date().toISOString(),
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          attachment_name: attachmentName,
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
    uploadAttachment,
    subscribeToMessages,
    ADMIN_ID,
  };
};
