import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<MixMasterProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
      return;
    }
    loadProjects();
  }, [isAdmin, navigate]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      // @ts-ignore - RPC exists in DB but types not yet regenerated
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
      rejected: { label: 'Rejeitado', variant: 'destructive' as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/dashboard')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Projetos Mix & Master</h1>
          <p className="text-muted-foreground">Todas as reservas de Mix & Master dos clientes</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reservas ({projects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Sem projetos Mix & Master</p>
              <p className="text-sm">Quando os clientes fizerem reservas, aparecerão aqui</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Data Criação</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Link Transferência</TableHead>
                    <TableHead>Notas</TableHead>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(project.transfer_link!, '_blank')}
                            className="gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Ver Link
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sem link</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {project.note ? (
                          <div className="text-sm truncate" title={project.note}>
                            {project.note}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sem notas</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProjects;
