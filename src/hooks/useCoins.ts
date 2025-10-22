import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CoinTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  expires_at: string | null;
  is_expired: boolean;
  created_at: string;
}

export const useCoins = () => {
  const { user, profile } = useAuth();
  const [coinsBalance, setCoinsBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);

  useEffect(() => {
    if (!user) {
      setCoinsBalance(0);
      setTransactions([]);
      setLoading(false);
      return;
    }

    loadCoins();
    subscribeToCoins();
  }, [user]);

  const loadCoins = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get current balance from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('coins_balance')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setCoinsBalance(profileData.coins_balance || 0);
      }

      // Get recent transactions
      const { data: txData } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txData) {
        setTransactions(txData);
      }
    } catch (error) {
      console.error('Error loading coins:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToCoins = () => {
    if (!user) return;

    const channel = supabase
      .channel('coin-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coin_transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadCoins();
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
          if (payload.new && 'coins_balance' in payload.new) {
            setCoinsBalance(payload.new.coins_balance || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getAvailableCoinsBreakdown = () => {
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

  const getCoinsInEuros = (coins: number) => {
    return coins / 250; // 2500 GW = 10€, so 250 GW = 1€
  };

  const getEurosInCoins = (euros: number) => {
    return euros * 250; // 1€ = 250 GW
  };

  return {
    coinsBalance,
    loading,
    transactions,
    refreshCoins: loadCoins,
    getAvailableCoinsBreakdown,
    getCoinsInEuros,
    getEurosInCoins,
  };
};
