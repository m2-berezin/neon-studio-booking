import { useState, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useMessaging } from '@/hooks/useMessaging';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Send, Music, Music2, MessageCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const Messages = () => {
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

  const isFromGhostWayne = (thread: typeof threads[0]) => {
    return thread.other_user_name === 'Ghost Wayne';
  };

  return (
    <Layout>
      <div 
        className="container mx-auto px-0 max-w-6xl"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'80\' height=\'80\' viewBox=\'0 0 80 80\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239333ea\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M0 0h40v40H0V0zm40 40h40v40H40V40z\'/%3E%3Cpath d=\'M20 10c5.523 0 10 4.477 10 10s-4.477 10-10 10-10-4.477-10-10 4.477-10 10-10zm40 40c5.523 0 10 4.477 10 10s-4.477 10-10 10-10-4.477-10-10 4.477-10 10-10z\'/%3E%3C/g%3E%3C/svg%3E")',
        }}
      >
        <Card className="h-[calc(100vh-200px)] flex overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 shadow-2xl border-primary/20">
          {/* Threads List */}
          {!selectedThreadId ? (
            <div className="w-full p-6">
              <h1 className="text-3xl font-bold mb-6 flex items-center gap-3 bg-gradient-to-r from-primary via-purple-600 to-blue-500 bg-clip-text text-transparent">
                <Music2 className="w-8 h-8 text-primary animate-pulse" />
                Mensagens
              </h1>
              
              <ScrollArea className="h-[calc(100vh-240px)]">
                {threads.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-4">
                    <MessageCircle className="w-20 h-20 opacity-20 animate-bounce" />
                    <p className="text-lg">Nenhuma conversa ainda</p>
                    <p className="text-sm opacity-70">As tuas mensagens aparecerão aqui 🎵</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {threads.map((thread) => (
                      <Button
                        key={thread.thread_id}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start h-auto p-5 transition-all hover:bg-primary/10 hover:scale-[1.02] rounded-2xl",
                          isFromGhostWayne(thread) && "border-l-4 border-primary bg-gradient-to-r from-primary/10 via-purple-600/5 to-transparent shadow-md"
                        )}
                        onClick={() => loadMessages(thread.thread_id)}
                      >
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              {isFromGhostWayne(thread) ? (
                                <div className="relative">
                                  <Music className="w-6 h-6 text-primary animate-pulse" />
                                  <Sparkles className="w-3 h-3 text-purple-600 absolute -top-1 -right-1 animate-ping" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center">
                                  <span className="text-primary font-bold">
                                    {thread.other_user_name.charAt(0)}
                                  </span>
                                </div>
                              )}
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
                  {selectedThread?.other_user_name === 'Ghost Wayne' ? (
                    <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                      <Music className="w-6 h-6 text-white animate-pulse" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center shadow-md">
                      <span className="text-primary font-bold text-lg">
                        {selectedThread?.other_user_name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h2 className="font-bold text-lg">{selectedThread?.other_user_name}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Online • Sempre disponível 🎵
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {messages.map((message, index) => {
                    const isSender = message.sender_id === user?.id;
                    const isFromAdmin = !isSender;
                    const isWelcomeMessage = isFromAdmin && (
                      message.message.includes('Bem-vindo à 7T7Studios') ||
                      message.message.includes('Recompensas')
                    );
                    
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex gap-3 animate-in fade-in slide-in-from-bottom-2',
                          isSender ? 'justify-end' : 'justify-start'
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {isFromAdmin && (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                            <Music className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div
                          className={cn(
                            'max-w-[75%] rounded-2xl px-5 py-3 shadow-md transition-all hover:scale-[1.02]',
                            isSender
                              ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-br-sm'
                              : isWelcomeMessage
                              ? 'bg-gradient-to-br from-primary via-purple-600 to-blue-600 text-white rounded-bl-sm border-2 border-white/20 shadow-xl'
                              : 'bg-card text-card-foreground rounded-bl-sm border shadow-sm'
                          )}
                        >
                          {isWelcomeMessage && (
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/20">
                              <Music2 className="w-5 h-5 animate-pulse" />
                              <span className="text-xs font-bold tracking-wide">✨ MENSAGEM ESPECIAL</span>
                            </div>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
                          <p className={cn(
                            "text-xs mt-2 flex items-center gap-1",
                            isSender ? "opacity-80" : isWelcomeMessage ? "text-white/80" : "opacity-60"
                          )}>
                            {new Date(message.timestamp).toLocaleTimeString('pt-PT', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        {isSender && (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-md flex-shrink-0">
                            <span className="text-sm font-bold text-accent-foreground">Tu</span>
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
                    placeholder="Escreve a tua mensagem... 🎵"
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
    </Layout>
  );
};

export default Messages;
