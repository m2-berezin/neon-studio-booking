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
  booking_id: string;
  created_at: string;
  files?: ProjectFile[];
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
        .from('projects' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects((data as any) || []);
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
