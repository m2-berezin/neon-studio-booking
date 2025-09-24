import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';

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
  status: string;
  client_id: string;
  booking_id?: string;
  created_at: string;
  files?: ProjectFile[];
  client_profile?: {
    full_name: string;
    role: string;
  };
}

export const useProjects = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { createNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Load projects (all for admin, user's own for clients)
  const loadProjects = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('projects')
        .select(`
          *,
          files(*),
          client_profile:profiles!client_id(full_name, role)
        `)
        .order('created_at', { ascending: false });

      // If not admin, only show user's projects
      if (!isAdmin()) {
        query = query.eq('client_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load a specific project
  const loadProject = async (projectId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          files(*),
          client_profile:profiles!client_id(full_name, role)
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setCurrentProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Upload project file
  const uploadProjectFile = async (
    projectId: string,
    file: File,
    kind: 'idea' | 'stems' | 'draft' | 'final'
  ): Promise<boolean> => {
    if (!user) return false;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${kind}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('message-attachments') // Reuse existing bucket
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      // Get audio duration if it's an audio file
      let duration_seconds: number | undefined;
      if (file.type.startsWith('audio/')) {
        duration_seconds = await getAudioDuration(file);
      }

      // Save file record
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          project_id: projectId,
          kind,
          url: publicUrl,
          duration_seconds
        });

      if (dbError) throw dbError;

      // Send notification to relevant party
      if (kind === 'idea' || kind === 'stems') {
        // Client uploaded, notify admin
        await notifyAdmin(projectId, `New ${kind} uploaded for project`);
      } else {
        // Admin uploaded, notify client
        await notifyClient(projectId, `New ${kind} available for your project`);
      }

      // Reload current project if we're viewing it
      if (currentProject?.id === projectId) {
        await loadProject(projectId);
      }

      toast({
        title: 'File Uploaded',
        description: `${kind} file uploaded successfully`,
      });

      return true;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload file',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUploading(false);
    }
  };

  // Mark project as delivered (admin only)
  const markAsDelivered = async (projectId: string): Promise<boolean> => {
    if (!user || !isAdmin()) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'delivered' })
        .eq('id', projectId);

      if (error) throw error;

      // Find project to get client info
      const project = projects.find(p => p.id === projectId) || currentProject;
      if (project) {
        // Send notification to client
        await createNotification(
          project.client_id,
          'Project Delivered',
          `Your project "${project.title}" has been completed and delivered!`
        );
      }

      // Reload projects
      await loadProjects();
      if (currentProject?.id === projectId) {
        await loadProject(projectId);
      }

      toast({
        title: 'Project Delivered',
        description: 'Project marked as delivered and client notified',
      });

      return true;
    } catch (error: any) {
      console.error('Error marking as delivered:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark as delivered',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get audio duration
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(Math.floor(audio.duration));
        URL.revokeObjectURL(audio.src);
      };
      audio.onerror = () => {
        resolve(0);
        URL.revokeObjectURL(audio.src);
      };
      audio.src = URL.createObjectURL(file);
    });
  };

  // Helper function to notify admin
  const notifyAdmin = async (projectId: string, message: string) => {
    try {
      const { data: adminUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .maybeSingle();

      if (adminUser) {
        await supabase
          .from('notifications')
          .insert({
            user_id: adminUser.id,
            title: 'Project Update',
            body: message,
          });
      }
    } catch (error) {
      console.error('Error notifying admin:', error);
    }
  };

  // Helper function to notify client
  const notifyClient = async (projectId: string, message: string) => {
    try {
      const project = projects.find(p => p.id === projectId) || currentProject;
      if (project) {
        await supabase
          .from('notifications')
          .insert({
            user_id: project.client_id,
            title: 'Project Update',
            body: message,
          });
      }
    } catch (error) {
      console.error('Error notifying client:', error);
    }
  };

  // Get file counts by type
  const getFileCounts = (projectFiles: ProjectFile[]) => {
    return projectFiles.reduce((acc, file) => {
      acc[file.kind] = (acc[file.kind] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  return {
    loading,
    uploading,
    projects,
    currentProject,
    loadProject,
    uploadProjectFile,
    markAsDelivered,
    getFileCounts,
    loadProjects,
  };
};