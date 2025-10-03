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
      console.log('Starting payment status update:', { id, newStatus, request });
      
      // If approved, move reservation to bookings first
      if (newStatus === 'approved') {
        try {
          // Find the reservation linked to this payment request
          const { data: reservation, error: reservationError } = await supabase
            .from('reservations')
            .select('*')
            .eq('payment_request_id', id)
            .eq('status', 'pending')
            .single();

          console.log('Reservation query result:', { reservation, reservationError });

          if (reservationError && reservationError.code !== 'PGRST116') {
            throw reservationError;
          }

          let bookingId = null;

          // If we have a reservation with a valid time slot (not placeholder), move it to bookings
          if (reservation && reservation.time_slot && reservation.time_slot !== '00:00:00') {
            console.log('Processing reservation with valid time slot');
            // Calculate end time from start time + duration
            const [hours, minutes] = reservation.time_slot.split(':');
            const startHour = parseInt(hours);
            const endHour = startHour + reservation.duration;
            const endTime = `${endHour.toString().padStart(2, '0')}:${minutes}:00`;

            // Get service_id - use from reservation or get default
            let serviceId = reservation.service_id;
            if (!serviceId) {
              console.log('No service_id in reservation, fetching default recording service');
              // Try to get the "Recording Session" service as default
              const { data: defaultService, error: serviceError } = await supabase
                .from('services')
                .select('id')
                .eq('type', 'recording')
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();
              
              if (serviceError) {
                console.error('Error fetching default service:', serviceError);
              }
              
              serviceId = defaultService?.id;
              
              if (!serviceId) {
                console.error('No default service found');
                throw new Error('Nenhum serviço disponível para criar a reserva');
              }
            }

            console.log('Creating booking with service_id:', serviceId);

            const { data: booking, error: bookingError } = await supabase
              .from('bookings')
              .insert({
                client_id: request.user_id,
                service_id: serviceId,
                date: reservation.date,
                start_time: reservation.time_slot,
                end_time: endTime,
                status: 'confirmed',
                notes: request.notes || 'Reserva aprovada'
              })
              .select()
              .single();

            if (bookingError) {
              console.error('Booking error:', bookingError);
              throw bookingError;
            }
            
            bookingId = booking.id;
            console.log('Booking created successfully:', bookingId);

            // Create unavailable slot with 1 hour buffer
            const startDateTime = `${reservation.date}T${reservation.time_slot}`;
            const endDateTime = new Date(`${reservation.date}T${endTime}`);
            endDateTime.setHours(endDateTime.getHours() + 1); // Add 1 hour buffer
            const endWithBufferStr = endDateTime.toISOString().slice(0, 19).replace('T', ' ');

            await supabase
              .from('unavailable_slots')
              .insert({
                start_time: startDateTime,
                end_time: endWithBufferStr,
                reason: 'Sessão reservada + descanso',
                booking_id: bookingId
              });

            // Delete the reservation after moving to bookings
            await supabase
              .from('reservations')
              .delete()
              .eq('id', reservation.id);
          } else if (reservation) {
            console.log('Processing placeholder reservation (Mix&Master/Beats)');
            // For Mix&Master, Beats, or other services without specific time slots
            // Just delete the placeholder reservation
            await supabase
              .from('reservations')
              .delete()
              .eq('id', reservation.id);
          }

          // Create project
          let bookingInfo = null;
          if (request.notes) {
            try {
              bookingInfo = JSON.parse(request.notes);
            } catch (e) {
              console.error('Error parsing booking info:', e);
            }
          }

          console.log('Creating project with info:', bookingInfo);

          const projectTitle = bookingInfo?.service 
            ? `${bookingInfo.service} - ${bookingInfo.option || ''}`
            : 'Novo Projeto';

          const { error: projectError } = await supabase
            .from('projects')
            .insert({
              client_id: request.user_id,
              title: projectTitle,
              status: 'in_progress',
              booking_id: bookingId
            });

          if (projectError) {
            console.error('Project creation error:', projectError);
            throw projectError;
          }

          console.log('Creating client notification');
          // Notify client
          const { error: notificationError } = await supabase.from('notifications').insert({
            user_id: request.user_id,
            title: 'Pagamento aprovado',
            body: 'A tua sessão está reservada',
            read: false
          });

          if (notificationError) {
            console.error('Notification error:', notificationError);
            throw notificationError;
          }

        } catch (error) {
          console.error('Error processing reservation:', error);
          toast({
            title: 'Erro',
            description: 'Erro ao processar reserva. Por favor tenta novamente.',
            variant: 'destructive',
          });
          return;
        }
      } else if (newStatus === 'rejected') {
        console.log('Processing rejection');
        // Delete the pending reservation if rejected
        await supabase
          .from('reservations')
          .delete()
          .eq('payment_request_id', id)
          .eq('status', 'pending');

        // Notify client of rejection
        await supabase.from('notifications').insert({
          user_id: request.user_id,
          title: 'Pagamento recusado',
          body: 'Reserva indisponível, experimenta marcar para outro dia/hora',
          read: false
        });
      }

      console.log('Updating payment request status to:', newStatus);
      // Update payment request status
      const { error } = await supabase
        .from('payment_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        console.error('Payment update error:', error);
        throw error;
      }

      console.log('Payment status updated successfully');

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
