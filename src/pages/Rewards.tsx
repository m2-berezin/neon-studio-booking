import React from 'react';
import { Gift, Star, Crown, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRewards } from '@/hooks/useRewards';
import { useAuth } from '@/contexts/AuthContext';
import PenaltyBanner from '@/components/PenaltyBanner';
import { format } from 'date-fns';

const Rewards = () => {
  const { profile } = useAuth();
  const { 
    loading, 
    userRewards, 
    hasActivePenalty, 
    getPenaltyEndDate, 
    redeemReward 
  } = useRewards();

  const nextTierPoints = 2000;
  const progress = Math.min((userRewards.total_points / nextTierPoints) * 100, 100);

  const rewards = [
    { 
      id: 'free-hour',
      title: 'Free Studio Hour', 
      points: 500, 
      icon: Star,
      description: 'One hour of free studio time'
    },
    { 
      id: 'beat-pack',
      title: 'Premium Beat Pack', 
      points: 750, 
      icon: Gift,
      description: '10 exclusive beats from our producers'
    },
    { 
      id: 'mixing-discount',
      title: 'Mixing Discount 25%', 
      points: 1000, 
      icon: Zap,
      description: '25% off your next mixing session'
    },
    { 
      id: 'vip-membership',
      title: 'VIP Membership', 
      points: 2500, 
      icon: Crown,
      description: 'Priority booking and exclusive access'
    },
  ];

  const handleRewardClaim = async (rewardId: string, pointsCost: number) => {
    await redeemReward(rewardId, pointsCost);
  };

  const isRewardAvailable = (pointsCost: number) => {
    return !hasActivePenalty() && userRewards.total_points >= pointsCost;
  };

  const penaltyEndDate = getPenaltyEndDate();

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-accent accent-glow mb-2">
          Studio Rewards
        </h1>
        <p className="text-muted-foreground">
          Earn points and unlock exclusive perks
        </p>
      </div>

      {/* Penalty Banner */}
      {hasActivePenalty() && penaltyEndDate && (
        <PenaltyBanner penaltyEndDate={penaltyEndDate} className="mb-6" />
      )}

      {/* Points Balance */}
      <div className="studio-card bg-gradient-to-br from-accent/10 to-primary/10">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-primary neon-glow mb-2">
            {userRewards.total_points.toLocaleString()}
          </h2>
          <p className="text-muted-foreground mb-4">Available Points</p>
          
          {/* Progress Bar */}
          <div className="w-full bg-secondary rounded-full h-2 mb-2">
            <div 
              className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {userRewards.total_points >= nextTierPoints 
              ? 'VIP status achieved!' 
              : `${nextTierPoints - userRewards.total_points} points to VIP status`
            }
          </p>
        </div>
      </div>

      {/* Earning Info */}
      <div className="studio-card">
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">How to Earn Points</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Complete session: <span className="font-medium text-foreground">10 pts</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">This month: <span className="font-medium text-foreground">{userRewards.current_month_bookings} sessions</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Available Rewards */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Available Rewards</h2>
        <div className="space-y-3">
          {rewards.map((reward) => {
            const canClaim = isRewardAvailable(reward.points);
            const hasEnoughPoints = userRewards.total_points >= reward.points;
            const isPenalized = hasActivePenalty();
            
            return (
              <div 
                key={reward.id} 
                className={`studio-card ${!hasEnoughPoints || isPenalized ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${
                      hasEnoughPoints && !isPenalized ? 'bg-primary/20' : 'bg-secondary'
                    }`}>
                      <reward.icon 
                        size={20} 
                        className={hasEnoughPoints && !isPenalized ? 'text-primary' : 'text-muted-foreground'} 
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{reward.title}</h3>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                      {isPenalized && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          Blocked by penalty
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <p className="text-lg font-bold text-accent">
                      {reward.points} pts
                    </p>
                    {canClaim ? (
                      <Button
                        size="sm"
                        onClick={() => handleRewardClaim(reward.id, reward.points)}
                        disabled={loading}
                        className="text-xs"
                      >
                        {loading ? 'Claiming...' : 'Claim'}
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        {!hasEnoughPoints ? 'Need more points' : 'Unavailable'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Point Balance Info */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          Points are earned automatically when you complete studio sessions.
          {hasActivePenalty() && (
            <span className="block text-destructive mt-1">
              Reward redemptions are currently paused due to an active penalty.
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default Rewards;