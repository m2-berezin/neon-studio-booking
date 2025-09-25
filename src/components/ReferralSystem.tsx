import { useState } from 'react';
import { Copy, Users, Gift, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ReferralSystemProps {
  className?: string;
}

const ReferralSystem = ({ className }: ReferralSystemProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!user || !profile) return null;

  // Generate referral code: FirstName + 777
  const generateReferralCode = () => {
    const firstName = profile.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User';
    return `${firstName}777`;
  };

  const referralCode = generateReferralCode();

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
    {
      name: 'WhatsApp',
      url: `https://wa.me/?text=Experimenta o 7T7Studios! Usa o meu código ${referralCode} e ganha 25%25 de desconto na tua primeira reserva. https://7t7studios.app`,
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      name: 'Telegram',
      url: `https://t.me/share/url?url=https://7t7studios.app&text=Experimenta o 7T7Studios! Usa o meu código ${referralCode} e ganha 25%25 de desconto na tua primeira reserva.`,
      color: 'bg-blue-600 hover:bg-blue-700',
    },
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {shareLinks.map((link) => (
              <Button
                key={link.name}
                onClick={() => window.open(link.url, '_blank')}
                className={`${link.color} text-white`}
                size="sm"
              >
                Partilhar via {link.name}
              </Button>
            ))}
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
            <p className="text-xs text-orange-800 font-medium">
              ℹ️ O código só fica disponível após o amigo fazer a sua primeira reserva
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