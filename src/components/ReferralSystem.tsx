import { useState } from 'react';
import { Copy, Users, Gift, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useFriendCode } from '@/hooks/useFriendCode';

interface ReferralSystemProps {
  className?: string;
}

const ReferralSystem = ({ className }: ReferralSystemProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { myFriendCode, appliedFriendCode, loading, applyFriendCode } = useFriendCode();
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');

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

  const handleApplyCode = async () => {
    if (!inputCode.trim()) {
      toast({
        title: 'Código Vazio',
        description: 'Por favor insere um código de amigo',
        variant: 'destructive',
      });
      return;
    }
    
    const success = await applyFriendCode(inputCode.toUpperCase());
    if (success) {
      setInputCode('');
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
        {/* Share your code section */}
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

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-xs text-orange-800 font-medium">
              ℹ️ O desconto só fica disponível após o amigo fazer a sua primeira reserva
            </p>
            <p className="text-xs text-orange-700 mt-1">
              Desconto não acumulável com outros.
            </p>
          </div>
        </div>

        {/* Apply friend code section */}
        {!appliedFriendCode && (
          <div className="border-t pt-4">
            <Label htmlFor="input-code" className="text-sm font-medium mb-2 block">
              Tens um código de amigo?
            </Label>
            <div className="flex gap-2">
              <Input
                id="input-code"
                placeholder="Insere o código aqui"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="font-mono text-center"
              />
              <Button
                onClick={handleApplyCode}
                disabled={loading || !inputCode.trim()}
                variant="default"
              >
                {loading ? 'A aplicar...' : 'Aplicar'}
              </Button>
            </div>
          </div>
        )}

        {/* Active discount badge */}
        {appliedFriendCode && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 justify-center">
              <Check className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-800 font-medium">
                Desconto de 25% ativo! (Código: {appliedFriendCode})
              </p>
            </div>
            <p className="text-xs text-green-700 mt-1 text-center">
              Válido por 30 dias desde a aplicação
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralSystem;