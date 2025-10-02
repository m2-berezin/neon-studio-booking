import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { addHours, format, parse, isAfter, isBefore } from 'date-fns';

interface Service {
  id: string;
  name: string;
  duration_prices: any;
  base_price: number;
}

interface Availability {
  id: string;
  date: string;
  time_slot: string;
  is_available: boolean;
}

interface Reservation {
  id: string;
  user_id: string;
  service_id: string;
  duration: number;
  date: string;
  time_slot: string;
  status: string;
  created_at: string;
  payment_request_id?: string;
}

export const useReservations = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadServices();
      loadAvailabilities();
      loadReservations();
    }
  }, [user]);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error('Erro ao carregar serviços');
    }
  };

  const loadAvailabilities = async () => {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 30);

      const { data, error } = await supabase
        .from('availabilities')
        .select('*')
        .gte('date', format(today, 'yyyy-MM-dd'))
        .lte('date', format(futureDate, 'yyyy-MM-dd'))
        .eq('is_available', true);

      if (error) throw error;
      setAvailabilities(data || []);
    } catch (error) {
      console.error('Error loading availabilities:', error);
      toast.error('Erro ao carregar disponibilidades');
    } finally {
      setLoading(false);
    }
  };

  const loadReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      
      // Cast the data to the correct type, ignoring the relation
      setReservations((data || []) as any);
    } catch (error) {
      console.error('Error loading reservations:', error);
      toast.error('Erro ao carregar reservas');
    }
  };

  const getAvailableTimeSlots = (date: string, duration: number) => {
    const dateAvailabilities = availabilities.filter(a => a.date === date);
    const dateReservations = reservations.filter(r => r.date === date);

    return dateAvailabilities.filter(slot => {
      const slotTime = parse(slot.time_slot, 'HH:mm:ss', new Date());
      const slotEndTime = addHours(slotTime, duration + 1); // duration + 1h rest

      // Check if any reservation conflicts
      const hasConflict = dateReservations.some(res => {
        const resTime = parse(res.time_slot, 'HH:mm:ss', new Date());
        const resEndTime = addHours(resTime, res.duration + 1);

        return (
          (isAfter(slotTime, resTime) && isBefore(slotTime, resEndTime)) ||
          (isAfter(slotEndTime, resTime) && isBefore(slotEndTime, resEndTime)) ||
          (isBefore(slotTime, resTime) && isAfter(slotEndTime, resEndTime))
        );
      });

      return !hasConflict;
    });
  };

  const createReservation = async (
    serviceId: string,
    duration: number,
    date: string,
    timeSlot: string
  ) => {
    if (!user) {
      toast.error('É necessário estar autenticado');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('reservations')
        .insert({
          user_id: user.id,
          service_id: serviceId,
          duration,
          date,
          time_slot: timeSlot,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Reserva criada com sucesso!');
      await loadReservations();
      return data;
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error('Erro ao criar reserva');
      return null;
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
    services,
    availabilities,
    reservations,
    loading,
    getAvailableTimeSlots,
    createReservation,
    updateReservationStatus,
    refreshReservations: loadReservations,
    refreshAvailabilities: loadAvailabilities
  };
};
