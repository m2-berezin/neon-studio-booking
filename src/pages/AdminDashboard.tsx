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
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { toast as sonnerToast } from 'sonner';
import { DaysOffManager } from '@/components/admin/DaysOffManager';

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
}

const AdminDashboard = () => {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          sender_name: senderName
        };
      }));
      
      setMessages(messagesWithSender);

      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', userId)
        .eq('receiver_id', user.id);

      loadThreads();
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId || !user) return;

    try {
      const ids = [user.id, selectedUserId].sort();
      const threadId = `${ids[0]}-${ids[1]}`;

      const { error } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          receiver_id: selectedUserId,
          message: newMessage.trim(),
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;
      setNewMessage('');
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                          <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                            {thread.unread_count}
                          </Badge>
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
                      Chat com {threads.find((t) => t.user_id === selectedUserId)?.user_name || 'Sem Nome'}
                    </h2>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted-foreground">Sem mensagens</div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg) => {
                          const isSender = msg.sender_id === user?.id;
                          return (
                            <div key={msg.id}>
                              <div
                                className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className="flex flex-col">
                                  {!isSender && msg.sender_name && (
                                    <p className="text-xs text-muted-foreground mb-1 px-1">
                                      {msg.sender_name}
                                    </p>
                                  )}
                                  <div
                                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                      isSender
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground'
                                    }`}
                                  >
                                    <p className="text-sm">{msg.message}</p>
                                    <p className="text-xs opacity-70 mt-1">
                                      {new Date(msg.timestamp).toLocaleTimeString('pt-PT', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  <div className="p-4 border-t">
                    <div className="flex gap-2">
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
                      />
                      <Button onClick={handleSendMessage} size="icon">
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
        </TabsContent>

        <TabsContent value="daysoff" className="space-y-6 mt-6">
          <DaysOffManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
