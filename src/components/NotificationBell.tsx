import React, { useState, useRef } from 'react';
import { Bell, Check, CheckCheck, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SelectedNotification {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
}

export const NotificationBell = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const [swipedNotificationId, setSwipedNotificationId] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<SelectedNotification | null>(null);
  const navigate = useNavigate();

  const handleNotificationClick = async (notification: SelectedNotification) => {
    // Open dialog to show full message
    setSelectedNotification(notification);
    setOpen(false);
  };

  const handleCloseDialog = async () => {
    if (selectedNotification && !selectedNotification.read) {
      await markAsRead(selectedNotification.id);
    }
    
    // Check if should navigate after closing dialog
    if (selectedNotification) {
      const { title, body } = selectedNotification;
      
      // Navigate to admin messages tab with client name if it's a new message notification
      if (title === 'Recebeu uma mensagem') {
        navigate('/admin/dashboard', { state: { openMessages: true, clientName: body } });
      }
      // Navigate to messages tab if it's a new message notification for regular users
      else if (title === 'Nova mensagem') {
        navigate('/messages');
      }
      // Navigate to projects tab if it's an approval/confirmation notification
      else if (title.toLowerCase().includes('aprovad') || title.toLowerCase().includes('confirmad')) {
        navigate('/projects');
      }
    }
    
    setSelectedNotification(null);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
    setSwipedNotificationId(null); // Reset swipe state after delete
  };

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent, notificationId: string) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = (notificationId: string) => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    
    if (isLeftSwipe) {
      setSwipedNotificationId(notificationId);
    } else {
      setSwipedNotificationId(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notificações</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={loading}
                  className="text-xs"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Marcar todas como lidas
                </Button>
              )}
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} notificação{unreadCount !== 1 ? 'ões' : ''} não lida{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    Ainda não há notificações
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {notifications.map((notification, index) => (
                    <div key={notification.id} className="relative overflow-hidden">
                      <div
                        className={cn(
                          "relative transition-transform duration-200 bg-background z-10",
                          swipedNotificationId === notification.id && "translate-x-[-80px]"
                        )}
                        onTouchStart={onTouchStart}
                        onTouchMove={(e) => onTouchMove(e, notification.id)}
                        onTouchEnd={() => onTouchEnd(notification.id)}
                      >
                        <div
                          className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                            !notification.read ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                          }`}
                          onClick={() => handleNotificationClick({
                            id: notification.id,
                            title: notification.title,
                            body: notification.body,
                            created_at: notification.created_at,
                            read: notification.read
                          })}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className={`text-sm font-medium truncate ${
                                  !notification.read ? 'text-foreground' : 'text-muted-foreground'
                                }`}>
                                  {notification.title}
                                </h4>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {notification.body}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: pt })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Delete button revealed on swipe - positioned behind the notification */}
                      <div className="absolute right-0 top-0 h-full w-[80px] flex items-center justify-center bg-destructive">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-full w-full text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground"
                          onClick={(e) => handleDelete(notification.id, e)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                      {index < notifications.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
      
      {/* Dialog for full notification message */}
      <Dialog open={selectedNotification !== null} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -left-2 -top-2"
              onClick={handleCloseDialog}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-center pt-2">
              {selectedNotification?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {selectedNotification?.body}
            </p>
            <p className="text-xs text-muted-foreground text-right">
              {selectedNotification && formatDistanceToNow(new Date(selectedNotification.created_at), { 
                addSuffix: true, 
                locale: pt 
              })}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Popover>
  );
};