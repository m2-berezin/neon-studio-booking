import { useState, useEffect } from 'react';
import { Copy, Users, Gift, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useFriendCode } from '@/hooks/useFriendCode';
import { supabase } from '@/integrations/supabase/client';

interface ReferralSystemProps {
  className?: string;
}

const ReferralSystem = ({ className }: ReferralSystemProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { myFriendCode, refreshAppliedCode } = useFriendCode();
  const [copied, setCopied] = useState(false);

  // Refresh applied code on mount and when page becomes visible
  useEffect(() => {
    if (user) {
      refreshAppliedCode();
    }

    // Refresh when page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        refreshAppliedCode();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set up realtime subscription for friend_code_uses changes
    const channel = supabase
      .channel('friend-code-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_code_uses',
          filter: `used_by=eq.${user.id}`,
        },
        () => {
          refreshAppliedCode();
        }
      )
      .subscribe();
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user || !profile) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(myFriendCode);
      setCopied(true);
      
      toast({
        title: 'Código Copiado!',
        description: 'O teu código de convite foi copiado para a área de transferência.',
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao copiar o código. Tenta selecionar e copiar manualmente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className={`bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Users className="h-5 w-5" />
          Convida Amigos e Ganha 10€ de Desconto!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Share your code section */}
        <div className="text-center">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="h-5 w-5 text-accent" />
            <span className="text-sm font-medium">
              Tu e o teu amigo ganham 2500 pontos (10€ de desconto)!
            </span>
          </div>
          
          <div className="bg-background/80 rounded-lg p-4">
            <Label htmlFor="referral-code" className="text-sm font-medium">
              O Teu Código de Convite
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="referral-code"
                value={myFriendCode}
                readOnly
                className="text-center font-mono text-lg font-bold"
              />
              <Button
                onClick={handleCopyCode}
                variant="outline"
                size="sm"
                className="px-3"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralSystem;