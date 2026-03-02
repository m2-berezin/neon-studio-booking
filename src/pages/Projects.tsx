import React, { useState, useEffect } from 'react';
import { Folder, Clock, CheckCircle, FileAudio, ArrowLeft, CalendarClock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Projects = () => {
  const { user } = useAuth();
  const { loading, projects, pendingProjects, deleteProject } = useProjects();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  
  useEffect(() => { window.scrollTo(0, 0); }, []);

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-lg font-bold text-foreground mb-2">Sessão Requerida</h2>
        <p className="text-sm text-muted-foreground">Por favor faz login para ver os teus projetos.</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => format(new Date(dateString), 'dd/MM/yyyy');
  const formatTime = (timeString: string) => format(new Date(timeString), 'HH:mm');
  const formatDateTime = (dateString: string) => format(new Date(dateString), 'dd/MM/yyyy HH:mm');

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    const success = await deleteProject(projectToDelete);
    if (success) { setDeleteDialogOpen(false); setProjectToDelete(null); }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = { confirmed: 'Confirmada', pending: 'Pendente', approved: 'Aprovada', rejected: 'Rejeitada' };
    return map[status] || status;
  };

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/?tab=7')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>
      
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold neon-title mb-1">As Minhas Sessões</h1>
        <p className="text-xs text-muted-foreground">Sessões confirmadas no estúdio</p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">A carregar sessões...</p>
        </div>
      ) : (
        <>
          {pendingProjects.length > 0 && (
            <div className="mb-4">
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" /> Aguardando Confirmação
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingProjects.map((project) => (
                  <Card key={project.id} className="studio-card border-yellow-500/30">
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="flex items-center gap-1.5 text-sm">
                        {project.is_mixmaster ? <FileAudio className="w-4 h-4 text-yellow-500" /> : <Clock className="w-4 h-4 text-yellow-500" />}
                        {project.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">{project.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-medium text-foreground">{formatDate(project.date_day)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-foreground">{formatTime(project.start_time)} - {formatTime(project.end_time)}</span>
                        </div>
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600 dark:text-yellow-400">Pendente</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {projects.length === 0 && pendingProjects.length === 0 ? (
            <div className="text-center py-8">
              <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">Nenhuma sessão</h3>
              <p className="text-xs text-muted-foreground">Faz uma reserva para começar!</p>
            </div>
          ) : projects.length > 0 ? (
            <>
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> Sessões Confirmadas
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {projects.map((project) => (
                  <Card key={project.id} className="studio-card">
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="flex items-center gap-1.5 text-sm">
                        {project.is_mixmaster ? <FileAudio className="w-4 h-4 text-primary" /> : <CheckCircle className="w-4 h-4 text-primary" />}
                        {project.title}
                      </CardTitle>
                      {project.description && <CardDescription className="text-xs">{project.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="space-y-1.5">
                        {project.address && (
                          <div className="flex items-start gap-1.5 text-xs">
                            <Folder className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <a href="https://maps.google.com/?q=Rua+Abade+Correia+da+Serra+20A,+2865-207+Fernão+Ferro" target="_blank" rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors underline">{project.address}</a>
                          </div>
                        )}
                        {project.is_mixmaster && !project.is_booking ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Enviado: {formatDateTime(project.created_at)}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 text-xs">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-medium text-foreground">{formatDate(project.date_day)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{formatTime(project.start_time)} - {formatTime(project.end_time)}</span>
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">{getStatusLabel(project.status)}</Badge>
                          <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="sm"
                              onClick={() => navigate('/messages', { state: { predefinedMessage: 'Ghost preciso de reagendar a sessão' } })}
                              className="h-7 px-1.5 text-xs gap-1">
                              <CalendarClock className="h-3 w-3" /> Reagendar
                            </Button>
                            <Button variant="ghost" size="icon"
                              onClick={() => { setProjectToDelete(project.id); setDeleteDialogOpen(true); }}
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
            <AlertDialogTitle className="text-base">Remover Projeto?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Tens a certeza que queres remover este projeto da tua lista?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Projects;
