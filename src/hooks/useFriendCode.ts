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
    }
  }, [user]);

  const loadMyFriendCode = async () => {
    if (!user) return;

    try {
      // Check if user already has a referral code
      const { data, error } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setMyFriendCode(data.code);
      } else {
        // Generate a new referral code using RPC function
        const { data: newCode, error: rpcError } = await supabase
          .rpc('generate_referral_code', { p_user_id: user.id });

        if (rpcError) throw rpcError;
        
        if (newCode) {
          setMyFriendCode(newCode);
        }
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
        .select('code, used_at')
        .eq('used_by', user.id)
        .order('used_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Check if code is still valid (within 30 days)
        const usedDate = new Date(data.used_at);
        const expiryDate = new Date(usedDate);
        expiryDate.setDate(expiryDate.getDate() + 30);

        if (expiryDate > new Date()) {
          setAppliedFriendCode(data.code);
        } else {
          setAppliedFriendCode(null);
        }
      }
    } catch (error) {
      console.error('Error loading applied friend code:', error);
    }
  };

  const applyFriendCode = async (code: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Deves estar autenticado para usar um código',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);
    try {
      // Trim and validate code
      const trimmedCode = code.trim().toUpperCase();
      
      console.log('Attempting to apply friend code:', trimmedCode);
      
      if (!trimmedCode) {
        toast({
          title: 'Código Vazio',
          description: 'Por favor insere um código válido',
          variant: 'destructive',
        });
        return false;
      }

      // Check if code exists (exact match, case-insensitive via uppercase)
      const { data: codeData, error: codeError } = await supabase
        .from('referral_codes')
        .select('code, user_id')
        .eq('code', trimmedCode)
        .eq('is_active', true)
        .maybeSingle();

      console.log('Code lookup result:', { codeData, codeError });

      if (codeError) throw codeError;

      if (!codeData) {
        console.log('Code not found in database');
        toast({
          title: 'Código Não Encontrado',
          description: 'Este código de amigo não existe',
          variant: 'destructive',
        });
        return false;
      }

      console.log('Code found, checking ownership...');

      // Check if user is trying to use their own code
      if (codeData.user_id === user.id) {
        toast({
          title: 'Código Inválido',
          description: 'Não podes usar o teu próprio código',
          variant: 'destructive',
        });
        return false;
      }

      // Check if user already used any friend code
      const { data: existingUse, error: useError } = await supabase
        .from('friend_code_uses')
        .select('code')
        .eq('used_by', user.id)
        .maybeSingle();

      if (useError) throw useError;

      if (existingUse) {
        toast({
          title: 'Código Já Usado',
          description: 'Já usaste um código de amigo anteriormente',
          variant: 'destructive',
        });
        return false;
      }

      // Apply the friend code
      const { error: insertError } = await supabase
        .from('friend_code_uses')
        .insert({
          code: trimmedCode,
          used_by: user.id,
        });

      if (insertError) throw insertError;

      setAppliedFriendCode(trimmedCode);
      toast({
        title: 'Código Aplicado!',
        description: '25% de desconto ativo nas tuas reservas por 30 dias',
      });

      return true;
    } catch (error: any) {
      console.error('Error applying friend code:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível aplicar o código',
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

  return {
    myFriendCode,
    appliedFriendCode,
    loading,
    applyFriendCode,
    hasFriendCodeDiscount,
    refreshAppliedCode: loadAppliedFriendCode,
  };
};
