import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Clock, Phone, MessageCircle, ExternalLink, AlertTriangle, CheckCircle, Calendar, Music, Headphones, Mic, Settings, ArrowLeft } from 'lucide-react';
import StudioGallery from '@/components/StudioGallery';

const StudioInfo = () => {
  const navigate = useNavigate();
  
  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const whatsappNumber = "+351934941263";
  const studioLocation = "Pinhal do General, Seixal";
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=Boas, estou com problemas na app, podes ajudar me?`;
  const houseRules = [{
    icon: <Clock className="h-5 w-5" />,
    title: "Pontualidade",
    description: "Chega a horas. Atrasos podem resultar em sessões encurtadas."
  }, {
    icon: <Music className="h-5 w-5" />,
    title: "Respeita o Equipamento",
    description: "Manuseia todo o equipamento com cuidado. Reporta qualquer problema imediatamente."
  }, {
    icon: <Settings className="h-5 w-5" />,
    title: "PROIBIDO COMER",
    description: "Comida não é permitida no estúdio. É permitido fumar."
  }, {
    icon: <Phone className="h-5 w-5" />,
    title: "Etiqueta do Telemóvel",
    description: "Mantém os telemóveis em modo silencioso durante as sessões de gravação."
  }, {
    icon: <Mic className="h-5 w-5" />,
    title: "Conduta Profissional",
    description: "Mantém uma atmosfera profissional. Comportamento disruptivo não será tolerado."
  }];
  const prepChecklist = [{
    category: "Before You Arrive",
    items: ["Confirm your session time 24 hours in advance", "Prepare your tracks/stems in the requested format", "Bring reference tracks for mixing/mastering", "Write down specific notes or feedback for the engineer"]
  }, {
    category: "What to Bring",
    items: ["Valid ID for entry", "USB drive or external hard drive", "Your own headphones (optional but recommended)", "Lyric sheets or chord progressions", "Any specific plugins or software requirements"]
  }, {
    category: "Technical Prep",
    items: ["Ensure all files are properly labeled", "Audio files should be in 24-bit/48kHz or higher", "Remove any limiting or heavy compression from stems", "Organize tracks by instrument/element"]
  }];
  return <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate('/?tab=7')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
      
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold neon-title mb-2">
          Informações do Estúdio
        </h1>
        <p className="text-muted-foreground text-lg">
          Tudo o que precisas de saber
        </p>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Localização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-foreground font-medium mb-2">{studioLocation}</p>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  A morada exata será disponibilizada após pagamento da sessão
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-2">Horários do Estúdio</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Todos os dias:</span>
                  <span>10:00 - 22:00</span>
                </div>
              </div>
            </div>

            <Separator />

            <StudioGallery />

          </CardContent>
        </Card>

        {/* Cancellation Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Política de Cancelamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">3+ Dias de Antecedência</p>
                  <p className="text-xs text-muted-foreground">Reagendamento sem custos extras</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Menos de 3 Dias</p>
                  <p className="text-xs text-muted-foreground">O valor do sinal não é reembolsável</p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="font-medium text-blue-800 text-sm mb-1">Política de Reservas</h5>
                <p className="text-xs text-blue-700">
                  Sinal de 15€ obrigatório para reserva de sessão.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-2">Política de Não Comparência</h4>
              <p className="text-sm text-muted-foreground">Cancelamentos com menos de 72 horas de antecedência ou No-Show implicam a retenção do sinal (15€).</p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Situações de Emergência</h4>
              <p className="text-sm text-muted-foreground">
                Em caso de emergências contacta imediatamente. Consideração varia de caso a caso.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* House Rules */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Regras do Estúdio</CardTitle>
          <p className="text-sm text-muted-foreground">
            Segue estas regras para garantir um ambiente profissional e produtivo para todos.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {houseRules.map((rule, index) => <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="text-primary mt-1">
                  {rule.icon}
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">{rule.title}</h4>
                  <p className="text-xs text-muted-foreground">{rule.description}</p>
                </div>
              </div>)}
          </div>
        </CardContent>
      </Card>


      {/* Contact Footer */}
      <Card className="mt-8 border-primary/20 bg-primary/5">
        <CardContent className="p-6 text-center">
          <h3 className="font-semibold text-foreground mb-2">Dúvidas?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Algum problema? Entra em contacto comigo.
          </p>
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => window.open(whatsappLink, '_blank')} className="border-green-600 text-green-600 hover:bg-green-50">
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default StudioInfo;