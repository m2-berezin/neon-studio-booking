import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CheckCircle2, XCircle } from 'lucide-react';

export const NotificationHandler = () => {
  const { user } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const navigate = useNavigate();

  // Don't show automatic toasts - only show notifications in the bell icon

  // Real-time subscription disabled - notifications only appear in bell icon

  return null;
};
