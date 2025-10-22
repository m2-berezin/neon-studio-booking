import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Star, Clock, Award, Ticket, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRewards } from '@/hooks/useRewards';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PenaltyBanner from '@/components/PenaltyBanner';
import ReferralSystem from '@/components/ReferralSystem';
import { formatPrice } from '@/lib/utils';
interface Offer {
  id: string;
  name: string;
  description: string;
  price_eur: number;
  duration_paid_min: number;
  duration_free_min: number;
  total_duration_min: number;
  limit_per_month: number;
  is_active: boolean;
}
const Rewards = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
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
  
  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerUsage, setOfferUsage] = useState<Record<string, number>>({});
  const [applyingOffer, setApplyingOffer] = useState<string | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
  const [voucherStatus, setVoucherStatus] = useState<{ available: boolean; days_left: number } | null>(null);
  const [claimingVoucher, setClaimingVoucher] = useState(false);
  const [activePlanType, setActivePlanType] = useState<string | null>(null);
  const [plan180DayOffer, setPlan180DayOffer] = useState<{ 
    eligible: boolean; 
    days_remaining: number | null;
    reason?: string;
  } | null>(null);
  const [claiming180DayOffer, setClaiming180DayOffer] = useState(false);

  // Fetch active offers and usage
  useEffect(() => {
    if (user) {
      fetchOffersAndUsage();
      fetchLoyaltyPoints();
      fetchVoucherStatus();
      fetchActivePlan();
      fetch180DayOfferEligibility();
    }
  }, [user]);

  // Realtime subscription for user_offers changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('user_offers_changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_offers',
      filter: `user_id=eq.${user.id}`
    }, payload => {
      console.log('[REWARDS REALTIME] user_offers changed:', payload);
      fetchOffersAndUsage();
    }).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'loyalty_points',
      filter: `user_id=eq.${user.id}`
    }, payload => {
      console.log('[REWARDS REALTIME] loyalty_points changed:', payload);
      fetchLoyaltyPoints();
    }).subscribe((status) => {
      console.log('[REWARDS REALTIME] Subscription status:', status);
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  const fetchOffersAndUsage = async () => {
    try {
      // Fetch active offers
      const {
        data: offersData,
        error: offersError
      } = await supabase.from('offers').select('*').eq('is_active', true);
      if (offersError) throw offersError;
      console.log('[REWARDS] Active offers:', offersData);
      setOffers(offersData || []);

      // Fetch usage for current month - use exact month_year format (YYYY-MM-01)
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      
      console.log('[REWARDS] Fetching user_offers for month_year:', monthYear, 'user_id:', user!.id);
      
      const {
        data: usageData,
        error: usageError
      } = await supabase
        .from('user_offers')
        .select('offer_id, used_count, month_year')
        .eq('user_id', user!.id)
        .eq('month_year', monthYear);
      
      if (usageError) {
        console.error('[REWARDS] Error fetching usage:', usageError);
        throw usageError;
      }
      
      console.log('[REWARDS] ✅ Received usage data:', usageData);
      
      const usageMap: Record<string, number> = {};
      usageData?.forEach(item => {
        usageMap[item.offer_id] = item.used_count;
        console.log('[REWARDS] Offer', item.offer_id, 'used:', item.used_count);
      });
      setOfferUsage(usageMap);
    } catch (error) {
      console.error('[REWARDS] Error fetching offers:', error);
    }
  };

  const fetchLoyaltyPoints = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_loyalty_points' as any, {
        p_user_id: user.id
      });
      if (error) throw error;
      setLoyaltyPoints((data as number) || 0);
    } catch (error) {
      console.error('Error fetching loyalty points:', error);
    }
  };

  const fetchVoucherStatus = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_voucher_status' as any, {
        p_user_id: user.id
      });
      if (error) throw error;
      setVoucherStatus(data as { available: boolean; days_left: number });
    } catch (error) {
      console.error('Error fetching voucher status:', error);
    }
  };

  const fetchActivePlan = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_type')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
      setActivePlanType(data?.plan_type || null);
    } catch (error) {
      console.error('Error fetching active plan:', error);
    }
  };

  const fetch180DayOfferEligibility = async () => {
    if (!user || !activePlanType) return;
    
    try {
      // Determine offer type based on plan
      const offerType = activePlanType === 'S' ? 'mixmaster' : activePlanType === 'X' ? 'captacao_mixmaster' : null;
      if (!offerType) return;
      
      const { data, error } = await supabase.rpc('check_180day_offer_eligibility' as any, {
        p_user_id: user.id,
        p_offer_type: offerType
      });
      
      if (error) throw error;
      setPlan180DayOffer(data as any);
    } catch (error) {
      console.error('Error fetching 180-day offer eligibility:', error);
    }
  };

  // Refetch 180-day offer when plan changes
  useEffect(() => {
    if (activePlanType) {
      fetch180DayOfferEligibility();
    }
  }, [activePlanType]);
  const handleApplyOffer = async (offerId: string) => {
    if (!user) return;
    setApplyingOffer(offerId);
    
    // Find the offer to determine the correct notification
    const offer = offers.find(o => o.id === offerId);
    const isPremiumOffer = offer?.name.includes('PREMIUM+');
    
    try {
      console.log('[REWARDS] 🔵 Applying offer:', offerId);
      
      // Call RPC to apply offer and create reservation
      const {
        data: reservationId,
        error
      } = await supabase.rpc('apply_offer', {
        p_user_id: user.id,
        p_offer_id: offerId,
        p_starts_at: null
      });
      
      if (error) throw error;
      
      console.log('[REWARDS] ✅ Offer applied! Reservation created:', reservationId);
      
      // Show different notification based on offer type
      toast({
        title: isPremiumOffer ? 'Oferta 2h Captação plano PREMIUM+ ativada' : 'Oferta aplicada!',
        description: 'Redireccionando para o calendário...'
      });

      // Redirect to booking with reservation ID
      setTimeout(() => {
        navigate(`/book?reservation=${reservationId}`);
      }, 500);
    } catch (error: any) {
      console.error('[REWARDS] ❌ Error applying offer:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível aplicar a oferta',
        variant: 'destructive'
      });
    } finally {
      setApplyingOffer(null);
      fetchOffersAndUsage(); // Refresh usage
    }
  };
  if (!user) {
    return <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Sessão Requerida</h2>
        <p className="text-muted-foreground">Por favor faz login para ver recompensas e ofertas.</p>
      </div>;
  }
  const penaltyEndDate = getPenaltyEndDate();

  // Find the "Compre 2h Gravação, Ganhe +1h Grátis" offer
  const recordingOffer = offers.find(o => o.name.includes('Compre 2h') || o.name.includes('Ganhe +1h'));
  
  // Find the PREMIUM+ offer (2h captação grátis)
  const premiumOffer = offers.find(o => o.name.includes('PREMIUM+'));
  const handleApplyReward = async (rewardCode: string) => {
    const success = await applyReward(rewardCode);
    if (success) {
      setAppliedRewards(prev => ({
        ...prev,
        [rewardCode]: true
      }));
    }
  };
  const handleLoyaltyRedeem = async () => {
    if (!user || loyaltyPoints < 7) return;
    
    toast({
      title: 'Oferta ativada!',
      description: 'Redireccionando para Mix&Master...',
    });

    // Navigate to MixMaster page with loyalty offer flag
    setTimeout(() => {
      navigate('/mix-master?loyalty=true');
    }, 500);
  };

  const handleClaimVoucher = async () => {
    if (!user || !voucherStatus?.available) return;
    
    setClaimingVoucher(true);
    try {
      const { data, error } = await supabase.rpc('claim_voucher' as any, {
        p_user_id: user.id
      });
      
      if (error) throw error;
      
      toast({
        title: 'Voucher reclamado!',
        description: 'Use na próxima reserva.',
      });
      
      // Refresh voucher status
      await fetchVoucherStatus();
    } catch (error: any) {
      console.error('Error claiming voucher:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível reclamar o voucher',
        variant: 'destructive',
      });
    } finally {
      setClaimingVoucher(false);
    }
  };

  const handleClaim180DayOffer = async () => {
    if (!user || !activePlanType || !plan180DayOffer?.eligible) return;
    
    setClaiming180DayOffer(true);
    try {
      const offerType = activePlanType === 'S' ? 'mixmaster' : 'captacao_mixmaster';
      
      const { data: reservationId, error } = await supabase.rpc('claim_180day_offer' as any, {
        p_user_id: user.id,
        p_offer_type: offerType
      });
      
      if (error) throw error;
      
      const offerName = activePlanType === 'S' ? 'Mix&Master' : 'Captação 3h + Mix&Master';
      
      toast({
        title: `Oferta ${offerName} ativada!`,
        description: activePlanType === 'S' 
          ? 'Redireccionando para Mix&Master...' 
          : 'Redireccionando para o calendário...',
      });
      
      // Navigate based on plan type
      setTimeout(() => {
        if (activePlanType === 'S') {
          navigate(`/mix-master?plan180day=true&reservation=${reservationId}`);
        } else {
          navigate(`/book?plan180day=true&reservation=${reservationId}`);
        }
      }, 500);
      
      // Refresh eligibility
      await fetch180DayOfferEligibility();
    } catch (error: any) {
      console.error('Error claiming 180-day offer:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível reclamar a oferta',
        variant: 'destructive',
      });
    } finally {
      setClaiming180DayOffer(false);
    }
  };
  return <div className="space-y-6">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate('/?tab=7')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
      
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold neon-title mb-2">
          Recompensas do Estúdio
        </h1>
        <p className="text-muted-foreground text-lg">
          Ofertas especiais e recompensas para clientes regulares
        </p>
      </div>

      {/* Penalty Banner */}
      {hasActivePenalty() && penaltyEndDate && <PenaltyBanner penaltyEndDate={penaltyEndDate} className="mb-6" />}

      {/* Referral System */}
      <ReferralSystem className="mb-6" />

      {/* Voucher 15€ Section */}
      {voucherStatus && (
        <Alert className="border-primary bg-primary/10 mb-6">
          <Ticket className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary font-medium">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {voucherStatus.available ? (
                  <>
                    <span className="font-semibold">Voucher 15€ disponível!</span>
                    <p className="text-sm text-primary/80 mt-1">
                      Reclama o teu voucher e usa na próxima reserva.
                    </p>
                    <p className="text-xs text-orange-600 font-medium mt-2">
                      ⚠️ Ao reivindicar o voucher tens 15€ para usar um serviço ou o voucher ficará inativo.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Voucher 15€</span>
                    <p className="text-sm text-primary/80 mt-1">
                      Faltam {voucherStatus.days_left} dias para reivindicar
                    </p>
                  </>
                )}
              </div>
              <Button 
                onClick={handleClaimVoucher} 
                disabled={!voucherStatus.available || claimingVoucher || hasActivePenalty()} 
                size="sm" 
                className="ml-4"
              >
                {claimingVoucher ? 'A reivindicar...' : 'Reivindicar Voucher 15€'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Monthly Offers */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" />
          Ofertas Mensais
        </h2>
        
        <div className="grid gap-4">
          {/* PREMIUM+ Offer: 2h captação grátis - Only for Plan X subscribers */}
          {premiumOffer && activePlanType === 'X' && <Card className="studio-card border-primary bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary flex-shrink-0" />
                  Oferta 2h de Captação por Mês PREMIUM+
                </CardTitle>
                <CardDescription className="min-h-[40px]">
                  {premiumOffer.description || 'Exclusivo para assinantes Plano X - 2h de captação totalmente grátis uma vez por mês'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-primary mb-1">GRÁTIS</p>
                    <p className="text-sm text-muted-foreground mb-1">
                      Usado: {offerUsage[premiumOffer.id] || 0}/{premiumOffer.limit_per_month} este mês
                    </p>
                    {(offerUsage[premiumOffer.id] || 0) >= premiumOffer.limit_per_month && <Badge variant="outline" className="text-xs">
                        Limite mensal atingido
                      </Badge>}
                  </div>
                  <Button onClick={() => handleApplyOffer(premiumOffer.id)} disabled={(offerUsage[premiumOffer.id] || 0) >= premiumOffer.limit_per_month || applyingOffer === premiumOffer.id || hasActivePenalty()} variant="default" className="bg-primary hover:bg-primary/90 w-full sm:w-auto whitespace-nowrap">
                    {applyingOffer === premiumOffer.id ? 'A aplicar...' : 'Aplicar Esta Oferta'}
                  </Button>
                </div>
              </CardContent>
            </Card>}
          
          {/* Offer A: 3h for €20 - Dynamic from database */}
          {recordingOffer && <Card className="studio-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary flex-shrink-0" />
                  Compra 2h de gravação, ganha + 1h grátis
                </CardTitle>
                <CardDescription className="min-h-[40px]">
                  {recordingOffer.description || `3 horas totais de gravação por apenas €20`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-accent mb-1">{formatPrice(recordingOffer.price_eur)}</p>
                    <p className="text-sm text-muted-foreground mb-1">
                      Usado: {offerUsage[recordingOffer.id] || 0}/{recordingOffer.limit_per_month} este mês
                    </p>
                    {(offerUsage[recordingOffer.id] || 0) >= recordingOffer.limit_per_month && <Badge variant="outline" className="text-xs mt-1">
                        Limite mensal atingido
                      </Badge>}
                  </div>
                  <Button onClick={() => handleApplyOffer(recordingOffer.id)} disabled={(offerUsage[recordingOffer.id] || 0) >= recordingOffer.limit_per_month || applyingOffer === recordingOffer.id || hasActivePenalty()} variant="default">
                    {applyingOffer === recordingOffer.id ? 'A aplicar...' : 'Aplicar à minha próxima reserva'}
                  </Button>
                </div>
              </CardContent>
            </Card>}
        </div>
      </section>

      {/* Plan 180-Day Offer */}
      {activePlanType && plan180DayOffer && (
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            Oferta Exclusiva Plano {activePlanType}
          </h2>
          
          <Card className="studio-card border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                {activePlanType === 'S' ? 'Mix&Master Grátis (180 dias)' : 'Captação 3h + Mix&Master Grátis (180 dias)'}
              </CardTitle>
              <CardDescription>
                {activePlanType === 'S' 
                  ? 'Após 180 dias de subscrição, ganha 1 Mix&Master totalmente grátis' 
                  : 'Após 180 dias de subscrição, ganha 1 Captação 3h + Mix&Master totalmente grátis'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {plan180DayOffer.eligible ? (
                  <>
                    <div className="text-center p-6 bg-green-500/10 rounded-lg border border-green-500/20">
                      <p className="text-2xl font-bold text-green-600 mb-2">
                        🎉 Oferta Disponível!
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Parabéns! Podes reclamar a tua oferta agora.
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handleClaim180DayOffer}
                      disabled={claiming180DayOffer || hasActivePenalty()} 
                      variant="default"
                      size="lg"
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      {claiming180DayOffer ? 'A ativar...' : `Reclamar ${activePlanType === 'S' ? 'Mix&Master' : 'Captação 3h + Mix&Master'} Grátis`}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-center p-6 bg-secondary/50 rounded-lg">
                      <p className="text-4xl font-bold text-primary mb-2">
                        {plan180DayOffer.days_remaining !== null 
                          ? `${plan180DayOffer.days_remaining} dias` 
                          : 'Indisponível'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {plan180DayOffer.reason === 'waiting_period' 
                          ? 'Faltam para desbloquear esta oferta' 
                          : plan180DayOffer.reason === 'already_claimed'
                          ? 'Oferta já reclamada'
                          : plan180DayOffer.reason === 'no_subscription'
                          ? 'Sem subscrição ativa'
                          : 'Oferta indisponível'}
                      </p>
                    </div>
                    
                    <Button 
                      disabled={true}
                      variant="outline"
                      size="lg"
                      className="w-full"
                    >
                      Ainda Não Disponível
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

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
              Mix&Master Grátis
            </CardTitle>
            <CardDescription>
              Acumula pontos e ganha uma Mix&Master grátis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center p-6 bg-secondary/50 rounded-lg">
                <p className="text-4xl font-bold text-primary mb-2">
                  Pontos: {loyaltyPoints}/7
                </p>
                <p className="text-sm text-muted-foreground">
                  {loyaltyPoints >= 7 
                    ? 'Parabéns! Podes reclamar a tua Mix&Master grátis!' 
                    : `Faltam ${7 - loyaltyPoints} pontos para a oferta Mix&Master`}
                </p>
              </div>
              
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground text-center">
                  Ganha 1 ponto por cada serviço 'Captação 3h Mix & Master' ou 'Mix & Master' completado
                </p>
                <Button 
                  onClick={handleLoyaltyRedeem}
                  disabled={loyaltyPoints < 7 || hasActivePenalty()} 
                  variant={loyaltyPoints >= 7 ? 'default' : 'outline'}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {loyaltyPoints >= 7 ? 'Reclamar Oferta Mix&Master' : 'Não Disponível'}
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
          {hasActivePenalty() && <span className="block text-destructive mt-1">
              Todas as aplicações de recompensas estão atualmente pausadas devido a uma penalização ativa.
            </span>}
        </p>
      </div>
    </div>;
};
export default Rewards;