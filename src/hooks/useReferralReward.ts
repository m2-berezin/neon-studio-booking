import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ReferralReward {
  id: string;
  discount_percent: number;
  expires_at: string;
  is_used: boolean;
}

export const useReferralReward = () => {
  const { user } = useAuth();
  const [referralReward, setReferralReward] = useState<ReferralReward | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setReferralReward(null);
      setLoading(false);
      return;
    }

    loadReferralReward();
  }, [user]);

  const loadReferralReward = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      setReferralReward(data);
    } catch (error) {
      console.error('Error loading referral reward:', error);
      setReferralReward(null);
    } finally {
      setLoading(false);
    }
  };

  const hasReferralReward = !!referralReward;

  const getDaysLeft = () => {
    if (!referralReward) return 0;
    
    const expiresAt = new Date(referralReward.expires_at);
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  return {
    referralReward,
    hasReferralReward,
    loading,
    getDaysLeft,
    refreshReward: loadReferralReward,
  };
};
