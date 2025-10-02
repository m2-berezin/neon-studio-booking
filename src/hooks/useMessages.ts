import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';

interface MessageAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  thread_type: string;
  created_at: string;
  project_id?: string;
  attachments?: MessageAttachment[];
  sender_profile?: {
    full_name: string;
    role: string;
  };
  recipient_profile?: {
    full_name: string;
    role: string;
  };
}

interface MessageThread {
  recipient_id: string;
  recipient_name: string;
  latest_message: Message;
  unread_count: number;
}

export const useMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [currentThread, setCurrentThread] = useState<Message[]>([]);
  const [currentRecipient, setCurrentRecipient] = useState<string | null>(null);

  // Load message threads (conversations)
  const loadThreads = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(full_name, role),
          recipient_profile:profiles!messages_recipient_id_fkey(full_name, role)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Messages loaded:', messages?.length);
      if (messages && messages.length > 0) {
        console.log('Sample message:', messages[0]);
      }

      // Group messages by conversation partner
      const threadMap = new Map<string, MessageThread>();
      
      messages?.forEach((message: any) => {
        const isFromUser = message.sender_id === user.id;
        const partnerId = isFromUser ? message.recipient_id : message.sender_id;
        
        // Handle both object and array returns from Supabase
        const senderProfile = Array.isArray(message.sender_profile) 
          ? message.sender_profile[0] 
          : message.sender_profile;
        const recipientProfile = Array.isArray(message.recipient_profile)
          ? message.recipient_profile[0]
          : message.recipient_profile;
        
        const partnerName = isFromUser 
          ? recipientProfile?.full_name || 'Ghost Wayne'
          : senderProfile?.full_name || 'Ghost Wayne';

        console.log('Partner name:', partnerName, 'for partner:', partnerId);

        if (!threadMap.has(partnerId)) {
          threadMap.set(partnerId, {
            recipient_id: partnerId,
            recipient_name: partnerName,
            latest_message: message,
            unread_count: 0
          });
        }
      });

      setThreads(Array.from(threadMap.values()));
    } catch (error) {
      console.error('Error loading threads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load messages for a specific thread
  const loadThread = async (recipientId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(full_name, role),
          recipient_profile:profiles!messages_recipient_id_fkey(full_name, role)
        `)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setCurrentThread((messages || []).map(msg => ({
        ...msg,
        attachments: msg.attachments ? (msg.attachments as any) : undefined
      })));
      setCurrentRecipient(recipientId);
    } catch (error) {
      console.error('Error loading thread:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Upload file attachments
  const uploadAttachments = async (files: File[]): Promise<MessageAttachment[]> => {
    if (!user) return [];

    setUploading(true);
    const uploadedAttachments: MessageAttachment[] = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(fileName);

        uploadedAttachments.push({
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size
        });
      }

      return uploadedAttachments;
    } catch (error) {
      console.error('Error uploading files:', error);
      return [];
    } finally {
      setUploading(false);
    }
  };

  // Send a message
  const sendMessage = async (
    recipientId: string,
    body: string,
    threadType: string = 'direct',
    attachments: File[] = []
  ) => {
    if (!user) return false;

    setLoading(true);
    try {
      let messageAttachments: MessageAttachment[] = [];
      
      // Upload attachments if any
      if (attachments.length > 0) {
        messageAttachments = await uploadAttachments(attachments);
      }

      console.log('📤 Enviando mensagem:', {
        sender_id: user.id,
        recipient_id: recipientId,
        thread_type: threadType,
        body: body.substring(0, 50)
      });

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          body,
          thread_type: threadType,
          attachments: messageAttachments.length > 0 ? (messageAttachments as any) : null
        });

      if (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        throw error;
      }

      console.log('✅ Mensagem enviada com sucesso');

      // Create notification for recipient
      try {
        await createNotification(
          recipientId, 
          'Nova Mensagem', 
          `Tens uma nova mensagem: ${body.length > 50 ? body.substring(0, 50) + '...' : body}`
        );
      } catch (notifError) {
        console.warn('⚠️ Erro ao criar notificação:', notifError);
      }

      // Reload current thread if we're viewing it
      if (currentRecipient === recipientId) {
        await loadThread(recipientId);
      }

      // Reload threads to update latest message
      await loadThreads();

      toast({
        title: 'Message Sent',
        description: 'Your message has been sent successfully.',
      });

      return true;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Send Failed',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Start a conversation with admin (sends to ALL admins)
  const startAdminConversation = async (initialMessage: string, threadType: string = 'direct') => {
    if (!user) return false;

    try {
      // Find all admin users
      const { data: adminUsers, error: adminError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'admin');

      if (adminError) throw adminError;

      if (adminUsers && adminUsers.length > 0) {
        console.log(`📤 Enviando mensagem para ${adminUsers.length} admin(s):`, adminUsers.map(a => a.full_name));
        
        // Send message to all admins
        let success = false;
        for (const admin of adminUsers) {
          const result = await sendMessage(admin.id, initialMessage, threadType);
          if (result) success = true;
        }
        
        return success;
      }

      return false;
    } catch (error) {
      console.error('Error starting admin conversation:', error);
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      loadThreads();

      // Set up realtime subscription for new messages
      const messagesChannel = supabase
        .channel('messages-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('✅ Nova mensagem recebida:', payload);
            console.log('Sender ID:', payload.new.sender_id);
            console.log('Recipient ID:', payload.new.recipient_id);
            
            // Reload threads to show new message
            loadThreads();
            
            // If the new message is for the current conversation, reload it
            if (payload.new.sender_id === currentRecipient) {
              loadThread(currentRecipient);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 User subscription status:', status);
        });

      return () => {
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [user, currentRecipient]);

  return {
    loading,
    uploading,
    threads,
    currentThread,
    currentRecipient,
    loadThread,
    sendMessage,
    startAdminConversation,
    loadThreads,
  };
};