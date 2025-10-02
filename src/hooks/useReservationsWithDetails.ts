import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReservationWithDetails {
  id: string;
  user_id: string;
  service_id: string;
  duration: number;
  date: string;
  time_slot: string;
  status: string;
  created_at: string;
  payment_request_id?: string;
  user_name?: string;
  user_email?: string;
  service_name?: string;
}

export const useReservationsWithDetails = () => {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReservations();

    // Realtime subscription
    const channel = supabase
      .channel('reservations-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'reservations' },
        () => loadReservations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadReservations = async () => {
    try {
      // First get reservations
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select('*')
        .order('date', { ascending: true });

      if (reservationsError) throw reservationsError;

      if (!reservationsData || reservationsData.length === 0) {
        setReservations([]);
        setLoading(false);
        return;
      }

      // Get user details
      const userIds = [...new Set(reservationsData.map(r => r.user_id))];
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', userIds);

      // Get service details
      const serviceIds = [...new Set(reservationsData.map(r => r.service_id))];
      const { data: servicesData } = await supabase
        .from('services')
        .select('id, name')
        .in('id', serviceIds);

      // Combine data
      const enrichedReservations = reservationsData.map(reservation => {
        const user = usersData?.find(u => u.id === reservation.user_id);
        const service = servicesData?.find(s => s.id === reservation.service_id);

        return {
          ...reservation,
          user_name: user?.full_name || 'Desconhecido',
          user_email: user?.phone || '',
          service_name: service?.name || 'Desconhecido'
        };
      });

      setReservations(enrichedReservations);
    } catch (error) {
      console.error('Error loading reservations:', error);
      toast.error('Erro ao carregar reservas');
    } finally {
      setLoading(false);
    }
  };

  const updateReservationStatus = async (
    reservationId: string,
    status: 'confirmed' | 'cancelled',
    paymentRequestId?: string
  ) => {
    try {
      const updateData: any = { status };
      if (paymentRequestId) {
        updateData.payment_request_id = paymentRequestId;
      }

      const { error } = await supabase
        .from('reservations')
        .update(updateData)
        .eq('id', reservationId);

      if (error) throw error;

      toast.success(
        status === 'confirmed' 
          ? 'Reserva confirmada!' 
          : 'Reserva cancelada'
      );
      await loadReservations();
    } catch (error) {
      console.error('Error updating reservation:', error);
      toast.error('Erro ao atualizar reserva');
    }
  };

  return {
    reservations,
    loading,
    updateReservationStatus,
    refreshReservations: loadReservations
  };
};
