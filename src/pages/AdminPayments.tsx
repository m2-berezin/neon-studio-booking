import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { DollarSign, CheckCircle, XCircle, Clock, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentRequest {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  notes?: string;
  profiles: {
    full_name: string;
    phone: string;
  };
}

const AdminPayments = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPaymentRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .select(`
          *,
          profiles (
            full_name,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const mappedData = (data || []).map(p => ({
        ...p,
        amount: p.amount_eur,
        method: 'bank_transfer'
      }));
      setPaymentRequests(mappedData);
    } catch (error) {
      console.error('Error loading payment requests:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as solicitações de pagamento',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadPaymentRequests();

      // Set up realtime subscription for new payment requests
      const channel = supabase
        .channel('payment-requests-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'payment_requests'
          },
          (payload) => {
            toast({
              title: 'Nova Solicitação de Pagamento!',
              description: 'Um cliente acabou de confirmar um pagamento.',
            });
            loadPaymentRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected', request: PaymentRequest) => {
    try {
      if (newStatus === 'approved') {
        const { error } = await supabase.rpc('admin_approve_payment', {
          p_payment_id: id
        });

        if (error) throw error;

        toast({
          title: 'Reserva Aprovada',
          description: 'A reserva foi aprovada e confirmada com sucesso.',
        });
      } else {
        const { error } = await supabase.rpc('admin_reject_payment', {
          p_payment_id: id,
          p_reason: 'Pagamento recusado pelo administrador'
        });

        if (error) throw error;

        toast({
          title: 'Reserva Rejeitada',
          description: 'A reserva foi rejeitada.',
        });
      }

      loadPaymentRequests();
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o status do pagamento',
        variant: 'destructive',
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-8">
        <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Acesso de Admin Necessário</h2>
        <p className="text-muted-foreground">Precisas de privilégios de administrador para ver esta página.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-500 text-white">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500 text-white">
            <XCircle className="w-3 h-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const pendingRequests = paymentRequests.filter(req => req.status === 'pending');
  const processedRequests = paymentRequests.filter(req => req.status !== 'pending');

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-accent mb-2">
          Solicitações de Pagamento
        </h1>
        <p className="text-muted-foreground">
          Gere as confirmações de pagamento dos clientes
        </p>
      </div>

      {/* Pending Requests */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Pendentes ({pendingRequests.length})
        </h2>
        
        {pendingRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Sem solicitações pendentes</p>
            </CardContent>
          </Card>
        ) : (
          pendingRequests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(request.status)}
                      <span className="font-semibold">€{request.amount}</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Cliente:</span> {request.profiles.full_name}</p>
                      <p><span className="font-medium">Telemóvel:</span> {request.profiles.phone || 'N/A'}</p>
                      <p><span className="font-medium">Método:</span> {request.method}</p>
                      {request.notes && (() => {
                        try {
                          const bookingInfo = JSON.parse(request.notes);
                          return (
                            <p className="text-xs bg-muted p-2 rounded mt-2">
                              <span className="font-medium">Detalhes:</span> {bookingInfo.booking_details || bookingInfo.service}
                            </p>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                      <p className="text-muted-foreground">
                        Solicitado em {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleUpdateStatus(request.id, 'approved', request)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleUpdateStatus(request.id, 'rejected', request)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Processed Requests */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Histórico ({processedRequests.length})
        </h2>
        
        {processedRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Sem histórico de pagamentos</p>
            </CardContent>
          </Card>
        ) : (
          processedRequests.slice(0, 10).map((request) => (
            <Card key={request.id} className="opacity-70">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(request.status)}
                      <span className="font-semibold">€{request.amount}</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Cliente:</span> {request.profiles.full_name}</p>
                      <p className="text-muted-foreground">
                        {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPayments;
