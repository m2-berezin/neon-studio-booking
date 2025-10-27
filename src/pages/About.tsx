import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Instagram } from 'lucide-react';

const About = () => {
  const navigate = useNavigate();

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
          Sobre
        </h1>
        <p className="text-muted-foreground text-lg">
          Conhece a história por trás do 7T7Studios
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>7T7Studios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground leading-relaxed">
            7T7Studios foi criada por <span className="font-semibold">Ghost Wayne</span>. Um rapper, produtor, 
            engenheiro de som, compositor, que dedicou a sua vida a aperfeiçoar a sua arte.
          </p>
          <p className="text-foreground leading-relaxed">
            Agora com o seu espaço permite-nos criar a nossa música, e dispõe do seu conhecimento 
            adquirido, para nos ajudar a alcançar os nossos objetivos.
          </p>
          <p className="text-foreground leading-relaxed">
            Procura mais sobre Ghost Wayne e segue nas redes sociais <span className="font-semibold">@ghostwayne_</span>
          </p>

          <div className="pt-4">
            <Button 
              onClick={() => window.open('https://instagram.com/ghostwayne_', '_blank')}
              className="gap-2"
            >
              <Instagram className="h-4 w-4" />
              Seguir @ghostwayne_
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default About;
