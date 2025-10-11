import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ArrowLeft, FileAudio, ExternalLink, StickyNote, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
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

interface MixMasterProject {
  id: string;
  client_id: string;
  client_name: string;
  created_at: string;
  transfer_link: string | null;
  note: string | null;
  service_name: string;
  amount_eur: number;
  status: string;
}

const AdminProjects = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<MixMasterProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
      return;
    }
    loadProjects();

    // Subscribe to real-time updates for payment_requests
    const channel = supabase
      .channel('mixmaster-projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_requests',
          filter: 'type=eq.reservation'
        },
        () => {
          console.log('Novo projeto Mix & Master, atualizando lista');
          loadProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, navigate]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      // @ts-ignore - RPC exists in DB
      const { data, error } = await supabase.rpc('get_mixmaster_projects');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading Mix & Master projects:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os projetos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', variant: 'secondary' as const },
      confirmed: { label: 'Confirmado', variant: 'default' as const },
      approved: { label: 'Aprovado', variant: 'default' as const },
      rejected: { label: 'Rejeitado', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      // @ts-ignore - RPC exists in DB
      const { error } = await supabase.rpc('admin_hide_project', {
        p_project_id: projectToDelete,
        p_project_type: 'mixmaster'
      });

      if (error) throw error;

      toast({
        title: 'Projeto Removido',
        description: 'O projeto foi removido do teu dashboard.',
      });

      loadProjects();
    } catch (error) {
      console.error('Error hiding project:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o projeto',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Projetos Mix & Master</h1>
          <p className="text-muted-foreground">
            Todas as reservas de Mix & Master dos clientes
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="h-5 w-5" />
            Reservas de Mix & Master
          </CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileAudio className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Sem projetos de Mix & Master</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Link de Transferência</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        {project.client_name || 'Sem Nome'}
                      </TableCell>
                      <TableCell>{project.service_name}</TableCell>
                      <TableCell>
                        {format(new Date(project.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>€{project.amount_eur.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell>
                        {project.transfer_link ? (
                          <a
                            href={project.transfer_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Ver Link
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Sem link</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {project.note ? (
                          <div className="flex items-start gap-2">
                            <StickyNote className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                            <span className="text-sm">{project.note}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sem notas</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setProjectToDelete(project.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Projeto do Dashboard?</AlertDialogTitle>
            <AlertDialogDescription>
              O projeto será removido apenas do teu dashboard. O cliente continuará a vê-lo e a receita mensal não será afetada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminProjects;
