import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isBefore, parseISO } from 'date-fns';

interface RewardProgram {
  id: string;
  name: string;
  points_required: number;
  description: string;
  active: boolean;
}

interface UserRewards {
  total_points: number;
  current_month_bookings: number;
  penalty_until: string | null;
}

export const useRewards = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userRewards, setUserRewards] = useState<UserRewards>({
    total_points: 0,
    current_month_bookings: 0,
    penalty_until: null,
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

  // Calculate user rewards and points
  const calculateUserRewards = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get completed bookings count for points calculation
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, date, status')
        .eq('client_id', user.id)
        .eq('status', 'completed');

      if (bookingsError) throw bookingsError;

      // Calculate total points (10 points per completed session)
      const totalPoints = (bookings?.length || 0) * 10;

      // Get current month bookings
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const currentMonthBookings = bookings?.filter(booking => {
        const bookingDate = new Date(booking.date);
        return bookingDate.getMonth() + 1 === currentMonth && 
               bookingDate.getFullYear() === currentYear;
      }).length || 0;

      setUserRewards({
        total_points: totalPoints,
        current_month_bookings: currentMonthBookings,
        penalty_until: profile?.penalty_until || null,
      });

    } catch (error) {
      console.error('Error calculating rewards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load rewards data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Redeem reward
  const redeemReward = async (rewardId: string, pointsCost: number) => {
    if (!user) return false;

    // Check for active penalty
    if (hasActivePenalty()) {
      toast({
        title: 'Rewards Paused',
        description: 'You cannot redeem rewards while a penalty is active.',
        variant: 'destructive',
      });
      return false;
    }

    if (userRewards.total_points < pointsCost) {
      toast({
        title: 'Insufficient Points',
        description: `You need ${pointsCost} points but only have ${userRewards.total_points}.`,
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);
    try {
      // In a real implementation, you'd track reward redemptions
      // For now, we'll just create a notification
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Reward Redeemed',
          body: `You have successfully redeemed a reward using ${pointsCost} points!`,
        });

      // Recalculate rewards after redemption
      await calculateUserRewards();

      toast({
        title: 'Reward Redeemed',
        description: `Successfully redeemed reward for ${pointsCost} points!`,
      });

      return true;
    } catch (error: any) {
      console.error('Error redeeming reward:', error);
      toast({
        title: 'Redemption Failed',
        description: error.message || 'Failed to redeem reward',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile) {
      calculateUserRewards();
    }
  }, [user, profile]);

  return {
    loading,
    userRewards,
    hasActivePenalty,
    getPenaltyEndDate,
    redeemReward,
    calculateUserRewards,
  };
};