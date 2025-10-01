import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Bell
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalBookings: number;
  pendingPayments: number;
  activeClients: number;
  monthlyRevenue: number;
}

interface RecentPayment {
  id: string;
  amount: number;
  method: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

const AdminDashboard = () => {
  const { isAdmin } = useAuth();
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

  const loadDashboardData = async () => {
    try {
      // Load bookings count
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      // Load pending payments
      const { data: pendingPaymentsData, count: pendingCount } = await supabase
        .from('payment_requests')
        .select('*, profiles(full_name)', { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      // Load active clients (profiles with role 'client')
      const { count: clientsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client');

      // Calculate monthly revenue from approved payments
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: approvedPayments } = await supabase
        .from('payment_requests')
        .select('amount')
        .eq('status', 'approved')
        .gte('created_at', startOfMonth.toISOString());

      const monthlyRevenue = approvedPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      setStats({
        totalBookings: bookingsCount || 0,
        pendingPayments: pendingCount || 0,
        activeClients: clientsCount || 0,
        monthlyRevenue,
      });

      setRecentPayments(pendingPaymentsData || []);
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

  useEffect(() => {
    if (isAdmin()) {
      loadDashboardData();

      // Set up realtime subscription for payment requests
      const channel = supabase
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
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

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
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Bem-vindo ao Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das operações do estúdio
        </p>
      </div>

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
                      {payment.method} • {format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                      Pendente
                    </Badge>
                    <span className="font-bold text-lg">€{payment.amount}</span>
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
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-24 flex flex-col gap-2"
              onClick={() => navigate('/admin/payments')}
            >
              <DollarSign className="h-6 w-6" />
              <span>Gerir Pagamentos</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex flex-col gap-2"
              onClick={() => navigate('/admin/bookings')}
            >
              <Calendar className="h-6 w-6" />
              <span>Ver Reservas</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex flex-col gap-2"
              onClick={() => navigate('/admin/messages')}
            >
              <Users className="h-6 w-6" />
              <span>Mensagens</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
