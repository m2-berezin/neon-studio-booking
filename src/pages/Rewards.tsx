import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Star, Clock, Award, Ticket, ArrowLeft, Music, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRewards } from '@/hooks/useRewards';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PenaltyBanner from '@/components/PenaltyBanner';
import ReferralSystem from '@/components/ReferralSystem';
import { formatPrice } from '@/lib/utils';
import PointsCard from '@/components/PointsCard';

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
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    loading, hasActivePenalty, getPenaltyEndDate, getCurrentMonthUsage,
    applyReward, redeemLoyaltyReward, isWeeklyOfferAAvailable,
    isLoyaltyRewardAvailable, isVoucherAvailable, claimVoucher, projectStats
  } = useRewards();
  const [appliedRewards, setAppliedRewards] = useState<Record<string, boolean>>({});
  
  useEffect(() => { window.scrollTo(0, 0); }, []);

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
  const [show180DayChoiceDialog, setShow180DayChoiceDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOffersAndUsage();
      fetchLoyaltyPoints();
      fetchVoucherStatus();
      fetchActivePlan();
      fetch180DayOfferEligibility();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('user_offers_changes').on('postgres_changes', {
      event: '*', schema: 'public', table: 'user_offers', filter: `user_id=eq.${user.id}`
    }, () => { fetchOffersAndUsage(); }).on('postgres_changes', {
      event: '*', schema: 'public', table: 'loyalty_points', filter: `user_id=eq.${user.id}`
    }, () => { fetchLoyaltyPoints(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchOffersAndUsage = async () => {
    try {
      const { data: offersData, error: offersError } = await supabase.from('offers').select('*').eq('is_active', true);
      if (offersError) throw offersError;
      setOffers(offersData || []);
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const { data: usageData, error: usageError } = await supabase
        .from('user_offers').select('offer_id, used_count, month_year')
        .eq('user_id', user!.id).eq('month_year', monthYear);
      if (usageError) throw usageError;
      const usageMap: Record<string, number> = {};
      usageData?.forEach(item => { usageMap[item.offer_id] = item.used_count; });
      setOfferUsage(usageMap);
    } catch (error) { console.error('[REWARDS] Error fetching offers:', error); }
  };

  const fetchLoyaltyPoints = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_loyalty_points' as any, { p_user_id: user.id });
      if (error) throw error;
      setLoyaltyPoints((data as number) || 0);
    } catch (error) { console.error('Error fetching loyalty points:', error); }
  };

  const fetchVoucherStatus = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_voucher_status' as any, { p_user_id: user.id });
      if (error) throw error;
      setVoucherStatus(data as { available: boolean; days_left: number });
    } catch (error) { console.error('Error fetching voucher status:', error); }
  };

  const fetchActivePlan = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('subscriptions').select('plan_type')
        .eq('user_id', user.id).eq('is_active', true).single();
      if (error && error.code !== 'PGRST116') throw error;
      setActivePlanType(data?.plan_type || null);
    } catch (error) { console.error('Error fetching active plan:', error); }
  };

  const fetch180DayOfferEligibility = async () => {
    if (!user || !activePlanType) return;
    try {
      const offerType = activePlanType === 'S' ? 'mixmaster' : activePlanType === 'X' ? 'captacao_mixmaster' : null;
      if (!offerType) return;
      const { data, error } = await supabase.rpc('check_180day_offer_eligibility' as any, {
        p_user_id: user.id, p_offer_type: offerType
      });
      if (error) throw error;
      setPlan180DayOffer(data as any);
    } catch (error) { console.error('Error fetching 180-day offer eligibility:', error); }
  };

  useEffect(() => { if (activePlanType) fetch180DayOfferEligibility(); }, [activePlanType]);

  const handleApplyOffer = async (offerId: string) => {
    if (!user) return;
    setApplyingOffer(offerId);
    const offer = offers.find(o => o.id === offerId);
    const isPremiumOffer = offer?.name.includes('PREMIUM+');
    try {
      const { data: reservationId, error } = await supabase.rpc('apply_offer', {
        p_user_id: user.id, p_offer_id: offerId, p_starts_at: null
      });
      if (error) throw error;
      toast({
        title: isPremiumOffer ? 'Oferta 2h Captação plano PREMIUM+ ativada' : 'Oferta aplicada!',
        description: 'Redireccionando para o calendário...'
      });
      setTimeout(() => { navigate(`/book?reservation=${reservationId}`); }, 500);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Não foi possível aplicar a oferta', variant: 'destructive' });
    } finally {
      setApplyingOffer(null);
      fetchOffersAndUsage();
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-lg font-bold text-foreground mb-2">Sessão Requerida</h2>
        <p className="text-sm text-muted-foreground">Por favor faz login para ver recompensas e ofertas.</p>
      </div>
    );
  }

  const penaltyEndDate = getPenaltyEndDate();
  const recordingOffer = offers.find(o => o.name.includes('Compre 2h') || o.name.includes('Ganhe +1h'));
  const premiumOffer = offers.find(o => o.name.includes('PREMIUM+'));

  const handleApplyReward = async (rewardCode: string) => {
    const success = await applyReward(rewardCode);
    if (success) setAppliedRewards(prev => ({ ...prev, [rewardCode]: true }));
  };

  const handleLoyaltyRedeem = async () => {
    if (!user || loyaltyPoints < 7) return;
    toast({ title: 'Oferta ativada!', description: 'Redireccionando para Mix&Master...' });
    setTimeout(() => { navigate('/mix-master?loyalty=true'); }, 500);
  };

  const handleClaimVoucher = async () => {
    if (!user || !voucherStatus?.available) return;
    setClaimingVoucher(true);
    try {
      const { data, error } = await supabase.rpc('claim_voucher' as any, { p_user_id: user.id });
      if (error) throw error;
      toast({ title: 'Voucher reclamado!', description: 'Use na próxima reserva.' });
      await fetchVoucherStatus();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Não foi possível reclamar o voucher', variant: 'destructive' });
    } finally { setClaimingVoucher(false); }
  };

  const handleClaim180DayOffer = async (chosenType?: string) => {
    if (!user || !activePlanType || !plan180DayOffer?.eligible) return;
    
    // For Plan S, show choice dialog first
    if (activePlanType === 'S' && !chosenType) {
      setShow180DayChoiceDialog(true);
      return;
    }
    
    setClaiming180DayOffer(true);
    setShow180DayChoiceDialog(false);
    try {
      const offerType = chosenType || (activePlanType === 'S' ? 'mixmaster' : 'captacao_mixmaster');
      const { data: reservationId, error } = await supabase.rpc('claim_180day_offer' as any, {
        p_user_id: user.id, p_offer_type: offerType
      });
      if (error) throw error;
      
      if (offerType === 'mixmaster') {
        toast({ title: 'Oferta Mix&Master ativada!', description: 'Redireccionando para Mix&Master...' });
        setTimeout(() => { navigate(`/mix-master?plan180day=true&reservation=${reservationId}`); }, 500);
      } else if (offerType === 'mixmaster_with_captacao') {
        toast({ title: 'Oferta Captação 3h + Mix&Master ativada!', description: 'Redireccionando para o calendário...' });
        setTimeout(() => { navigate(`/book?plan180day=true&reservation=${reservationId}`); }, 500);
      } else {
        toast({ title: 'Oferta Captação 3h + Mix&Master ativada!', description: 'Redireccionando para o calendário...' });
        setTimeout(() => { navigate(`/book?plan180day=true&reservation=${reservationId}`); }, 500);
      }
      await fetch180DayOfferEligibility();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Não foi possível reclamar a oferta', variant: 'destructive' });
    } finally { setClaiming180DayOffer(false); }
  };

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/?tab=7')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
      
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold neon-title mb-1">Recompensas</h1>
      </div>

      {hasActivePenalty() && penaltyEndDate && <PenaltyBanner penaltyEndDate={penaltyEndDate} className="mb-4" />}

      <PointsCard />

      {/* Voucher 15€ Section */}
      {voucherStatus && (
        <Alert className="border-primary bg-primary/10 mb-4">
          <Ticket className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary font-medium">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                {voucherStatus.available ? (
                  <>
                    <span className="font-semibold text-sm">Voucher 15€ disponível!</span>
                    <p className="text-xs text-primary/80 mt-0.5">Reclama o teu voucher e usa na próxima reserva.</p>
                    <p className="text-xs text-orange-600 font-medium mt-1">
                      ⚠️ Ao reivindicar tens 15€ para usar ou ficará inativo.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-sm">Voucher 15€</span>
                    <p className="text-xs text-primary/80 mt-0.5">Faltam {voucherStatus.days_left} dias para reivindicar</p>
                  </>
                )}
              </div>
              <Button 
                onClick={handleClaimVoucher} 
                disabled={!voucherStatus.available || claimingVoucher || hasActivePenalty()} 
                size="sm" 
                className="text-xs shrink-0"
              >
                {claimingVoucher ? 'A reivindicar...' : 'Reivindicar'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Monthly Offers */}
      <section>
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Ofertas Mensais
        </h2>
        
        <div className="grid gap-3">
          {premiumOffer && activePlanType === 'X' && (
            <Card className="studio-card border-primary bg-primary/5">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-primary flex-shrink-0" />
                  Oferta 2h Captação PREMIUM+
                </CardTitle>
                <CardDescription className="text-xs">
                  {premiumOffer.description || '2h de captação grátis uma vez por mês'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-primary">GRÁTIS</p>
                    <p className="text-xs text-muted-foreground">
                      Usado: {offerUsage[premiumOffer.id] || 0}/{premiumOffer.limit_per_month} este mês
                    </p>
                    {(offerUsage[premiumOffer.id] || 0) >= premiumOffer.limit_per_month && (
                      <Badge variant="outline" className="text-xs mt-1">Limite atingido</Badge>
                    )}
                  </div>
                  <Button 
                    onClick={() => handleApplyOffer(premiumOffer.id)} 
                    disabled={(offerUsage[premiumOffer.id] || 0) >= premiumOffer.limit_per_month || applyingOffer === premiumOffer.id || hasActivePenalty()} 
                    size="sm"
                  >
                    {applyingOffer === premiumOffer.id ? 'A aplicar...' : 'Aplicar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {recordingOffer && (
            <Card className="studio-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4 text-primary flex-shrink-0" />
                  Compra 2h Gravação, Ganha +1h Grátis
                </CardTitle>
                <CardDescription className="text-xs">
                  {recordingOffer.description || `3 horas totais por apenas €20`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-accent">{formatPrice(recordingOffer.price_eur)}</p>
                    <p className="text-xs text-muted-foreground">
                      Usado: {offerUsage[recordingOffer.id] || 0}/{recordingOffer.limit_per_month} este mês
                    </p>
                    {(offerUsage[recordingOffer.id] || 0) >= recordingOffer.limit_per_month && (
                      <Badge variant="outline" className="text-xs mt-1">Limite atingido</Badge>
                    )}
                  </div>
                  <Button 
                    onClick={() => handleApplyOffer(recordingOffer.id)} 
                    disabled={(offerUsage[recordingOffer.id] || 0) >= recordingOffer.limit_per_month || applyingOffer === recordingOffer.id || hasActivePenalty()} 
                    size="sm"
                  >
                    {applyingOffer === recordingOffer.id ? 'A aplicar...' : 'Aplicar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Plan 180-Day Offer */}
      {activePlanType && plan180DayOffer && (
        <section>
          <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            Oferta Exclusiva Plano {activePlanType}
          </h2>
          
          <Card className="studio-card border-primary bg-primary/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Gift className="w-4 h-4 text-primary" />
                {activePlanType === 'S' ? 'Mix&Master Grátis (180 dias)' : 'Captação 3h + Mix&Master Grátis (180 dias)'}
              </CardTitle>
              <CardDescription className="text-xs">
                {activePlanType === 'S' 
                  ? 'Após 180 dias, ganha 1 Mix&Master grátis' 
                  : 'Após 180 dias, ganha 1 Captação 3h + Mix&Master grátis'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {plan180DayOffer.eligible ? (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <p className="text-lg font-bold text-green-600 mb-1">🎉 Oferta Disponível!</p>
                    <p className="text-xs text-muted-foreground">Podes reclamar agora.</p>
                  </div>
                  <Button 
                    onClick={() => handleClaim180DayOffer()}
                    disabled={claiming180DayOffer || hasActivePenalty()} 
                    className="w-full"
                    size="sm"
                  >
                    {claiming180DayOffer ? 'A ativar...' : `Reclamar Oferta Grátis`}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-secondary/50 rounded-lg">
                    <p className="text-2xl font-bold text-primary mb-1">
                      {plan180DayOffer.days_remaining !== null ? `${plan180DayOffer.days_remaining} dias` : 'Indisponível'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {plan180DayOffer.reason === 'waiting_period' ? 'Faltam para desbloquear' 
                        : plan180DayOffer.reason === 'already_claimed' ? 'Oferta já reclamada'
                        : plan180DayOffer.reason === 'no_subscription' ? 'Sem subscrição ativa'
                        : 'Oferta indisponível'}
                    </p>
                  </div>
                  <Button disabled variant="outline" size="sm" className="w-full">
                    Ainda Não Disponível
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      <div className="text-center py-3">
        <p className="text-xs text-muted-foreground">
          As recompensas serão incluídas no preço da tua próxima reserva.
          {hasActivePenalty() && (
            <span className="block text-destructive mt-1">
              Recompensas pausadas devido a penalização ativa.
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default Rewards;
