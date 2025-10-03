import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, CheckCircle, Copy, Smartphone, Building2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

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
  const bookingDate = searchParams.get('date');
  const startTime = searchParams.get('start_time');
  const endTime = searchParams.get('end_time');
  const serviceId = searchParams.get('service_id');
  
  // Determine service title based on service and option
  let serviceTitle = '';
  let optionTitle = '';
  
  if (service === 'booking') {
    if (option === 'recording') {
      serviceTitle = 'Captação (Gravação)';
      optionTitle = ''; // Will use notes for details
    } else if (option === 'mix-master') {
      serviceTitle = 'Captação Mix & Master';
      optionTitle = '';
    }
  } else if (service === 'mixmaster') {
    serviceTitle = 'Mix & Master';
    optionTitle = option === '1project' ? '1 Projecto' : '2 Projectos';
  } else {
    serviceTitle = service || '';
    optionTitle = option || '';
  }

  // Payment details
  const MBWAY_PHONE = '934941263';
  const IBAN = 'PT50 0193 0000 1050 4647 3479 5';

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
      // Store booking details in payment request
      const bookingInfo = notes ? {
        service: serviceTitle,
        option: optionTitle,
        booking_details: notes
      } : null;

      // 1. Create payment request with status pending
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_requests')
        .insert({
          user_id: user.id,
          amount: parseFloat(price || '0'),
          method: 'manual',
          status: 'pending',
          notes: JSON.stringify(bookingInfo),
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Create reservation with status pending (only for bookings)
      if (service === 'booking' && bookingDate && startTime && endTime && serviceId) {
        const { error: reservationError } = await supabase
          .from('reservations')
          .insert({
            user_id: user.id,
            service_id: serviceId,
            date: bookingDate,
            time_slot: startTime,
            duration: 2, // Default 2 hours, adjust based on service
            status: 'pending',
            payment_request_id: paymentData.id
          });

        if (reservationError) throw reservationError;
      }

      // 3. Create notification for admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const userName = profile?.full_name || user.email || 'Usuário';

      // Get admin users
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const notificationBody = notes 
          ? `${userName} confirmou pagamento de €${price} para ${serviceTitle} - ${notes}`
          : `${userName} confirmou pagamento de €${price} para ${serviceTitle} - ${optionTitle}`;

        const notifications = admins.map(admin => ({
          user_id: admin.id,
          title: 'Novo Pagamento Pendente',
          body: notificationBody,
          read: false
        }));

        await supabase.from('notifications').insert(notifications);
      }

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
            
            {optionTitle && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Opção:</span>
                <span>{optionTitle}</span>
              </div>
            )}
            
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
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">MB Way</h3>
            </div>
            
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-xl border-2 border-primary/20">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="bg-white p-4 rounded-lg shadow-lg">
                  <QRCodeSVG 
                    value={`MBWAY:${MBWAY_PHONE}:${price}`}
                    size={160}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <p className="text-sm text-muted-foreground mb-2">Número de Telemóvel:</p>
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                    <span className="text-2xl font-bold font-mono">{MBWAY_PHONE}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(MBWAY_PHONE, 'Número MB Way')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Digitalize o QR code com a app MB Way ou use o número manualmente
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* IBAN */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Transferência Bancária</h3>
            </div>
            
            <div className="bg-gradient-to-br from-secondary/5 to-secondary/10 p-4 rounded-xl border-2 border-secondary/20">
              <p className="text-sm text-muted-foreground mb-2">IBAN:</p>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-sm md:text-base font-semibold break-all">{IBAN}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(IBAN, 'IBAN')}
                  className="flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Utilize este IBAN para transferência bancária nacional ou internacional
              </p>
            </div>
          </div>

          <Separator />

          {/* Instructions */}
          <div className="space-y-2">
            <h3 className="font-semibold">Instruções:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Faça o pagamento do sinal usando MB Way ou Transferência Bancária</li>
              <li>Use a referência do pedido nas notas de pagamento (se aplicável)</li>
              <li>Clique em "Já Paguei" após realizar o pagamento</li>
              <li>Aguarde a confirmação do pagamento (normalmente 3-8h)</li>
            </ol>
          </div>

          <Button 
            onClick={handlePaymentConfirmation}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                A processar...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Já Paguei
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

export default Payment;
