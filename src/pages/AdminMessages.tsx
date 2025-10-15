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
                        const hasAttachment = msg.attachment_url;
                        const isImage = msg.attachment_type?.startsWith('image/');
                        const isAudio = msg.attachment_type?.startsWith('audio/');
                        
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

                <div className="p-4 border-t">
                  {selectedFile && (
                    <div className="mb-2 flex items-center gap-2 bg-muted p-2 rounded">
                      {selectedFile.type.startsWith('image/') ? (
                        <ImageIcon className="h-4 w-4" />
                      ) : (
                        <Music className="h-4 w-4" />
                      )}
                      <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                      <Button
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
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
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
                      disabled={uploading}
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      size="icon"
                      disabled={uploading || (!newMessage.trim() && !selectedFile)}
                    >
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
