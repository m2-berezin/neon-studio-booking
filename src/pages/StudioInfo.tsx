import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MapPin, Clock, Phone, MessageCircle, ExternalLink, AlertTriangle, CheckCircle, Calendar, Music, Headphones, Mic, Settings, ArrowLeft, Instagram, Mail } from 'lucide-react';
import StudioGallery from '@/components/StudioGallery';

const StudioInfo = () => {
  const navigate = useNavigate();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  
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
  }, {
    icon: <Headphones className="h-5 w-5" />,
    title: "Acompanhamento",
    description: "Apenas são permitidas mais 3 pessoas no estúdio para além do artista."
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
                  Morada exata será disponibilizada após pagamento da sessão
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
                  <p className="text-xs text-muted-foreground">Reagendamento sem custos extras ou reembolso total</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Menos de 3 Dias</p>
                  <p className="text-xs text-muted-foreground">O valor do sinal não é reembolsável. Reagendamento sob consulta. Contacta o Ghost pelo chat da app.</p>
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
                Em caso de emergências contacta imediatamente. Consideração caso a caso.
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


      {/* Footer Links */}
      <div className="mt-12 pb-6 text-center border-t pt-6">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <button 
            onClick={() => setAboutOpen(true)}
            className="hover:text-foreground transition-colors hover:underline"
          >
            Sobre
          </button>
          <span>/</span>
          <button 
            onClick={() => setFaqOpen(true)}
            className="hover:text-foreground transition-colors hover:underline"
          >
            FAQ's
          </button>
          <span>/</span>
          <button 
            onClick={() => setContactOpen(true)}
            className="hover:text-foreground transition-colors hover:underline"
          >
            Contactos
          </button>
        </div>
      </div>

      {/* Sobre Dialog */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sobre 7T7Studios</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-foreground leading-relaxed">
              7T7Studios foi criada por <span className="font-semibold">Ghost Wayne</span>. Um rapper, produtor, 
              engenheiro de som, compositor, que dedicou a sua vida a aperfeiçoar a sua arte.
            </p>
            <p className="text-foreground leading-relaxed">
              Agora com o seu espaço, permite-nos criar a nossa música, e dispõe do seu conhecimento 
              adquirido ao longo do seu trajeto profissional/pessoal, para nos ajudar a alcançar os nossos objetivos.
            </p>
            <p className="text-foreground leading-relaxed">
              Sabe mais sobre Ghost Wayne e segue nas redes sociais <span className="font-semibold">@ghostwayne_</span>
            </p>
            <div className="pt-2">
              <Button 
                onClick={() => window.open('https://www.instagram.com/ghostwayne_', '_blank')}
                className="gap-2"
              >
                <Instagram className="h-4 w-4" />
                Seguir @ghostwayne_
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAQ's Dialog */}
      <Dialog open={faqOpen} onOpenChange={setFaqOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>FAQ's</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left text-[0.938rem]">Fiz uma reserva, e agora?</AccordionTrigger>
                <AccordionContent>
                  Todas as reservas dependem da confirmação de pagamento. Na tua tab Projetos, tens informação sobre as sessões confirmadas, e as sessões que aguardam confirmação. Serás notificado quando a sessão for aceite/recusada pelo Ghost.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left text-[0.938rem]">A minha sessão foi recusada, porquê?</AccordionTrigger>
                <AccordionContent>
                  Se a tua sessão foi recusada não foi um erro. Experimenta marcar para outra hora nesse dia, ou até mesmo, um outro dia. Se o problema persistir, contacta o Ghost pelo chat da app!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left text-[0.938rem]">A reserva foi recusada mas eu já paguei o sinal, e agora?</AccordionTrigger>
                <AccordionContent>
                  Experimenta marcar para outro dia/hora, clica em já paguei (pois o valor do sinal já está pago), e aguarda confirmação. Caso não tenciones reagendar, envia mensagem ao Ghost pelo chat da app a pedir o reembolso.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left text-[0.938rem]">Métodos de Pagamento?</AccordionTrigger>
                <AccordionContent>
                  Para pagamento do sinal aceitamos pagamentos através de: MB WAY / Revolut / Transferência bancária. Paypal / Crypto também são aceites, envia mensagem ao Ghost no chat da app. O valor restante é pago no dia da sessão, preferencialmente a dinheiro. Caso não seja possível, utiliza um dos métodos anteriores.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left text-[0.938rem]">Enviei o meu projeto para Mix&Master e esqueci me de uns ficheiros, e agora?</AccordionTrigger>
                <AccordionContent>
                  Envia mensagem no chat da app ao Ghost a explicar o sucedido. Envia juntamente o link para download com o que faltava.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger className="text-left text-[0.938rem]">Pretendo gravar um Cover, o valor é o mesmo?</AccordionTrigger>
                <AccordionContent>
                  Para covers, marca sessão apenas para Captação, com o número de horas que achares necessário. Dependendo do conceito/duração do cover, o valor da Mix&Master é ajustado. (em média ronda os 20€)
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7">
                <AccordionTrigger className="text-left text-[0.938rem]">Posso levar guitarra para gravar e cantar por cima?</AccordionTrigger>
                <AccordionContent>
                  Sim podes, reserva a tua sessão e após confirmação envia mensagem ao Ghost no chat da app a falar um pouco sobre o teu projeto para ele ter tudo pronto para quando chegares! Atenção: o estúdio dispõe apenas de interface de áudio, não tem amplificador/pedais. Nestes casos, são utilizados plugins para emular os efeitos pretendidos.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8">
                <AccordionTrigger className="text-left text-[0.938rem]">Somos 2 pessoas no projeto, o valor é o mesmo?</AccordionTrigger>
                <AccordionContent>
                  Sim, o valor é igual. Atenção ao número de horas de captação, analisem se 3h para 2 pessoas é suficiente. Caso precisem de mais, reservem apenas sessão de Captação com o número de horas pretendidas, e depois a Mix&Master é cobrada à parte (40€).
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-9">
                <AccordionTrigger className="text-left text-[0.938rem]">Posso levar videomaker para fazer um vlog? / Posso fazer videoclip no estúdio?</AccordionTrigger>
                <AccordionContent>
                  Sim, dependendo do conceito e número de pessoas, podes agendar uma "sessão" com esse objetivo. Envia mensagem ao Ghost no chat da app ANTES DE RESERVAR A SESSÂO para falarem sobre os detalhes.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contactos Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contactos</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                WhatsApp
              </h4>
              <p className="text-muted-foreground mb-3 text-sm">
                Contacta diretamente via WhatsApp <strong>caso haja algum problema com o chat da app</strong>.
              </p>
              <Button 
                onClick={() => window.open(whatsappLink, '_blank')}
                className="border-green-600 text-green-600 hover:bg-green-50"
                variant="outline"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Abrir WhatsApp
              </Button>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email
              </h4>
              <p className="text-muted-foreground mb-3 text-sm">
                Envia um email para questões mais detalhadas.
              </p>
              <a 
                href="mailto:ghostwayne777@hotmail.com"
                className="text-primary hover:underline font-medium"
              >
                ghostwayne777@hotmail.com
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default StudioInfo;