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

  // Show toasts for existing unread notifications
  useEffect(() => {
    notifications.forEach((notification) => {
      const isApproved = notification.title.toLowerCase().includes('aprovad');
      
      if (isApproved) {
        toast.success(notification.title, {
          description: notification.body,
          icon: <CheckCircle2 className="h-5 w-5" />,
          duration: 8000,
          action: {
            label: 'Ver detalhes',
            onClick: () => {
              markAsRead(notification.id);
              navigate('/profile');
            },
          },
          onDismiss: () => markAsRead(notification.id),
          onAutoClose: () => markAsRead(notification.id),
        });
      } else {
        toast.error(notification.title, {
          description: notification.body,
          icon: <XCircle className="h-5 w-5" />,
          duration: 8000,
          action: {
            label: 'Nova reserva',
            onClick: () => {
              markAsRead(notification.id);
              navigate('/book');
            },
          },
          onDismiss: () => markAsRead(notification.id),
          onAutoClose: () => markAsRead(notification.id),
        });
      }
    });
  }, [notifications]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as {
            id: string;
            title: string;
            body: string;
            user_id: string;
            read: boolean;
            created_at: string;
          };

          const isApproved = notification.title.toLowerCase().includes('aprovad');

          if (isApproved) {
            toast.success(notification.title, {
              description: notification.body,
              icon: <CheckCircle2 className="h-5 w-5" />,
              duration: 8000,
              action: {
                label: 'Ver detalhes',
                onClick: () => {
                  markAsRead(notification.id);
                  navigate('/profile');
                },
              },
              onDismiss: () => markAsRead(notification.id),
              onAutoClose: () => markAsRead(notification.id),
            });
          } else {
            toast.error(notification.title, {
              description: notification.body,
              icon: <XCircle className="h-5 w-5" />,
              duration: 8000,
              action: {
                label: 'Nova reserva',
                onClick: () => {
                  markAsRead(notification.id);
                  navigate('/book');
                },
              },
              onDismiss: () => markAsRead(notification.id),
              onAutoClose: () => markAsRead(notification.id),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, markAsRead, navigate]);

  return null;
};
