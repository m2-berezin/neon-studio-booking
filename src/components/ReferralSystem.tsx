import { useState, useEffect } from 'react';
import { Copy, Users, Gift, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { generateFriendCode, saveFriendCode } from '@/utils/friendCodes';

interface ReferralSystemProps {
  className?: string;
}

const ReferralSystem = ({ className }: ReferralSystemProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!user || !profile) return null;

  // Generate random referral code and save it
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    if (user && profile) {
      // Check if user already has a friend code
      const existingCodes = JSON.parse(localStorage.getItem('friend_codes') || '[]');
      const userCode = existingCodes.find((c: any) => c.createdBy === user.id);
      
      if (userCode) {
        setReferralCode(userCode.code);
      } else {
        // Generate new code
        const newCode = generateFriendCode();
        setReferralCode(newCode);
        
        // Save the friend code
        saveFriendCode({
          code: newCode,
          discount: 25,
          createdBy: user.id,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        });
      }
    }
  }, [user, profile]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
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

  const shareLinks = [
    // Removed WhatsApp and Telegram as requested
  ];

  return (
    <Card className={`bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Users className="h-5 w-5" />
          Convida Amigos e Ganha 25% de Desconto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="h-5 w-5 text-accent" />
            <span className="text-sm font-medium">
              Tu e o teu amigo ganham 25% de desconto!
            </span>
          </div>
          
          <div className="bg-background/80 rounded-lg p-4 mb-4">
            <Label htmlFor="referral-code" className="text-sm font-medium">
              O Teu Código de Convite
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="referral-code"
                value={referralCode}
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

          {/* Removed share buttons as requested */}

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
            <p className="text-xs text-orange-800 font-medium">
              ℹ️ O desconto só fica disponível após o amigo fazer a sua primeira reserva
            </p>
            <p className="text-xs text-orange-700 mt-1">
              Desconto não acumulável com outros.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralSystem;