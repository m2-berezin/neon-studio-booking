import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface Thread {
  user_id: string;
  user_name: string;
  last_message: string;
  last_timestamp: string;
  unread_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  thread_id: string;
  message: string;
  timestamp: string;
  is_read: boolean;
}

const AdminMessages = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadThreads = async () => {
    if (!user) return;

    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const threadsMap = new Map<string, Thread>();
      
      for (const msg of messagesData || []) {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        
        if (!threadsMap.has(otherUserId)) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', otherUserId)
            .single();

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', otherUserId)
            .eq('receiver_id', user.id)
            .eq('is_read', false);

          threadsMap.set(otherUserId, {
            user_id: otherUserId,
            user_name: profile?.full_name || 'Cliente',
            last_message: msg.message,
            last_timestamp: msg.timestamp,
            unread_count: count || 0,
          });
        }
      }

      setThreads(Array.from(threadsMap.values()));
    } catch (error) {
      console.error('Error loading threads:', error);
    }
  };

  const markThreadAsRead = async (userId: string) => {
    if (!user) return;

    try {
      const ids = [user.id, userId].sort();
      const threadId = `${ids[0]}-${ids[1]}`;

      // Mark all messages in this thread as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('thread_id', threadId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking thread as read:', error);
    }
  };

  const loadMessages = async (userId: string) => {
    if (!user) return;

    try {
      const ids = [user.id, userId].sort();
      const threadId = `${ids[0]}-${ids[1]}`;

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await markThreadAsRead(userId);
      loadThreads();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId || !user) return;

    try {
      const ids = [user.id, selectedUserId].sort();
      const threadId = `${ids[0]}-${ids[1]}`;

      const { error } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          receiver_id: selectedUserId,
          message: newMessage.trim(),
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadThreads();

      const channel = supabase
        .channel('admin-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          () => {
            loadThreads();
            if (selectedUserId) {
              loadMessages(selectedUserId);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return null;

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Mensagens</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Conversas</h2>
            <ScrollArea className="h-[500px]">
              {threads.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Sem mensagens</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {threads.map((thread) => (
                    <Button
                      key={thread.user_id}
                      variant={selectedUserId === thread.user_id ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        setSelectedUserId(thread.user_id);
                        loadMessages(thread.user_id);
                      }}
                    >
                      <div className="flex-1 text-left">
                        <div className="font-semibold">{thread.user_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {thread.last_message}
                        </div>
                      </div>
                      {thread.unread_count > 0 && (
                        <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">
                          {thread.unread_count}
                        </div>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          <Card className="md:col-span-2 flex flex-col h-[580px]">
            {selectedUserId ? (
              <>
                <div className="p-4 border-b">
                  <h2 className="font-semibold">
                    {threads.find((t) => t.user_id === selectedUserId)?.user_name || 'Cliente'}
                  </h2>
                </div>

                <ScrollArea className="flex-1 p-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground">Sem mensagens</div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isSender = msg.sender_id === user.id;
                        return (
                          <div
                            key={msg.id}
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
                          handleSendMessage();
                        }
                      }}
                      placeholder="Escreve a tua mensagem..."
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Seleciona uma conversa
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMessages;
