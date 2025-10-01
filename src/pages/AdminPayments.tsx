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
      setPaymentRequests(data || []);
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
      const { error } = await supabase
        .from('payment_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // If approved, create booking and project
      if (newStatus === 'approved') {
        try {
          // Parse booking info from notes
          let bookingInfo = null;
          if (request.notes) {
            try {
              bookingInfo = JSON.parse(request.notes);
            } catch (e) {
              console.error('Error parsing booking info:', e);
            }
          }

          // Extract date and time from booking details if available
          let bookingDate = null;
          let startTime = null;
          let endTime = null;

          if (bookingInfo?.booking_details) {
            const details = bookingInfo.booking_details;
            // Extract date (format: "Reserva para 01/01/2025 às 14:00")
            const dateMatch = details.match(/(\d{2}\/\d{2}\/\d{4})/);
            const timeMatch = details.match(/às (\d{2}:\d{2})/);
            
            if (dateMatch) {
              const [day, month, year] = dateMatch[1].split('/');
              bookingDate = `${year}-${month}-${day}`;
            }
            if (timeMatch) {
              startTime = timeMatch[1];
              // Add 1 hour for end time
              const [hours, minutes] = startTime.split(':');
              endTime = `${String(parseInt(hours) + 1).padStart(2, '0')}:${minutes}`;
            }
          }

          // Create booking if we have date and time
          let bookingId = null;
          if (bookingDate && startTime && endTime) {
            // Get the service ID (simplified - you may need to adjust)
            const { data: services } = await supabase
              .from('services')
              .select('id')
              .eq('name', 'Recording Session')
              .single();

            if (services) {
              const { data: booking, error: bookingError } = await supabase
                .from('bookings')
                .insert({
                  client_id: request.user_id,
                  service_id: services.id,
                  date: bookingDate,
                  start_time: startTime,
                  end_time: endTime,
                  status: 'confirmed',
                  notes: bookingInfo?.booking_details || 'Reserva via pagamento'
                })
                .select()
                .single();

              if (!bookingError && booking) {
                bookingId = booking.id;
              }
            }
          }

          // Create project
          const projectTitle = bookingInfo?.service 
            ? `${bookingInfo.service} - ${bookingInfo.option || ''}`
            : 'Novo Projeto';

          const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert({
              client_id: request.user_id,
              title: projectTitle,
              status: 'in_progress',
              booking_id: bookingId
            })
            .select()
            .single();

          if (projectError) {
            console.error('Error creating project:', projectError);
          }

          // Notify client
          await supabase.from('notifications').insert({
            user_id: request.user_id,
            title: 'Pagamento aprovado',
            body: 'A tua sessão está reservada',
            read: false
          });

        } catch (projectError) {
          console.error('Error creating booking/project:', projectError);
        }
      } else if (newStatus === 'rejected') {
        // Notify client of rejection
        await supabase.from('notifications').insert({
          user_id: request.user_id,
          title: 'Pagamento recusado',
          body: 'Reserva indisponível, experimenta marcar para outro dia/hora',
          read: false
        });
      }

      toast({
        title: newStatus === 'approved' ? 'Pagamento Aprovado' : 'Pagamento Rejeitado',
        description: `A solicitação foi ${newStatus === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso.`,
      });

      loadPaymentRequests();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status do pagamento',
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
