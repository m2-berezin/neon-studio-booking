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
        <h2 className="text-2xl font-bold text-foreground mb-4">Login Required</h2>
        <p className="text-muted-foreground">Please login to view exclusive beats.</p>
      </div>
    );
  }

  const beatPackages = [
    {
      id: 'single-beat',
      name: 'Single Exclusive Beat',
      description: 'One custom beat tailored to your style',
      price: 150,
      features: [
        'Custom production',
        'Full exclusive rights',
        'WAV + MP3 stems',
        '2 revisions included',
        '48-hour delivery'
      ]
    },
    {
      id: 'beat-pack-3',
      name: '3-Beat Pack',
      description: 'Three exclusive beats with cohesive sound',
      price: 400,
      originalPrice: 450,
      features: [
        'Three custom beats',
        'Full exclusive rights',
        'WAV + MP3 stems',
        '3 revisions per beat',
        '1 week delivery',
        'Bonus: Instrumental variations'
      ],
      popular: true
    },
    {
      id: 'beat-pack-5',
      name: '5-Beat Album Pack',
      description: 'Complete album package with professional mixing',
      price: 650,
      originalPrice: 750,
      features: [
        'Five exclusive beats',
        'Professional mixing',
        'All stems + MIDI files',
        'Unlimited revisions',
        '2 week delivery',
        'Bonus: Acapella versions',
        'Priority support'
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
    setMessage(`I'm interested in the ${beatPackage.name}. Please let me know the next steps for purchase.`);
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
        <h1 className="text-3xl font-bold text-accent accent-glow mb-2">
          Exclusive Beats
        </h1>
        <p className="text-muted-foreground">
          Premium custom beats crafted exclusively for you
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
                Most Popular
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
                    Save €{beatPackage.originalPrice - beatPackage.price}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-2 mb-6">
                {beatPackage.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Music className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full" 
                onClick={() => handlePurchaseClick(beatPackage)}
                variant={beatPackage.popular ? 'default' : 'outline'}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat to Purchase
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Purchase Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contact for Purchase</DialogTitle>
            <DialogDescription>
              Send a message to our team or chat via WhatsApp
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Selected Package</Label>
              <p className="text-sm text-muted-foreground">{selectedBeat}</p>
            </div>
            
            <div>
              <Label htmlFor="message" className="text-sm font-medium">
                Your Message
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us about your project, style preferences, or any specific requirements..."
                className="mt-1"
                rows={4}
              />
            </div>
            
            {/* File Upload */}
            <div>
              <Label className="text-sm font-medium">Reference Files (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Upload audio references to help us understand your style
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
                  {uploading ? 'Uploading...' : 'Add Reference Files'}
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
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
            
            <Button
              variant="outline"
              asChild
              className="w-full"
            >
              <a href={whatsAppLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Chat on WhatsApp
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Section */}
      <Card className="studio-card bg-gradient-to-br from-primary/10 to-accent/10">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold text-foreground">Why Choose Our Exclusive Beats?</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <Music className="w-6 h-6 text-primary mx-auto" />
                <h4 className="font-medium text-foreground">100% Original</h4>
                <p className="text-muted-foreground">Every beat is crafted from scratch exclusively for you</p>
              </div>
              <div className="space-y-2">
                <MessageCircle className="w-6 h-6 text-primary mx-auto" />
                <h4 className="font-medium text-foreground">Direct Collaboration</h4>
                <p className="text-muted-foreground">Work directly with our producers throughout the process</p>
              </div>
              <div className="space-y-2">
                <Upload className="w-6 h-6 text-primary mx-auto" />
                <h4 className="font-medium text-foreground">Full Rights</h4>
                <p className="text-muted-foreground">Complete exclusive ownership and commercial rights</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          All beats come with full exclusive rights and professional mixing.
          <span className="block mt-1">
            Contact us for custom packages or bulk discounts.
          </span>
        </p>
      </div>
    </div>
  );
};

export default Beats;