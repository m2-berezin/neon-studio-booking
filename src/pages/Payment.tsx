import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Smartphone, CheckCircle, ArrowLeft } from 'lucide-react';

const Payment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Get payment details from URL params
  const service = searchParams.get('service');
  const option = searchParams.get('option');
  const delivery = searchParams.get('delivery');
  const price = searchParams.get('price');
  const notes = searchParams.get('notes');
  
  const serviceTitle = service === 'mixmaster' ? 'Mix & Master' : service;
  const optionTitle = option === '1project' ? '1 Projecto' : '2 Projectos';

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

  const handleMBWayPayment = async () => {
    if (!phoneNumber) {
      toast({
        title: 'Erro',
        description: 'Por favor introduce o teu número de telefone',
        variant: 'destructive',
      });
      return;
    }

    if (!/^9[1236]\d{7}$/.test(phoneNumber)) {
      toast({
        title: 'Erro',
        description: 'Número de telefone inválido. Use o formato 9XXXXXXXX',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      // Simulate MBWay payment process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Pagamento Enviado',
        description: 'Verifica o teu telemóvel para confirmar o pagamento MBWay',
      });
      
      // Simulate payment confirmation
      setTimeout(() => {
        toast({
          title: 'Pagamento Confirmado',
          description: 'O teu pagamento foi processado com sucesso!',
        });
        navigate('/projects');
      }, 3000);
      
    } catch (error) {
      toast({
        title: 'Erro no Pagamento',
        description: 'Ocorreu um erro ao processar o pagamento',
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
          Confirma os detalhes e escolhe o método de pagamento
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
              <span>€{price}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Pagar com MBWay
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Número de Telemóvel</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="9XXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                maxLength={9}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Introduce o número associado ao teu MBWay
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">Como funciona</h4>
                  <ol className="text-sm text-blue-700 mt-1 space-y-1">
                    <li>1. Clica em "Pagar com MBWay"</li>
                    <li>2. Receberás uma notificação no teu telemóvel</li>
                    <li>3. Confirma o pagamento na app MBWay</li>
                    <li>4. Aguarda a confirmação</li>
                  </ol>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleMBWayPayment}
              disabled={loading || !phoneNumber}
              className="w-full bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  A processar...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Pagar €{price} com MBWay
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-800">Pagamento Seguro</h4>
            <p className="text-sm text-green-700 mt-1">
              Os teus dados estão protegidos. O pagamento é processado de forma segura através do MBWay.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;