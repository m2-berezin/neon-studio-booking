import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PointTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  expires_at: string | null;
  is_expired: boolean;
  created_at: string;
}

export const usePoints = () => {
  const { user, profile } = useAuth();
  const [pointsBalance, setPointsBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);

  useEffect(() => {
    if (!user) {
      setPointsBalance(0);
      setTransactions([]);
      setLoading(false);
      return;
    }

    loadPoints();
    subscribeToPoints();
    
    // Poll for points every 10 seconds to ensure UI stays in sync
    const intervalId = setInterval(() => {
      loadPoints();
    }, 10000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [user]);

  const loadPoints = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get current balance from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('points_balance')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setPointsBalance(profileData.points_balance || 0);
      }

      // Get recent transactions
      const { data: txData } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txData) {
        setTransactions(txData);
      }
    } catch (error) {
      console.error('Error loading points:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToPoints = () => {
    if (!user) return;

    const channel = supabase
      .channel('point-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'point_transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadPoints();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && 'points_balance' in payload.new) {
            setPointsBalance(payload.new.points_balance || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getAvailablePointsBreakdown = () => {
    const now = new Date();
    const availableBatches: { amount: number; expiresAt: Date | null }[] = [];
    
    // Group positive transactions by expiration
    transactions.forEach((tx) => {
      if (tx.amount > 0 && !tx.is_expired) {
        const expiresAt = tx.expires_at ? new Date(tx.expires_at) : null;
        if (!expiresAt || expiresAt > now) {
          availableBatches.push({
            amount: tx.amount,
            expiresAt,
          });
        }
      }
    });

    return availableBatches;
  };

  const getPointsInEuros = (points: number) => {
    return points / 250; // 2500 points = 10€, so 250 points = 1€
  };

  const getEurosInPoints = (euros: number) => {
    return euros * 250; // 1€ = 250 points
  };

  return {
    pointsBalance,
    loading,
    transactions,
    refreshPoints: loadPoints,
    getAvailablePointsBreakdown,
    getPointsInEuros,
    getEurosInPoints,
  };
};
