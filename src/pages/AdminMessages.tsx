import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageSquare, Paperclip, X, Download, Image as ImageIcon, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';

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
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
}

const AdminMessages = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadAttachment = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erro ao enviar ficheiro');
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast.error('Erro ao enviar ficheiro');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/', 'audio/mp3', 'audio/mpeg'];
      const isAllowed = allowedTypes.some(type => file.type.startsWith(type) || file.type === type);
      
      if (!isAllowed) {
        toast.error('Apenas imagens e ficheiros MP3 são permitidos');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast.error('O ficheiro é muito grande (máximo 10MB)');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedUserId || !user) return;

    try {
      const ids = [user.id, selectedUserId].sort();
      const threadId = `${ids[0]}-${ids[1]}`;
      
      let attachmentUrl: string | null = null;
      let attachmentType: string | null = null;
      let attachmentName: string | null = null;

      if (selectedFile) {
        attachmentUrl = await uploadAttachment(selectedFile);
        if (attachmentUrl) {
          attachmentType = selectedFile.type;
          attachmentName = selectedFile.name;
        }
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          receiver_id: selectedUserId,
          message: newMessage.trim() || '📎 Anexo',
          timestamp: new Date().toISOString(),
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          attachment_name: attachmentName,
        });

      if (error) throw error;
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success('Mensagem enviada');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
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
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          Mensagens 🦇
        </h1>

        {threads.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Sem mensagens</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {threads.map((thread) => (
              <Card 
                key={thread.user_id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setSelectedUserId(thread.user_id);
                  loadMessages(thread.user_id);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg truncate">
                        {thread.user_name}
                      </h3>
                      {thread.unread_count > 0 && (
                        <div className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs shrink-0">
                          {thread.unread_count}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Paperclip className="h-3 w-3 shrink-0" />
                      <span className="truncate">{thread.last_message}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(thread.last_timestamp).toLocaleString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Chat modal/overlay - mobile optimized */}
        {selectedUserId && (
          <div className="fixed inset-0 z-[100] bg-background flex flex-col">
            <Card className="flex-1 flex flex-col rounded-none border-x-0 border-t-0">
              <div className="p-4 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedUserId(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
                <h2 className="font-semibold flex-1">
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
                      const hasAttachment = msg.attachment_url;
                      const isImage = msg.attachment_type?.startsWith('image/');
                      const isAudio = msg.attachment_type?.startsWith('audio/');
                      
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] md:max-w-[70%] rounded-lg px-4 py-2 ${
                              isSender
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            <p className="text-sm break-words">{msg.message}</p>
                            
                            {hasAttachment && (
                              <div className="mt-2">
                                {isImage && (
                                  <div className="relative">
                                    <img 
                                      src={msg.attachment_url} 
                                      alt={msg.attachment_name || 'Imagem'} 
                                      className="rounded max-w-full max-h-64 object-contain cursor-pointer"
                                      onClick={() => window.open(msg.attachment_url, '_blank')}
                                    />
                                  </div>
                                )}
                                
                                {isAudio && (
                                  <div className="flex items-center gap-2 bg-background/20 rounded p-2">
                                    <Music className="h-4 w-4" />
                                    <audio controls className="max-w-full">
                                      <source src={msg.attachment_url} type={msg.attachment_type || 'audio/mpeg'} />
                                    </audio>
                                  </div>
                                )}
                                
                                <a 
                                  href={msg.attachment_url} 
                                  download={msg.attachment_name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs mt-1 opacity-70 hover:opacity-100"
                                >
                                  <Download className="h-3 w-3" />
                                  {msg.attachment_name}
                                </a>
                              </div>
                            )}
                            
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

              <div className="p-4 border-t space-y-2 bg-background">
                {selectedFile && (
                  <div className="flex items-center gap-2 bg-muted p-2 rounded">
                    {selectedFile.type.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <Music className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,audio/mp3,audio/mpeg"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="admin-file-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="shrink-0"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    type="text"
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
                    disabled={uploading}
                  />
                  <Button 
                    type="button"
                    onClick={handleSendMessage} 
                    size="icon"
                    disabled={uploading || (!newMessage.trim() && !selectedFile)}
                    className="shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminMessages;
