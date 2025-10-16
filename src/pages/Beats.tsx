import React, { useState } from 'react';
import { Music, MessageCircle, Upload, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useBeats } from '@/hooks/useBeats';

const Beats = () => {
  const { user } = useAuth();
  const { loading, uploading, startBeatConversation, generateWhatsAppLink } = useBeats();
  
  const [selectedBeat, setSelectedBeat] = useState<string>('');
  const [message, setMessage] = useState('');
  const [referenceLinks, setReferenceLinks] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Sessão Requerida</h2>
        <p className="text-muted-foreground">Por favor faz login para ver os beats exclusivos.</p>
      </div>
    );
  }

  // Beat package data - single option
  const beatPackage = {
    id: 'beat-exclusivo',
    name: 'Beat Exclusivo',
    description: 'um beat único ao teu estilo',
    price: 100,
    paymentTerms: [
      '30% como sinal para começar o trabalho',
      '70% antes do envio do produto final'
    ]
  };


  const handlePurchaseClick = () => {
    setSelectedBeat(beatPackage.name);
    setMessage('Yooo Ghost, queria comprar um beat exclusivo. Podemos falar?');
    setDialogOpen(true);
  };

  const whatsAppMessage = referenceLinks 
    ? `${message}\n\nLinks de referência:\n${referenceLinks}`
    : message;
  
  const whatsAppLink = generateWhatsAppLink(selectedBeat, whatsAppMessage);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold neon-title mb-2">
          Beats Exclusivos
        </h1>
      </div>

      {/* Single Beat Package Card */}
      <div className="max-w-2xl mx-auto mb-8">
        <Card className="studio-card">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Music className="w-6 h-6 text-primary" />
              {beatPackage.name}
            </CardTitle>
            <CardDescription className="text-lg">Beats personalizados premium criados exclusivamente para ti</CardDescription>
            
            <div className="pt-6">
              <span className="text-5xl font-bold text-primary">{beatPackage.price}€</span>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-semibold mb-3 text-foreground">
                Condições de Pagamento:
              </p>
              <ul className="space-y-2">
                {beatPackage.paymentTerms.map((term, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <Button 
              className="w-full" 
              onClick={handlePurchaseClick}
              size="lg"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Conversar para Comprar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mb-3">
              <Label className="text-sm font-medium">Pacote Selecionado</Label>
              <p className="text-sm text-muted-foreground">{selectedBeat}</p>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            
            <div>
              <Label htmlFor="message" className="text-sm font-medium">
                A Tua Mensagem
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Yooo Ghost, queria comprar um beat exclusivo. Podemos falar?"
                className="mt-1"
                rows={4}
              />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold">Contactar para Compra</h3>
              <p className="text-sm text-muted-foreground">
                Antes de enviares uma mensagem ao Ghost pelo WhatsApp, preenche abaixo:
              </p>
            </div>
            
            {/* Reference Links */}
            <div>
              <Label htmlFor="reference-links" className="text-sm font-medium">
                Links de Referência (Opcional)
              </Label>
              <Textarea
                id="reference-links"
                value={referenceLinks}
                onChange={(e) => setReferenceLinks(e.target.value)}
                placeholder="Cola aqui 1/2 links de sons para referência do beat que estás à procura."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              asChild
              className="w-full"
              disabled={!message.trim()}
            >
              <a href={whatsAppLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Conversar no WhatsApp
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          Todos os beats incluem direitos exclusivos completos e mistura profissional.
          <span className="block mt-1">
            Manda mensagem para pacotes personalizados ou descontos por volume.
          </span>
        </p>
      </div>
    </div>
  );
};

export default Beats;