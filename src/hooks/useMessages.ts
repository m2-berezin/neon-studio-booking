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
  const [isAdmin, setIsAdmin] = useState(false);

  // Load message threads (conversations)
  const loadThreads = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Check if current user is admin
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isUserAdmin = currentUserProfile?.role === 'admin';

      // Load messages from direct conversations OR shared admin inbox
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(full_name, role),
          recipient_profile:profiles!messages_recipient_id_fkey(full_name, role)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id},and(sender_id.eq.${user.id},receiver_role.eq.admin)`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Messages loaded:', messages?.length);
      if (messages && messages.length > 0) {
        console.log('Sample message:', messages[0]);
      }

      // Group messages by conversation partner
      const threadMap = new Map<string, MessageThread>();
      
      messages?.forEach((message: any) => {
        let partnerId: string;
        let partnerName: string;
        
        // For non-admin users, show single "Admin Team" thread for all admin communications
        if (!isUserAdmin) {
          const isAdminMessage = message.receiver_role === 'admin' || 
                                 message.sender_profile?.role === 'admin' ||
                                 message.recipient_profile?.role === 'admin';
          
          if (isAdminMessage) {
            partnerId = 'admin-inbox';
            partnerName = 'Admin Team';
          } else {
            // Regular user-to-user message
            const isFromUser = message.sender_id === user.id;
            partnerId = isFromUser ? message.recipient_id : message.sender_id;
            
            const senderProfile = Array.isArray(message.sender_profile) 
              ? message.sender_profile[0] 
              : message.sender_profile;
            const recipientProfile = Array.isArray(message.recipient_profile)
              ? message.recipient_profile[0]
              : message.recipient_profile;
            
            partnerName = isFromUser 
              ? recipientProfile?.full_name || 'Unknown User'
              : senderProfile?.full_name || 'Unknown User';
          }
        } else {
          // Admin users see individual user threads
          if (message.receiver_role === 'admin' && message.sender_id === user.id) {
            partnerId = 'admin-inbox';
            partnerName = 'Admin Team';
          } else {
            const isFromUser = message.sender_id === user.id;
            partnerId = isFromUser ? message.recipient_id : message.sender_id;
            
            const senderProfile = Array.isArray(message.sender_profile) 
              ? message.sender_profile[0] 
              : message.sender_profile;
            const recipientProfile = Array.isArray(message.recipient_profile)
              ? message.recipient_profile[0]
              : message.recipient_profile;
            
            partnerName = isFromUser 
              ? recipientProfile?.full_name || 'Unknown User'
              : senderProfile?.full_name || 'Unknown User';
          }
        }

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
      let query;
      
      // Handle admin inbox thread (all messages between user and any admin)
      if (recipientId === 'admin-inbox') {
        // Get current user role
        const { data: currentUserProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const isUserAdmin = currentUserProfile?.role === 'admin';

        if (isUserAdmin) {
          // Admin viewing admin inbox: messages from user to admin inbox OR admin responses
          query = supabase
            .from('messages')
            .select(`
              *,
              sender_profile:profiles!messages_sender_id_fkey(full_name, role),
              recipient_profile:profiles!messages_recipient_id_fkey(full_name, role)
            `)
            .or(`and(sender_id.eq.${user.id},receiver_role.eq.admin),and(recipient_id.eq.${user.id},sender_profile.role.eq.admin)`)
            .order('created_at', { ascending: true });
        } else {
          // Non-admin viewing admin inbox: messages to/from ANY admin
          query = supabase
            .from('messages')
            .select(`
              *,
              sender_profile:profiles!messages_sender_id_fkey(full_name, role),
              recipient_profile:profiles!messages_recipient_id_fkey(full_name, role)
            `)
            .or(`and(sender_id.eq.${user.id},receiver_role.eq.admin),recipient_id.eq.${user.id}`)
            .order('created_at', { ascending: true });
        }
      } else {
        // Regular direct messages
        query = supabase
          .from('messages')
          .select(`
            *,
            sender_profile:profiles!messages_sender_id_fkey(full_name, role),
            recipient_profile:profiles!messages_recipient_id_fkey(full_name, role)
          `)
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
          .order('created_at', { ascending: true });
      }

      const { data: messages, error } = await query;

      if (error) throw error;

      setCurrentThread((messages || []).map(msg => ({
        ...msg,
        attachments: msg.attachments ? (msg.attachments as any) : undefined
      })));
      setCurrentRecipient(recipientId);
      
      // Mark messages from this sender as read
      const unreadMessageIds = (messages || [])
        .filter(msg => msg.recipient_id === user.id)
        .map(msg => msg.id);
      
      if (unreadMessageIds.length > 0) {
        // Get already marked messages
        const { data: alreadyRead } = await supabase
          .from('message_reads')
          .select('message_id')
          .eq('user_id', user.id)
          .in('message_id', unreadMessageIds);
        
        const alreadyReadIds = new Set(alreadyRead?.map(r => r.message_id) || []);
        
        // Mark new messages as read
        const toMark = unreadMessageIds
          .filter(id => !alreadyReadIds.has(id))
          .map(id => ({ user_id: user.id, message_id: id }));
        
        if (toMark.length > 0) {
          await supabase.from('message_reads').insert(toMark);
          console.log('✅ Marcadas', toMark.length, 'mensagens como lidas');
        }
      }
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

      // Check if current user is admin
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isUserAdmin = currentUserProfile?.role === 'admin';

      console.log('🔍 Verificação de envio:', {
        user_id: user.id,
        isUserAdmin,
        recipientId,
        currentUserRole: currentUserProfile?.role
      });

      // Check if recipient is admin (for non-admin users sending to admins)
      let isRecipientAdmin = false;
      if (!isUserAdmin && recipientId !== 'admin-inbox') {
        const { data: recipientProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', recipientId)
          .single();
        
        isRecipientAdmin = recipientProfile?.role === 'admin';
        
        console.log('🔍 Destinatário:', {
          recipientId,
          isRecipientAdmin,
          recipientRole: recipientProfile?.role
        });
      }

      // If non-admin user is sending to admin, use shared inbox
      if (!isUserAdmin && (isRecipientAdmin || recipientId === 'admin-inbox')) {
        console.log('📤 Enviando mensagem para inbox partilhado de admins');
        console.log('📋 Detalhes:', {
          sender_id: user.id,
          recipient_id: null,
          receiver_role: 'admin',
          isUserAdmin,
          isRecipientAdmin,
          recipientId
        });

        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            recipient_id: null,
            receiver_role: 'admin',
            body,
            thread_type: threadType,
            attachments: messageAttachments.length > 0 ? (messageAttachments as any) : null
          });

        if (error) {
          console.error('❌ Erro ao enviar mensagem:', error);
          throw error;
        }

        console.log('✅ Mensagem enviada para inbox partilhado');

        // Create notification for all admins
        const { data: adminUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin');

        if (adminUsers) {
          console.log('📢 Criando notificações para', adminUsers.length, 'admins');
          for (const admin of adminUsers) {
            try {
              await createNotification(
                admin.id,
                'Nova Mensagem de Utilizador',
                `${user.user_metadata?.full_name || 'Um utilizador'}: ${body.length > 50 ? body.substring(0, 50) + '...' : body}`
              );
            } catch (notifError) {
              console.warn('⚠️ Erro ao criar notificação:', notifError);
            }
          }
        }

        await loadThreads();

        toast({
          title: 'Message Sent',
          description: 'Your message has been sent to the admin team.',
        });

        return true;
      }

      // Regular direct message (admin to user, or user to user)
      console.log('📤 Enviando mensagem direta:', {
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

  // Start a conversation with admin (shared inbox - all admins can see)
  const startAdminConversation = async (initialMessage: string, threadType: string = 'direct') => {
    if (!user) return false;

    setLoading(true);
    try {
      console.log('📤 Enviando mensagem para inbox partilhado de admins');

      // Send message to shared admin inbox (receiver_role='admin', recipient_id=null)
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: null, // No specific recipient
          receiver_role: 'admin', // Shared admin inbox
          body: initialMessage,
          thread_type: threadType,
        });

      if (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        throw error;
      }

      console.log('✅ Mensagem enviada para inbox partilhado de admins');

      // Create notification for all admins
      const { data: adminUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (adminUsers) {
        for (const admin of adminUsers) {
          try {
            await createNotification(
              admin.id,
              'Nova Mensagem',
              `Tens uma nova mensagem: ${initialMessage.length > 50 ? initialMessage.substring(0, 50) + '...' : initialMessage}`
            );
          } catch (notifError) {
            console.warn('⚠️ Erro ao criar notificação:', notifError);
          }
        }
      }

      await loadThreads();

      toast({
        title: 'Message Sent',
        description: 'Your message has been sent to the admin team.',
      });

      return true;
    } catch (error: any) {
      console.error('Error starting admin conversation:', error);
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

  useEffect(() => {
    if (user) {
      // Check if user is admin once on mount
      const checkAdminStatus = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        setIsAdmin(profile?.role === 'admin');
        console.log('👤 User role:', profile?.role, '| Is Admin:', profile?.role === 'admin');
      };

      checkAdminStatus();
      loadThreads();

      // Create unique channel name per user to avoid conflicts
      const channelName = `messages-${user.id}`;
      console.log('📡 Creating channel:', channelName);

      const messagesChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload: any) => {
            console.log('📨 New message event received:', {
              sender_id: payload.new.sender_id,
              recipient_id: payload.new.recipient_id,
              receiver_role: payload.new.receiver_role,
              current_user: user.id,
              is_admin: isAdmin
            });

            // Direct message to this user
            const isDirectToMe = payload.new.recipient_id === user.id;
            
            // Message from this user
            const isFromMe = payload.new.sender_id === user.id;
            
            // Shared admin inbox message (for admins only)
            const isAdminInboxMessage = payload.new.receiver_role === 'admin' && 
                                       payload.new.sender_id !== user.id &&
                                       isAdmin;

            if (isDirectToMe) {
              console.log('✅ Direct message to me');
              loadThreads();
              
              if (payload.new.sender_id === currentRecipient) {
                loadThread(currentRecipient);
              }
            } else if (isAdminInboxMessage) {
              console.log('✅ Admin inbox message (I am admin)');
              loadThreads();
              
              if (currentRecipient === 'admin-inbox') {
                loadThread('admin-inbox');
              }

              toast({
                title: 'Nova Mensagem',
                description: 'Recebeste uma nova mensagem de um utilizador',
              });
            } else if (isFromMe) {
              console.log('✅ Message from me, reloading threads');
              loadThreads();
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Channel subscription status:', status, 'for user:', user.id);
        });

      return () => {
        console.log('📡 Removing channel:', channelName);
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [user, currentRecipient, isAdmin]);

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