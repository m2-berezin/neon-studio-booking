import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { addMonths, format } from 'date-fns';

interface Booking {
  id: string;
  client_id: string;
  service_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string;
  created_at: string;
  profiles: {
    full_name: string;
    email?: string;
  };
  services: {
    name: string;
    type: string;
  };
}

export const useAdmin = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Update booking status
  const updateBookingStatus = async (bookingId: string, newStatus: string, notes?: string) => {
    if (!isAdmin()) {
      throw new Error('Admin access required');
    }

    setLoading(true);
    try {
      // First, get the booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, client_id, status')
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      // Update the booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          status: newStatus,
          ...(notes && { notes })
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      // If status is 'no_show', apply penalty to client
      if (newStatus === 'no_show') {
        const penaltyUntil = format(addMonths(new Date(), 3), 'yyyy-MM-dd');
        
        const { error: penaltyError } = await supabase
          .from('profiles')
          .update({ penalty_until: penaltyUntil })
          .eq('id', booking.client_id);

        if (penaltyError) throw penaltyError;

        // Create notification for the client about the penalty
        await supabase
          .from('notifications')
          .insert({
            user_id: booking.client_id,
            title: 'Session Penalty Applied',
            body: `A penalty has been applied to your account due to a no-show. Rewards are paused until ${format(addMonths(new Date(), 3), 'MMMM do, yyyy')}.`,
          });

        toast({
          title: 'Status Updated',
          description: `Booking marked as no-show. 3-month penalty applied to client.`,
        });
      } else {
        toast({
          title: 'Status Updated',
          description: `Booking status updated to ${newStatus}`,
        });
      }

      return true;
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update booking status',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get all bookings for admin view
  const getAllBookings = async () => {
    if (!isAdmin()) {
      throw new Error('Admin access required');
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles:client_id(full_name),
          services:service_id(name, type)
        `)
        .order('date', { ascending: false })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
  };

  // Remove penalty from client
  const removePenalty = async (clientId: string) => {
    if (!isAdmin()) {
      throw new Error('Admin access required');
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ penalty_until: null })
        .eq('id', clientId);

      if (error) throw error;

      // Create notification for the client
      await supabase
        .from('notifications')
        .insert({
          user_id: clientId,
          title: 'Penalty Removed',
          body: 'Your account penalty has been removed. You can now use rewards again.',
        });

      toast({
        title: 'Penalty Removed',
        description: 'Client penalty has been successfully removed.',
      });

      return true;
    } catch (error: any) {
      console.error('Error removing penalty:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove penalty',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    updateBookingStatus,
    getAllBookings,
    removePenalty,
    isAdmin: isAdmin(),
  };
};