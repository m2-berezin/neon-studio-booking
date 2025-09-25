import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Clock, 
  Phone, 
  MessageCircle, 
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Music,
  Headphones,
  Mic,
  Settings
} from 'lucide-react';

const StudioInfo = () => {
  const whatsappNumber = "+1234567890"; // Replace with actual studio WhatsApp number
  const studioAddress = "123 Studio Street, Music City, MC 12345";
  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studioAddress)}`;
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi! I'd like to inquire about studio sessions.`;

  const houseRules = [
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Punctuality",
      description: "Please arrive on time. Late arrivals may result in shortened sessions."
    },
    {
      icon: <Music className="h-5 w-5" />,
      title: "Respect the Equipment",
      description: "Handle all equipment with care. Report any issues immediately."
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: "NO FOOD",
      description: "Comida não é permitida no estúdio. É permitido fumar."
    },
    {
      icon: <Phone className="h-5 w-5" />,
      title: "Phone Etiquette",
      description: "Keep phones on silent mode during recording sessions."
    },
    {
      icon: <Headphones className="h-5 w-5" />,
      title: "Personal Items",
      description: "You're responsible for your personal belongings. We're not liable for lost items."
    },
    {
      icon: <Mic className="h-5 w-5" />,
      title: "Professional Conduct",
      description: "Maintain a professional atmosphere. Disruptive behavior will not be tolerated."
    }
  ];

  const prepChecklist = [
    {
      category: "Before You Arrive",
      items: [
        "Confirm your session time 24 hours in advance",
        "Prepare your tracks/stems in the requested format",
        "Bring reference tracks for mixing/mastering",
        "Write down specific notes or feedback for the engineer"
      ]
    },
    {
      category: "What to Bring",
      items: [
        "Valid ID for entry",
        "USB drive or external hard drive",
        "Your own headphones (optional but recommended)",
        "Lyric sheets or chord progressions",
        "Any specific plugins or software requirements"
      ]
    },
    {
      category: "Technical Prep",
      items: [
        "Ensure all files are properly labeled",
        "Audio files should be in 24-bit/48kHz or higher",
        "Remove any limiting or heavy compression from stems",
        "Organize tracks by instrument/element"
      ]
    }
  ];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Informações do Estúdio
        </h1>
        <p className="text-muted-foreground text-lg">
          Tudo o que precisa de saber para a sua sessão
        </p>
      </div>

      {/* Quick Contact */}
      <Card className="mb-8 border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">Precisa de Ajuda?</h3>
                <p className="text-sm text-muted-foreground">Obtenha suporte instantâneo via WhatsApp</p>
              </div>
            </div>
            <Button
              onClick={() => window.open(whatsappLink, '_blank')}
              className="bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Contactar Estúdio
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-foreground font-medium mb-2">{studioAddress}</p>
              <Button
                variant="outline"
                onClick={() => window.open(googleMapsLink, '_blank')}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Google Maps
              </Button>
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

            <div>
              <h4 className="font-medium mb-2">Parking</h4>
              <p className="text-sm text-muted-foreground">
                Free parking available in the studio lot. Street parking is also available with no time limits.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cancellation Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Cancellation Policy
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
                  <p className="text-xs text-muted-foreground">Não há devolução, cobrança de €15 como taxa</p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="font-medium text-blue-800 text-sm mb-1">Política de Reservas</h5>
                <p className="text-xs text-blue-700">
                  Não subscritores: Sinal de €15 obrigatório para reserva de sessão.<br/>
                  Subscritores: Sem necessidade de sinal.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-2">No-Show Policy</h4>
              <p className="text-sm text-muted-foreground">
                Missing your session without notice results in full payment forfeiture and a 3-month penalty period where rewards cannot be used.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Emergency Situations</h4>
              <p className="text-sm text-muted-foreground">
                We understand emergencies happen. Contact us immediately for case-by-case consideration.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* House Rules */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Studio House Rules</CardTitle>
          <p className="text-sm text-muted-foreground">
            Please follow these guidelines to ensure a professional and productive environment for everyone.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {houseRules.map((rule, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="text-primary mt-1">
                  {rule.icon}
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">{rule.title}</h4>
                  <p className="text-xs text-muted-foreground">{rule.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>


      {/* Contact Footer */}
      <Card className="mt-8 border-primary/20 bg-primary/5">
        <CardContent className="p-6 text-center">
          <h3 className="font-semibold text-foreground mb-2">Questions?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Don't see what you're looking for? Get in touch with us directly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => window.open(whatsappLink, '_blank')}
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`tel:${whatsappNumber}`, '_self')}
            >
              <Phone className="h-4 w-4 mr-2" />
              Call Studio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudioInfo;