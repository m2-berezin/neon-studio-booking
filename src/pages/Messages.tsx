import React, { useState } from 'react';
import { Send, Paperclip, X, FileText, Image as ImageIcon, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import AudioPlayer from '@/components/AudioPlayer';
import { format } from 'date-fns';

const Messages = () => {
  const { user } = useAuth();
  const {
    loading,
    uploading,
    threads,
    currentThread,
    currentRecipient,
    loadThread,
    sendMessage,
  } = useMessages();

  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Login Necessário</h2>
        <p className="text-muted-foreground">Por favor, inicie sessão para ver as suas mensagens.</p>
      </div>
    );
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!currentRecipient || (!messageText.trim() && attachments.length === 0)) return;

    const success = await sendMessage(
      currentRecipient,
      messageText.trim(),
      'general',
      attachments
    );

    if (success) {
      setMessageText('');
      setAttachments([]);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType.startsWith('audio/')) return Music;
    return FileText;
  };

  const isAudioFile = (fileType: string) => {
    return fileType.startsWith('audio/');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Thread List */}
      <div className="w-1/3 border-r border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Conversas</h2>
        </div>
        
        <ScrollArea className="h-[calc(100%-4rem)]">
          <div className="p-2">
            {loading && threads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                A carregar conversas...
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Ainda não há conversas
              </div>
            ) : (
              <div className="space-y-2">
                {threads.map((thread) => (
                  <Card
                    key={thread.recipient_id}
                    className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                      currentRecipient === thread.recipient_id ? 'bg-accent/20 border-primary' : ''
                    }`}
                    onClick={() => loadThread(thread.recipient_id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm text-foreground">
                          {thread.recipient_name}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(thread.latest_message.created_at), 'MMM d')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {thread.latest_message.attachments?.length 
                          ? `📎 ${thread.latest_message.attachments.length} anexo(s)`
                          : thread.latest_message.body
                        }
                      </p>
                      {thread.latest_message.thread_type !== 'general' && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {thread.latest_message.thread_type.replace('_', ' ')}
                        </Badge>
                      )}
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
        {currentRecipient ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                {threads.find(t => t.recipient_id === currentRecipient)?.recipient_name || 'Conversa'}
              </h3>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {currentThread.map((message) => {
                  const isFromUser = message.sender_id === user.id;
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
                        {message.body && (
                          <p className="text-sm whitespace-pre-wrap mb-2">
                            {message.body}
                          </p>
                        )}
                        
                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="space-y-2">
                            {message.attachments.map((attachment, index) => (
                              <div key={index}>
                                {isAudioFile(attachment.type) ? (
                                  <AudioPlayer
                                    src={attachment.url}
                                    fileName={attachment.name}
                                    className="bg-background/10"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2 p-2 bg-background/10 rounded">
                                    {React.createElement(getFileIcon(attachment.type), {
                                      className: "h-4 w-4"
                                    })}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">
                                        {attachment.name}
                                      </p>
                                      <p className="text-xs opacity-70">
                                        {formatFileSize(attachment.size)}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      asChild
                                      className="h-auto p-1"
                                    >
                                      <a
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={attachment.name}
                                      >
                                        ↓
                                      </a>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-xs opacity-70 mt-2">
                          {format(new Date(message.created_at), 'MMM d, HH:mm')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 bg-secondary p-2 rounded text-xs">
                      {React.createElement(getFileIcon(file.type), {
                        className: "h-3 w-3"
                      })}
                      <span className="truncate max-w-24">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="h-auto p-0 ml-1"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <div className="flex-1">
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Escreva a sua mensagem..."
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    id="attachment-upload"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="*/*"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('attachment-upload')?.click()}
                    disabled={uploading}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={handleSendMessage}
                    disabled={loading || (!messageText.trim() && attachments.length === 0)}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Seleccione uma conversa
              </h3>
              <p className="text-muted-foreground">
                Escolha uma conversa da lista para começar a enviar mensagens
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;