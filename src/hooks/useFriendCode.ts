import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useFriendCode = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [myFriendCode, setMyFriendCode] = useState<string>('');
  const [appliedFriendCode, setAppliedFriendCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load or create user's friend code
  useEffect(() => {
    if (user) {
      loadMyFriendCode();
      loadAppliedFriendCode();
      
      // Subscribe to realtime changes in friend_code_uses to refresh when admin approves
      const channel = supabase
        .channel('friend_code_uses_changes')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'friend_code_uses',
          filter: `used_by=eq.${user.id}`
        }, (payload) => {
          console.log('[FRIEND CODE REALTIME] Update detected:', payload);
          
          // Check if the update marked the code as used in payment
          if (payload.new && (payload.new as any).used_in_payment === true) {
            console.log('[FRIEND CODE REALTIME] Code marked as used in payment, clearing from UI...');
            // Immediately clear the applied code
            setAppliedFriendCode(null);
          }
          
          // Reload applied friend code to check if it was used in payment
          loadAppliedFriendCode();
        })
        .subscribe((status) => {
          console.log('[FRIEND CODE REALTIME] Subscription status:', status);
        });
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadMyFriendCode = async () => {
    if (!user) return;

    try {
      // Always regenerate code to ensure it's based on current profile name
      const { data: newCode, error: rpcError } = await supabase
        .rpc('generate_referral_code', { p_user_id: user.id });

      if (rpcError) throw rpcError;
      
      if (newCode) {
        setMyFriendCode(newCode);
      }
    } catch (error) {
      console.error('Error loading friend code:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o código de convite',
        variant: 'destructive',
      });
    }
  };

  const loadAppliedFriendCode = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('friend_code_uses')
        .select('code, used_at, used_in_payment')
        .eq('used_by', user.id)
        .order('used_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        console.log('[FRIEND CODE] Loaded code data:', data);
        
        // Check if code was already used in a payment
        if (data.used_in_payment) {
          console.log('[FRIEND CODE] Code already used in payment, clearing...');
          setAppliedFriendCode(null);
          return;
        }

        // Check if code is still valid (within 30 days)
        const usedDate = new Date(data.used_at);
        const expiryDate = new Date(usedDate);
        expiryDate.setDate(expiryDate.getDate() + 30);

        if (expiryDate > new Date()) {
          console.log('[FRIEND CODE] Code still valid:', data.code);
          setAppliedFriendCode(data.code);
        } else {
          console.log('[FRIEND CODE] Code expired, clearing...');
          setAppliedFriendCode(null);
        }
      } else {
        console.log('[FRIEND CODE] No code found for user');
        setAppliedFriendCode(null);
      }
    } catch (error) {
      console.error('Error loading applied friend code:', error);
      setAppliedFriendCode(null);
    }
  };

  const applyFriendCode = async (code: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setLoading(true);

      // Call new RPC function that handles points
      const { data, error } = await supabase.rpc('apply_friend_code_with_points', {
        p_user_id: user.id,
        p_code: code.trim().toUpperCase(),
      }) as { data: any; error: any };

      if (error) {
        console.error('Error applying friend code:', error);
        toast({
          title: 'Erro',
          description: error.message || 'Erro ao aplicar o código.',
          variant: 'destructive',
        });
        return false;
      }

      const result = data as { success: boolean; error?: string; points_awarded?: number; expires_in_days?: number };

      if (!result.success) {
        toast({
          title: 'Código inválido',
          description: result.error || 'Este código não pode ser usado.',
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: `Ganhaste ${result.points_awarded || 2500} Pontos!`,
        description: `Código aplicado! Tens ${result.expires_in_days || 30} dias para usar os pontos (10€ de desconto).`,
      });

      // Reload applied code
      await loadAppliedFriendCode();
      return true;
    } catch (error) {
      console.error('Error applying friend code:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao aplicar o código. Tenta novamente.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const hasFriendCodeDiscount = (): boolean => {
    return appliedFriendCode !== null;
  };

  const markCodeAsUsed = async (paymentRequestId: string): Promise<boolean> => {
    if (!user || !appliedFriendCode) {
      console.log('[FRIEND CODE] Cannot mark as used - no user or code:', { user: !!user, code: appliedFriendCode });
      return false;
    }

    try {
      console.log('[FRIEND CODE] Marking code as used:', { code: appliedFriendCode, paymentRequestId });
      
      const { error } = await supabase
        .from('friend_code_uses')
        .update({ 
          used_in_payment: true,
          payment_request_id: paymentRequestId
        })
        .eq('used_by', user.id)
        .eq('code', appliedFriendCode);

      if (error) {
        console.error('[FRIEND CODE] Error marking code as used:', error);
        throw error;
      }

      console.log('[FRIEND CODE] Code marked as used successfully');
      
      // Clear the applied code from state immediately
      setAppliedFriendCode(null);
      return true;
    } catch (error) {
      console.error('Error marking code as used:', error);
      return false;
    }
  };

  return {
    myFriendCode,
    appliedFriendCode,
    loading,
    applyFriendCode,
    hasFriendCodeDiscount,
    markCodeAsUsed,
    refreshAppliedCode: loadAppliedFriendCode,
  };
};
