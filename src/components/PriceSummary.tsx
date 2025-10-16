import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendCode as useFriendCodeHook } from '@/hooks/useFriendCode';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  type: string;
  base_price: number;
  description: string;
}

interface Voucher {
  id: string;
  code: string;
  amount: number;
  expires_at: string;
  redeemed: boolean;
  combinable: boolean;
}

interface PriceSummaryProps {
  services: Service[];
  bookingDate?: Date;
  className?: string;
  onPriceChange?: (finalPrice: number, breakdown: PriceBreakdown) => void;
  showFriendCode?: boolean;
  excludeVouchers?: boolean;
  isPremiumOffer?: boolean; // Indica se é oferta PREMIUM+ (2h captação grátis)
  premiumOfferOriginalPrice?: number; // Preço original antes do desconto PREMIUM+
}

interface LineItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PriceBreakdown {
  subtotal: number;
  subscriptionDiscount: number;
  rewardDiscount: number;
  voucherDiscount: number;
  finalPrice: number;
  appliedReward?: string;
  appliedVoucher?: Voucher;
}

export const PriceSummary = ({ services, bookingDate, className, onPriceChange, showFriendCode = true, excludeVouchers = false, isPremiumOffer = false, premiumOfferOriginalPrice = 0 }: PriceSummaryProps) => {
  const { user, subscription, subscriptionDiscountPercent } = useAuth();
  const { toast } = useToast();
  const { appliedFriendCode, hasFriendCodeDiscount, applyFriendCode, loading: friendCodeLoading } = useFriendCodeHook();
  
  const [rewardCode, setRewardCode] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedReward, setAppliedReward] = useState<string>('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');

  // Load user's available vouchers
  const loadVouchers = async () => {
    if (!user || excludeVouchers) return;
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('client_id', user.id)
        .eq('is_used', false)
        .gte('expires_at', new Date().toISOString());
      
      if (error) throw error;
      
      // Map database vouchers to component format
      const mappedVouchers = (data || []).map(v => ({
        id: v.id,
        code: v.code,
        amount: v.amount_eur,
        expires_at: v.expires_at,
        redeemed: false, // If it's in the list, it's not redeemed yet
        combinable: false
      }));
      
      setAvailableVouchers(mappedVouchers);
      
      // Auto-apply the first voucher if available and no reward is active
      if (mappedVouchers.length > 0 && !appliedReward && !appliedVoucher) {
        setAppliedVoucher(mappedVouchers[0]);
        setVoucherCode(mappedVouchers[0].code);
      }
    } catch (error) {
      console.error('Error loading vouchers:', error);
    }
  };

  useEffect(() => {
    loadVouchers();
  }, [user, excludeVouchers]);

  // Calculate line items from services
  const lineItems: LineItem[] = services.map(service => ({
    id: service.id,
    name: isPremiumOffer ? 'Captação 2h PREMIUM+' : service.name,
    price: isPremiumOffer ? premiumOfferOriginalPrice : service.base_price,
    quantity: 1
  }));

  const subtotal = lineItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const premiumOfferDiscount = isPremiumOffer ? premiumOfferOriginalPrice : 0;

  // Calculate subscription discount automatically if user has active subscription
  // BUT NOT for premium offers (they are already 100% off)
  const subscriptionDiscount = (subscription?.is_active && !isPremiumOffer)
    ? (subtotal * subscriptionDiscountPercent) / 100
    : 0;

  // Apply reward code (not friend codes - those are managed in Rewards page)
  const applyReward = async () => {
    if (!rewardCode.trim()) {
      toast({
        title: 'Código Inválido',
        description: 'Por favor introduza um código de recompensa',
        variant: 'destructive',
      });
      return;
    }

    // Clear voucher if reward is applied (can't use both)
    if (appliedVoucher) {
      setAppliedVoucher(null);
      setVoucherCode('');
    }

    // Check other reward codes
    const rewardDiscounts: Record<string, { discount: number; description: string }> = {
      'BUY2GET1': { discount: subtotal * 0.33, description: 'Buy 2h Get 1h Free' },
      'MIXING50': { discount: subtotal * 0.5, description: '50% Off Mixing & Mastering' },
      'NEWCLIENT': { discount: 15, description: '15€ New Client Discount' },
    };

    const reward = rewardDiscounts[rewardCode.toUpperCase()];
    if (reward) {
      setAppliedReward(rewardCode.toUpperCase());
      toast({
        title: 'Recompensa Aplicada',
        description: `${reward.description} - €${reward.discount.toFixed(2)} desconto`,
      });
    } else {
      toast({
        title: 'Código Inválido',
        description: 'Código não encontrado ou expirado',
        variant: 'destructive',
      });
    }
  };

  // Apply voucher code (not needed anymore as it's auto-applied)

  // Calculate reward discount
  const getRewardDiscount = () => {
    // Premium offers don't stack with other discounts
    if (isPremiumOffer) return 0;
    
    // Friend code discount takes priority and is automatically applied
    if (hasFriendCodeDiscount() && appliedFriendCode) {
      console.log('[PRICE SUMMARY] Applying friend code discount:', appliedFriendCode);
      return subtotal * 0.25; // 25% discount for friend codes
    }
    
    if (!appliedReward) return 0;
    
    const rewardDiscounts: Record<string, number> = {
      'BUY2GET1': subtotal * 0.33,
      'MIXING50': subtotal * 0.5,
      'NEWCLIENT': 15,
    };
    
    return rewardDiscounts[appliedReward] || 0;
  };

  const rewardDiscount = getRewardDiscount();
  // Premium offers don't stack with vouchers
  const voucherDiscount = (excludeVouchers || isPremiumOffer) ? 0 : (appliedVoucher ? appliedVoucher.amount : 0);
  
  // Calculate final price with PREMIUM+ discount
  const priceAfterSubscription = subtotal - subscriptionDiscount;
  const priceAfterPremiumOffer = priceAfterSubscription - premiumOfferDiscount;
  const priceAfterRewardOrVoucher = priceAfterPremiumOffer - Math.max(rewardDiscount, voucherDiscount);
  const finalPrice = Math.max(0, priceAfterRewardOrVoucher);

  // Notify parent component of price changes
  useEffect(() => {
    const breakdown: PriceBreakdown = {
      subtotal,
      subscriptionDiscount,
      rewardDiscount,
      voucherDiscount,
      finalPrice,
      appliedReward: appliedReward || undefined,
      appliedVoucher: appliedVoucher || undefined,
    };
    
    onPriceChange?.(finalPrice, breakdown);
  }, [subtotal, subscriptionDiscount, rewardDiscount, voucherDiscount, finalPrice, appliedReward, appliedVoucher, onPriceChange]);

  const removeReward = () => {
    setAppliedReward('');
    setRewardCode('');
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
  };

  const selectVoucher = (voucher: Voucher) => {
    setVoucherCode(voucher.code);
    setAppliedVoucher(voucher);
    if (appliedReward) {
      setAppliedReward('');
      setRewardCode('');
    }
  };

  const handleApplyFriendCode = async () => {
    if (!friendCodeInput.trim()) {
      toast({
        title: 'Código Vazio',
        description: 'Por favor insere um código de amigo',
        variant: 'destructive',
      });
      return;
    }
    
    const success = await applyFriendCode(friendCodeInput.toUpperCase());
    if (success) {
      setFriendCodeInput('');
      setAppliedReward(''); // Clear any active reward
      setAppliedVoucher(null); // Clear any active voucher
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Resumo de Preços</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Line Items */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Serviços</Label>
          {lineItems.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.name} x {item.quantity}</span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-medium">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
        </div>

        {/* Subscription Discount */}
        {subscriptionDiscount > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-green-600">
              <span>Desconto de Subscrição ({subscriptionDiscountPercent}% - Plano {subscription?.plan_type})</span>
              <span>-{formatPrice(subscriptionDiscount)}</span>
            </div>
          </div>
        )}

        {/* Apply Friend Code Section */}
        {!appliedFriendCode && showFriendCode && (
          <div className="border-t pt-4 space-y-2">
            <Label htmlFor="friend-code-input" className="text-sm font-medium">
              Tens um código de amigo?
            </Label>
            <div className="flex gap-2">
              <Input
                id="friend-code-input"
                placeholder="Insere o código aqui"
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase().trim())}
                className="font-mono text-center"
                maxLength={100}
              />
              <Button
                onClick={handleApplyFriendCode}
                disabled={friendCodeLoading || !friendCodeInput.trim()}
                size="sm"
                variant="default"
              >
                {friendCodeLoading ? 'A aplicar...' : 'Aplicar'}
              </Button>
            </div>
          </div>
        )}

        {/* Friend Code Discount Display */}
        {hasFriendCodeDiscount() && appliedFriendCode && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-green-800">
                  Desconto de 25% ativo! (Código: {appliedFriendCode})
                </Label>
                <p className="text-xs text-green-700 mt-1">
                  Reserva um serviço em 30 dias ou o desconto ficará inativo.
                </p>
              </div>
              <span className="text-green-600 font-bold">-{formatPrice(rewardDiscount)}</span>
            </div>
          </div>
        )}

        {/* Available Vouchers - No Code Input */}
        {!appliedReward && !excludeVouchers && (
          <div className="space-y-2">
            {availableVouchers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Vales Disponíveis:</Label>
                <div className="flex flex-wrap gap-2">
                  {availableVouchers.map(voucher => (
                    <Button
                      key={voucher.id}
                      variant="outline"
                      size="sm"
                      onClick={() => selectVoucher(voucher)}
                      className="text-xs"
                    >
                      {voucher.code} ({formatPrice(voucher.amount)})
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Show applied voucher */}
            {appliedVoucher && (
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {appliedVoucher.code} ({formatPrice(appliedVoucher.amount)})
                </Badge>
                <Button variant="outline" size="sm" onClick={removeVoucher}>
                  Remover
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Discount Summary */}
        {(premiumOfferDiscount > 0 || rewardDiscount > 0 || voucherDiscount > 0) && (
          <div className="space-y-2">
            <Separator />
            {premiumOfferDiscount > 0 && (
              <div className="flex justify-between text-sm text-primary font-semibold">
                <span>Desconto PREMIUM+ (Plano X)</span>
                <span>-{formatPrice(premiumOfferDiscount)}</span>
              </div>
            )}
            {rewardDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto de Recompensa</span>
                <span>-{formatPrice(rewardDiscount)}</span>
              </div>
            )}
            {voucherDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto 15€ Voucher</span>
                <span>-{formatPrice(voucherDiscount)}</span>
              </div>
            )}
          </div>
        )}

        {/* Final Price */}
        <Separator />
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatPrice(finalPrice)}</span>
        </div>

        {finalPrice === 0 && (
          <Badge variant="secondary" className="w-full justify-center">
            Sessão Gratuita
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};

export default PriceSummary;