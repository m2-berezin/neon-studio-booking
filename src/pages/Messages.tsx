import React, { useState } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/hooks/useMessaging';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    threads,
    messages,
    selectedThreadId,
    loading,
    loadMessages,
    sendMessage
  } = useMessaging();

  const [messageText, setMessageText] = useState('');

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">Login Necessário</h2>
        <p className="text-muted-foreground">Por favor faz login para ver as tuas mensagens.</p>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    const success = await sendMessage(messageText);
    if (success) {
      setMessageText('');
    }
  };

  const parseAttachments = (attachments: any) => {
    if (typeof attachments === 'string') {
      try {
        return JSON.parse(attachments);
      } catch {
        return null;
      }
    }
    return attachments;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Thread List */}
      <div className="w-1/3 border-r border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-bold">Conversas</h2>
        </div>
        
        <ScrollArea className="h-[calc(100%-4rem)]">
          <div className="p-2">
            {loading && threads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                A carregar...
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-muted-foreground">Ainda não há conversas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {threads.map((thread) => (
                  <Card
                    key={thread.id}
                    className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                      selectedThreadId === thread.id ? 'bg-accent/20 border-primary' : ''
                    }`}
                    onClick={() => loadMessages(thread.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm">
                          {thread.name}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(thread.last_message_at), "d 'de' MMM", { locale: pt })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {thread.last_message}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedThreadId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">
                {threads.find(t => t.id === selectedThreadId)?.name || 'Conversa'}
              </h3>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isFromUser = message.sender_id === user.id;
                  const senderName = isFromUser ? 'Tu' : 'Ghost Wayne';
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isFromUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          isFromUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {!isFromUser && (
                          <p className="text-xs font-semibold mb-1 opacity-70">
                            {senderName}
                          </p>
                        )}
                        
                        <p className="text-sm whitespace-pre-wrap">
                          {message.body}
                        </p>
                        
                        {/* Action button if present */}
                        {(() => {
                          const parsedAttachments = parseAttachments(message.attachments);
                          if (parsedAttachments?.action) {
                            return (
                              <Button
                                variant={isFromUser ? "secondary" : "default"}
                                size="sm"
                                onClick={() => navigate(parsedAttachments.action.url)}
                                className="mt-2 w-full"
                              >
                                {parsedAttachments.action.label}
                              </Button>
                            );
                          }
                          return null;
                        })()}
                        
                        <p className="text-xs opacity-70 mt-2">
                          {format(new Date(message.created_at), "d 'de' MMM, HH:mm", { locale: pt })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Escreve a tua mensagem..."
                  className="min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                
                <Button
                  onClick={handleSendMessage}
                  disabled={loading || !messageText.trim()}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                Selecciona uma conversa
              </h3>
              <p className="text-muted-foreground">
                Escolhe uma conversa para começar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
