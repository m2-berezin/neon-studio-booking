import { useState, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useMessaging } from '@/hooks/useMessaging';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Send, Music, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const Messages = () => {
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
    <Layout>
      <div 
        className="container mx-auto px-4 py-4 max-w-6xl"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      >
        <Card className="h-[calc(100vh-140px)] flex overflow-hidden bg-background/95 backdrop-blur">
          {/* Threads List */}
          {!selectedThreadId ? (
            <div className="w-full p-4">
              <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Music className="w-7 h-7 text-primary animate-pulse" />
                <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                  Mensagens
                </span>
              </h1>
              
              <ScrollArea className="h-[calc(100vh-240px)]">
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
                              <Music className="w-5 h-5 text-primary" />
                              <span className="font-semibold text-lg">{thread.other_user_name}</span>
                            </div>
                            {thread.unread_count > 0 && (
                              <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                                {thread.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1 pl-7">
                            {thread.last_message}
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-1 pl-7">
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
                  <Music className="w-6 h-6 text-primary" />
                  <div>
                    <h2 className="font-bold text-lg">{selectedThread?.other_user_name}</h2>
                    <p className="text-xs text-muted-foreground">Studio Producer</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4 bg-muted/20">
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isSender = message.sender_id === user?.id;
                    const isWelcomeMessage = message.message.includes('Bem-vindo') || message.message.includes('Recompensas');
                    
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
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : isWelcomeMessage
                              ? 'bg-gradient-to-br from-purple-500 to-primary text-white rounded-bl-sm border-2 border-primary/30'
                              : 'bg-secondary text-secondary-foreground rounded-bl-sm'
                          )}
                        >
                          {!isSender && isWelcomeMessage && (
                            <div className="flex items-center gap-2 mb-2 text-white/90">
                              <Music className="w-4 h-4 animate-pulse" />
                              <span className="text-xs font-semibold">{selectedThread?.other_user_name}</span>
                            </div>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
                          <p className={cn(
                            "text-xs mt-2 flex items-center gap-1",
                            isSender ? "opacity-80" : isWelcomeMessage ? "text-white/70" : "opacity-70"
                          )}>
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
                    placeholder="Escreve a tua mensagem..."
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
    </Layout>
  );
};

export default Messages;
