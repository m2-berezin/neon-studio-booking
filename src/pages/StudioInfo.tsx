import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MapPin, Clock, MessageCircle, AlertTriangle, CheckCircle, Calendar, Mic, Headphones, Settings, ArrowLeft, Instagram, Mail } from 'lucide-react';
import StudioGallery from '@/components/StudioGallery';

const StudioInfo = () => {
  const navigate = useNavigate();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  
  useEffect(() => { window.scrollTo(0, 0); }, []);
  
  const whatsappNumber = "+351934941263";
  const studioLocation = "Quinta do Conde";
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=Boas, estou com problemas na app, podes ajudar me?`;

  const houseRules = [
    { icon: <Clock className="h-4 w-4" />, title: "Pontualidade", description: "Chega a horas. Atrasos podem resultar em sessões encurtadas." },
    { icon: <Settings className="h-4 w-4" />, title: "PROIBIDO COMER", description: "Comida não é permitida no estúdio. É permitido fumar." },
    { icon: <Mic className="h-4 w-4" />, title: "Conduta Profissional", description: "Mantém uma atmosfera profissional. Comportamento disruptivo não será tolerado." },
    { icon: <Headphones className="h-4 w-4" />, title: "Acompanhamento", description: "Apenas são permitidas mais 3 pessoas no estúdio para além do artista." },
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/?tab=7')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Location */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              Localização
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground mb-1.5">{studioLocation}</p>
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">Morada exata disponibilizada após pagamento</p>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium text-sm mb-1">Horários</h4>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Todos os dias:</span>
                <span>10:00 - 22:00</span>
              </div>
            </div>
            <Separator />
            <StudioGallery />
          </CardContent>
        </Card>

        {/* Cancellation Policy */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              Política de Cancelamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-xs">3+ Dias de Antecedência</p>
                  <p className="text-xs text-muted-foreground">Reagendamento sem custos extras ou reembolso total</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-xs">Menos de 3 Dias</p>
                  <p className="text-xs text-muted-foreground">Sinal não reembolsável. Reagendamento sob consulta.</p>
                </div>
              </div>
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-medium text-blue-800 text-xs mb-0.5">Política de Reservas</p>
                <p className="text-xs text-blue-700">Sinal de 15€ obrigatório para reserva de sessão.</p>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium text-xs mb-1">Política de Não Comparência</h4>
              <p className="text-xs text-muted-foreground">Cancelamentos &lt;72h ou No-Show implicam retenção do sinal (15€).</p>
            </div>
            <div>
              <h4 className="font-medium text-xs mb-1">Emergências</h4>
              <p className="text-xs text-muted-foreground">Contacta imediatamente. Consideração caso a caso.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* House Rules */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Regras do Estúdio</CardTitle>
          <p className="text-xs text-muted-foreground">Segue estas regras para um ambiente profissional.</p>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {houseRules.map((rule, index) => (
              <div key={index} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30">
                <div className="text-primary mt-0.5">{rule.icon}</div>
                <div>
                  <h4 className="font-medium text-xs mb-0.5">{rule.title}</h4>
                  <p className="text-xs text-muted-foreground">{rule.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer Links */}
      <div className="py-4 text-center border-t">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => setAboutOpen(true)} className="hover:text-foreground transition-colors hover:underline">Sobre</button>
          <span>/</span>
          <button onClick={() => setFaqOpen(true)} className="hover:text-foreground transition-colors hover:underline">FAQ's</button>
          <span>/</span>
          <button onClick={() => setContactOpen(true)} className="hover:text-foreground transition-colors hover:underline">Contactos</button>
        </div>
      </div>

      {/* Sobre Dialog */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base">Sobre 7T7Studios</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 text-sm text-foreground leading-relaxed">
            <p>7T7Studios foi criada por <span className="font-semibold">Ghost Wayne</span>. Um rapper, produtor, engenheiro de som, compositor, que dedicou a sua vida a aperfeiçoar a sua arte.</p>
            <p>Agora com o seu espaço, permite-nos criar a nossa música, e dispõe do seu conhecimento para nos ajudar a alcançar os nossos objetivos.</p>
            <p>Sabe mais sobre Ghost Wayne <span className="font-semibold">@ghostwayne_</span></p>
            <Button size="sm" onClick={() => window.open('https://www.instagram.com/ghostwayne_', '_blank')} className="gap-1.5">
              <Instagram className="h-3.5 w-3.5" />
              Seguir @ghostwayne_
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAQ's Dialog */}
      <Dialog open={faqOpen} onOpenChange={setFaqOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">FAQ's</DialogTitle></DialogHeader>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left text-xs">Fiz uma reserva, e agora?</AccordionTrigger>
              <AccordionContent className="text-xs">Todas as reservas dependem da confirmação de pagamento. Na tua tab Projetos, tens informação sobre as sessões. Serás notificado quando aceite/recusada.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left text-xs">A minha sessão foi recusada, porquê?</AccordionTrigger>
              <AccordionContent className="text-xs">Experimenta marcar para outra hora/dia. Se persistir, contacta o Ghost pelo chat da app!</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left text-xs">Reserva recusada mas já paguei o sinal?</AccordionTrigger>
              <AccordionContent className="text-xs">Reagenda e clica "já paguei". Caso não tenciones reagendar, pede reembolso pelo chat.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left text-xs">Métodos de Pagamento?</AccordionTrigger>
              <AccordionContent className="text-xs">MB WAY / Revolut / Transferência bancária. Paypal / Crypto via chat. Restante pago no dia, preferencialmente a dinheiro.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left text-xs">Esqueci ficheiros no Mix&Master?</AccordionTrigger>
              <AccordionContent className="text-xs">Envia mensagem no chat com o link do que faltava.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-6">
              <AccordionTrigger className="text-left text-xs">Gravar um Cover, valor é o mesmo?</AccordionTrigger>
              <AccordionContent className="text-xs">Marca apenas Captação. Mix&Master ajustada ao conceito (≈20€).</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-7">
              <AccordionTrigger className="text-left text-xs">Posso levar guitarra?</AccordionTrigger>
              <AccordionContent className="text-xs">Sim! Envia mensagem ao Ghost após confirmação. O estúdio usa plugins para efeitos.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-8">
              <AccordionTrigger className="text-left text-xs">Somos 2 pessoas, valor é o mesmo?</AccordionTrigger>
              <AccordionContent className="text-xs">Sim. Avaliem se 3h para 2 é suficiente. Senão, reservem mais horas e Mix&Master à parte (40€).</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-9">
              <AccordionTrigger className="text-left text-xs">Posso levar videomaker/fazer videoclip?</AccordionTrigger>
              <AccordionContent className="text-xs">Sim, dependendo do conceito. Envia mensagem ao Ghost ANTES de reservar.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </DialogContent>
      </Dialog>

      {/* Contactos Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base">Contactos</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <h4 className="font-semibold text-sm text-foreground mb-1.5 flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp
              </h4>
              <p className="text-xs text-muted-foreground mb-2">Contacta via WhatsApp caso haja problema com o chat.</p>
              <Button size="sm" onClick={() => window.open(whatsappLink, '_blank')} className="border-green-600 text-green-600 hover:bg-green-50" variant="outline">
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Abrir WhatsApp
              </Button>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm text-foreground mb-1.5 flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-primary" /> Email
              </h4>
              <a href="mailto:ghostwayne777@hotmail.com" className="text-xs text-primary hover:underline font-medium">ghostwayne777@hotmail.com</a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudioInfo;
