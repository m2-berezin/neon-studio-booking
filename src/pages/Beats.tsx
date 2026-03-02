import React, { useState } from 'react';
import { Music, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useBeats } from '@/hooks/useBeats';
import { formatPrice } from '@/lib/utils';

const Beats = () => {
  const { user } = useAuth();
  const { loading, uploading, startBeatConversation, generateWhatsAppLink } = useBeats();
  
  const [selectedBeat, setSelectedBeat] = useState('');
  const [message, setMessage] = useState('');
  const [referenceLinks, setReferenceLinks] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-lg font-bold text-foreground mb-2">Sessão Requerida</h2>
        <p className="text-sm text-muted-foreground">Por favor faz login para ver os beats exclusivos.</p>
      </div>
    );
  }

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
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold neon-title mb-1">Beats Exclusivos</h1>
      </div>

      <div className="max-w-lg mx-auto">
        <Card className="studio-card">
          <CardHeader className="p-4 pb-2 text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-lg">
              <Music className="w-4 h-4 text-primary" />
              {beatPackage.name}
            </CardTitle>
            <CardDescription className="text-sm">Beats personalizados premium criados exclusivamente para ti</CardDescription>
            <div className="pt-3">
              <span className="text-3xl font-bold text-primary">{formatPrice(beatPackage.price)}</span>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-xs font-semibold mb-2 text-foreground">Condições de Pagamento:</p>
              <ul className="space-y-1">
                {beatPackage.paymentTerms.map((term, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <Button className="w-full" onClick={handlePurchaseClick} size="sm">
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              Conversar para Comprar
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mb-2">
              <Label className="text-xs font-medium">Pacote Selecionado</Label>
              <p className="text-xs text-muted-foreground">{selectedBeat}</p>
            </div>
          </DialogHeader>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="message" className="text-xs font-medium">A Tua Mensagem</Label>
              <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Yooo Ghost, queria comprar um beat exclusivo." className="mt-1 text-xs" rows={3} />
            </div>
            
            <div>
              <h3 className="text-sm font-semibold">Contactar para Compra</h3>
              <p className="text-xs text-muted-foreground">Preenche antes de enviar mensagem ao Ghost:</p>
            </div>
            
            <div>
              <Label htmlFor="reference-links" className="text-xs font-medium">Links de Referência (Opcional)</Label>
              <Textarea id="reference-links" value={referenceLinks} onChange={(e) => setReferenceLinks(e.target.value)}
                placeholder="Cola 1/2 links de referência." className="mt-1 text-xs" rows={2} />
            </div>
          </div>
          
          <DialogFooter>
            <Button asChild className="w-full" size="sm" disabled={!message.trim()}>
              <a href={whatsAppLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Conversar no WhatsApp
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="text-center py-2">
        <p className="text-xs text-muted-foreground">
          Todos os beats incluem direitos exclusivos e mistura profissional.
        </p>
      </div>
    </div>
  );
};

export default Beats;
