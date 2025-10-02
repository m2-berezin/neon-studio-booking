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
      console.log('👤 loadThreads - User:', user.id, 'isAdmin:', isUserAdmin);

      let messages;
      
      if (isUserAdmin) {
        // ADMINS: Fetch ALL messages from shared inbox (receiver_role='admin') OR sent by this admin
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender_profile:profiles!messages_sender_id_fkey(full_name, role),
            recipient_profile:profiles!messages_recipient_id_fkey(full_name, role)
          `)
          .or(`receiver_role.eq.admin,sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        messages = data;
        console.log('👨‍💼 Admin loaded:', messages?.length, 'messages');
      } else {
        // NON-ADMINS: Load messages they sent or received
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender_profile:profiles!messages_sender_id_fkey(full_name, role),
            recipient_profile:profiles!messages_recipient_id_fkey(full_name, role)
          `)
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        messages = data;
        console.log('👤 User loaded:', messages?.length, 'messages');
      }

      // Group messages by conversation partner
      const threadMap = new Map<string, MessageThread>();
      
      messages?.forEach((message: any) => {
        let partnerId: string;
        let partnerName: string;
        
        if (!isUserAdmin) {
          // NON-ADMIN: Show admin name from messages
          const isAdminMessage = message.receiver_role === 'admin' || 
                                 message.sender_profile?.role === 'admin' ||
                                 message.recipient_profile?.role === 'admin';
          
          if (isAdminMessage) {
            // Use admin-inbox as thread ID but show actual admin name
            partnerId = 'admin-inbox';
            
            // Get admin name from the message
            const senderProfile = Array.isArray(message.sender_profile) 
              ? message.sender_profile[0] 
              : message.sender_profile;
            const recipientProfile = Array.isArray(message.recipient_profile)
              ? message.recipient_profile[0]
              : message.recipient_profile;
            
            // If message is from admin, use admin name; otherwise use "Admin Team"
            if (message.sender_id !== user.id && senderProfile?.role === 'admin') {
              partnerName = senderProfile?.full_name || 'Admin';
            } else if (recipientProfile?.role === 'admin') {
              partnerName = recipientProfile?.full_name || 'Admin Team';
            } else {
              partnerName = 'Admin Team';
            }
            
            console.log('📨 Admin thread - Partner:', partnerName, '| Message from:', message.sender_id === user.id ? 'me' : senderProfile?.full_name);
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
          // ADMIN: Group by user who sent message to admin inbox OR direct messages
          if (message.receiver_role === 'admin') {
            // Message sent TO admin inbox - group by sender
            partnerId = message.sender_id;
            const senderProfile = Array.isArray(message.sender_profile) 
              ? message.sender_profile[0] 
              : message.sender_profile;
            partnerName = senderProfile?.full_name || 'Utilizador Desconhecido';
            console.log('📥 Admin inbox message from:', partnerName, partnerId);
          } else if (message.sender_id === user.id) {
            // Message sent BY this admin - group by recipient
            partnerId = message.recipient_id;
            const recipientProfile = Array.isArray(message.recipient_profile)
              ? message.recipient_profile[0]
              : message.recipient_profile;
            partnerName = recipientProfile?.full_name || 'Utilizador Desconhecido';
            console.log('📤 Admin sent to:', partnerName, partnerId);
          } else {
            // Direct message TO this admin
            partnerId = message.sender_id;
            const senderProfile = Array.isArray(message.sender_profile) 
              ? message.sender_profile[0] 
              : message.sender_profile;
            partnerName = senderProfile?.full_name || 'Utilizador Desconhecido';
            console.log('📨 Direct to admin from:', partnerName, partnerId);
          }
        }

        if (!threadMap.has(partnerId)) {
          threadMap.set(partnerId, {
            recipient_id: partnerId,
            recipient_name: partnerName,
            latest_message: message,
            unread_count: 0
          });
        } else {
          // Update with latest message if this one is newer
          const existing = threadMap.get(partnerId);
          if (existing && new Date(message.created_at) > new Date(existing.latest_message.created_at)) {
            threadMap.set(partnerId, {
              ...existing,
              latest_message: message
            });
          }
        }
      });

      console.log('📋 Total threads:', threadMap.size);
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
        console.log('🔍 Loading admin inbox thread for user:', user.id);
        
        // Get current user role
        const { data: currentUserProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const isUserAdmin = currentUserProfile?.role === 'admin';
        console.log('👤 User is admin:', isUserAdmin);

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
          // Non-admin viewing admin inbox: 
          // 1. Messages they sent to admin inbox (receiver_role='admin')
          // 2. Messages sent directly to them from admins (recipient_id=user.id AND sender is admin)
          query = supabase
            .from('messages')
            .select(`
              *,
              sender_profile:profiles!messages_sender_id_fkey(full_name, role),
              recipient_profile:profiles!messages_recipient_id_fkey(full_name, role)
            `)
            .or(`and(sender_id.eq.${user.id},receiver_role.eq.admin),and(recipient_id.eq.${user.id},sender_profile.role.eq.admin)`)
            .order('created_at', { ascending: true });
            
          console.log('📥 Non-admin loading: messages sent to admin OR received from admin');
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

      if (error) {
        console.error('❌ Error loading thread:', error);
        throw error;
      }

      console.log('✅ Loaded', messages?.length || 0, 'messages for thread:', recipientId);
      
      if (messages && messages.length > 0) {
        console.log('📨 Sample messages:', messages.slice(0, 3).map(m => ({
          from: m.sender_profile?.full_name,
          to: m.recipient_profile?.full_name || 'admin inbox',
          body: m.body.substring(0, 30),
          receiver_role: m.receiver_role
        })));
      }

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

      console.log('🔍 sendMessage - User:', user.id, 'isAdmin:', isUserAdmin, 'recipientId:', recipientId);

      // NON-ADMIN users ALWAYS send to shared admin inbox
      if (!isUserAdmin) {
        console.log('📤 NON-ADMIN → Sending to shared admin inbox');

        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            recipient_id: null,  // NO specific recipient
            receiver_role: 'admin',  // SHARED INBOX
            body,
            thread_type: threadType,
            attachments: messageAttachments.length > 0 ? (messageAttachments as any) : null
          });

        if (error) {
          console.error('❌ Error sending to admin inbox:', error);
          throw error;
        }

        console.log('✅ Message sent to shared admin inbox');

        // Notify ALL admins
        const { data: adminUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin');

        if (adminUsers) {
          console.log('📢 Notifying', adminUsers.length, 'admins');
          for (const admin of adminUsers) {
            try {
              await createNotification(
                admin.id,
                'Nova Mensagem de Utilizador',
                `${user.user_metadata?.full_name || 'Um utilizador'}: ${body.length > 50 ? body.substring(0, 50) + '...' : body}`
              );
            } catch (notifError) {
              console.warn('⚠️ Notification error:', notifError);
            }
          }
        }

        await loadThreads();

        toast({
          title: 'Mensagem Enviada',
          description: 'A tua mensagem foi enviada para a equipa de admins.',
        });

        return true;
      }

      // ADMIN sending message - sempre usar Ghost Wayne como remetente
      console.log('📤 ADMIN → Sending message as Ghost Wayne to user:', recipientId);

      // Get Ghost Wayne's ID (primeiro admin encontrado)
      const { data: ghostWayne } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (!ghostWayne) {
        console.error('❌ Ghost Wayne not found!');
        throw new Error('Ghost Wayne admin account not found');
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: ghostWayne.id,  // SEMPRE Ghost Wayne
          recipient_id: recipientId,  // Direct to user
          receiver_role: null,  // NOT shared inbox
          body,
          thread_type: threadType,
          attachments: messageAttachments.length > 0 ? (messageAttachments as any) : null
        });

      if (error) {
        console.error('❌ Error sending admin message:', error);
        throw error;
      }

      console.log('✅ Admin message sent successfully');

      // Notify recipient
      try {
        await createNotification(
          recipientId, 
          'Nova Mensagem', 
          `Tens uma nova mensagem: ${body.length > 50 ? body.substring(0, 50) + '...' : body}`
        );
      } catch (notifError) {
        console.warn('⚠️ Notification error:', notifError);
      }

      // Reload current thread if viewing it
      if (currentRecipient === recipientId) {
        await loadThread(recipientId);
      }

      // Reload threads
      await loadThreads();

      toast({
        title: 'Mensagem Enviada',
        description: 'A tua mensagem foi enviada com sucesso.',
      });

      return true;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro ao Enviar',
        description: error.message || 'Falha ao enviar mensagem',
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
        
        const adminStatus = profile?.role === 'admin';
        setIsAdmin(adminStatus);
        console.log('👤 User role:', profile?.role, '| Is Admin:', adminStatus);
        return adminStatus;
      };

      checkAdminStatus().then((adminStatus) => {
        loadThreads();

        // Create realtime subscription
        const channelName = `messages-realtime-${user.id}`;
        console.log('📡 Creating realtime channel:', channelName, '| Is Admin:', adminStatus);

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
              console.log('📨 NEW MESSAGE EVENT:', {
                sender_id: payload.new.sender_id,
                recipient_id: payload.new.recipient_id,
                receiver_role: payload.new.receiver_role,
                current_user: user.id,
                is_admin: adminStatus,
                body_preview: payload.new.body?.substring(0, 30)
              });

              // Direct message TO this user
              const isDirectToMe = payload.new.recipient_id === user.id;
              
              // Message FROM this user
              const isFromMe = payload.new.sender_id === user.id;
              
              // Message TO shared admin inbox (for ALL admins)
              const isAdminInboxMessage = payload.new.receiver_role === 'admin' && 
                                         payload.new.sender_id !== user.id;

              if (isDirectToMe) {
                console.log('✅ Direct message TO ME - reloading');
                loadThreads();
                
                if (payload.new.sender_id === currentRecipient) {
                  loadThread(currentRecipient);
                }
              } else if (isAdminInboxMessage && adminStatus) {
                console.log('✅ ADMIN INBOX MESSAGE - I am admin, reloading ALL threads');
                loadThreads();
                
                // If viewing this user's thread, reload it
                if (currentRecipient === payload.new.sender_id) {
                  loadThread(payload.new.sender_id);
                }

                toast({
                  title: 'Nova Mensagem',
                  description: 'Recebeste uma nova mensagem de um utilizador',
                });
              } else if (isFromMe) {
                console.log('✅ Message FROM ME - reloading threads');
                loadThreads();
              } else {
                console.log('ℹ️ Message not relevant to this user');
              }
            }
          )
          .subscribe((status) => {
            console.log('📡 Realtime subscription status:', status);
          });

        return () => {
          console.log('📡 Cleaning up channel:', channelName);
          supabase.removeChannel(messagesChannel);
        };
      });
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