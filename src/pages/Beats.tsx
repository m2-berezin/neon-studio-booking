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
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Sessão Requerida</h2>
        <p className="text-muted-foreground">Por favor faça login para ver os beats exclusivos.</p>
      </div>
    );
  }

  const beatPackages = [
    {
      id: 'single-beat',
      name: 'Beat Exclusivo Individual',
      description: 'Um beat personalizado ao teu estilo',
      price: 150,
      features: [
        'Produção personalizada',
        'Direitos exclusivos totais',
        'Stems WAV + MP3',
        '2 revisões incluídas',
        'Entrega em 48 horas'
      ]
    },
    {
      id: 'beat-pack-3',
      name: 'Pack de 3 Beats',
      description: 'Três beats exclusivos com som coeso',
      price: 400,
      originalPrice: 450,
      features: [
        'Três beats personalizados',
        'Direitos exclusivos totais',
        'Stems WAV + MP3',
        '3 revisões por beat',
        'Entrega em 1 semana',
        'Bónus: Variações instrumentais'
      ],
      popular: true
    },
    {
      id: 'beat-pack-5',
      name: 'Pack de Álbum 5 Beats',
      description: 'Pacote completo de álbum com mistura profissional',
      price: 650,
      originalPrice: 750,
      features: [
        'Cinco beats exclusivos',
        'Mistura profissional',
        'Todos os stems + ficheiros MIDI',
        'Revisões ilimitadas',
        'Entrega em 2 semanas',
        'Bónus: Versões acapella',
        'Suporte prioritário'
      ]
    }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const audioFiles = files.filter(file => 
      file.type.startsWith('audio/') || 
      file.name.toLowerCase().match(/\.(mp3|wav|m4a|aac|flac|ogg)$/i)
    );
    
    setReferenceFiles(prev => [...prev, ...audioFiles]);
  };

  const removeFile = (index: number) => {
    setReferenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handlePurchaseClick = (beatPackage: any) => {
    setSelectedBeat(beatPackage.name);
    setMessage(`Tenho interesse no ${beatPackage.name}. Por favor, indique-me os próximos passos para compra.`);
    setDialogOpen(true);
  };

  const handleSendMessage = async () => {
    const success = await startBeatConversation(selectedBeat, message, referenceFiles);
    if (success) {
      setDialogOpen(false);
      setMessage('');
      setReferenceFiles([]);
    }
  };

  const whatsAppLink = generateWhatsAppLink(selectedBeat, message);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold neon-title mb-2">
          Beats Exclusivos
        </h1>
        <p className="text-muted-foreground">
          Beats personalizados premium criados exclusivamente para ti
        </p>
      </div>

      {/* Pricing Table */}
      <div className="grid lg:grid-cols-3 gap-6">
        {beatPackages.map((beatPackage) => (
          <Card 
            key={beatPackage.id} 
            className={`studio-card relative ${beatPackage.popular ? 'border-primary' : ''}`}
          >
            {beatPackage.popular && (
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
                Mais Popular
              </Badge>
            )}
            
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Music className="w-5 h-5 text-primary" />
                {beatPackage.name}
              </CardTitle>
              <CardDescription>{beatPackage.description}</CardDescription>
              
              <div className="pt-4">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-bold text-primary">€{beatPackage.price}</span>
                  {beatPackage.originalPrice && (
                    <span className="text-lg text-muted-foreground line-through">
                      €{beatPackage.originalPrice}
                    </span>
                  )}
                </div>
                {beatPackage.originalPrice && (
                  <Badge variant="secondary" className="mt-2">
                    Poupa €{beatPackage.originalPrice - beatPackage.price}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Premium</span>
                          <span className="font-semibold text-primary">€{beatPackage.price}</span>
                        </div>
                        
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-xs text-yellow-800 mb-2">
                            <strong>Condições de Pagamento:</strong>
                          </p>
                          <p className="text-xs text-yellow-700">
                            • 30% como sinal para começar o trabalho<br/>
                            • 70% antes do envio do produto final
                          </p>
                        </div>
              
                <Button 
                  className="w-full" 
                  onClick={() => handlePurchaseClick(beatPackage)}
                  variant={beatPackage.popular ? 'default' : 'outline'}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Conversar para Comprar
                </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Purchase Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contactar para Compra</DialogTitle>
            <DialogDescription>
              Envia uma mensagem à nossa equipa ou conversa pelo WhatsApp
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Pacote Selecionado</Label>
              <p className="text-sm text-muted-foreground">{selectedBeat}</p>
            </div>
            
            <div>
              <Label htmlFor="message" className="text-sm font-medium">
                A Tua Mensagem
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Conta-nos sobre o teu projeto, preferências de estilo, ou requisitos específicos..."
                className="mt-1"
                rows={4}
              />
            </div>
            
            {/* File Upload */}
            <div>
              <Label className="text-sm font-medium">Ficheiros de Referência (Opcional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Carrega referências áudio para nos ajudar a entender o teu estilo
              </p>
              
              <div className="space-y-2">
                <input
                  type="file"
                  id="reference-files"
                  multiple
                  accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('reference-files')?.click()}
                  disabled={uploading}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'A carregar...' : 'Adicionar Ficheiros de Referência'}
                </Button>
                
                {referenceFiles.length > 0 && (
                  <div className="space-y-1">
                    {referenceFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-xs bg-secondary p-2 rounded">
                        <span className="truncate">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-auto p-0 ml-2"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-col space-y-2">
            <Button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="w-full"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              {loading ? 'A enviar...' : 'Enviar Mensagem'}
            </Button>
            
            <Button
              variant="outline"
              asChild
              className="w-full"
            >
              <a href={whatsAppLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 w-4 mr-2" />
                Conversar no WhatsApp
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Section */}
      <Card className="studio-card bg-gradient-to-br from-primary/10 to-accent/10">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold text-foreground">Porquê Escolher os Nossos Beats Exclusivos?</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <Music className="w-6 h-6 text-primary mx-auto" />
                <h4 className="font-medium text-foreground">100% Original</h4>
                <p className="text-muted-foreground">Cada beat é criado de raiz exclusivamente para ti</p>
              </div>
              <div className="space-y-2">
                <MessageCircle className="w-6 h-6 text-primary mx-auto" />
                <h4 className="font-medium text-foreground">Colaboração Direta</h4>
                <p className="text-muted-foreground">Trabalha diretamente com os nossos produtores durante todo o processo</p>
              </div>
              <div className="space-y-2">
                <Upload className="w-6 h-6 text-primary mx-auto" />
                <h4 className="font-medium text-foreground">Direitos Completos</h4>
                <p className="text-muted-foreground">Propriedade exclusiva completa e direitos comerciais</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          Todos os beats incluem direitos exclusivos completos e mistura profissional.
          <span className="block mt-1">
            Contacta-nos para pacotes personalizados ou descontos por volume.
          </span>
        </p>
      </div>
    </div>
  );
};

export default Beats;