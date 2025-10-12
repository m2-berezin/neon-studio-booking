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
  is_mixmaster?: boolean;
  transfer_link?: string;
  note?: string;
  is_booking?: boolean;
}

export const useProjects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (user) {
      loadProjects();
      
      // Setup realtime subscription for bookings
      const bookingsChannel = supabase
        .channel('bookings-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('[PROJECTS] Booking changed, reloading...', payload);
            loadProjects();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(bookingsChannel);
      };
    }
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load regular bookings (excluding Mix & Master and hidden from client)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .eq('hidden_from_client', false)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;
      
      // Load Mix & Master projects
      // @ts-ignore - RPC exists in DB
      const { data: mixmasterData, error: mixmasterError } = await supabase
        .rpc('get_client_mixmaster_projects', { p_user_id: user.id });

      if (mixmasterError) throw mixmasterError;
      
      // Map bookings to projects format, filtering out Mix & Master bookings
      const bookingProjects: Project[] = (bookingsData || [])
        .filter((booking: any) => {
          const serviceName = booking.service_name_snapshot || '';
          return !serviceName.toLowerCase().includes('mix') && !serviceName.toLowerCase().includes('master');
        })
        .map((booking: any) => ({
        id: booking.id,
        title: booking.service_name_snapshot || 'Sessão de Estúdio',
        description: 'Reserva Confirmada',
        address: 'Rua Abade Correia da Serra 20A, 2865-207 Fernão Ferro',
        date_day: booking.starts_at,
        start_time: booking.starts_at,
        end_time: booking.ends_at,
        status: booking.status,
        user_id: booking.user_id,
        created_at: booking.created_at,
        is_mixmaster: false,
      }));
      
      // Map mixmaster projects (both pending requests and confirmed bookings)
      const mixProjects: Project[] = (mixmasterData || []).map((mix: any) => ({
        id: mix.id,
        title: mix.service_name || 'Mix & Master',
        description: mix.is_booking ? 'Reserva Confirmada' : (mix.note || ''),
        address: mix.is_booking ? 'Rua Abade Correia da Serra 20A, 2865-207 Fernão Ferro' : '',
        date_day: mix.starts_at || mix.created_at,
        start_time: mix.starts_at || mix.created_at,
        end_time: mix.ends_at || mix.created_at,
        status: mix.status,
        user_id: user.id,
        created_at: mix.created_at,
        is_mixmaster: true,
        is_booking: mix.is_booking,
        transfer_link: mix.transfer_link,
        note: mix.note,
      }));
      
      // Combine and sort by created_at
      const allProjects = [...bookingProjects, ...mixProjects].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setProjects(allProjects);
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

  const deleteProject = async (projectId: string) => {
    try {
      // @ts-ignore - RPC exists in DB
      const { error } = await supabase.rpc('client_delete_project', {
        p_booking_id: projectId
      });

      if (error) throw error;

      toast({
        title: 'Projeto Removido',
        description: 'O projeto foi removido da tua lista.',
      });

      // Reload projects
      await loadProjects();
      return true;
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível eliminar o projeto',
        variant: 'destructive',
      });
      return false;
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
    deleteProject,
  };
};
