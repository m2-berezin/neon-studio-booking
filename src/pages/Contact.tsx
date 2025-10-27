import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, Mail } from 'lucide-react';

const Contact = () => {
  const navigate = useNavigate();
  const whatsappNumber = "+351934941263";
  const email = "ghostwayne777@hotmail.com";
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=Olá, gostaria de entrar em contacto.`;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate('/studio-info')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
      
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold neon-title mb-2">
          Contactos
        </h1>
        <p className="text-muted-foreground text-lg">
          Entra em contacto connosco
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Contacta-nos diretamente via WhatsApp para respostas rápidas
            </p>
            <Button 
              onClick={() => window.open(whatsappLink, '_blank')}
              className="border-green-600 text-green-600 hover:bg-green-50"
              variant="outline"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Abrir WhatsApp
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Envia-nos um email para questões mais detalhadas
            </p>
            <a 
              href={`mailto:${email}`}
              className="text-primary hover:underline font-medium"
            >
              {email}
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Contact;
