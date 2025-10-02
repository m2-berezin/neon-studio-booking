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
        <Card className="h-[calc(100vh-180px)] flex overflow-hidden bg-background/95 backdrop-blur">
          {/* Threads List */}
          {!selectedThreadId ? (
            <div className="w-full p-4">
              <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <MessageCircle className="w-7 h-7 text-primary animate-pulse" />
                <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                  Mensagens dos Clientes
                </span>
              </h1>
              
              <ScrollArea className="h-[calc(100vh-280px)]">
                {threads.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>Nenhuma conversa ainda</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {threads.map((thread) => (
                      <Button
                        key={thread.thread_id}
                        variant="ghost"
                        className="w-full justify-start h-auto p-4 hover:bg-primary/10 transition-all duration-200 rounded-xl"
                        onClick={() => loadMessages(thread.thread_id)}
                      >
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-primary font-bold">
                                  {thread.other_user_name.charAt(0)}
                                </span>
                              </div>
                              <span className="font-semibold text-lg">{thread.other_user_name}</span>
                            </div>
                            {thread.unread_count > 0 && (
                              <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                                {thread.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1 pl-12">
                            {thread.last_message}
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-1 pl-12">
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
              <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-purple-500/10 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedThreadId(null)}
                  className="hover:bg-background/50"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold">
                      {selectedThread?.other_user_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{selectedThread?.other_user_name}</h2>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4 bg-muted/20">
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
                            'max-w-[75%] rounded-2xl px-4 py-3 shadow-lg transition-all duration-200 hover:shadow-xl',
                            isSender
                              ? 'bg-gradient-to-br from-primary to-purple-500 text-primary-foreground rounded-br-sm'
                              : 'bg-secondary text-secondary-foreground rounded-bl-sm'
                          )}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
                          <p className="text-xs opacity-70 mt-2">
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
              <div className="p-4 border-t bg-background/50 backdrop-blur">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Responde ao cliente..."
                    className="flex-1 rounded-full border-2 focus:border-primary transition-colors"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    size="icon"
                    className="rounded-full w-12 h-12 bg-gradient-to-r from-primary to-purple-500 hover:shadow-lg transition-all"
                  >
                    <Send className="w-5 h-5" />
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
