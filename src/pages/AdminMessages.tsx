import { useState, useRef, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useMessaging } from '@/hooks/useMessaging';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const AdminMessages = () => {
  const { user } = useAuth();
  const { threads, messages, selectedThreadId, loadMessages, sendMessage, setSelectedThreadId } = useMessaging();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedThread = threads.find(t => t.thread_id === selectedThreadId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThreadId || !selectedThread) return;

    await sendMessage(selectedThreadId, selectedThread.other_user_id, newMessage);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-4">
        <Card className="h-[calc(100vh-180px)] flex overflow-hidden">
          {/* Threads List */}
          {!selectedThreadId ? (
            <div className="w-full p-4">
              <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-primary" />
                Mensagens dos Clientes
              </h1>
              
              <ScrollArea className="h-[calc(100vh-280px)]">
                {threads.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhuma conversa ainda
                  </div>
                ) : (
                  <div className="space-y-2">
                    {threads.map((thread) => (
                      <Button
                        key={thread.thread_id}
                        variant="ghost"
                        className="w-full justify-start h-auto p-4"
                        onClick={() => loadMessages(thread.thread_id)}
                      >
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold">{thread.other_user_name}</span>
                            {thread.unread_count > 0 && (
                              <span className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-full">
                                {thread.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {thread.last_message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(thread.last_message_time).toLocaleString('pt-PT', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            /* Messages View */
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedThreadId(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="font-semibold">{selectedThread?.other_user_name}</h2>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isSender = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex',
                          isSender ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[70%] rounded-2xl px-4 py-2',
                            isSender
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground'
                          )}
                        >
                          <p className="text-sm">{message.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message.timestamp).toLocaleTimeString('pt-PT', {
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
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Responde ao cliente..."
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminMessages;
