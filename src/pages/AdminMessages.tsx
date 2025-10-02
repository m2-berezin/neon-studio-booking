import { useState, useRef, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useMessaging } from '@/hooks/useMessaging';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Send, MessageCircle, Music, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const AdminMessages = () => {
  const { user } = useAuth();
  const { threads, messages, selectedThreadId, loadMessages, sendMessage, setSelectedThreadId } = useMessaging();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedThread = threads.find(t => t.thread_id === selectedThreadId);

  // No auto-scroll - user controls scroll manually

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
        <Card className="h-[calc(100vh-180px)] flex overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 shadow-2xl border-primary/20">
          {/* Threads List */}
          {!selectedThreadId ? (
            <div className="w-full p-6">
              <h1 className="text-3xl font-bold mb-6 flex items-center gap-3 bg-gradient-to-r from-primary via-purple-600 to-blue-500 bg-clip-text text-transparent">
                <MessageCircle className="w-8 h-8 text-primary animate-pulse" />
                Mensagens dos Clientes
              </h1>
              
              <ScrollArea className="h-[calc(100vh-280px)]">
                {threads.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-4">
                    <MessageCircle className="w-20 h-20 opacity-20 animate-bounce" />
                    <p className="text-lg">Nenhuma conversa ainda</p>
                    <p className="text-sm opacity-70">As conversas com clientes aparecerão aqui</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {threads.map((thread) => (
                      <Button
                        key={thread.thread_id}
                        variant="ghost"
                        className="w-full justify-start h-auto p-5 hover:bg-primary/10 hover:scale-[1.02] transition-all rounded-2xl"
                        onClick={() => loadMessages(thread.thread_id)}
                      >
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center shadow-md">
                                <span className="text-primary font-bold text-lg">
                                  {thread.other_user_name.charAt(0)}
                                </span>
                              </div>
                              <span className="font-bold text-lg">{thread.other_user_name}</span>
                            </div>
                            {thread.unread_count > 0 && (
                              <span className="relative bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                                {thread.unread_count}
                                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2 pl-1">
                            {thread.last_message}
                          </p>
                          <p className="text-xs text-muted-foreground/70 pl-1">
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
            <div className="flex-1 flex flex-col bg-gradient-to-b from-background to-primary/5">
              {/* Header */}
              <div className="p-5 border-b bg-card/50 backdrop-blur-sm flex items-center gap-3 shadow-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-primary/10"
                  onClick={() => setSelectedThreadId(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center shadow-md">
                    <span className="text-primary font-bold text-lg">
                      {selectedThread?.other_user_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{selectedThread?.other_user_name}</h2>
                    <p className="text-xs text-muted-foreground">Cliente • 7T7Studios</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {messages.map((message, index) => {
                    const isSender = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex gap-3 animate-in fade-in slide-in-from-bottom-2',
                          isSender ? 'justify-end' : 'justify-start'
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {!isSender && (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center shadow-md flex-shrink-0">
                            <span className="text-primary font-bold">
                              {selectedThread?.other_user_name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div
                          className={cn(
                            'max-w-[75%] rounded-2xl px-5 py-3 shadow-md transition-all hover:scale-[1.02]',
                            isSender
                              ? 'bg-gradient-to-br from-primary via-purple-600 to-purple-700 text-white rounded-br-sm shadow-lg'
                              : 'bg-card text-card-foreground rounded-bl-sm border shadow-sm'
                          )}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
                          <p className={cn(
                            "text-xs mt-2 flex items-center gap-1",
                            isSender ? "text-white/80" : "opacity-60"
                          )}>
                            {new Date(message.timestamp).toLocaleTimeString('pt-PT', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {isSender && message.is_read && (
                              <CheckCheck className="w-3 h-3 ml-1" />
                            )}
                          </p>
                        </div>
                        {isSender && (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                            <Music className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-5 border-t bg-card/50 backdrop-blur-sm">
                <div className="flex gap-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Responde ao cliente... 🎵"
                    className="flex-1 text-base h-12 rounded-full px-6 bg-background/50 border-primary/20 focus:border-primary transition-all"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    size="icon"
                    className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-purple-600 hover:scale-110 transition-transform shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!newMessage.trim()}
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
