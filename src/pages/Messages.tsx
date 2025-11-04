import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Send, ArrowLeft, Paperclip, X, Download, Image as ImageIcon, Music } from 'lucide-react';
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
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
}
const ADMIN_ID = '6d9d1dc1-e16f-4f3d-a817-1591a1b27477';
const Messages = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  
  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Helper function to render text with clickable links
  const renderMessageWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80 cursor-pointer"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const markThreadAsRead = async () => {
    if (!user) return;
    try {
      const ids = [user.id, ADMIN_ID].sort();
      const threadId = `${ids[0]}-${ids[1]}`;

      // Mark all messages in this thread as read
      const {
        error
      } = await supabase.from('messages').update({
        is_read: true
      }).eq('thread_id', threadId).eq('receiver_id', user.id).eq('is_read', false);
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
      const {
        data,
        error
      } = await supabase.from('messages').select('*').eq('thread_id', threadId).order('timestamp', {
        ascending: true
      });
      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read immediately after loading
      await markThreadAsRead();
      
      // Scroll to bottom after loading
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
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

  const sendMessageFunc = async () => {
    if (!user || (!newMessage.trim() && !selectedFile)) return;
    
    try {
      const ids = [user.id, ADMIN_ID].sort();
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

      const { error } = await supabase.from('messages').insert({
        thread_id: threadId,
        sender_id: user.id,
        receiver_id: ADMIN_ID,
        message: newMessage.trim() || '📎 Anexo',
        timestamp: new Date().toISOString(),
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        attachment_name: attachmentName,
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
      const channel = supabase.channel('messages-changes').on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`
      }, () => {
        loadMessages();
      }).on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`
      }, () => {
        // Reload to reflect read status changes
        loadMessages();
      }).subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = ['image/', 'audio/mp3', 'audio/mpeg'];
      const isAllowed = allowedTypes.some(type => file.type.startsWith(type) || file.type === type);
      
      if (!isAllowed) {
        toast.error('Apenas imagens e ficheiros MP3 são permitidos');
        return;
      }
      
      // Check file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('O ficheiro é muito grande (máximo 10MB)');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    await sendMessageFunc();
    setNewMessage('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Scroll to bottom after sending
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    
    await markThreadAsRead();
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  if (!user) return null;
  return <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate('/?tab=7')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Mensagens</h1>
      
      <Card className="flex flex-col h-[600px]">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Chat com Ghost Wayne 🦇 </h2>
        </div>

        <ScrollArea className="flex-1 p-4">
          {loading ? <div className="text-center text-muted-foreground">A carregar...</div> : messages.length === 0 ? <div className="text-center text-muted-foreground">Sem mensagens</div> : <div className="space-y-4">
              {messages.map(msg => {
            const isSender = msg.sender_id === user.id;
            const hasAttachment = msg.attachment_url;
            const isImage = msg.attachment_type?.startsWith('image/');
            const isAudio = msg.attachment_type?.startsWith('audio/');
            
            return <div key={msg.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-lg px-4 py-2 ${isSender ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                      <p className="text-sm">
                        {renderMessageWithLinks(msg.message)}
                      </p>
                      
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
                    minute: '2-digit'
                  })}
                      </p>
                    </div>
                  </div>;
          })}
              <div ref={messagesEndRef} />
            </div>}
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
              className="self-end"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea 
              ref={textareaRef}
              value={newMessage} 
              onChange={e => setNewMessage(e.target.value)} 
              onKeyDown={handleKeyPress} 
              placeholder="Escreve a tua mensagem..." 
              className="flex-1 resize-none overflow-y-auto"
              style={{ minHeight: '40px', maxHeight: '120px' }}
              disabled={uploading}
              rows={1}
            />
            <Button 
              onClick={handleSendMessage} 
              size="icon"
              disabled={uploading || (!newMessage.trim() && !selectedFile)}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>;
};
export default Messages;