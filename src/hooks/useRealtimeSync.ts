import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useRealtimeSync = (forAdmin = false) => {
  const { user, refreshUserData, isAdminUser } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Set up realtime subscriptions for all relevant tables
    // Admin listens to ALL changes, regular users only their own
    const subscriptionsChannel = supabase
      .channel(forAdmin ? 'admin-subscriptions-changes' : 'subscriptions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          ...(forAdmin ? {} : { filter: `user_id=eq.${user.id}` }),
        },
        () => {
          console.log('[REALTIME] Subscription changed, refreshing data...');
          refreshUserData();
        }
      )
      .subscribe();

    const paymentRequestsChannel = supabase
      .channel(forAdmin ? 'admin-payment-requests-changes' : 'payment-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_requests',
          ...(forAdmin ? {} : { filter: `user_id=eq.${user.id}` }),
        },
        () => {
          console.log('[REALTIME] Payment request changed, refreshing...');
          refreshUserData();
        }
      )
      .subscribe();

    const bookingsChannel = supabase
      .channel(forAdmin ? 'admin-bookings-changes' : 'bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          ...(forAdmin ? {} : { filter: `user_id=eq.${user.id}` }),
        },
        () => {
          console.log('[REALTIME] Booking changed, refreshing...');
          refreshUserData();
        }
      )
      .subscribe();

    const reservationsChannel = supabase
      .channel(forAdmin ? 'admin-reservations-changes' : 'reservations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          ...(forAdmin ? {} : { filter: `user_id=eq.${user.id}` }),
        },
        () => {
          console.log('[REALTIME] Reservation changed, refreshing...');
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
  }, [user?.id, forAdmin, isAdminUser]);

  return null;
};
