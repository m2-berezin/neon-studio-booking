import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  DollarSign, 
  Calendar, 
  Users, 
  TrendingUp, 
  CheckCircle,
  Clock,
  Bell,
  CreditCard,
  MessageSquare,
  Send,
  FolderOpen,
  Paperclip,
  ArrowLeft,
  X,
  Download,
  Image as ImageIcon,
  Music
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { toast as sonnerToast } from 'sonner';
import { DaysOffManager } from '@/components/admin/DaysOffManager';
import ReferralCodeStats from '@/components/admin/ReferralCodeStats';

import { useRealtimeSync } from '@/hooks/useRealtimeSync';

interface DashboardStats {
  totalBookings: number;
  pendingPayments: number;
  activeClients: number;
  monthlyRevenue: number;
}

interface RecentPayment {
  id: string;
  amount_eur: number;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface Thread {
  user_id: string;
  user_name: string;
  last_message: string;
  last_timestamp: string;
  unread_count: number;
}

interface MessageWithSender {
  id: string;
  sender_id: string;
  receiver_id: string;
  thread_id: string;
  message: string;
  timestamp: string;
  is_read: boolean;
  sender_name: string | null;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
}

const AdminDashboard = () => {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Enable realtime sync for admin (all users)
  useRealtimeSync(true);

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

  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    pendingPayments: 0,
    activeClients: 0,
    monthlyRevenue: 0,
  });
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeReservations, setActiveReservations] = useState<any[]>([]);
  const [showReservations, setShowReservations] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDashboardData = async () => {
    try {
      // Load active bookings using RPC function
      const { data: activeBookingsCount, error: bookingsError } = await supabase
        .rpc('get_active_bookings_count' as any);

      if (bookingsError) {
        console.error('Error loading active bookings count:', bookingsError);
      }

      const bookingsCount = (activeBookingsCount as number) || 0;

      // Load pending payments - no relation with profiles exists
      const { data: pendingPaymentsData, count: pendingCount } = await supabase
        .from('payment_requests')
        .select('*', { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Map to expected format
      const mappedPayments = (pendingPaymentsData || []).map(p => ({
        ...p,
        profiles: { full_name: 'Cliente' }
      }));

      // Load active clients using RPC function
      const { data: activeUsersCount, error: countError } = await supabase
        .rpc('get_active_users_count' as any);

      if (countError) {
        console.error('Error loading active users count:', countError);
      }

      const clientsCount = (activeUsersCount as number) || 0;

      // Load monthly revenue using RPC function
      const { data: monthlyRevenueData, error: revenueError } = await supabase
        .rpc('get_monthly_revenue' as any);

      if (revenueError) {
        console.error('Error loading monthly revenue:', revenueError);
      }

      const monthlyRevenue = Number(monthlyRevenueData) || 0;

      setStats({
        totalBookings: bookingsCount || 0,
        pendingPayments: pendingCount || 0,
        activeClients: clientsCount || 0,
        monthlyRevenue,
      });

      setRecentPayments(mappedPayments);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do dashboard',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadThreads = async () => {
    if (!user) return;

    console.log('=== LOADING THREADS ===');
    console.log('Admin user ID:', user.id);

    try {
      // Get all messages involving this user
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error loading messages:', error);
        throw error;
      }

      console.log('Messages data loaded:', messagesData);

      const threadsMap = new Map<string, Thread>();
      
      for (const msg of messagesData || []) {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        
        console.log('Processing message:', {
          msg_id: msg.id,
          sender_id: msg.sender_id,
          receiver_id: msg.receiver_id,
          otherUserId
        });
        
        if (!threadsMap.has(otherUserId)) {
          // Fetch profile directly
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', otherUserId)
            .single();

          if (profileError) {
            console.error('Error fetching profile for', otherUserId, ':', profileError);
          }

          const userName = profile?.full_name?.trim() || 'Sem Nome';
          
          console.log('✅ Loaded sender_name:', userName, 'for user_id:', otherUserId);

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', otherUserId)
            .eq('receiver_id', user.id)
            .eq('is_read', false);

          threadsMap.set(otherUserId, {
            user_id: otherUserId,
            user_name: userName,
            last_message: msg.message,
            last_timestamp: msg.timestamp,
            unread_count: count || 0,
          });
        }
      }

      const threadsArray = Array.from(threadsMap.values());
      console.log('Final threads array:', threadsArray);
      setThreads(threadsArray);
    } catch (error) {
      console.error('Error loading threads:', error);
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

      // Fetch sender names for all messages
      const messagesWithSender = await Promise.all((data || []).map(async (msg) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', msg.sender_id)
          .single();

        const senderName = profile?.full_name?.trim() || 'Sem Nome';
        console.log('Loaded sender_name:', senderName, 'for message:', msg.id);
        
        return {
          id: msg.id,
          sender_id: msg.sender_id,
          receiver_id: msg.receiver_id,
          thread_id: msg.thread_id,
          message: msg.message,
          timestamp: msg.timestamp,
          is_read: msg.is_read,
          sender_name: senderName,
          attachment_url: msg.attachment_url,
          attachment_type: msg.attachment_type,
          attachment_name: msg.attachment_name
        };
      }));
      
      setMessages(messagesWithSender);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', userId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      // Reload threads immediately to update badge
      await loadThreads();
      
      // Scroll to bottom after loading
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadUnreadCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
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
        sonnerToast.error('Erro ao enviar ficheiro');
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      sonnerToast.error('Erro ao enviar ficheiro');
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
        sonnerToast.error('Apenas imagens e ficheiros MP3 são permitidos');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        sonnerToast.error('O ficheiro é muito grande (máximo 10MB)');
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
      
      // Scroll to bottom after sending
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      sonnerToast.success('Mensagem enviada');
    } catch (error) {
      console.error('Error sending message:', error);
      sonnerToast.error('Erro ao enviar mensagem');
    }
  };

  const markNotificationsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const loadActiveReservations = async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_reservations' as any);
      
      if (error) {
        console.error('Error loading active reservations:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as reservas ativas.',
          variant: 'destructive',
        });
        return;
      }
      
      setActiveReservations(data || []);
      setShowReservations(true);
    } catch (error) {
      console.error('Error loading active reservations:', error);
    }
  };

  useEffect(() => {
    if (isAdmin()) {
      loadDashboardData();
      loadThreads();
      loadUnreadCount();

      const paymentsChannel = supabase
        .channel('dashboard-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payment_requests'
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              toast({
                title: 'Nova Solicitação de Pagamento!',
                description: 'Um cliente confirmou um pagamento.',
              });
            }
            loadDashboardData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'payments'
          },
          () => {
            console.log('Novo pagamento aprovado, atualizando receita mensal');
            loadDashboardData();
          }
        )
        .subscribe();

      const messagesChannel = supabase
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

      const notificationsChannel = supabase
        .channel('admin-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user?.id}`,
          },
          () => {
            loadUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(paymentsChannel);
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(notificationsChannel);
      };
    }
  }, [isAdmin, selectedUserId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total de Reservas',
      value: stats.totalBookings,
      icon: Calendar,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Pagamentos Pendentes',
      value: stats.pendingPayments,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Clientes Ativos',
      value: stats.activeClients,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Receita Mensal',
      value: `€${stats.monthlyRevenue.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Bem-vindo ao Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das operações do estúdio
        </p>
      </div>

      <Tabs defaultValue="overview" onValueChange={(value) => {
        if (value === 'messages') {
          markNotificationsRead();
        }
      }}>
        <TabsList className="grid w-full grid-cols-4 max-w-3xl">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="messages" className="relative">
            Mensagens
            {unreadCount > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="daysoff">Days Off</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Payment Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Solicitações de Pagamento Recentes
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/admin/payments')}
          >
            Ver Todas
          </Button>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Sem solicitações pendentes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div 
                  key={payment.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/admin/payments')}
                >
                  <div className="flex-1">
                    <p className="font-medium">{payment.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Transferência Bancária • {format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                      Pendente
                    </Badge>
                    <span className="font-bold text-lg">€{payment.amount_eur}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2 hover:bg-primary/10"
              onClick={() => navigate('/admin/payments')}
            >
              <DollarSign className="h-6 w-6" />
              <span className="text-sm font-medium">Gerir Pagamentos</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2 hover:bg-primary/10"
              onClick={loadActiveReservations}
            >
              <Calendar className="h-6 w-6" />
              <span className="text-sm font-medium">Ver Reservas</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2 hover:bg-primary/10"
              onClick={() => navigate('/admin/subscriptions')}
            >
              <CreditCard className="h-6 w-6" />
              <span className="text-sm font-medium">Subscrições</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2 hover:bg-primary/10"
              onClick={() => navigate('/admin/projects')}
            >
              <FolderOpen className="h-6 w-6" />
              <span className="text-sm font-medium">Projetos Mix & Master</span>
            </Button>
          </div>

          {showReservations && activeReservations.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeReservations.map((reservation) => {
                    const clientId = reservation.booking_id?.split('-')[0] || '';
                    const threadId = `${clientId}-6d9d1dc1-e16f-4f3d-a817-1591a1b27477`;
                    
                    return (
                      <TableRow key={reservation.booking_id}>
                        <TableCell>
                          {reservation.client_name || 'Sem Nome'}
                        </TableCell>
                        <TableCell>{reservation.service_name}</TableCell>
                        <TableCell>
                          {format(new Date(reservation.start_time), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          {format(new Date(reservation.end_time), 'HH:mm')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {showReservations && activeReservations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Sem reservas ativas no momento</p>
            </div>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="messages" className="space-y-6 mt-6">
          {!selectedUserId ? (
            /* Lista de conversas */
            <div className="max-w-4xl mx-auto">
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
                              <Badge className="h-6 w-6 p-0 flex items-center justify-center text-xs rounded-full">
                                {thread.unread_count}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Paperclip className="h-3 w-3 shrink-0" />
                            <span className="truncate">{thread.last_message}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(thread.last_timestamp), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Chat aberto */
            <div className="max-w-4xl mx-auto">
              <Button
                variant="ghost"
                className="mb-4"
                onClick={() => setSelectedUserId(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar às conversas
              </Button>

              <Card className="flex flex-col h-[600px]">
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
                        const isSender = msg.sender_id === user?.id;
                        const hasAttachment = msg.attachment_url;
                        const isImage = msg.attachment_type?.startsWith('image/');
                        const isAudio = msg.attachment_type?.startsWith('audio/');
                        
                        return (
                          <div key={msg.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                            <div className="flex flex-col">
                              {!isSender && msg.sender_name && (
                                <p className="text-xs text-muted-foreground mb-1 px-1">
                                  {msg.sender_name}
                                </p>
                              )}
                              <div
                                className={`max-w-[85%] md:max-w-[70%] rounded-lg px-4 py-2 ${
                                  isSender
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-foreground'
                                }`}
                              >
                                <p className="text-sm break-words">
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
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                <div className="p-4 border-t space-y-2">
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
                      id="dashboard-file-input"
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
        </TabsContent>

        <TabsContent value="daysoff" className="space-y-6 mt-6">
          <DaysOffManager />
        </TabsContent>

        <TabsContent value="referrals" className="space-y-6 mt-6">
          <ReferralCodeStats />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
