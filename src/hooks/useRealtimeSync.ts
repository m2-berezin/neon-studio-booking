import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useRealtimeSync = () => {
  const { user, refreshUserData } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Set up realtime subscriptions for all relevant tables
    const subscriptionsChannel = supabase
      .channel('subscriptions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('Subscription changed, refreshing user data...');
          refreshUserData();
        }
      )
      .subscribe();

    const paymentRequestsChannel = supabase
      .channel('payment-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_requests',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('Payment request changed, refreshing...');
          refreshUserData();
        }
      )
      .subscribe();

    const bookingsChannel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('Booking changed, refreshing...');
          refreshUserData();
        }
      )
      .subscribe();

    const reservationsChannel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('Reservation changed, refreshing...');
          refreshUserData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscriptionsChannel);
      supabase.removeChannel(paymentRequestsChannel);
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(reservationsChannel);
    };
  }, [user?.id]);

  return null;
};
