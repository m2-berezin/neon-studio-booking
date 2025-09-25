import React, { useState } from 'react';
import { Gift, Star, Crown, Zap, Clock, Percent, Package, Award, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRewards } from '@/hooks/useRewards';
import { useAuth } from '@/contexts/AuthContext';
import PenaltyBanner from '@/components/PenaltyBanner';
import ReferralSystem from '@/components/ReferralSystem';

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
        <h2 className="text-2xl font-bold text-foreground mb-4">Sessão Requerida</h2>
        <p className="text-muted-foreground">Por favor faz login para ver recompensas e ofertas.</p>
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
        <h1 className="text-4xl font-bold neon-title mb-2">
          Recompensas do Estúdio
        </h1>
        <p className="text-muted-foreground text-lg">
          Ofertas especiais e recompensas para clientes regulares
        </p>
      </div>

      {/* Penalty Banner */}
      {hasActivePenalty() && penaltyEndDate && (
        <PenaltyBanner penaltyEndDate={penaltyEndDate} className="mb-6" />
      )}

      {/* Referral System */}
      <ReferralSystem className="mb-6" />

      {/* Voucher Banner */}
      {isVoucherAvailable() && (
        <Alert className="border-primary bg-primary/10 mb-6">
          <Ticket className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary font-medium">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold">Vale de €15 disponível!</span>
                <p className="text-sm text-primary/80 mt-1">
                  Disponível a cada 90 dias.
                </p>
                <div className="text-xs text-orange-600 font-medium mt-2">
                  ⏰ Dias restantes para reivindicar: {Math.max(0, Math.ceil((new Date().getTime() + 90 * 24 * 60 * 60 * 1000 - new Date().getTime()) / (24 * 60 * 60 * 1000)))}
                </div>
              </div>
              <Button
                onClick={claimVoucher}
                disabled={loading}
                size="sm"
                className="ml-4"
              >
                {loading ? 'A reivindicar...' : 'Reivindicar Vale de €15'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Weekly Offers */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" />
          Ofertas Semanais
        </h2>
        
        <div className="grid gap-4">
          {/* Offer A: 3h for €20 */}
          <Card className="studio-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Compre 2h de Gravação, Ganhe +1h Grátis
              </CardTitle>
              <CardDescription>
                3 horas totais de gravação por apenas €20
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-accent">€20</p>
                  <p className="text-sm text-muted-foreground">
                    Usado: {getCurrentMonthUsage('W_REC_3FOR20')}/2 este mês
                  </p>
                  {!isWeeklyOfferAAvailable() && getCurrentMonthUsage('W_REC_3FOR20') >= 2 && (
                    <Badge variant="outline" className="text-xs mt-1">
                      Limite mensal atingido
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={() => {
                    handleApplyReward('W_REC_3FOR20', '3h recording for €20');
                    window.open('/book?discount=W_REC_3FOR20', '_blank');
                  }}
                  disabled={!isWeeklyOfferAAvailable() || appliedRewards['W_REC_3FOR20'] || loading}
                  variant={appliedRewards['W_REC_3FOR20'] ? 'outline' : 'default'}
                >
                  {appliedRewards['W_REC_3FOR20'] ? 'Aplicado ✓' : 'Aplicar à Próxima Reserva'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Offer B: M&M €35 each for 2 tracks */}
          <Card className="studio-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Bundle Mistura & Masterização
              </CardTitle>
              <CardDescription>
                €35 cada ao enviar 2 faixas juntas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-accent">€35 cada</p>
                  <p className="text-sm text-muted-foreground">
                    Usos ilimitados • Poupe ao agrupar
                  </p>
                </div>
                <Button
                  onClick={() => {
                    handleApplyReward('W_MM_BUNDLE', 'M&M bundle €35 each');
                    window.open('/mix-master?discount=W_MM_BUNDLE', '_blank');
                  }}
                  disabled={hasActivePenalty() || appliedRewards['W_MM_BUNDLE'] || loading}
                  variant={appliedRewards['W_MM_BUNDLE'] ? 'outline' : 'default'}
                >
                  {appliedRewards['W_MM_BUNDLE'] ? 'Aplicado ✓' : 'Aplicar Oferta'}
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
          Pacote Mensal
        </h2>
        
        <Card className="studio-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Crown className="w-5 h-5 text-primary" />
              Pacote Produção Completa
            </CardTitle>
            <CardDescription className="text-sm">
              Pacote completo Gravação + Mistura + Masterização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-center sm:text-left">
                <div>
                  <p className="text-2xl font-bold text-accent">€70</p>
                  <p className="text-sm text-muted-foreground">Taxa padrão</p>
                </div>
                <div className="text-muted-foreground hidden sm:block">ou</div>
                <div>
                  <p className="text-2xl font-bold text-primary">€65</p>
                  <p className="text-sm text-muted-foreground">Taxa premium</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => handleApplyReward('M_PACKAGE_70', 'Full package €70')}
                  disabled={hasActivePenalty() || appliedRewards['M_PACKAGE_70'] || loading}
                  variant={appliedRewards['M_PACKAGE_70'] ? 'outline' : 'secondary'}
                  size="sm"
                  className="w-full sm:w-auto"
                  >
                    {appliedRewards['M_PACKAGE_70'] ? 'Aplicado ✓' : 'Aplicar €70'}
                  </Button>
                  <Button
                    onClick={() => handleApplyReward('M_PACKAGE_65', 'Full package €65')}
                    disabled={hasActivePenalty() || appliedRewards['M_PACKAGE_65'] || loading}
                    variant={appliedRewards['M_PACKAGE_65'] ? 'outline' : 'default'}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    {appliedRewards['M_PACKAGE_65'] ? 'Aplicado ✓' : 'Aplicar €65'}
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
          Recompensas de Fidelidade
        </h2>
        
        <Card className="studio-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Ganha uma Mix&Master
            </CardTitle>
            <CardDescription>
              Através da acumulação de pontos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="text-center p-4 bg-secondary/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{projectStats.mixingMasteringCount}</p>
                  <p className="text-sm text-muted-foreground">Projetos M&M</p>
                  <p className="text-xs text-muted-foreground">Precisas de 7 no total</p>
                </div>
                <div className="text-center p-4 bg-secondary/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{projectStats.fullSongCount}</p>
                  <p className="text-sm text-muted-foreground">Músicas Completas</p>
                  <p className="text-xs text-muted-foreground">Precisas de 5 no total</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-center sm:text-left">
                  <p className="font-medium text-foreground">
                    {isLoyaltyRewardAvailable() 
                      ? 'Parabéns! Ganhou uma sessão M&M grátis' 
                      : 'Continua a completar projetos para ganhar a tua sessão grátis'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Complete 7 projetos de mistura/masterização OU 5 músicas completas (gravar+misturar+masterizar)
                  </p>
                </div>
                <Button
                  onClick={handleLoyaltyRedeem}
                  disabled={!isLoyaltyRewardAvailable() || loading}
                  variant={isLoyaltyRewardAvailable() ? 'default' : 'outline'}
                  className="w-full sm:w-auto"
                >
                  {loading ? 'A resgatar...' : isLoyaltyRewardAvailable() ? 'Resgatar M&M Grátis' : 'Não Disponível'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Info Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          As recompensas aplicadas serão automaticamente incluídas no preço da tua próxima reserva.
          {hasActivePenalty() && (
            <span className="block text-destructive mt-1">
              Todas as aplicações de recompensas estão atualmente pausadas devido a uma penalização ativa.
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default Rewards;