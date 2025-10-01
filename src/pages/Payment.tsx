import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, CheckCircle, Copy } from 'lucide-react';

const Payment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  
  // Get payment details from URL params
  const service = searchParams.get('service');
  const option = searchParams.get('option');
  const delivery = searchParams.get('delivery');
  const price = searchParams.get('price');
  const notes = searchParams.get('notes');
  
  const serviceTitle = service === 'mixmaster' ? 'Mix & Master' : service;
  const optionTitle = option === '1project' ? '1 Projecto' : '2 Projectos';

  // Payment details
  const MBWAY_PHONE = '+351 912 345 678';
  const IBAN = 'PT50 0000 0000 0000 0000 0000 0';

  useEffect(() => {
    if (!service || !option || !price) {
      toast({
        title: 'Erro',
        description: 'Dados de pagamento em falta. A redireccionar...',
        variant: 'destructive',
      });
      navigate('/mix-master');
    }
  }, [service, option, price, navigate, toast]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: `${label} copiado para a área de transferência`,
    });
  };

  const handlePaymentConfirmation = async () => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Precisa de iniciar sessão para confirmar o pagamento',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('payment_requests')
        .insert({
          user_id: user.id,
          amount: parseFloat(price || '0'),
          method: 'manual',
          status: 'pending'
        });

      if (error) throw error;

      // Call edge function to notify admin via SMS
      await supabase.functions.invoke('notify-payment-sms', {
        body: {
          user_id: user.id,
          amount: parseFloat(price || '0'),
          method: 'manual'
        }
      });

      toast({
        title: 'Pagamento Registado',
        description: 'O teu pagamento está a ser verificado. Receberás uma confirmação em breve.',
      });
      
      navigate('/projects');
      
    } catch (error) {
      console.error('Error registering payment:', error);
      toast({
        title: 'Erro no Pagamento',
        description: 'Ocorreu um erro ao registar o pagamento',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!service || !option || !price) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => window.history.back()}
          className="mb-4"
        >
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
          <CardTitle>Resumo do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Serviço:</span>
              <span>{serviceTitle}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Opção:</span>
              <span>{optionTitle}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Método de Entrega:</span>
              <Badge variant="secondary">{delivery}</Badge>
            </div>
            
            {notes && (
              <div className="pt-2">
                <span className="font-medium block mb-1">Notas:</span>
                <p className="text-sm text-muted-foreground">{notes}</p>
              </div>
            )}
            
            <Separator />
            
            <div className="flex items-center justify-between text-xl font-bold">
              <span>Total:</span>
              <span className="text-primary">€{price}</span>
            </div>
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
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">MB Way</h3>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-mono">{MBWAY_PHONE}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(MBWAY_PHONE, 'Número MB Way')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* IBAN */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Transferência Bancária</h3>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-mono text-sm">{IBAN}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(IBAN, 'IBAN')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Instructions */}
          <div className="space-y-2">
            <h3 className="font-semibold">Instruções:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Faça o pagamento de €{price} usando MB Way ou Transferência Bancária</li>
              <li>Use a referência do pedido nas notas de pagamento (se aplicável)</li>
              <li>Clique em "Já Paguei" após realizar o pagamento</li>
              <li>Aguarde a confirmação do pagamento (normalmente 24-48h)</li>
            </ol>
          </div>

          <Button 
            onClick={handlePaymentConfirmation}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                A processar...
              </>
            ) : (
              'Já Paguei'
            )}
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
    </div>
  );
};

export default Payment;
