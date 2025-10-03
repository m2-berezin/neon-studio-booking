import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rewardUsage, setRewardUsage] = useState<RewardUsage[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStats>({
    mixingMasteringCount: 0,
    fullSongCount: 0,
  });

  // Rewards tables don't exist - all functions disabled
  const hasActivePenalty = (): boolean => {
    return false; // penalty_until field doesn't exist
  };

  const getPenaltyEndDate = (): Date | null => {
    return null; // penalty_until field doesn't exist
  };

  const getCurrentMonthUsage = (rewardCode: string): number => {
    return 0;
  };

  const loadRewardUsage = async () => {
    setRewardUsage([]);
  };

  const loadProjectStats = async () => {
    setProjectStats({
      mixingMasteringCount: 0,
      fullSongCount: 0,
    });
  };

  const canClaimReward = (rewardCode: string, maxPerMonth: number): boolean => {
    return false;
  };

  const getNextAvailableDate = (rewardCode: string, maxPerMonth: number): Date | null => {
    return null;
  };

  const claimReward = async (rewardCode: string, maxPerMonth: number) => {
    toast({
      title: 'Error',
      description: 'Rewards system not implemented',
      variant: 'destructive',
    });
    return false;
  };

  const canClaimLoyaltyReward = (rewardType: 'mixingMastering' | 'fullSong'): boolean => {
    return false;
  };

  const claimLoyaltyReward = async (rewardType: 'mixingMastering' | 'fullSong') => {
    toast({
      title: 'Error',
      description: 'Rewards system not implemented',
      variant: 'destructive',
    });
    return false;
  };

  return {
    loading,
    rewardUsage,
    projectStats,
    hasActivePenalty,
    getPenaltyEndDate,
    getCurrentMonthUsage,
    loadRewardUsage,
    loadProjectStats,
    canClaimReward,
    getNextAvailableDate,
    claimReward,
    canClaimLoyaltyReward,
    claimLoyaltyReward,
  };
};
