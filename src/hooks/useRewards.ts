import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isBefore, parseISO } from 'date-fns';

interface RewardUsage {
  reward_code: string;
  count: number;
  month: number;
  year: number;
}

interface ProjectStats {
  mixingMasteringCount: number;
  fullSongCount: number;
}

export const useRewards = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rewardUsage, setRewardUsage] = useState<RewardUsage[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStats>({
    mixingMasteringCount: 0,
    fullSongCount: 0,
  });

  // Check if user has an active penalty
  const hasActivePenalty = (): boolean => {
    if (!profile?.penalty_until) return false;
    return isBefore(new Date(), parseISO(profile.penalty_until));
  };

  // Get penalty end date
  const getPenaltyEndDate = (): Date | null => {
    if (!profile?.penalty_until) return null;
    return parseISO(profile.penalty_until);
  };

  // Get current month reward usage count
  const getCurrentMonthUsage = (rewardCode: string): number => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const usage = rewardUsage.find(u => 
      u.reward_code === rewardCode && 
      u.month === currentMonth && 
      u.year === currentYear
    );
    
    return usage?.count || 0;
  };

  // Load reward usage data
  const loadRewardUsage = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('rewards_usage')
        .select('*')
        .eq('client_id', user.id);

      if (error) throw error;
      setRewardUsage(data || []);
    } catch (error) {
      console.error('Error loading reward usage:', error);
    }
  };

  // Load project statistics for loyalty rewards
  const loadProjectStats = async () => {
    if (!user) return;

    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('title, status')
        .eq('client_id', user.id)
        .eq('status', 'delivered');

      if (error) throw error;

      let mixingMasteringCount = 0;
      let fullSongCount = 0;

      projects?.forEach(project => {
        const title = project.title.toLowerCase();
        if (title.includes('mixing') || title.includes('mastering')) {
          mixingMasteringCount++;
        }
        if (title.includes('recording') && (title.includes('mixing') || title.includes('mastering'))) {
          fullSongCount++;
        }
      });

      setProjectStats({ mixingMasteringCount, fullSongCount });
    } catch (error) {
      console.error('Error loading project stats:', error);
    }
  };

  // Apply reward to session
  const applyReward = (rewardCode: string, description: string) => {
    if (hasActivePenalty()) {
      toast({
        title: 'Rewards Paused',
        description: 'You cannot apply rewards while a penalty is active.',
        variant: 'destructive',
      });
      return false;
    }

    // Store in session storage
    sessionStorage.setItem('appliedReward', JSON.stringify({
      code: rewardCode,
      description,
      appliedAt: new Date().toISOString()
    }));

    toast({
      title: 'Reward Applied',
      description: `${description} will be applied to your next booking.`,
    });

    return true;
  };

  // Increment reward usage
  const incrementRewardUsage = async (rewardCode: string) => {
    if (!user) return;

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    try {
      // Try to increment existing record or create a new one
      const { data: existing } = await supabase
        .from('rewards_usage')
        .select('*')
        .eq('client_id', user.id)
        .eq('reward_code', rewardCode)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('rewards_usage')
          .update({ count: existing.count + 1 })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('rewards_usage')
          .insert({
            client_id: user.id,
            reward_code: rewardCode,
            month: currentMonth,
            year: currentYear,
            count: 1
          });
      }

      // Reload usage data
      await loadRewardUsage();
    } catch (error) {
      console.error('Error incrementing reward usage:', error);
    }
  };

  // Redeem loyalty reward
  const redeemLoyaltyReward = async () => {
    if (!user) return false;

    if (hasActivePenalty()) {
      toast({
        title: 'Rewards Paused',
        description: 'You cannot redeem rewards while a penalty is active.',
        variant: 'destructive',
      });
      return false;
    }

    const isEligible = projectStats.mixingMasteringCount >= 7 || projectStats.fullSongCount >= 5;
    
    if (!isEligible) {
      toast({
        title: 'Not Eligible',
        description: 'You need 7 mixing/mastering projects or 5 full songs to redeem this reward.',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);
    try {
      // Create zero-price project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          client_id: user.id,
          title: 'Free Mixing & Mastering (Loyalty Reward)',
          status: 'in_progress'
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create voucher record for audit
      await supabase
        .from('vouchers')
        .insert({
          client_id: user.id,
          code: `LOYALTY_${Date.now()}`,
          amount: 0,
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days
          redeemed: true
        });

      // Reset project stats (they've used their loyalty reward)
      setProjectStats({ mixingMasteringCount: 0, fullSongCount: 0 });

      toast({
        title: 'Loyalty Reward Redeemed',
        description: 'Free mixing & mastering project created! Check your projects.',
      });

      return true;
    } catch (error: any) {
      console.error('Error redeeming loyalty reward:', error);
      toast({
        title: 'Redemption Failed',
        description: error.message || 'Failed to redeem loyalty reward',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Check if weekly offer A is available
  const isWeeklyOfferAAvailable = (): boolean => {
    const usage = getCurrentMonthUsage('W_REC_3FOR20');
    return !hasActivePenalty() && usage < 2;
  };

  // Check if loyalty reward is available
  const isLoyaltyRewardAvailable = (): boolean => {
    const isEligible = projectStats.mixingMasteringCount >= 7 || projectStats.fullSongCount >= 5;
    return !hasActivePenalty() && isEligible;
  };

  // Check if voucher is available (no penalty, last_voucher_at null or >= 6 months ago)
  const isVoucherAvailable = (): boolean => {
    if (hasActivePenalty()) return false;
    
    if (!profile?.last_voucher_at) return true;
    
    const lastVoucherDate = new Date(profile.last_voucher_at);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90); // 90 days = ~3 months
    
    return lastVoucherDate <= threeMonthsAgo;
  };

  // Claim €15 voucher
  const claimVoucher = async () => {
    if (!user) return false;

    if (!isVoucherAvailable()) {
      toast({
        title: 'Vale Não Disponível',
        description: 'Não és elegível para um vale neste momento.',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // +30 days

      // Insert voucher
      const { data: voucher, error: voucherError } = await supabase
        .from('vouchers')
        .insert({
          client_id: user.id,
          code: `VOUCHER_${Date.now()}`,
          amount: 15,
          expires_at: expiresAt.toISOString().split('T')[0],
          combinable: false,
          redeemed: false
        })
        .select()
        .single();

      if (voucherError) throw voucherError;

      // Update profile last_voucher_at
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ last_voucher_at: new Date().toISOString().split('T')[0] })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast({
        title: 'Vale Reivindicado!',
        description: `Vale de €15 criado! Código: ${voucher.code}. Expira em 30 dias.`,
      });

      return true;
    } catch (error: any) {
      console.error('Error claiming voucher:', error);
      toast({
        title: 'Falha na Reivindicação',
        description: error.message || 'Falha ao reivindicar vale',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile) {
      loadRewardUsage();
      loadProjectStats();
    }
  }, [user, profile]);

  return {
    loading,
    hasActivePenalty,
    getPenaltyEndDate,
    getCurrentMonthUsage,
    applyReward,
    incrementRewardUsage,
    redeemLoyaltyReward,
    isWeeklyOfferAAvailable,
    isLoyaltyRewardAvailable,
    isVoucherAvailable,
    claimVoucher,
    projectStats,
    rewardUsage,
  };
};