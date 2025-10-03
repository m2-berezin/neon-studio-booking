import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProjectFile {
  id: string;
  project_id: string;
  kind: string;
  url: string;
  duration_seconds?: number;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  description?: string;
  address: string;
  date_day: string;
  start_time: string;
  end_time: string;
  status: string;
  user_id: string;
  created_at: string;
}

export const useProjects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map bookings to projects format
      const mappedProjects: Project[] = (data || []).map((booking: any) => ({
        id: booking.id,
        title: booking.service_name_snapshot || 'Sessão de Estúdio',
        description: `Reserva confirmada - ${booking.currency_snapshot || 'EUR'} ${booking.price_eur_snapshot || ''}`,
        address: 'Rua do Estúdio 123, Lisboa',
        date_day: booking.starts_at,
        start_time: booking.starts_at,
        end_time: booking.ends_at,
        status: booking.status,
        user_id: booking.user_id,
        created_at: booking.created_at,
      }));
      
      setProjects(mappedProjects);
    } catch (error: any) {
      console.error('Error loading projects:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as sessões',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Stub methods for compatibility with ProjectDetail
  const currentProject = null;
  const uploading = false;
  const loadProject = async (projectId: string) => {};
  const uploadProjectFile = async (projectId: string, file: File) => null;
  const markAsDelivered = async (projectId: string) => false;

  return {
    loading,
    uploading,
    projects,
    currentProject,
    loadProjects,
    loadProject,
    uploadProjectFile,
    markAsDelivered,
  };
};
