import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { refetchUnreadMessages } from '@/hooks/useUnreadMessages';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  thread_id: string;
  message: string;
  timestamp: string;
  is_read: boolean;
}

const ADMIN_ID = '6d9d1dc1-e16f-4f3d-a817-1591a1b27477';

const Messages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const markThreadAsRead = async () => {
    if (!user) return;
    
    try {
      const ids = [user.id, ADMIN_ID].sort();
      const threadId = `${ids[0]}-${ids[1]}`;
      
      // Mark all messages in this thread as read
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('thread_id', threadId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking thread as read:', error);
      } else {
        console.log('Messages marked as read');
        
        // Force immediate refetch of unread count
        setTimeout(() => {
          refetchUnreadMessages();
        }, 100);
      }
    } catch (error) {
      console.error('Error marking thread as read:', error);
    }
  };

  const loadMessages = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const ids = [user.id, ADMIN_ID].sort();
      const threadId = `${ids[0]}-${ids[1]}`;
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read immediately after loading
      await markThreadAsRead();
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
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
      toast.success('Mensagem enviada');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  useEffect(() => {
    if (user) {
      loadMessages();

      const ids = [user.id, ADMIN_ID].sort();
      const threadId = `${ids[0]}-${ids[1]}`;

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
            loadMessages();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `thread_id=eq.${threadId}`,
          },
          () => {
            // Reload to reflect read status changes
            loadMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    await sendMessageFunc();
    setNewMessage('');
    await markThreadAsRead();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) return null;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Mensagens</h1>
      
      <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="p-3 border-b bg-card">
          <h2 className="font-semibold text-sm">Chat com 7T7 Studios</h2>
        </div>

        <ScrollArea className="flex-1 p-3">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">A carregar...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">Sem mensagens</p>
              <p className="text-xs mt-1">Envia a primeira mensagem!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isSender = msg.sender_id === user.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                        isSender
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                      <p className="text-[10px] opacity-70 mt-0.5">
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

        <div className="p-3 border-t bg-card">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Mensagem..."
              className="flex-1 text-sm"
            />
            <Button 
              onClick={handleSendMessage} 
              size="icon"
              disabled={!newMessage.trim()}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Messages;
