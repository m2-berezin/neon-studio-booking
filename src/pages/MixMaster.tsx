import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptions } from '@/hooks/useSubscriptions';
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

const MixMaster = () => {
  const { user } = useAuth();
  const { userSubscription } = useSubscriptions();
  const { toast } = useToast();
  
  const [selectedOption, setSelectedOption] = useState<'1project' | '2projects' | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'upload' | 'link' | 'whatsapp' | 'later' | null>(null);
  const [transferLink, setTransferLink] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);

  const hasSubscription = userSubscription?.active;

  const pricingOptions = [
    {
      id: '1project',
      title: '1 Projecto',
      description: 'Mix & Master de 1 música',
      originalPrice: 40,
      subscriptionPrice: 34,
      savings: 6
    },
    {
      id: '2projects',
      title: '2 Projectos',
      description: 'Mix & Master de 2 músicas',
      originalPrice: 70,
      subscriptionPrice: 70,
      pricePerTrack: 35,
      note: 'Mesmo preço com e sem subscrição'
    }
  ];

  const deliveryOptions = [
    {
      id: 'upload',
      title: 'Enviar Ficheiros',
      description: 'Faz upload directo dos teus ficheiros',
      icon: <Upload className="h-5 w-5" />
    },
    {
      id: 'link',
      title: 'Link de Transferência',
      description: 'SwissTransfer, WeTransfer, etc.',
      icon: <LinkIcon className="h-5 w-5" />
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      description: 'Enviar ficheiros via WhatsApp',
      icon: <MessageCircle className="h-5 w-5" />
    },
    {
      id: 'later',
      title: 'Enviar Depois',
      description: 'Fazer pagamento agora, enviar ficheiros depois',
      icon: <Clock className="h-5 w-5" />
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

  const handleProceedToPayment = () => {
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

    // Here you would integrate with your payment system
    toast({
      title: "Redireccionando para Pagamento",
      description: "Será redirecionado para a página de pagamento em breve...",
    });
  };

  const getSelectedPrice = () => {
    if (!selectedOption) return 0;
    const option = pricingOptions.find(p => p.id === selectedOption);
    return hasSubscription ? (option?.subscriptionPrice || 0) : (option?.originalPrice || 0);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pricingOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => setSelectedOption(option.id as '1project' | '2projects')}
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sem subscrição:</span>
                    <span className="font-medium">€{option.originalPrice}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Com subscrição:</span>
                    <span className="font-medium text-primary">€{option.subscriptionPrice}</span>
                  </div>
                  {option.savings && (
                    <Badge variant="secondary" className="text-xs">
                      Poupe €{option.savings}
                    </Badge>
                  )}
                  {option.note && (
                    <p className="text-xs text-muted-foreground">{option.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
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
        <Card className="mb-8">
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
            {deliveryMethod === 'upload' && (
              <div className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="file-upload">Seleccionar Ficheiros</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="mt-2"
                  />
                  {files && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {files.length} ficheiro(s) seleccionado(s)
                    </p>
                  )}
                </div>
              </div>
            )}

            {deliveryMethod === 'link' && (
              <div className="mt-6">
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

            {deliveryMethod === 'whatsapp' && (
              <div className="mt-6">
                <Button 
                  onClick={handleWhatsAppSend}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Abrir WhatsApp
                </Button>
              </div>
            )}

            {deliveryMethod === 'later' && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Envio Pendente</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Pode fazer o pagamento agora e enviar os ficheiros depois. 
                      Receberá instruções por email após o pagamento.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {deliveryMethod && (
              <div className="mt-6">
                <Label htmlFor="project-notes">Notas do Projecto (Opcional)</Label>
                <Textarea
                  id="project-notes"
                  placeholder="Descreve o que pretendes para o teu projecto, referências, estilo, etc."
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

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleProceedToPayment}
                  className="flex-1"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pagar Agora
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleProceedToPayment}
                >
                  Pagar Depois
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MixMaster;