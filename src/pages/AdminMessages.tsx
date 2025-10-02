import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { MessageSquare, Send, User, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  sender?: {
    full_name: string;
  };
  recipient?: {
    full_name: string;
  };
}

interface Conversation {
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

const AdminMessages = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { markConversationAsRead } = useUnreadMessages();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadConversations = async () => {
    if (!user) return;

    try {
      // Get messages from shared admin inbox (receiver_role='admin') or direct admin messages
      const { data: allMessages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(full_name, role),
          recipient:profiles!messages_recipient_id_fkey(full_name, role)
        `)
        .or(`receiver_role.eq.admin,recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by user conversations
      const conversationMap = new Map<string, Conversation>();

      allMessages?.forEach((msg: any) => {
        const senderRole = msg.sender?.role;
        const recipientRole = msg.recipient?.role;
        
        // Skip admin-to-admin messages (unless they're in shared inbox)
        if (senderRole === 'admin' && recipientRole === 'admin' && !msg.receiver_role) return;
        
        // Determine which participant is the user (non-admin)
        let userId: string;
        let userName: string;
        
        if (msg.receiver_role === 'admin') {
          // Message from user to shared admin inbox
          userId = msg.sender_id;
          userName = msg.sender?.full_name || 'Utilizador Desconhecido';
        } else if (senderRole !== 'admin') {
          // Message from user to specific admin
          userId = msg.sender_id;
          userName = msg.sender?.full_name || 'Utilizador Desconhecido';
        } else {
          // Message from admin to user
          userId = msg.recipient_id;
          userName = msg.recipient?.full_name || 'Utilizador Desconhecido';
        }

        if (!conversationMap.has(userId) || 
            new Date(msg.created_at) > new Date(conversationMap.get(userId)!.lastMessageTime)) {
          conversationMap.set(userId, {
            userId: userId,
            userName: userName,
            lastMessage: msg.body,
            lastMessageTime: msg.created_at,
            unreadCount: 0,
          });
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as conversas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (userId: string) => {
    if (!user) return;

    try {
      // Load messages from shared admin inbox OR responses from ANY admin to this user
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(full_name),
          recipient:profiles!messages_recipient_id_fkey(full_name)
        `)
        .or(`and(sender_id.eq.${userId},receiver_role.eq.admin),recipient_id.eq.${userId}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      // Mark messages as read when admin opens the conversation
      const unreadMessageIds = (data || [])
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
      console.error('Error loading messages:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as mensagens',
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedUserId || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: selectedUserId,
          body: newMessage.trim(),
          thread_type: 'direct',
        });

      if (error) throw error;

      // Create notification for recipient
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedUserId,
          title: 'Nova Mensagem do Admin',
          body: newMessage.trim().substring(0, 100),
        });

      setNewMessage('');
      await loadMessages(selectedUserId);
      await loadConversations();

      toast({
        title: 'Mensagem Enviada',
        description: 'A sua mensagem foi enviada com sucesso',
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (isAdmin() && user) {
      loadConversations();

      // Set up realtime subscription for shared admin inbox
      const channel = supabase
        .channel('admin-shared-inbox')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async (payload) => {
            console.log('✅ Nova mensagem recebida (shared inbox):', payload);
            
            // Check if message is for admin inbox or involves current admin
            const isAdminInboxMessage = payload.new.receiver_role === 'admin';
            const isDirectToAdmin = payload.new.recipient_id === user.id;
            const isFromAdmin = payload.new.sender_id === user.id;
            
            if (isAdminInboxMessage || isDirectToAdmin || isFromAdmin) {
              // Reload conversations to show new message
              loadConversations();
              
              // If viewing this conversation, reload messages
              const userId = isAdminInboxMessage ? payload.new.sender_id : 
                            (isFromAdmin ? payload.new.recipient_id : payload.new.sender_id);
              
              if (selectedUserId && userId === selectedUserId) {
                loadMessages(selectedUserId);
              }
              
              // Show toast notification for new user messages to admin inbox
              if (isAdminInboxMessage && payload.new.sender_id !== user.id) {
                toast({
                  title: 'Nova Mensagem',
                  description: 'Recebeste uma nova mensagem de um utilizador',
                });
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Admin shared inbox subscription status:', status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin, user, selectedUserId]);

  useEffect(() => {
    if (selectedUserId) {
      loadMessages(selectedUserId);
    }
  }, [selectedUserId]);

  if (!isAdmin()) {
    return (
      <div className="text-center py-8">
        <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acesso de Admin Necessário</h2>
        <p className="text-muted-foreground">Precisas de privilégios de administrador.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
      {/* Conversations List */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Sem conversas</p>
              </div>
            ) : (
              <div className="space-y-1 p-4">
                {conversations.map((conv) => (
                  <div
                    key={conv.userId}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedUserId === conv.userId
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setSelectedUserId(conv.userId);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{conv.userName}</span>
                      {conv.unreadCount > 0 && (
                        <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(conv.lastMessageTime), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Messages Area */}
      <Card className="md:col-span-2">
        {selectedUserId ? (
          <>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {conversations.find(c => c.userId === selectedUserId)?.userName}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col h-[calc(100vh-340px)] p-0">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isAdmin = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isAdmin
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{msg.body}</p>
                          <p className={`text-xs mt-1 ${isAdmin ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escreva a sua mensagem..."
                    className="resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    size="icon"
                    className="h-full"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Selecione uma conversa para começar</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default AdminMessages;
