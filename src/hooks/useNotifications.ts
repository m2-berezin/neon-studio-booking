import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Notifications table doesn't exist - all functions disabled
  const loadNotifications = async () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const markAsRead = async (notificationId: string) => {
    toast({
      title: 'Error',
      description: 'Notifications system not implemented',
      variant: 'destructive',
    });
  };

  const markAllAsRead = async () => {
    toast({
      title: 'Error',
      description: 'Notifications system not implemented',
      variant: 'destructive',
    });
  };

  const createNotification = async (userId: string, title: string, body: string) => {
    return false;
  };

  return {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
  };
};
