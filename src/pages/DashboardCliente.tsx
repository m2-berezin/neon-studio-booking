import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Gift, Music, MessageSquare, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { DebugPanel } from '@/components/DebugPanel';

const ADMIN_ID = '6d9d1dc1-e16f-4f3d-a817-1591a1b27477';

interface MessageWithSender {
  id: string;
  sender_id: string;
  receiver_id: string;
  thread_id: string;
  message: string;
  timestamp: string;
  is_read: boolean;
  sender_name: string | null;
}

const DashboardCliente = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [renewalCount, setRenewalCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Enable realtime sync for all user data
  useRealtimeSync();

  const loadMessages = async () => {
    if (!user) return;

    try {
      const ids = [user.id, ADMIN_ID].sort();
      const threadId = `${ids[0]}-${ids[1]}`;

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Fetch sender names separately
      const messagesWithSender = await Promise.all((data || []).map(async (msg) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', msg.sender_id)
          .single();
        
        return {
          ...msg,
          sender_name: profile?.full_name || null
        };
      }));
      
      setMessages(messagesWithSender);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadUnreadCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadRenewalCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('title', 'Renovação da Subscrição')
        .eq('read', false);

      if (error) throw error;
      setRenewalCount(count || 0);
    } catch (error) {
      console.error('Error loading renewal count:', error);
    }
  };

  const sendMessageFunc = async () => {
    if (!user || !newMessage.trim()) return;

    try {
      const ids = [user.id, ADMIN_ID].sort();
      const threadId = `${ids[0]}-${ids[1]}`;

      const { error } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          receiver_id: ADMIN_ID,
          message: newMessage.trim(),
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;
      setNewMessage('');
      toast.success('Mensagem enviada');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const markNotificationsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadMessages();
      loadUnreadCount();
      loadRenewalCount();

      const ids = [user.id, ADMIN_ID].sort();
      const threadId = `${ids[0]}-${ids[1]}`;

      const messagesChannel = supabase
        .channel('client-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `thread_id=eq.${threadId}`,
          },
          () => {
            loadMessages();
          }
        )
        .subscribe();

      const notificationsChannel = supabase
        .channel('client-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadUnreadCount();
            loadRenewalCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(notificationsChannel);
      };
    }
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return null;

  return (
    <>
      <DebugPanel />
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <Tabs defaultValue="overview" onValueChange={(value) => {
        if (value === 'messages') {
          markNotificationsRead();
        }
        if (value === 'subscriptions') {
          // Mark renewal notifications as read
          if (user && renewalCount > 0) {
            supabase
              .from('notifications')
              .update({ read: true })
              .eq('user_id', user.id)
              .eq('title', 'Renovação da Subscrição')
              .eq('read', false)
              .then(() => setRenewalCount(0));
          }
        }
      }}>
        <TabsList className="grid w-full grid-cols-3 max-w-3xl">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="subscriptions" className="relative">
            Subscrições
            {renewalCount > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {renewalCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages" className="relative">
            Mensagens
            {unreadCount > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/book')}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reservar</p>
                  <p className="text-xl font-bold">Nova Sessão</p>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/mix-master')}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Music className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Enviar</p>
                  <p className="text-xl font-bold">Mix & Master</p>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/rewards')}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ver</p>
                  <p className="text-xl font-bold">Recompensas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                Funcionalidade de subscrições em breve...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          <Card className="flex flex-col h-[600px]">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Chat com 7T7 Studios</h2>
            </div>

            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Sem mensagens</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isSender = msg.sender_id === user.id;
                    return (
                      <div key={msg.id}>
                        {!isSender && msg.sender_name && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {msg.sender_name}
                          </p>
                        )}
                        <div
                          className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              isSender
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(msg.timestamp).toLocaleTimeString('pt-PT', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessageFunc();
                    }
                  }}
                  placeholder="Escreve a tua mensagem..."
                  className="flex-1"
                />
                <Button onClick={sendMessageFunc} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
};

export default DashboardCliente;
