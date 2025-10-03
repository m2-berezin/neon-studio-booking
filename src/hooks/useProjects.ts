import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  booking?: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
    notes?: string;
    service?: {
      name: string;
      description?: string;
    };
  };
}

export const useProjects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Projects table doesn't exist - all functions disabled
  const loadProjects = async () => {
    setProjects([]);
  };

  const loadProject = async (projectId: string) => {
    setCurrentProject(null);
  };

  const createProject = async (title: string, description: string, files: File[], bookingId?: string) => {
    toast({
      title: 'Error',
      description: 'Projects system not implemented',
      variant: 'destructive',
    });
    return null;
  };

  const updateProjectStatus = async (projectId: string, status: string, adminNotes?: string) => {
    toast({
      title: 'Error',
      description: 'Projects system not implemented',
      variant: 'destructive',
    });
    return false;
  };

  const deleteProject = async (projectId: string) => {
    toast({
      title: 'Error',
      description: 'Projects system not implemented',
      variant: 'destructive',
    });
    return false;
  };

  const uploadProjectFiles = async (files: File[]) => {
    toast({
      title: 'Error',
      description: 'Projects system not implemented',
      variant: 'destructive',
    });
    return [];
  };

  // Stub methods for compatibility
  const uploadProjectFile = async (projectId: string, file: File) => null;
  const markAsDelivered = async (projectId: string) => false;
  const getFileCounts = (projectFiles: any[]) => ({ audio: 0, video: 0, stems: 0 });

  return {
    loading,
    uploading,
    projects,
    currentProject,
    loadProjects,
    loadProject,
    createProject,
    updateProjectStatus,
    deleteProject,
    uploadProjectFiles,
    uploadProjectFile,
    markAsDelivered,
    getFileCounts,
  };
};
