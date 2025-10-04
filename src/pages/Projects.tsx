import React from 'react';
import { Folder, Clock, CheckCircle, FileText, Music, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const Projects = () => {
  const { user } = useAuth();
  const { loading, projects } = useProjects();

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Sessão Requerida</h2>
        <p className="text-muted-foreground">Por favor faz login para ver os teus projetos.</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy');
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return format(date, 'HH:mm');
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold neon-title mb-2">
          As Minhas Sessões
        </h1>
        <p className="text-muted-foreground">
          Sessões confirmadas no estúdio
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">A carregar sessões...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-8">
          <Folder className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma sessão confirmada</h3>
          <p className="text-muted-foreground">
            Faz uma reserva para começar!
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="studio-card hover:shadow-lg transition-all"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  {project.title}
                </CardTitle>
                {project.description && (
                  <CardDescription className="text-sm">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <Folder className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors underline"
                    >
                      {project.address}
                    </a>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-foreground">
                      {formatDate(project.date_day)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground">
                      {formatTime(project.start_time)} - {formatTime(project.end_time)}
                    </span>
                  </div>

                  <Badge variant="outline" className="text-xs mt-2">
                    {project.status === 'confirmed' ? 'Confirmada' : project.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;