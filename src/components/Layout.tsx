import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWelcomeMessages } from '@/hooks/useWelcomeMessages';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Calendar, Gift, MessageCircle, User, LogOut, Settings, Star, Music, Folder, Info } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { Logo } from '@/components/Logo';

const Layout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut, isAdmin } = useAuth();
  const { unreadCount: unreadMessagesCount } = useUnreadMessages();
  
  // Initialize welcome messages for new users
  useWelcomeMessages();

  // Handle authentication redirect properly (non-blocking)
  useEffect(() => {
    if (!user && location.pathname !== '/auth') {
      navigate('/auth');
    }
  }, [user, navigate, location.pathname]);

  type NavItem = {
    path: string;
    icon: any;
    label: string;
    isLogo?: boolean;
  };

  const navItems: NavItem[] = [
    { path: '/projects', icon: Folder, label: 'Projectos' },
    { path: '/rewards', icon: Gift, label: 'Recompensas' },
    { path: '/', icon: Home, label: '7', isLogo: true },
    { path: '/messages', icon: MessageCircle, label: 'Mensagens' },
    { path: '/studio-info', icon: Info, label: 'Info' },
  ];

  // Add admin navigation items if user is admin
  const adminNavItems: NavItem[] = [
    { path: '/admin', icon: Settings, label: 'Admin' },
  ];

  const allNavItems = isAdmin() ? [...navItems, ...adminNavItems] : navItems;

  // Don't show layout for auth page - show immediately
  if (location.pathname === '/auth') {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // Show content immediately, handle auth state reactively
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Profile, Logo, and Logout */}
      <header className="flex items-center justify-between py-6 px-4">
        {/* Profile Icon - Left */}
        {user && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/profile')}
            className="text-muted-foreground hover:text-foreground"
          >
            <User className="h-5 w-5" />
          </Button>
        )}
        
        {/* Logo - Center */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <div className="text-center">
            <h1 className="text-2xl font-bold neon-logo">7T7</h1>
            <p className="text-xs text-muted-foreground -mt-1">Studios</p>
          </div>
        </div>
        
        {/* Logout and Notifications - Right */}
        {user && (
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => signOut()}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-20">
        {children}
      </main>

      {/* Navigation - Only show if user is authenticated */}
      {user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-md border-t border-border">
          <div className="flex justify-around py-3">
            {allNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                    isActive 
                      ? 'text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.isLogo ? (
                    <span className={`text-2xl font-bold ${isActive ? 'neon-title' : 'neon-title'}`}>
                      7
                    </span>
                  ) : (
                    <div className="relative">
                      <item.icon className="w-5 h-5" />
                      {item.label === 'Mensagens' && unreadMessagesCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] animate-pulse"
                        >
                          {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                        </Badge>
                      )}
                      <span className="text-xs font-medium">{item.label}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;