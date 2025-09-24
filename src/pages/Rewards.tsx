import React, { useState } from 'react';
import { Gift, Star, Crown, Zap, Clock, Percent, Package, Award, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRewards } from '@/hooks/useRewards';
import { useAuth } from '@/contexts/AuthContext';
import PenaltyBanner from '@/components/PenaltyBanner';

const Rewards = () => {
  const { user } = useAuth();
  const { 
    loading, 
    hasActivePenalty, 
    getPenaltyEndDate, 
    getCurrentMonthUsage,
    applyReward,
    redeemLoyaltyReward,
    isWeeklyOfferAAvailable,
    isLoyaltyRewardAvailable,
    isVoucherAvailable,
    claimVoucher,
    projectStats
  } = useRewards();

  const [appliedRewards, setAppliedRewards] = useState<Record<string, boolean>>({});

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Login Required</h2>
        <p className="text-muted-foreground">Please login to view rewards and offers.</p>
      </div>
    );
  }

  const penaltyEndDate = getPenaltyEndDate();

  const handleApplyReward = (rewardCode: string, description: string) => {
    const success = applyReward(rewardCode, description);
    if (success) {
      setAppliedRewards(prev => ({ ...prev, [rewardCode]: true }));
    }
  };

  const handleLoyaltyRedeem = async () => {
    const success = await redeemLoyaltyReward();
    if (success) {
      // Loyalty reward redeemed successfully - component will update automatically
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-accent accent-glow mb-2">
          Studio Rewards
        </h1>
        <p className="text-muted-foreground">
          Special offers and loyalty rewards for our valued clients
        </p>
      </div>

      {/* Penalty Banner */}
      {hasActivePenalty() && penaltyEndDate && (
        <PenaltyBanner penaltyEndDate={penaltyEndDate} className="mb-6" />
      )}

      {/* Voucher Banner */}
      {isVoucherAvailable() && (
        <Alert className="border-primary bg-primary/10 mb-6">
          <Ticket className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary font-medium">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold">€15 voucher available!</span>
                <p className="text-sm text-primary/80 mt-1">
                  Claim your quarterly voucher - valid for 60 days on any service.
                </p>
              </div>
              <Button
                onClick={claimVoucher}
                disabled={loading}
                size="sm"
                className="ml-4"
              >
                {loading ? 'Claiming...' : 'Claim €15 Voucher'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Weekly Offers */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" />
          Weekly Offers
        </h2>
        
        <div className="grid gap-4">
          {/* Offer A: 3h for €20 */}
          <Card className="studio-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Buy 2h Recording, Get +1h Free
              </CardTitle>
              <CardDescription>
                3 hours total recording time for just €20
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-accent">€20</p>
                  <p className="text-sm text-muted-foreground">
                    Used: {getCurrentMonthUsage('W_REC_3FOR20')}/2 this month
                  </p>
                  {!isWeeklyOfferAAvailable() && getCurrentMonthUsage('W_REC_3FOR20') >= 2 && (
                    <Badge variant="outline" className="text-xs mt-1">
                      Monthly limit reached
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={() => handleApplyReward('W_REC_3FOR20', '3h recording for €20')}
                  disabled={!isWeeklyOfferAAvailable() || appliedRewards['W_REC_3FOR20'] || loading}
                  variant={appliedRewards['W_REC_3FOR20'] ? 'outline' : 'default'}
                >
                  {appliedRewards['W_REC_3FOR20'] ? 'Applied ✓' : 'Apply to Next Booking'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Offer B: M&M €35 each for 2 tracks */}
          <Card className="studio-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Mixing & Mastering Bundle
              </CardTitle>
              <CardDescription>
                €35 each when sending 2 tracks together
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-accent">€35 each</p>
                  <p className="text-sm text-muted-foreground">
                    Unlimited uses • Save when bundling
                  </p>
                </div>
                <Button
                  onClick={() => handleApplyReward('W_MM_BUNDLE', 'M&M bundle €35 each')}
                  disabled={hasActivePenalty() || appliedRewards['W_MM_BUNDLE'] || loading}
                  variant={appliedRewards['W_MM_BUNDLE'] ? 'outline' : 'default'}
                >
                  {appliedRewards['W_MM_BUNDLE'] ? 'Applied ✓' : 'Apply Bundle Rate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Monthly Offers */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          Monthly Package
        </h2>
        
        <Card className="studio-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Full Production Package
            </CardTitle>
            <CardDescription>
              Recording + Mixing + Mastering complete package
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-bold text-accent">€70</p>
                    <p className="text-sm text-muted-foreground">Standard rate</p>
                  </div>
                  <div className="text-muted-foreground">or</div>
                  <div>
                    <p className="text-2xl font-bold text-primary">€65</p>
                    <p className="text-sm text-muted-foreground">Premium rate</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApplyReward('M_PACKAGE_70', 'Full package €70')}
                  disabled={hasActivePenalty() || appliedRewards['M_PACKAGE_70'] || loading}
                  variant={appliedRewards['M_PACKAGE_70'] ? 'outline' : 'secondary'}
                  size="sm"
                >
                  {appliedRewards['M_PACKAGE_70'] ? 'Applied ✓' : 'Apply €70'}
                </Button>
                <Button
                  onClick={() => handleApplyReward('M_PACKAGE_65', 'Full package €65')}
                  disabled={hasActivePenalty() || appliedRewards['M_PACKAGE_65'] || loading}
                  variant={appliedRewards['M_PACKAGE_65'] ? 'outline' : 'default'}
                  size="sm"
                >
                  {appliedRewards['M_PACKAGE_65'] ? 'Applied ✓' : 'Apply €65'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Loyalty Rewards */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Award className="w-6 h-6 text-primary" />
          Loyalty Rewards
        </h2>
        
        <Card className="studio-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Free Mixing & Mastering
            </CardTitle>
            <CardDescription>
              Earn a free M&M session through loyalty
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-secondary/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{projectStats.mixingMasteringCount}</p>
                  <p className="text-sm text-muted-foreground">M&M Projects</p>
                  <p className="text-xs text-muted-foreground">Need 7 total</p>
                </div>
                <div className="text-center p-4 bg-secondary/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{projectStats.fullSongCount}</p>
                  <p className="text-sm text-muted-foreground">Full Songs</p>
                  <p className="text-xs text-muted-foreground">Need 5 total</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {isLoyaltyRewardAvailable() 
                      ? 'Congratulations! You\'ve earned a free M&M session' 
                      : 'Keep completing projects to earn your free session'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Complete 7 mixing/mastering projects OR 5 full songs (record+mix+master)
                  </p>
                </div>
                <Button
                  onClick={handleLoyaltyRedeem}
                  disabled={!isLoyaltyRewardAvailable() || loading}
                  variant={isLoyaltyRewardAvailable() ? 'default' : 'outline'}
                >
                  {loading ? 'Redeeming...' : isLoyaltyRewardAvailable() ? 'Redeem Free M&M' : 'Not Available'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Info Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          Applied rewards will be automatically included in your next booking pricing.
          {hasActivePenalty() && (
            <span className="block text-destructive mt-1">
              All reward applications are currently paused due to an active penalty.
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default Rewards;