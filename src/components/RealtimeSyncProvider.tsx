import { ReactNode } from 'react';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

interface RealtimeSyncProviderProps {
  children: ReactNode;
}

/**
 * Wrapper component that enables realtime data synchronization
 * for subscriptions, payments, bookings, and reservations.
 * 
 * Use this to wrap pages that need automatic data refresh.
 */
export const RealtimeSyncProvider = ({ children }: RealtimeSyncProviderProps) => {
  useRealtimeSync();
  return <>{children}</>;
};
