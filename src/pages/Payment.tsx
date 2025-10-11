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
import { ArrowLeft, CheckCircle, Copy, Smartphone, Building2, Tag } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
const Payment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const { sendMessage, ADMIN_ID } = useMessaging();
  const { appliedFriendCode, hasFriendCodeDiscount, markCodeAsUsed, refreshAppliedCode } = useFriendCode();
  const [loading, setLoading] = useState(false);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [hasVoucher, setHasVoucher] = useState(false);
  const [subscriptionDiscount, setSubscriptionDiscount] = useState(0);
  const [subscriptionDiscountPercent, setSubscriptionDiscountPercent] = useState(0);
  const [friendCodeDiscount, setFriendCodeDiscount] = useState(0);
  const [activeVoucherId, setActiveVoucherId] = useState<string | null>(null);
  
  // Enable realtime sync
  useRealtimeSync();

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
        
        // Calculate friend code discount (25%)
        if (hasFriendCodeDiscount()) {
          const friendDiscount = basePrice * 0.25;
          setFriendCodeDiscount(friendDiscount);
        } else {
          setFriendCodeDiscount(0);
        }
        
        // Load subscription discount
        const { data: subscriptionData } = await supabase
          .from('subscriptions')
          .select('id, plan_type, is_active, start_date')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (subscriptionData) {
          // Calculate month number since subscription started
          const startDate = new Date(subscriptionData.start_date);
          const now = new Date();
          const monthsSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)) + 1;
          
          // Get discount percentage for current month
          const { data: discountData } = await supabase
            .from('plan_discounts')
            .select('discount_pct')
            .eq('subscription_id', subscriptionData.id)
            .eq('month_num', monthsSinceStart)
            .maybeSingle();
          
          const discountPercent = discountData?.discount_pct || 0;
          const basePrice = parseFloat(price);
          const discount = (basePrice * discountPercent) / 100;
          
          setSubscriptionDiscountPercent(discountPercent);
          setSubscriptionDiscount(discount);
        }
        
        // Load voucher discount ONLY for non-subscription services
        if (service !== 'subscription') {
          // Use voucherId from params if available, otherwise load from DB
          if (voucherId) {
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
          } else {
            const { data: voucherData, error } = await supabase
              .from('vouchers')
              .select('id, amount_eur')
              .eq('client_id', user.id)
              .eq('is_used', false)
              .gte('expires_at', new Date().toISOString())
              .limit(1)
              .maybeSingle();
            
            if (voucherData && !error) {
              setVoucherDiscount(voucherData.amount_eur);
              setActiveVoucherId(voucherData.id);
              setHasVoucher(true);
            }
          }
        }
      } catch (error) {
        console.error('Error loading discounts:', error);
      }
    };
    
    loadDiscounts();
  }, [user, price, service, hasFriendCodeDiscount]);
  
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

        // Check if user already has a pending subscription
        const { data: existingPendingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('payment_status', 'pending')
          .maybeSingle();

        if (existingPendingSub) {
          toast({
            title: 'Pedido Pendente',
            description: 'Já tens um pedido de subscrição pendente. Aguarda aprovação do administrador.',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        // Create payment request for subscription using subscribe_request RPC
        const planType = plan === 'plan-s' ? 'S' : 'X';
        const finalPrice = parseFloat(price);
        
        const { data: requestId, error: requestError } = await supabase.rpc('subscribe_request', {
          p_user_id: user.id,
          p_plan_type: planType,
          p_amount_eur: finalPrice
        });

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

        // Mark friend code as used if applicable
        if (hasFriendCodeDiscount() && requestId) {
          console.log('[PAYMENT] Marking friend code as used for subscription:', requestId);
          const marked = await markCodeAsUsed(requestId);
          if (marked) {
            console.log('[PAYMENT] Friend code marked successfully');
            await refreshAppliedCode();
          }
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
        const finalPrice = Math.max(0, parseFloat(price) - subscriptionDiscount - friendCodeDiscount - voucherDiscount);
        
        const { data: paymentData, error: paymentError } = await supabase
          .from('payment_requests')
          .insert({
            user_id: user.id,
            reservation_id: reservationData.id,
            amount_eur: finalPrice,
            currency: 'EUR',
            type: 'reservation',
            status: 'pending',
            transfer_link: transferLink || null,
            note: notes || null,
            voucher_id: activeVoucherId
          })
          .select()
          .single();

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

        // Mark friend code as used if applicable
        if (hasFriendCodeDiscount() && paymentData) {
          console.log('[PAYMENT] Marking friend code as used for mixmaster:', paymentData.id);
          const marked = await markCodeAsUsed(paymentData.id);
          if (marked) {
            console.log('[PAYMENT] Friend code marked successfully');
            await refreshAppliedCode(); // Refresh to ensure UI is cleared
          }
        }

        // Send message to admin with transfer link and notes
        let messageContent = `🎵 Novo pedido de Mix & Master\n\n`;
        messageContent += `Cliente: ${clientName}\n`;
        messageContent += `Opção: ${optionTitle}\n`;
        messageContent += `Valor: €${finalPrice.toFixed(2)}\n\n`;
        
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
      if (!price || !service || !serviceId) {
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

      // 1. Create reservation first
      const startDateTime = new Date(`${bookingDate}T${startTime}`);
      const endDateTime = new Date(`${bookingDate}T${endTime}`);
      const {
        data: reservationData,
        error: reservationError
      } = await supabase.from('reservations').insert({
        user_id: user.id,
        service_id: serviceId,
        starts_at: startDateTime.toISOString(),
        ends_at: endDateTime.toISOString(),
        status: 'pending'
      }).select().single();
      if (reservationError) {
        console.error('Reservation error:', reservationError);
        toast({
          title: 'Erro',
          description: 'Não foi possível criar a reserva. Tenta novamente.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // 2. Call RPC to create payment request with voucher_id
      const finalPrice = Math.max(0, parseFloat(price) - subscriptionDiscount - friendCodeDiscount - voucherDiscount);
      
      const {
        data: paymentId,
        error: paymentError
      } = await supabase.rpc('request_payment', {
        p_reservation_id: reservationData.id,
        p_amount_eur: finalPrice,
        p_currency: 'EUR',
        p_note: notes || `${serviceTitle} - ${optionTitle}`,
        p_voucher_id: activeVoucherId
      });
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

      // Mark friend code as used if applicable
      if (hasFriendCodeDiscount() && paymentId) {
        console.log('[PAYMENT] Marking friend code as used for booking:', paymentId);
        const marked = await markCodeAsUsed(paymentId);
        if (marked) {
          console.log('[PAYMENT] Friend code marked successfully');
          await refreshAppliedCode(); // Refresh to ensure UI is cleared
        }
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
                  <span className="text-lg font-semibold text-primary">€{price}</span>
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
                
                {(subscriptionDiscount > 0 || friendCodeDiscount > 0 || hasVoucher) && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>€{price}</span>
                  </div>
                )}
                
                {subscriptionDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Desconto de Subscrição ({subscriptionDiscountPercent}%):</span>
                    <span>-€{subscriptionDiscount.toFixed(2)}</span>
                  </div>
                )}
                
                {friendCodeDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Código de Amigo ({appliedFriendCode}) - 25%:</span>
                    <span>-€{friendCodeDiscount.toFixed(2)}</span>
                  </div>
                )}
                
                {hasVoucher && voucherDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      Desconto 15€ Voucher:
                    </span>
                    <span>-€{voucherDiscount.toFixed(2)}</span>
                  </div>
                )}
                
                {(subscriptionDiscount > 0 || friendCodeDiscount > 0 || hasVoucher) && <Separator />}
                
                <div className="flex items-center justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span className="text-primary">€{Math.max(0, parseFloat(price || '0') - subscriptionDiscount - friendCodeDiscount - voucherDiscount).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Instructions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informações de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* MBWay */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">MB Way</h3>
            </div>
            
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-xl border-2 border-primary/20">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="bg-white p-4 rounded-lg shadow-lg">
                  <QRCodeSVG value={`MBWAY:${MBWAY_PHONE}:${price}`} size={160} level="H" includeMargin={true} />
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <p className="text-sm text-muted-foreground mb-2">Número de Telemóvel:</p>
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                    <span className="text-2xl font-bold font-mono">{MBWAY_PHONE}</span>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(MBWAY_PHONE, 'Número MB Way')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Digitaliza o QR code com a app MB Way ou usa o número manualmente</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* IBAN */}
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
              <p className="text-xs text-muted-foreground">Utiliza este IBAN para transferência bancária nacional ou internacional</p>
            </div>
          </div>

          <Separator />

          {/* Revolut */}
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

          <Separator />

          {/* Instructions */}
          <div className="space-y-2">
            <h3 className="font-semibold">Instruções:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Faz o pagamento do sinal usando um método de pagamento à tua escolha</li>
              <li>Clica em "Já Paguei" após realizar o pagamento</li>
              <li>Aguarda a confirmação do pagamento (normalmente 2-6h)</li>
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