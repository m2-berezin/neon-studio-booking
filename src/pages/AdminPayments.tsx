import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { DollarSign, CheckCircle, XCircle, Clock, Shield, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { formatPrice } from '@/lib/utils';

interface PaymentRequest {
  id: string;
  user_id: string;
  amount_eur: number;
  status: string;
  created_at: string;
  note?: string;
  reservation_id: string;
  payment_method?: string;
  type?: string;
  friend_code?: string;
  profiles: {
    full_name: string;
  };
  reservations?: {
    starts_at: string;
    ends_at: string;
    service_name_snapshot?: string;
  };
}

const AdminPayments = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToHide, setPaymentToHide] = useState<string | null>(null);
  
  // Enable realtime sync for admin
  useRealtimeSync(true);
  
  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadPaymentRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .select(`
          *,
          reservations (
            starts_at,
            ends_at,
            service_name_snapshot
          )
        `)
        .eq('hidden_from_admin', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user profiles separately
      const userIds = [...new Set(data?.map(p => p.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      // Map to expected format
      const mappedData = (data || []).map(p => ({
        ...p,
        profiles: {
          full_name: profilesMap.get(p.user_id)?.full_name || 'Cliente Desconhecido'
        }
      }));
      
      // Debug: Log payment methods
      console.log('[ADMIN PAYMENTS] Loaded payment requests with methods:', 
        mappedData.map(p => ({ id: p.id, payment_method: p.payment_method }))
      );
      
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
        console.log('[ADMIN] 🔵 Approving payment:', id);
        console.log('[ADMIN] 🔵 Reservation ID:', request.reservation_id);
        
        const { data, error } = await supabase.rpc('admin_approve_payment', {
          p_payment_id: id
        });

        if (error) {
          console.error('[ADMIN] ❌ Error approving payment:', error);
          throw error;
        }

        console.log('[ADMIN] ✅ Payment approved successfully! Result:', data);
        
        // Send calendar invite email if it's a booking (not subscription)
        if (data && request.type !== 'subscription_request') {
          try {
            console.log('[ADMIN] 📧 Fetching booking details for calendar invite...');
            
            // Fetch booking details
            const { data: booking, error: bookingError } = await supabase
              .from('bookings')
              .select('id, user_id, service_name_snapshot, starts_at, ends_at')
              .eq('id', data)
              .single();

            if (bookingError) {
              console.error('[ADMIN] ❌ Error fetching booking:', bookingError);
            } else if (booking && booking.starts_at && booking.ends_at) {
              // Fetch user profile separately
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', booking.user_id)
                .single();
              
              console.log('[ADMIN] 📧 Sending calendar invite email...');
              
              const { error: emailError } = await supabase.functions.invoke('send-booking-calendar', {
                body: {
                  client_name: profile?.full_name || 'Cliente',
                  service_name: booking.service_name_snapshot || 'Serviço',
                  starts_at: booking.starts_at,
                  ends_at: booking.ends_at,
                  booking_id: booking.id,
                }
              });

              if (emailError) {
                console.error('[ADMIN] ❌ Error sending calendar invite:', emailError);
              } else {
                console.log('[ADMIN] ✅ Calendar invite sent successfully!');
              }
            }
          } catch (emailError) {
            console.error('[ADMIN] ❌ Error in calendar invite process:', emailError);
            // Don't throw - we still want to show success for the approval
          }
        }
        
        toast({
          title: 'Reserva Aprovada',
          description: 'A reserva foi aprovada e confirmada com sucesso.',
        });
      } else {
        console.log('Rejecting payment:', id);
        const { error } = await supabase.rpc('admin_reject_payment', {
          p_payment_id: id,
          p_reason: 'Pagamento recusado pelo administrador'
        });

        if (error) {
          console.error('Error rejecting payment:', error);
          throw error;
        }

        console.log('Payment rejected successfully');
        toast({
          title: 'Reserva Rejeitada',
          description: 'A reserva foi rejeitada.',
        });
      }

      await loadPaymentRequests();
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      
      // Extract more specific error message
      let errorMessage = 'Não foi possível atualizar o status do pagamento';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.details) {
        errorMessage = error.details;
      } else if (error.hint) {
        errorMessage = error.hint;
      }
      
      toast({
        title: 'Erro ao processar',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleHidePayment = async () => {
    if (!paymentToHide) return;

    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({ hidden_from_admin: true })
        .eq('id', paymentToHide);

      if (error) throw error;

      toast({
        title: 'Pagamento Removido',
        description: 'O pagamento foi removido do teu dashboard.',
      });

      await loadPaymentRequests();
    } catch (error) {
      console.error('Error hiding payment:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o pagamento',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setPaymentToHide(null);
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
                      <span className="font-semibold">{formatPrice(request.amount_eur)}</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Cliente:</span> {request.profiles.full_name}</p>
                      {request.reservations?.service_name_snapshot && (
                        <p><span className="font-medium">Serviço:</span> {request.reservations.service_name_snapshot}</p>
                      )}
                      {request.reservations?.starts_at && (
                        <p>
                          <span className="font-medium">Data/Hora da Reserva:</span>{' '}
                          {format(new Date(request.reservations.starts_at), "dd/MM/yyyy 'das' HH:mm")}
                          {request.reservations.ends_at && ` às ${format(new Date(request.reservations.ends_at), "HH:mm")}`}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Método de Pagamento:</span>{' '}
                        {request.payment_method === 'mbway' ? 'MB Way' :
                         request.payment_method === 'transferencia' ? 'Transferência Bancária' :
                         request.payment_method === 'revolut' ? 'Revolut' :
                         'Não especificado'}
                      </p>
                      {request.friend_code && (
                        <p className="text-green-600 font-medium">
                          <span className="font-semibold">✅ Código de Convite Usado:</span> {request.friend_code}
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        <span className="font-medium">Pedido em:</span> {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm")}
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
                      <span className="font-semibold">{formatPrice(request.amount_eur)}</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Cliente:</span> {request.profiles.full_name}</p>
                      <p className="text-muted-foreground">
                        {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setPaymentToHide(request.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Pagamento do Dashboard?</AlertDialogTitle>
            <AlertDialogDescription>
              O pagamento será removido apenas do teu dashboard. O cliente continuará a vê-lo e a receita mensal não será afetada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleHidePayment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPayments;
