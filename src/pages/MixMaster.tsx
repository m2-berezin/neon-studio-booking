import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  Link as LinkIcon, 
  MessageCircle, 
  CreditCard, 
  Clock,
  AlertCircle,
  CheckCircle,
  Music,
  FileAudio
} from 'lucide-react';

interface Voucher {
  id: string;
  code: string;
  amount_eur: number;
  expires_at: string;
}

const MixMaster = () => {
  const navigate = useNavigate();
  const { user, subscription } = useAuth();
  const { toast } = useToast();
  
  const [selectedOption, setSelectedOption] = useState<'1project' | '2projects' | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'upload' | 'link' | 'whatsapp' | 'later' | null>(null);
  const [transferLink, setTransferLink] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  const hasSubscription = subscription?.is_active;

  // Load user's available vouchers
  useEffect(() => {
    const loadVouchers = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('vouchers')
          .select('*')
          .eq('client_id', user.id)
          .gte('expires_at', new Date().toISOString());
        
        if (error) throw error;
        setAvailableVouchers(data || []);
        
        // Auto-apply first voucher
        if (data && data.length > 0) {
          setSelectedVoucher(data[0]);
        }
      } catch (error) {
        console.error('Error loading vouchers:', error);
      }
    };
    
    loadVouchers();
  }, [user]);

  // Check if it's first month of subscription (simplified check)
  const isFirstMonth = false; // TODO: Implement proper first month detection
  
  const getProjectPrice = () => {
    const basePrice = 40;
    let finalPrice = basePrice;
    
    // Apply subscription discount
    if (hasSubscription) {
      if (isFirstMonth) {
        finalPrice = basePrice * 0.9; // 10% discount
      } else {
        finalPrice = basePrice * 0.85; // 15% discount
      }
    }
    
    // Apply voucher discount
    if (selectedVoucher) {
      finalPrice = Math.max(0, finalPrice - selectedVoucher.amount_eur);
    }
    
    return finalPrice;
  };
  
  const getSubscriptionDiscount = () => {
    if (!hasSubscription) return 0;
    const basePrice = 40;
    if (isFirstMonth) return basePrice * 0.1; // 10%
    return basePrice * 0.15; // 15%
  };
  
  const getVoucherDiscount = () => {
    return selectedVoucher ? selectedVoucher.amount_eur : 0;
  };

  const pricingOptions = [
    {
      id: '1project',
      title: '1 Projecto',
      description: 'Mix & Master de 1 música',
      price: getProjectPrice(),
      originalPrice: 40,
      hasSubscription,
      isFirstMonth
    }
  ];

  const deliveryOptions = [
    {
      id: 'link',
      title: 'Link de Transferência',
      description: 'SwissTransfer, WeTransfer, etc.',
      icon: <LinkIcon className="h-5 w-5" />
    }
  ];

  const fileRequirements = [
    "Todos os ficheiros devidamente identificados",
    "Ficheiros de áudio em 24-bit/48kHz ou superior",
    "Remover limiting, compressão pesada e plugins como reverbs e delays das stems",
    "Organizar faixas por instrumento/elemento",
    "Escrever notas específicas",
    "Enviar 1/2 faixas de referência se pretender"
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (uploadedFiles) {
      setFiles(uploadedFiles);
      toast({
        title: "Ficheiros Seleccionados",
        description: `${uploadedFiles.length} ficheiro(s) seleccionado(s)`,
      });
    }
  };

  const handleWhatsAppSend = () => {
    const whatsappNumber = "+1234567890"; // Replace with actual studio WhatsApp
    const message = `Olá! Gostaria de enviar ficheiros para Mix & Master (${selectedOption === '1project' ? '1 projecto' : '2 projectos'}).\n\nNotas: ${projectNotes || 'Sem notas específicas'}`;
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleProceedToPayment = async () => {
    if (!selectedOption) {
      toast({
        title: "Erro",
        description: "Por favor seleccione uma opção de preço",
        variant: "destructive",
      });
      return;
    }

    if (!deliveryMethod) {
      toast({
        title: "Erro",
        description: "Por favor seleccione um método de entrega",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Erro",
        description: "Por favor faça login para continuar",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    const queryParams = new URLSearchParams({
      service: 'mixmaster',
      option: selectedOption,
      delivery: deliveryMethod,
      price: getSelectedPrice().toString(),
      notes: projectNotes,
      transferLink: transferLink,
      voucherId: selectedVoucher?.id || '',
      voucherCode: selectedVoucher?.code || ''
    });
    
    navigate(`/payment?${queryParams.toString()}`);
  };

  const getSelectedPrice = () => {
    if (!selectedOption) return 0;
    const option = pricingOptions.find(p => p.id === selectedOption);
    return option?.price || 0;
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center justify-center gap-3">
          <Music className="h-8 w-8 text-primary" />
          Mix & Master
        </h1>
        <p className="text-muted-foreground text-lg">
          Serviço profissional de mistura e masterização
        </p>
      </div>

      {/* Pricing Options */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Escolhe a Tua Opção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {pricingOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => {
                  setSelectedOption(option.id as '1project' | '2projects');
                  // Automatically scroll to delivery method
                  setTimeout(() => {
                    const deliveryElement = document.getElementById('delivery-section');
                    if (deliveryElement) {
                      deliveryElement.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 100);
                }}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedOption === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{option.title}</h3>
                  {selectedOption === option.id && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">{option.description}</p>
                
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="text-base font-medium text-muted-foreground">€40 sem subscrição</div>
                    <div className="text-2xl font-bold text-primary">€34 com subscrição</div>
                  </div>
                  {option.hasSubscription && (
                    <Badge variant="secondary" className="text-xs">
                      Com Subscrição
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* First Month Disclaimer */}
          {hasSubscription && isFirstMonth && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800 font-medium">
                ℹ️ O primeiro mês apenas tem 10% de desconto nos serviços
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Requirements */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="h-5 w-5" />
            Antes de Enviar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {fileRequirements.map((requirement, index) => (
              <div key={index} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{requirement}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Method */}
      {selectedOption && (
        <Card className="mb-8" id="delivery-section">
          <CardHeader>
            <CardTitle>Método de Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deliveryOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => setDeliveryMethod(option.id as any)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    deliveryMethod === option.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-primary">{option.icon}</div>
                    <h3 className="font-semibold">{option.title}</h3>
                    {deliveryMethod === option.id && (
                      <CheckCircle className="h-5 w-5 text-primary ml-auto" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              ))}
            </div>

            {/* Delivery Method Content */}
            {deliveryMethod === 'link' && (
              <div className="mt-6 space-y-4">
                <Label htmlFor="transfer-link">Link de Transferência</Label>
                <Input
                  id="transfer-link"
                  placeholder="Cola aqui o teu link do SwissTransfer/WeTransfer"
                  value={transferLink}
                  onChange={(e) => setTransferLink(e.target.value)}
                  className="mt-2"
                />
              </div>
            )}

            {deliveryMethod && (
              <div className="mt-6">
                <Label htmlFor="project-notes">Notas do Projecto (Opcional)</Label>
                <Textarea
                  id="project-notes"
                  placeholder="Cola aqui 1/2 links de youtube/spotify como referências para a mix que estás à procura."
                  value={projectNotes}
                  onChange={(e) => setProjectNotes(e.target.value)}
                  className="mt-2"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Summary */}
      {selectedOption && deliveryMethod && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Resumo do Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Serviço:</span>
                <span>{pricingOptions.find(p => p.id === selectedOption)?.title}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Estado da Subscrição:</span>
                <Badge variant={hasSubscription ? "default" : "secondary"}>
                  {hasSubscription ? "Activa" : "Sem Subscrição"}
                </Badge>
              </div>
              
              {/* Vouchers */}
              {availableVouchers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Vales Disponíveis:</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableVouchers.map(voucher => (
                      <Button
                        key={voucher.id}
                        variant={selectedVoucher?.id === voucher.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedVoucher(voucher)}
                        className="text-xs"
                      >
                        {voucher.code} (€{voucher.amount_eur})
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <Separator />
              
              {/* Price Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Preço Base:</span>
                  <span>€40</span>
                </div>
                
                {getSubscriptionDiscount() > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Desconto Subscrição ({isFirstMonth ? '10' : '15'}%):</span>
                    <span>-€{getSubscriptionDiscount().toFixed(2)}</span>
                  </div>
                )}
                
                {getVoucherDiscount() > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Desconto Voucher:</span>
                    <span>-€{getVoucherDiscount().toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>€{getSelectedPrice()}</span>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Envio Pendente de Pagamento</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      O trabalho começará apenas após confirmação do pagamento.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleProceedToPayment}
                className="w-full"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pagar Agora
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MixMaster;