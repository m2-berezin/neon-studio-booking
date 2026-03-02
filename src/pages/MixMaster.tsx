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
import { RealtimeSyncProvider } from '@/components/RealtimeSyncProvider';
import { useFriendCode } from '@/hooks/useFriendCode';
import { useReferralReward } from '@/hooks/useReferralReward';
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
import { formatPrice } from '@/lib/utils';

interface Voucher {
  id: string;
  code: string;
  amount_eur: number;
  expires_at: string;
}

const MixMaster = () => {
  const navigate = useNavigate();
  const { user, subscription, subscriptionDiscountPercent } = useAuth();
  const { toast } = useToast();
  const { hasReferralReward, referralReward } = useReferralReward();
  
  // Debug log for referral reward
  useEffect(() => {
    console.log('[MIXMASTER] Referral reward status:', { hasReferralReward, referralReward });
  }, [hasReferralReward, referralReward]);
  
  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // Check if this is a loyalty offer or plan 180-day offer from URL
  const searchParams = new URLSearchParams(window.location.search);
  const isLoyaltyOffer = searchParams.get('loyalty') === 'true';
  const isPlan180DayOffer = searchParams.get('plan180day') === 'true';
  
  const [selectedOption, setSelectedOption] = useState<'1project' | '2projects' | null>((isLoyaltyOffer || isPlan180DayOffer) ? '1project' : null);
  const [deliveryMethod, setDeliveryMethod] = useState<'upload' | 'link' | 'whatsapp' | 'later' | null>(null);
  const [transferLink, setTransferLink] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [pointsUsed, setPointsUsed] = useState(0);

  const hasSubscription = subscription?.is_active;

  // Load user's available vouchers (not used and not expired)
  useEffect(() => {
    const loadVouchers = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('vouchers')
          .select('*')
          .eq('client_id', user.id)
          .eq('is_used', false)
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
  
  const getProjectPrice = () => {
    // If loyalty offer or plan 180-day offer, price is always 0
    if (isLoyaltyOffer || isPlan180DayOffer) return 0;
    
    const basePrice = 40;
    let finalPrice = basePrice;
    
    // Apply subscription discount using AuthContext value
    if (hasSubscription && subscriptionDiscountPercent > 0) {
      finalPrice = basePrice * (1 - subscriptionDiscountPercent / 100);
    }
    
    // Apply referral reward discount (25% for code sharing)
    if (hasReferralReward && referralReward) {
      finalPrice = finalPrice * (1 - referralReward.discount_percent / 100);
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
    return basePrice * (subscriptionDiscountPercent / 100);
  };
  
  const getVoucherDiscount = () => {
    // No voucher discount if loyalty offer or plan 180-day offer
    if (isLoyaltyOffer || isPlan180DayOffer) return 0;
    return selectedVoucher ? selectedVoucher.amount_eur : 0;
  };
  
  const getLoyaltyDiscount = () => {
    return isLoyaltyOffer ? 40 : 0;
  };
  
  const getPlan180DayDiscount = () => {
    return isPlan180DayOffer ? 40 : 0;
  };
  
  const getReferralRewardDiscount = () => {
    if (!hasReferralReward || !referralReward || isLoyaltyOffer || isPlan180DayOffer) {
      console.log('[MIXMASTER] No referral reward:', { hasReferralReward, referralReward, isLoyaltyOffer, isPlan180DayOffer });
      return 0;
    }
    const basePrice = 40;
    const afterSubscription = hasSubscription ? basePrice * (1 - subscriptionDiscountPercent / 100) : basePrice;
    const discount = afterSubscription * (referralReward.discount_percent / 100);
    console.log('[MIXMASTER] Referral reward discount:', discount, 'from', afterSubscription);
    return discount;
  };

  const pricingOptions = [
    {
      id: '1project',
      title: '1 Projecto',
      description: 'Mix & Master de 1 música',
      price: getProjectPrice(),
      originalPrice: 40,
      hasSubscription
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
    "Remover limiting, compressão pesada e plugins como reverbs e delays das stems",
    "Organizar faixas por instrumento/elemento",
    "Escrever notas/indicações específicas",
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
      price: '40', // Always send base price - discounts are calculated in Payment.tsx
      notes: projectNotes,
      transferLink: transferLink,
      voucherId: selectedVoucher?.id || '',
      voucherCode: selectedVoucher?.code || '',
      loyaltyOffer: isLoyaltyOffer ? 'true' : '',
      plan180DayOffer: isPlan180DayOffer ? 'true' : '',
      points_used: pointsUsed.toString(), // Add points used
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
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center justify-center gap-2">
          <Music className="h-6 w-6 text-primary" />
          Mix & Master
        </h1>
        <p className="text-sm text-muted-foreground">
          Serviço profissional de mistura e masterização
        </p>
        {isLoyaltyOffer && (
          <Badge className="mt-3 text-sm px-3 py-1 bg-primary/20 text-primary border-primary">
            🎁 Oferta de Fidelidade - Mix&Master Grátis!
          </Badge>
        )}
        {isPlan180DayOffer && (
          <Badge className="mt-3 text-sm px-3 py-1 bg-primary/20 text-primary border-primary">
            🎁 Oferta Plano S (180 dias) - Mix&Master Grátis!
          </Badge>
        )}
      </div>

      {/* Pricing Info - compact inline */}
      {!isLoyaltyOffer && !isPlan180DayOffer && (
        <div className="flex items-center justify-center gap-4 mb-4 text-sm">
          <span className="text-muted-foreground">{formatPrice(40)} sem subscrição</span>
          <span className="text-primary font-semibold">{formatPrice(34)} com subscrição</span>
        </div>
      )}

      {/* Subscription Discount Info */}
      {hasSubscription && subscriptionDiscountPercent > 0 && !isLoyaltyOffer && !isPlan180DayOffer && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 mb-4 text-center">
          <p className="text-xs text-muted-foreground">
            {subscriptionDiscountPercent === 10 
              ? '10% desconto no primeiro mês' 
              : '15% desconto com subscrição ativa'}
          </p>
        </div>
      )}

      {/* File Requirements */}
      <Card className="mb-4">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileAudio className="h-4 w-4" />
            Antes de Enviar
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="space-y-2">
            {fileRequirements.map((requirement, index) => (
              <div key={index} className="flex items-start gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">{requirement}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Method - always visible */}
      <Card className="mb-4" id="delivery-section">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base">Método de Entrega</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="grid grid-cols-1 gap-3">
            {deliveryOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => {
                  setDeliveryMethod(option.id as any);
                  if (!selectedOption) setSelectedOption('1project');
                }}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  deliveryMethod === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-primary">{option.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{option.title}</h3>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  {deliveryMethod === option.id && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Method Content */}
          {deliveryMethod === 'link' && (
            <div className="mt-4 space-y-3">
              <Label htmlFor="transfer-link" className="text-sm">Link de Transferência</Label>
              <Input
                id="transfer-link"
                placeholder="Cola aqui o teu link do SwissTransfer/WeTransfer"
                value={transferLink}
                onChange={(e) => setTransferLink(e.target.value)}
              />
            </div>
          )}

          {deliveryMethod && (
            <div className="mt-4">
              <Label htmlFor="project-notes" className="text-sm">Notas do Projecto (Opcional)</Label>
              <Textarea
                id="project-notes"
                placeholder="Cola aqui 1/2 links de youtube/spotify como referências para a mix."
                value={projectNotes}
                onChange={(e) => setProjectNotes(e.target.value)}
                className="mt-1.5"
                rows={3}
              />
            </div>
          )}
          
          {deliveryMethod && (
            <Button 
              onClick={handleProceedToPayment}
              className="w-full mt-4"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pagar Agora
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const MixMasterWithSync = () => (
  <RealtimeSyncProvider>
    <MixMaster />
  </RealtimeSyncProvider>
);

export default MixMasterWithSync;