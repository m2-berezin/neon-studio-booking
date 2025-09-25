import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, ArrowLeft, CheckCircle } from 'lucide-react';

const PaymentStripe = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'mbway' | null>(null);
  
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

  const paymentMethods = [
    {
      id: 'card',
      name: 'Cartão de Crédito/Débito',
      description: 'Visa, Mastercard, American Express',
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      id: 'mbway',
      name: 'MBWay',
      description: 'Pagamento através do telemóvel',
      icon: <div className="w-5 h-5 bg-orange-500 rounded text-white text-xs flex items-center justify-center font-bold">MB</div>,
    },
  ];

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast({
        title: 'Erro',
        description: 'Por favor seleccione um método de pagamento',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      if (selectedMethod === 'mbway') {
        // Redirect to MBWay payment page
        const queryParams = new URLSearchParams({
          service: service || '',
          option: option || '',
          delivery: delivery || '',
          price: price || '',
          notes: notes || '',
        });
        
        navigate(`/payment?${queryParams.toString()}`);
      } else {
        // Handle card payment with Stripe
        toast({
          title: 'Pagamento por Cartão',
          description: 'A processar pagamento com Stripe...',
        });
        
        // TODO: Implement Stripe payment processing
        setTimeout(() => {
          toast({
            title: 'Pagamento Processado',
            description: 'O teu pagamento foi processado com sucesso!',
          });
          navigate('/projects');
        }, 2000);
      }
      
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
          Escolher Método de Pagamento
        </h1>
        <p className="text-muted-foreground">
          Selecciona como queres pagar
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

      {/* Payment Methods */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Métodos de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                onClick={() => setSelectedMethod(method.id as 'card' | 'mbway')}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedMethod === method.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-primary">{method.icon}</div>
                    <div>
                      <h3 className="font-semibold">{method.name}</h3>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                  </div>
                  {selectedMethod === method.id && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <Button 
            onClick={handlePayment}
            disabled={loading || !selectedMethod}
            className="w-full mt-6"
            size="lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                A processar...
              </>
            ) : (
              <>
                Continuar com {selectedMethod === 'card' ? 'Cartão' : 'MBWay'}
              </>
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

export default PaymentStripe;