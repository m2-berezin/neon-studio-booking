import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMessaging } from '@/hooks/useMessaging';
import { useFriendCode } from '@/hooks/useFriendCode';
import { useReferralReward } from '@/hooks/useReferralReward';
import { ArrowLeft, CheckCircle, Copy, Smartphone, Building2, Tag } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { formatPrice } from '@/lib/utils';

const Payment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    user, subscription: userSubscription, subscriptionDiscountPercent: authSubscriptionDiscountPercent
  } = useAuth();
  const { sendMessage, ADMIN_ID } = useMessaging();
  const { appliedFriendCode, hasFriendCodeDiscount } = useFriendCode();
  const { referralReward, hasReferralReward } = useReferralReward();
  const [loading, setLoading] = useState(false);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [hasVoucher, setHasVoucher] = useState(false);
  const [subscriptionDiscount, setSubscriptionDiscount] = useState(0);
  const [subscriptionDiscountPercent, setSubscriptionDiscountPercent] = useState(0);
  const [friendCodeDiscount, setFriendCodeDiscount] = useState(0);
  const [referralRewardDiscount, setReferralRewardDiscount] = useState(0);
  const [activeVoucherId, setActiveVoucherId] = useState<string | null>(null);
  const [isPremiumOffer, setIsPremiumOffer] = useState(false);
  const [premiumOfferDiscount, setPremiumOfferDiscount] = useState(0);
  const [isPlan180DayOffer, setIsPlan180DayOffer] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mbway' | 'transferencia' | 'revolut'>('mbway');
  
  // Enable realtime sync
  useRealtimeSync();
  
  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Get payment details from URL params
  const service = searchParams.get('service');
  const option = searchParams.get('option');
  const delivery = searchParams.get('delivery');
  const price = searchParams.get('price');
  const notes = searchParams.get('notes');
  const bookingDate = searchParams.get('date');
  const startTime = searchParams.get('start_time');
  const endTime = searchParams.get('end_time');
  const serviceId = searchParams.get('service_id');
  const plan = searchParams.get('plan'); // For subscriptions
  const transferLink = searchParams.get('transferLink'); // For mixmaster
  const voucherId = searchParams.get('voucherId'); // Voucher ID if applied
  const existingReservationId = searchParams.get('reservation_id'); // Existing reservation from offer
  const loyaltyOffer = searchParams.get('loyaltyOffer') === 'true'; // Loyalty offer from 7 points
  const plan180DayOffer = searchParams.get('plan180DayOffer') === 'true'; // Plan 180-day offer

  // Determine service title based on service and option
  let serviceTitle = '';
  let optionTitle = '';
  if (service === 'subscription') {
    serviceTitle = plan === 'plan-s' ? 'Plano S' : 'Plano X';
    optionTitle = 'Subscrição Mensal';
  } else if (service === 'booking') {
    if (option === 'recording') {
      serviceTitle = 'Captação (Gravação)';
      optionTitle = ''; // Will use notes for details
    } else if (option === 'mix-master') {
      serviceTitle = 'Captação Mix & Master';
      optionTitle = '';
    }
  } else if (service === 'mixmaster') {
    serviceTitle = 'Mix & Master';
    optionTitle = option === '1project' ? '1 Projecto' : '2 Projectos';
  } else {
    serviceTitle = service || '';
    optionTitle = option || '';
  }

  // Payment details
  const MBWAY_PHONE = '934941263';
  const IBAN = 'PT50 0193 0000 1050 4647 3479 5';
  const REVOLUT_REVTAG = '@Ghostwayne';
  
  // Load subscription, friend code, and voucher discounts on mount
  useEffect(() => {
    const loadDiscounts = async () => {
      if (!user || !price) return;
      
      try {
        const basePrice = parseFloat(price);
        
        // Check if this is a PREMIUM+ offer (free 2h captação from Plan X)
        if (existingReservationId) {
          const { data: reservationData } = await supabase
            .from('reservations')
            .select('offer_id')
            .eq('id', existingReservationId)
            .maybeSingle();
          
          if (reservationData?.offer_id) {
            // Check if this offer is the PREMIUM+ offer (free captação)
            const { data: offerData } = await supabase
              .from('offers')
              .select('name, price_eur')
              .eq('id', reservationData.offer_id)
              .maybeSingle();
            
            // If it's the free PREMIUM+ offer, apply 100% discount
            if (offerData && offerData.price_eur === 0) {
              setIsPremiumOffer(true);
              setPremiumOfferDiscount(basePrice);
              setFriendCodeDiscount(0);
              setSubscriptionDiscount(0);
              setSubscriptionDiscountPercent(0);
              setVoucherDiscount(0);
              return;
            }
          }
        }
        
        // If loyalty offer or plan 180-day offer, skip all discounts
        if (loyaltyOffer || plan180DayOffer) {
          setFriendCodeDiscount(0);
          setSubscriptionDiscount(0);
          setSubscriptionDiscountPercent(0);
          setVoucherDiscount(0);
          setIsPlan180DayOffer(plan180DayOffer);
          return;
        }
        
        // Calculate friend code discount (25%)
        if (hasFriendCodeDiscount()) {
          const friendDiscount = basePrice * 0.25;
          setFriendCodeDiscount(friendDiscount);
        } else {
          setFriendCodeDiscount(0);
        }
        
        // Calculate referral reward discount (25% for sharing code)
        if (hasReferralReward && referralReward && !isPremiumOffer && !loyaltyOffer && !plan180DayOffer) {
          const rewardDiscount = basePrice * (referralReward.discount_percent / 100);
          setReferralRewardDiscount(rewardDiscount);
        } else {
          setReferralRewardDiscount(0);
        }
        
        // Use subscription discount from AuthContext (consistent with PriceSummary)
        if (userSubscription?.is_active) {
          const basePrice = parseFloat(price);
          const discount = (basePrice * authSubscriptionDiscountPercent) / 100;
          
          console.log('[PAYMENT] Subscription data:', userSubscription);
          console.log('[PAYMENT] Base price:', basePrice, 'Discount %:', authSubscriptionDiscountPercent, 'Discount amount:', discount);
          
          setSubscriptionDiscountPercent(authSubscriptionDiscountPercent);
          setSubscriptionDiscount(discount);
        } else {
          console.log('[PAYMENT] No active subscription found');
          setSubscriptionDiscountPercent(0);
          setSubscriptionDiscount(0);
        }
        
        // Load voucher discount ONLY if voucherId is explicitly provided in URL params
        if (service !== 'subscription' && voucherId) {
          const { data: voucherData, error } = await supabase
            .from('vouchers')
            .select('id, amount_eur, is_used')
            .eq('id', voucherId)
            .eq('is_used', false)
            .gte('expires_at', new Date().toISOString())
            .maybeSingle();
          
          if (voucherData && !error) {
            setVoucherDiscount(voucherData.amount_eur);
            setActiveVoucherId(voucherData.id);
            setHasVoucher(true);
          }
        }
      } catch (error) {
        console.error('Error loading discounts:', error);
      }
    };
    
    loadDiscounts();
  }, [user, price, service, hasFriendCodeDiscount, hasReferralReward, loyaltyOffer, plan180DayOffer, userSubscription, authSubscriptionDiscountPercent, voucherId, existingReservationId]);
  
  useEffect(() => {
    // For subscriptions, we don't need 'option', just 'plan'
    const isSubscription = service === 'subscription';
    const hasRequiredParams = isSubscription 
      ? (service && plan && price)
      : (service && option && price);
    
    if (!hasRequiredParams) {
      toast({
        title: 'Erro',
        description: 'Dados de pagamento em falta. A redireccionar...',
        variant: 'destructive'
      });
      navigate('/mix-master');
    }
  }, [service, option, plan, price, navigate, toast]);
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: `${label} copiado para a área de transferência`
    });
  };
  const handlePaymentConfirmation = async () => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Precisa de iniciar sessão para confirmar o pagamento',
        variant: 'destructive'
      });
      return;
    }

    console.log('[PAYMENT CONFIRMATION] Payment method selected:', paymentMethod);

    setLoading(true);
    try {
      // Handle subscription payment
      if (service === 'subscription') {
        if (!price || !plan) {
          toast({
            title: 'Erro',
            description: 'Dados de subscrição incompletos',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        // Check if user already has a pending subscription payment request
        const { data: existingPendingRequest } = await supabase
          .from('payment_requests')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'subscription_request')
          .eq('status', 'pending')
          .maybeSingle();

        if (existingPendingRequest) {
          toast({
            title: 'Pedido Pendente',
            description: 'Já tens um pedido de subscrição pendente. Aguarda aprovação do administrador.',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        // Create payment request for subscription without creating subscription itself
        // Subscription will be created/updated when admin approves
        const planType = plan === 'plan-s' ? 'S' : 'X';
        const finalPrice = parseFloat(price);
        
        const { data: requestId, error: requestError } = await supabase.rpc('create_subscription_payment_request', {
          p_user_id: user.id,
          p_plan_type: planType,
          p_amount_eur: finalPrice,
          p_friend_code: appliedFriendCode || null,
          p_payment_method: paymentMethod
        });

        // Update payment request with referral_reward_id if applicable
        if (requestId) {
          console.log('[PAYMENT SUBSCRIPTION] ✅ Payment request created with method:', paymentMethod);
          if (hasReferralReward && referralReward) {
            console.log('[PAYMENT SUBSCRIPTION] 🎁 Applying referral reward:', referralReward.id, referralReward.discount_percent + '%');
            await supabase
              .from('payment_requests')
              .update({ 
                referral_reward_id: referralReward.id,
                note: 'Aplicado 25% desconto codigo de amigo (partilha)'
              })
              .eq('id', requestId);
          } else {
            console.log('[PAYMENT SUBSCRIPTION] ℹ️ No referral reward to apply:', { hasReferralReward, referralReward });
          }
        }

        if (requestError) {
          console.error('Payment request error:', requestError);
          toast({
            title: 'Erro',
            description: requestError.message || 'Não foi possível criar o pedido de pagamento. Tenta novamente.',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        toast({
          title: 'Pedido Enviado ✅',
          description: 'Subscrição pendente de verificação de pagamento. Aguarda aprovação do administrador.',
          duration: 5000
        });

        setTimeout(() => {
          navigate('/subscriptions');
        }, 1500);
        return;
      }

      // Handle mixmaster payment
      if (service === 'mixmaster') {
        if (!price) {
          toast({
            title: 'Erro',
            description: 'Dados de pagamento incompletos',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        // Get client name from profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const clientName = profileData?.full_name || 'Cliente';

        // Get Mix&Master service with full details
        const { data: serviceData } = await supabase
          .from('services')
          .select('id, name, price_eur, duration_minutes, currency')
          .or('name.ilike.%Mix&Master%,name.ilike.%Mix & Master%,name.ilike.%MixMaster%')
          .limit(1)
          .maybeSingle();

        if (!serviceData) {
          toast({
            title: 'Erro',
            description: 'Serviço Mix&Master não encontrado',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        // Create reservation for mixmaster with snapshot data
        const { data: reservationData, error: reservationError } = await supabase
          .from('reservations')
          .insert({
            user_id: user.id,
            service_id: serviceData.id,
            service_name_snapshot: serviceData.name,
            price_eur_snapshot: serviceData.price_eur,
            duration_minutes_snapshot: serviceData.duration_minutes,
            currency_snapshot: serviceData.currency || 'EUR',
            status: 'pending'
          })
          .select()
          .single();

        if (reservationError) {
          console.error('Reservation error:', reservationError);
          toast({
            title: 'Erro',
            description: 'Não foi possível criar a reserva',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        // Create payment request with transfer_link and voucher_id
        // Apply subscription discount first, then referral reward, then apply the HIGHEST of friend code or voucher (not both)
        // For loyalty offers or plan 180-day offers, price is always 0
        let finalPrice = 0;
        if (loyaltyOffer || plan180DayOffer) {
          finalPrice = 0;
        } else {
          const priceAfterSubscription = parseFloat(price) - subscriptionDiscount;
          const priceAfterReferralReward = priceAfterSubscription - referralRewardDiscount;
          const priceAfterRewardOrVoucher = priceAfterReferralReward - Math.max(friendCodeDiscount, voucherDiscount);
          finalPrice = Math.max(0, priceAfterRewardOrVoucher);
        }
        
        console.log('[PAYMENT MIX&MASTER] Final price calculation:', {
          basePrice: parseFloat(price),
          subscriptionDiscount,
          referralRewardDiscount,
          friendCodeDiscount,
          voucherDiscount,
          loyaltyOffer,
          plan180DayOffer: isPlan180DayOffer,
          finalPrice
        });
        
        console.log('[PAYMENT MIX&MASTER] Saving payment method:', paymentMethod);
        
        const { data: paymentData, error: paymentError } = await supabase
          .from('payment_requests')
          .insert({
            user_id: user.id,
            reservation_id: reservationData.id,
            amount_eur: finalPrice,
            currency: 'EUR',
            type: loyaltyOffer ? 'loyalty_mixmaster' : plan180DayOffer ? 'plan_180day_mixmaster' : 'reservation',
            status: 'pending',
            transfer_link: transferLink || null,
            note: notes || null,
            voucher_id: loyaltyOffer ? null : activeVoucherId, // No voucher for loyalty offers
            friend_code: hasFriendCodeDiscount() ? appliedFriendCode : null, // Save friend code (will be marked as used when admin approves)
            referral_reward_id: hasReferralReward && referralReward ? referralReward.id : null,
            payment_method: paymentMethod
          })
          .select()
          .single();

        // Update note if referral reward is applied
        if (paymentData && hasReferralReward && referralReward) {
          console.log('[PAYMENT MIX&MASTER] 🎁 Applying referral reward:', referralReward.id, referralReward.discount_percent + '%');
          await supabase
            .from('payment_requests')
            .update({ 
              note: (notes || '') + '\n\nAplicado 25% desconto codigo de amigo (partilha)'
            })
            .eq('id', paymentData.id);
        } else {
          console.log('[PAYMENT MIX&MASTER] ℹ️ No referral reward to apply:', { hasReferralReward, referralReward });
        }

        if (paymentError) {
          console.error('Payment error:', paymentError);
          await supabase.from('reservations').delete().eq('id', reservationData.id);
          toast({
            title: 'Erro',
            description: 'Não foi possível criar o pedido de pagamento',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        // Mark voucher as used if applicable
        if (activeVoucherId) {
          await supabase
            .from('vouchers')
            .update({ is_used: true })
            .eq('id', activeVoucherId);
        }

        // Send message to admin with transfer link and notes
        let messageContent = loyaltyOffer 
          ? `🎁 Novo pedido de Mix & Master GRÁTIS (Oferta de Fidelidade - 7 Pontos)\n\n`
          : plan180DayOffer
          ? `🎁 Novo pedido de Mix & Master GRÁTIS (Oferta Plano S - 180 dias)\n\n`
          : `🎵 Novo pedido de Mix & Master\n\n`;
        messageContent += `Cliente: ${clientName}\n`;
        messageContent += `Opção: ${optionTitle}\n`;
        messageContent += `Valor: €${finalPrice.toFixed(2)}${(loyaltyOffer || plan180DayOffer) ? ' (Oferta Grátis)' : ''}\n\n`;
        
        if (transferLink) {
          messageContent += `📎 Link de Transferência:\n${transferLink}\n\n`;
        }
        
        if (notes) {
          messageContent += `📝 Notas do Projeto:\n${notes}`;
        }
        
        await sendMessage(ADMIN_ID, messageContent);

        toast({
          title: 'Pedido Enviado ✅',
          description: 'Mix&Master pendente de verificação de pagamento. Aguarde aprovação.',
          duration: 5000
        });

        setTimeout(() => {
          navigate('/projects');
        }, 1500);
        return;
      }

      // Handle booking payment (existing code)
      // Validate required fields
      if (!price || !service) {
        toast({
          title: 'Erro',
          description: 'Dados de pagamento incompletos',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Additional validation for booking service
      if (service === 'booking' && (!bookingDate || !startTime || !endTime)) {
        toast({
          title: 'Erro',
          description: 'Dados da reserva incompletos',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Validate serviceId only if creating new reservation (not updating existing one)
      // Treat 'undefined' string as no reservation
      const hasValidReservation = existingReservationId && existingReservationId !== 'undefined';
      if (!hasValidReservation && (!serviceId || serviceId === 'undefined')) {
        toast({
          title: 'Erro',
          description: 'ID do serviço inválido',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // 1. Update existing reservation OR create new one
      const startDateTime = new Date(`${bookingDate}T${startTime}`);
      const endDateTime = new Date(`${bookingDate}T${endTime}`);
      
      let reservationData;
      let reservationError;
      
      // Use the validated hasValidReservation from above
      const shouldUpdateReservation = existingReservationId && existingReservationId !== 'undefined';
      
      if (shouldUpdateReservation) {
        // UPDATE existing reservation from offer with date/time
        console.log('[PAYMENT] Updating existing reservation with offer:', existingReservationId);
        const { data, error } = await supabase
          .from('reservations')
          .update({
            starts_at: startDateTime.toISOString(),
            ends_at: endDateTime.toISOString(),
            status: 'pending'
          })
          .eq('id', existingReservationId)
          .select()
          .single();
        reservationData = data;
        reservationError = error;
        
        if (data) {
          console.log('[PAYMENT] ✅ Reservation updated with offer_id:', data.offer_id);
        }
      } else {
        // CREATE new reservation
        const { data, error } = await supabase
          .from('reservations')
          .insert({
            user_id: user.id,
            service_id: serviceId,
            starts_at: startDateTime.toISOString(),
            ends_at: endDateTime.toISOString(),
            status: 'pending'
          })
          .select()
          .single();
        reservationData = data;
        reservationError = error;
        
        console.log('[PAYMENT] New reservation created (no offer)');
      }
      
      if (reservationError) {
        console.error('Reservation error:', reservationError);
        console.error('Reservation error details:', JSON.stringify(reservationError, null, 2));
        toast({
          title: 'Erro',
          description: `Não foi possível processar a reserva: ${reservationError.message || 'Tenta novamente.'}`,
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }
      
      if (!reservationData) {
        console.error('No reservation data returned');
        toast({
          title: 'Erro',
          description: 'Não foi possível criar a reserva. Tenta novamente.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // 2. Call RPC to create payment request with voucher_id
      // Apply discounts in order: premium offer, subscription, referral reward, then the HIGHEST of friend code or voucher
      const priceAfterPremiumOffer = parseFloat(price) - premiumOfferDiscount;
      const priceAfterSubscription = priceAfterPremiumOffer - subscriptionDiscount;
      const priceAfterReferralReward = priceAfterSubscription - referralRewardDiscount;
      const priceAfterRewardOrVoucher = priceAfterReferralReward - Math.max(friendCodeDiscount, voucherDiscount);
      const finalPrice = Math.max(0, priceAfterRewardOrVoucher);
      
      console.log('[PAYMENT] Final price calculation:', {
        basePrice: parseFloat(price),
        premiumOfferDiscount,
        subscriptionDiscount,
        referralRewardDiscount,
        friendCodeDiscount,
        voucherDiscount,
        finalPrice
      });
      
      console.log('[PAYMENT BOOKING] Saving payment method:', paymentMethod);
      console.log('[PAYMENT] Creating payment request for reservation:', reservationData.id, 'with offer_id:', reservationData.offer_id);
      
      const {
        data: paymentId,
        error: paymentError
      } = await supabase.rpc('request_payment', {
        p_reservation_id: reservationData.id,
        p_amount_eur: finalPrice,
        p_currency: 'EUR',
        p_note: notes || `${serviceTitle} - ${optionTitle}`,
        p_voucher_id: activeVoucherId,
        p_friend_code: appliedFriendCode || null,
        p_payment_method: paymentMethod
      });

      // Update payment request with payment method
      if (paymentId) {
        console.log('[PAYMENT BOOKING] ✅ Payment request created with method:', paymentMethod);
      }

      // Update payment request with referral_reward_id if applicable
      if (paymentId && hasReferralReward && referralReward) {
        console.log('[PAYMENT BOOKING] 🎁 Applying referral reward:', referralReward.id, referralReward.discount_percent + '%');
        await supabase
          .from('payment_requests')
          .update({ 
            referral_reward_id: referralReward.id,
            note: (notes || `${serviceTitle} - ${optionTitle}`) + '\n\nAplicado 25% desconto codigo de amigo (partilha)'
          })
          .eq('id', paymentId);
      } else {
        console.log('[PAYMENT BOOKING] ℹ️ No referral reward to apply:', { hasReferralReward, referralReward });
      }
      if (paymentError) {
        console.error('Payment error:', paymentError);
        // Cleanup: delete the reservation if payment request failed
        await supabase.from('reservations').delete().eq('id', reservationData.id);
        toast({
          title: 'Erro',
          description: 'Não foi possível criar o pedido de pagamento. Tenta novamente.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Mark voucher as used if applicable
      if (activeVoucherId) {
        await supabase
          .from('vouchers')
          .update({ is_used: true })
          .eq('id', activeVoucherId);
      }

      // Success notification with clear instructions
      toast({
        title: 'Pedido Enviado ✅',
        description: 'Reserva de sessão pendente de verificação de pagamento. Aguarde aprovação do administrador.',
        duration: 5000
      });

      // Navigate to projects page after a short delay
      setTimeout(() => {
        navigate('/projects');
      }, 1500);
    } catch (error) {
      console.error('Error registering payment:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível confirmar a reserva. Tenta novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const isSubscription = service === 'subscription';
  const hasRequiredParams = isSubscription 
    ? (service && plan && price)
    : (service && option && price);
    
  if (!hasRequiredParams) {
    return null;
  }
  return <div className="container mx-auto p-4 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => window.history.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Finalizar Pagamento
        </h1>
        <p className="text-muted-foreground">
          Confirma os detalhes e realiza o pagamento
        </p>
      </div>

      {/* Order Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {service === 'subscription' ? `Detalhes do ${serviceTitle}` : 'Resumo do Pedido'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Serviço:</span>
              <span>{serviceTitle}</span>
            </div>
            
            {optionTitle && <div className="flex items-center justify-between">
                <span className="font-medium">Opção:</span>
                <span>{optionTitle}</span>
              </div>}
            
            {service === 'subscription' && plan && (
              <>
                <div className="pt-2">
                  <span className="font-medium block mb-1">Plano:</span>
                  <p className="text-sm text-muted-foreground">
                    {plan === 'plan-s' ? 'Plano S - 10% desconto no primeiro mês, 15% nos seguintes' : 'Plano X - 10% desconto no primeiro mês, 15% nos seguintes + Oferta de 2h captação'}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Valor:</span>
                  <span className="text-lg font-semibold text-primary">{formatPrice(parseFloat(price || '0'))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Renovação:</span>
                  <span>{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                </div>
              </>
            )}
            
            {notes && <div className="pt-2">
                <span className="font-medium block mb-1">Notas:</span>
                <p className="text-sm text-muted-foreground">{notes}</p>
              </div>}
            
            {service !== 'subscription' && (
              <>
                <Separator />
                
                {(isPremiumOffer || subscriptionDiscount > 0 || referralRewardDiscount > 0 || friendCodeDiscount > 0 || hasVoucher || loyaltyOffer || plan180DayOffer) && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatPrice(parseFloat(price || '0'))}</span>
                  </div>
                )}
                
                {isPremiumOffer && premiumOfferDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm text-primary font-semibold">
                    <span>Desconto PREMIUM+ (Plano X):</span>
                    <span>-{formatPrice(premiumOfferDiscount)}</span>
                  </div>
                )}
                
                {!isPremiumOffer && subscriptionDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Desconto de Subscrição ({subscriptionDiscountPercent}% - Plano {userSubscription?.plan_type}):</span>
                    <span>-{formatPrice(subscriptionDiscount)}</span>
                  </div>
                )}
                
                {!isPremiumOffer && referralRewardDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm text-blue-600 font-medium">
                    <span>🎉 Desconto Partilha de Código (25%):</span>
                    <span>-{formatPrice(referralRewardDiscount)}</span>
                  </div>
                )}
                
                {!isPremiumOffer && friendCodeDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm text-purple-600">
                    <span>Código de Amigo ({appliedFriendCode}) - 25%:</span>
                    <span>-{formatPrice(friendCodeDiscount)}</span>
                  </div>
                )}
                
                {hasVoucher && voucherDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      Desconto 15€ Voucher:
                    </span>
                    <span>-{formatPrice(voucherDiscount)}</span>
                  </div>
                )}
                
                {loyaltyOffer && (
                  <div className="flex items-center justify-between text-sm text-green-600 font-semibold">
                    <span>🎁 Oferta Mix&Master (7 Pontos):</span>
                    <span>-{formatPrice(parseFloat(price || '0'))}</span>
                  </div>
                )}
                
                {plan180DayOffer && (
                  <div className="flex items-center justify-between text-sm text-green-600 font-semibold">
                    <span>🎁 Oferta Plano S (180 dias):</span>
                    <span>-{formatPrice(parseFloat(price || '0'))}</span>
                  </div>
                )}
                
                {(isPremiumOffer || subscriptionDiscount > 0 || referralRewardDiscount > 0 || friendCodeDiscount > 0 || hasVoucher || loyaltyOffer || plan180DayOffer) && <Separator />}
                
                <div className="flex items-center justify-between text-xl font-bold">
                  <span>Total:</span>
                <span className="text-primary">
                  {isPremiumOffer || loyaltyOffer || isPlan180DayOffer
                    ? formatPrice(0) 
                    : formatPrice(Math.max(0, parseFloat(price || '0') - premiumOfferDiscount - subscriptionDiscount - referralRewardDiscount - Math.max(friendCodeDiscount, voucherDiscount)))
                  }
                </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Método de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'mbway' | 'transferencia' | 'revolut')}>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mbway" id="mbway" />
                <Label htmlFor="mbway" className="flex items-center gap-2 cursor-pointer">
                  <Smartphone className="h-4 w-4 text-primary" />
                  <span>MB Way</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="transferencia" id="transferencia" />
                <Label htmlFor="transferencia" className="flex items-center gap-2 cursor-pointer">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>Transferência Bancária</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="revolut" id="revolut" />
                <Label htmlFor="revolut" className="flex items-center gap-2 cursor-pointer">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>Revolut</span>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Payment Instructions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informações de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* MBWay */}
          {paymentMethod === 'mbway' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">MB Way</h3>
              </div>
              
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-xl border-2 border-primary/20">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Número de Telemóvel:</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-bold font-mono">{MBWAY_PHONE}</span>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(MBWAY_PHONE, 'Número MB Way')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* IBAN */}
          {paymentMethod === 'transferencia' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Transferência Bancária</h3>
              </div>
              
              <div className="bg-gradient-to-br from-secondary/5 to-secondary/10 p-4 rounded-xl border-2 border-secondary/20">
                <p className="text-sm text-muted-foreground mb-2">IBAN:</p>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-sm md:text-base font-semibold break-all">{IBAN}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(IBAN, 'IBAN')} className="flex-shrink-0">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Utiliza este IBAN para transferência bancária nacional ou internacional</p>
                <p className="text-xs text-muted-foreground font-medium">Enviar comprovativo por mensagem chat da app</p>
              </div>
            </div>
          )}

          {/* Revolut */}
          {paymentMethod === 'revolut' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Revolut</h3>
              </div>
              
              <div className="bg-gradient-to-br from-secondary/5 to-secondary/10 p-4 rounded-xl border-2 border-secondary/20">
                <p className="text-sm text-muted-foreground mb-2">RevTag:</p>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-sm md:text-base font-semibold">{REVOLUT_REVTAG}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(REVOLUT_REVTAG, 'RevTag')} className="flex-shrink-0">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Utiliza este RevTag para enviar dinheiro via Revolut</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Instructions */}
          <div className="space-y-2">
            <h3 className="font-semibold">Instruções:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Faz o pagamento do sinal (15€) usando um método de pagamento à tua escolha.</li>
              <li>Clica em "Já Paguei" após realizares o pagamento.</li>
              <li>Aguarda a confirmação do pagamento. (normalmente 1h-6h, serás notificado)</li>
              <li>O valor restante é pago no dia. Pagamento a dinheiro ou outro método de pagamento à tua escolha.</li>
            </ol>
          </div>

          <Button onClick={handlePaymentConfirmation} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg">
            {loading ? <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                A processar...
              </> : <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Já Paguei
              </>}
          </Button>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-800">Pagamento Seguro</h4>
            <p className="text-sm text-green-700 mt-1">
              Os teus dados estão protegidos. Todos os pagamentos são processados de forma segura.
            </p>
          </div>
        </div>
      </div>
    </div>;
};
export default Payment;