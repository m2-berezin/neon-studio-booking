import React from 'react';
import { Folder, Clock, CheckCircle, FileText, Music, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const Projects = () => {
  const { user, isAdmin } = useAuth();
  const { loading, projects, getFileCounts } = useProjects();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Sessão Requerida</h2>
        <p className="text-muted-foreground">Por favor faz login para ver os teus projetos.</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
      case 'review':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'delivered':
        return 'bg-green-500/20 text-green-700 dark:text-green-300';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'Em Progresso';
      case 'review':
        return 'Em Revisão';
      case 'delivered':
        return 'Entregue';
      default:
        return status;
    }
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold neon-title mb-2">
          Os Meus Projetos
        </h1>
        <p className="text-muted-foreground">
          {isAdmin() ? 'Gerir todos os projetos do estúdio' : 'Acompanha os teus projetos de estúdio'}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">A carregar projetos...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-8">
          <Folder className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Ainda Sem Projetos</h3>
          <p className="text-muted-foreground">
            {isAdmin() ? 'Ainda não foram criados projetos.' : 'Faz uma reserva para começar o teu primeiro projeto!'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const fileCounts = getFileCounts(project.files || []);
            return (
              <Card
                key={project.id}
                className="studio-card cursor-pointer hover:shadow-lg transition-all"
                onClick={() => handleProjectClick(project.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Folder className="w-5 h-5 text-primary" />
                      {project.title}
                    </CardTitle>
                    <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </Badge>
                  </div>
                  {isAdmin() && project.client_profile && (
                    <CardDescription className="text-sm">
                      Cliente: {project.client_profile.full_name}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* File Badges */}
                    <div className="flex flex-wrap gap-2">
                      {['idea', 'stems', 'draft', 'final'].map((fileType) => (
                        <Badge
                          key={fileType}
                          variant={fileCounts[fileType] > 0 ? 'default' : 'outline'}
                          className="text-xs capitalize"
                        >
                          {React.createElement(
                            fileType === 'idea' ? FileText : 
                            fileType === 'stems' ? Music : 
                            fileType === 'draft' ? Zap : CheckCircle,
                            { className: "w-3 h-3 mr-1" }
                          )}
                          {fileType} {fileCounts[fileType] > 0 && `(${fileCounts[fileType]})`}
                        </Badge>
                      ))}
                    </div>

                    {/* Last Update */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Atualizado {format(new Date(project.created_at), 'MMM d, yyyy')}</span>
                    </div>

                    {/* Progress Indicator */}
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500"
                        style={{
                          width: project.status === 'delivered' ? '100%' : 
                                 project.status === 'review' ? '75%' : '50%'
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Stats */}
      {projects.length > 0 && (
        <Card className="studio-card bg-gradient-to-br from-primary/10 to-accent/10">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {projects.filter(p => p.status === 'in_progress').length}
                </p>
                <p className="text-sm text-muted-foreground">Em Progresso</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">
                  {projects.filter(p => p.status === 'review').length}
                </p>
                <p className="text-sm text-muted-foreground">Em Revisão</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">
                  {projects.filter(p => p.status === 'delivered').length}
                </p>
                <p className="text-sm text-muted-foreground">Entregues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Projects;