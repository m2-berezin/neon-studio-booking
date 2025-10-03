import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { validateFriendCode, useFriendCode } from '@/utils/friendCodes';

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

export const PriceSummary = ({ services, bookingDate, className, onPriceChange, showFriendCode = true }: PriceSummaryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { userSubscription } = useSubscriptions();
  
  const [rewardCode, setRewardCode] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedReward, setAppliedReward] = useState<string>('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);

  // Load user's available vouchers
  const loadVouchers = async () => {
    // Vouchers table not yet implemented
    setAvailableVouchers([]);
    // if (!user) return;
    // try {
    //   const { data, error } = await supabase
    //     .from('vouchers')
    //     .select('*')
    //     .eq('client_id', user.id)
    //     .eq('redeemed', false)
    //     .gte('expires_at', new Date().toISOString().split('T')[0]);
    //   if (error) throw error;
    //   setAvailableVouchers(data || []);
    // } catch (error) {
    //   console.error('Error loading vouchers:', error);
    // }
  };

  useEffect(() => {
    loadVouchers();
  }, [user]);

  // Calculate line items from services
  const lineItems: LineItem[] = services.map(service => ({
    id: service.id,
    name: service.name,
    price: service.base_price,
    quantity: 1
  }));

  const subtotal = lineItems.reduce((total, item) => total + (item.price * item.quantity), 0);

  // Check if booking is within active subscription period
  const isSubscriptionBooking = () => {
    if (!userSubscription || !userSubscription.active || !bookingDate) return false;
    
    const startDate = new Date(userSubscription.start_date);
    
    // Check if booking is after start date and subscription is active
    if (bookingDate < startDate) return false;
    
    return true;
  };

  // Calculate subscription discount
  const subscriptionDiscount = isSubscriptionBooking() && userSubscription?.discounted_price 
    ? Math.max(0, subtotal - userSubscription.discounted_price) 
    : 0;

  // Apply friend/reward code
  const applyReward = async () => {
    if (!rewardCode.trim()) {
      toast({
        title: 'Código Inválido',
        description: 'Por favor introduza um código de amigo',
        variant: 'destructive',
      });
      return;
    }

    // Clear voucher if reward is applied (can't use both)
    if (appliedVoucher) {
      setAppliedVoucher(null);
      setVoucherCode('');
    }

    // First check if it's a friend code
    const friendCodeValidation = validateFriendCode(rewardCode.toUpperCase(), user?.id || '');
    if (friendCodeValidation.valid) {
      setAppliedReward(rewardCode.toUpperCase());
      useFriendCode(rewardCode.toUpperCase(), user?.id || '');
      toast({
        title: 'Código de Amigo Aplicado',
        description: `25% de desconto aplicado - €${(subtotal * 0.25).toFixed(2)} de desconto`,
      });
      return;
    }

    // Fallback to other reward codes
    const rewardDiscounts: Record<string, { discount: number; description: string }> = {
      'BUY2GET1': { discount: subtotal * 0.33, description: 'Buy 2h Get 1h Free' },
      'MIXING50': { discount: subtotal * 0.5, description: '50% Off Mixing & Mastering' },
      'NEWCLIENT': { discount: 15, description: '€15 New Client Discount' },
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
        description: friendCodeValidation.error || 'Código não encontrado ou expirado',
        variant: 'destructive',
      });
    }
  };

  // Apply voucher code
  const applyVoucher = async () => {
    if (!voucherCode.trim()) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a voucher code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Vouchers not yet implemented
      toast({
        title: 'Erro',
        description: 'Sistema de vouchers ainda não disponível',
        variant: 'destructive',
      });
      // const { data, error } = await supabase
      //   .from('vouchers')
      //   .select('*')
      //   .eq('code', voucherCode)
      //   .eq('client_id', user?.id)
      //   .eq('redeemed', false)
      //   .gte('expires_at', new Date().toISOString().split('T')[0])
      //   .maybeSingle();
      // if (error) throw error;
      // if (data) {
      //   if (appliedReward) {
      //     setAppliedReward('');
      //     setRewardCode('');
      //   }
      //   setAppliedVoucher(data);
      //   toast({ title: 'Voucher Applied', description: `€${data.amount} discount applied` });
      // } else {
      //   toast({
      //     title: 'Invalid Voucher',
      //     description: 'Voucher code not found, expired, or already used',
      //     variant: 'destructive',
      //   });
      // }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to apply voucher',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate reward discount
  const getRewardDiscount = () => {
    if (!appliedReward) return 0;
    
    // Check if it's a friend code (8 character alphanumeric)
    if (/^[A-Z0-9]{8}$/.test(appliedReward)) {
      return subtotal * 0.25; // 25% discount for friend codes
    }
    
    const rewardDiscounts: Record<string, number> = {
      'BUY2GET1': subtotal * 0.33,
      'MIXING50': subtotal * 0.5,
      'NEWCLIENT': 15,
    };
    
    return rewardDiscounts[appliedReward] || 0;
  };

  const rewardDiscount = getRewardDiscount();
  const voucherDiscount = appliedVoucher ? appliedVoucher.amount : 0;
  
  // Calculate final price
  const priceAfterSubscription = subtotal - subscriptionDiscount;
  const priceAfterRewardOrVoucher = priceAfterSubscription - Math.max(rewardDiscount, voucherDiscount);
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
              <span>€{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-medium">
            <span>Subtotal</span>
            <span>€{subtotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Subscription Discount */}
        {subscriptionDiscount > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-green-600">
              <span>Desconto de Subscrição ({userSubscription?.plan})</span>
              <span>-€{subscriptionDiscount.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Friend Code Input */}
        {showFriendCode && !appliedVoucher && (
          <div className="space-y-2">
            <Label htmlFor="friend-code">Código de Amigo</Label>
            {appliedReward ? (
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{appliedReward} Applied</Badge>
                <Button variant="outline" size="sm" onClick={removeReward}>
                  Remover
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  id="friend-code"
                  placeholder="Introduza código de amigo"
                  value={rewardCode}
                  onChange={(e) => setRewardCode(e.target.value)}
                />
                <Button onClick={applyReward}>Aplicar</Button>
              </div>
            )}
          </div>
        )}

        {/* Available Vouchers - No Code Input */}
        {!appliedReward && (
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
                      {voucher.code} (€{voucher.amount})
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Show applied voucher */}
            {appliedVoucher && (
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {appliedVoucher.code} (€{appliedVoucher.amount})
                </Badge>
                <Button variant="outline" size="sm" onClick={removeVoucher}>
                  Remover
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Discount Summary */}
        {(rewardDiscount > 0 || voucherDiscount > 0) && (
          <div className="space-y-2">
            <Separator />
            {rewardDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto de Recompensa</span>
                <span>-€{rewardDiscount.toFixed(2)}</span>
              </div>
            )}
            {voucherDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto de Vale</span>
                <span>-€{voucherDiscount.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Final Price */}
        <Separator />
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>€{finalPrice.toFixed(2)}</span>
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