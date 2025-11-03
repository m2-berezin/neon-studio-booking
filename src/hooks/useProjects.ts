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
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);

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
      
      // Load pending bookings (awaiting confirmation)
      const { data: pendingBookingsData, error: pendingBookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .eq('hidden_from_client', false)
        .order('created_at', { ascending: false });

      if (pendingBookingsError) throw pendingBookingsError;
      
      // Load pending reservations (awaiting payment approval)
      const { data: pendingReservationsData, error: pendingReservationsError } = await supabase
        .from('reservations')
        .select(`
          *,
          services (
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingReservationsError) throw pendingReservationsError;
      
      // Load Mix & Master projects
      // @ts-ignore - RPC exists in DB
      const { data: mixmasterData, error: mixmasterError } = await supabase
        .rpc('get_client_mixmaster_projects', { p_user_id: user.id });

      if (mixmasterError) throw mixmasterError;
      
      console.log('[PROJECTS] 🔍 Mix&Master data from RPC:', mixmasterData);
      
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
      const mixProjects: Project[] = (mixmasterData || []).map((mix: any) => {
        console.log('[PROJECTS] 🔍 Processing mix project:', {
          id: mix.id,
          service_name: mix.service_name,
          is_booking: mix.is_booking,
          starts_at: mix.starts_at,
          ends_at: mix.ends_at,
          status: mix.status
        });
        
        const hasCaptacao = (mix.service_name || '').toLowerCase().includes('capta');
        
        return {
          id: mix.id,
          title: mix.service_name || 'Mix & Master',
          description: mix.is_booking ? 'Reserva Confirmada' : (mix.note || ''),
          address: hasCaptacao ? 'Rua Abade Correia da Serra 20A, 2865-207 Fernão Ferro' : '',
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
        };
      });
      
      console.log('[PROJECTS] ✅ Mapped mix projects:', mixProjects.length);
      console.log('[PROJECTS] ✅ Mapped booking projects:', bookingProjects.length);
      
      // Map pending bookings
      const pendingBookingProjects: Project[] = (pendingBookingsData || [])
        .filter((booking: any) => {
          const serviceName = booking.service_name_snapshot || '';
          return !serviceName.toLowerCase().includes('mix') && !serviceName.toLowerCase().includes('master');
        })
        .map((booking: any) => ({
          id: booking.id,
          title: booking.service_name_snapshot || 'Sessão de Estúdio',
          description: 'Aguardando Confirmação',
          address: 'Rua Abade Correia da Serra 20A, 2865-207 Fernão Ferro',
          date_day: booking.starts_at,
          start_time: booking.starts_at,
          end_time: booking.ends_at,
          status: 'pending',
          user_id: booking.user_id,
          created_at: booking.created_at,
          is_mixmaster: false,
        }));
      
      // Map pending reservations  
      const pendingReservationProjects: Project[] = (pendingReservationsData || []).map((reservation: any) => {
        const serviceName = reservation.services?.name || 'Sessão de Estúdio';
        const hasCaptacao = serviceName.toLowerCase().includes('capta');
        const isMixMaster = serviceName.toLowerCase().includes('mix');
        
        return {
          id: reservation.id,
          title: serviceName,
          description: 'Aguardando Confirmação',
          address: hasCaptacao ? 'Rua Abade Correia da Serra 20A, 2865-207 Fernão Ferro' : '',
          date_day: reservation.starts_at || reservation.created_at,
          start_time: reservation.starts_at || reservation.created_at,
          end_time: reservation.ends_at || reservation.created_at,
          status: 'pending',
          user_id: user.id,
          created_at: reservation.created_at,
          is_mixmaster: isMixMaster,
          is_booking: false,
        };
      });
      
      // Combine pending projects (only bookings - Mix&Master pending are not shown here)
      const allPendingProjects = [...pendingBookingProjects, ...pendingReservationProjects].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      // Combine and sort confirmed projects by created_at
      const allProjects = [...bookingProjects, ...mixProjects].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      console.log('[PROJECTS] ✅ Total confirmed projects:', allProjects.length);
      console.log('[PROJECTS] ✅ Total pending projects:', allPendingProjects.length);
      
      setProjects(allProjects);
      setPendingProjects(allPendingProjects);
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
    pendingProjects,
    currentProject,
    loadProjects,
    loadProject,
    uploadProjectFile,
    markAsDelivered,
    deleteProject,
  };
};
