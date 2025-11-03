import React, { useState, useEffect } from 'react';
import { Folder, Clock, CheckCircle, FileText, Music, Zap, Trash2, FileAudio, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Projects = () => {
  const { user } = useAuth();
  const { loading, projects, pendingProjects, deleteProject } = useProjects();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  
  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy HH:mm');
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    
    const success = await deleteProject(projectToDelete);
    if (success) {
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      confirmed: 'Confirmada',
      pending: 'Pendente',
      approved: 'Aprovada',
      rejected: 'Rejeitada',
    };
    return statusMap[status] || status;
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate('/?tab=7')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
      
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
      ) : (
        <>
          {/* Pending Projects Section */}
          {pendingProjects.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6 text-yellow-500" />
                Aguardando Confirmação
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="studio-card hover:shadow-lg transition-all relative border-yellow-500/30"
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {project.is_mixmaster ? (
                          <FileAudio className="w-5 h-5 text-yellow-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-500" />
                        )}
                        {project.title}
                      </CardTitle>
                      <CardDescription className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                        {project.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-3">
                        {project.address && (
                          <div className="flex items-start gap-2 text-sm">
                            <Folder className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <a 
                              href="https://maps.google.com/?q=Rua+Abade+Correia+da+Serra+20A,+2865-207+Fernão+Ferro"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors underline cursor-pointer"
                            >
                              {project.address}
                            </a>
                          </div>
                        )}

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

                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600 dark:text-yellow-400">
                            Pendente
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Confirmed Projects Section */}
          {projects.length === 0 && pendingProjects.length === 0 ? (
            <div className="text-center py-8">
              <Folder className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma sessão</h3>
              <p className="text-muted-foreground">
                Faz uma reserva para começar!
              </p>
            </div>
          ) : projects.length > 0 ? (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                Sessões Confirmadas
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
            <Card
              key={project.id}
              className="studio-card hover:shadow-lg transition-all relative"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {project.is_mixmaster ? (
                    <FileAudio className="w-5 h-5 text-primary" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
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
                  {project.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <Folder className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <a 
                        href="https://maps.google.com/?q=Rua+Abade+Correia+da+Serra+20A,+2865-207+Fernão+Ferro"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors underline cursor-pointer"
                      >
                        {project.address}
                      </a>
                    </div>
                  )}

                  {project.is_mixmaster && !project.is_booking ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground">
                        Enviado: {formatDateTime(project.created_at)}
                      </span>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}

                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {getStatusLabel(project.status)}
                    </Badge>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setProjectToDelete(project.id);
                        setDeleteDialogOpen(true);
                      }}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres remover este projeto da tua lista? O projeto continuará visível no dashboard do admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Projects;