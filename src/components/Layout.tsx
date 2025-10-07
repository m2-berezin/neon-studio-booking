import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Home, User, LogOut, Settings, Folder, Info, Award, MessageSquare } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { Logo } from '@/components/Logo';
import { NotificationHandler } from '@/components/NotificationHandler';

const Layout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut, isAdmin, subscription } = useAuth();

  // Handle authentication redirect properly (non-blocking)
  useEffect(() => {
    if (!user && location.pathname !== '/auth') {
      navigate('/auth');
    }
  }, [user, navigate, location.pathname]);

  // Redirect admins to dashboard when they try to access home
  useEffect(() => {
    if (user && isAdmin() && location.pathname === '/') {
      navigate('/admin/dashboard');
    }
  }, [user, isAdmin, location.pathname, navigate]);

  type NavItem = {
    path: string;
    icon: any;
    label: string;
    isLogo?: boolean;
  };

  // Different navigation items based on role
  const userNavItems: NavItem[] = [
    { path: '/projects', icon: Folder, label: 'Projetos' },
    { path: '/rewards', icon: Award, label: 'Recompensas' },
    { path: '/', icon: Home, label: '7', isLogo: true },
    { path: '/messages', icon: MessageSquare, label: 'Mensagens' },
    { path: '/studio-info', icon: Info, label: 'Info' },
  ];

  const adminNavItems: NavItem[] = [
    { path: '/admin/dashboard', icon: Settings, label: '🦇', isLogo: true },
  ];

  const allNavItems = isAdmin() ? adminNavItems : userNavItems;

  // Don't show layout for auth page - show immediately
  if (location.pathname === '/auth') {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // Show content immediately, handle auth state reactively
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Notification Handler */}
      <NotificationHandler />
      
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
            {subscription?.is_active && (
              <div className="flex justify-center mt-1.5">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white text-black">
                  {subscription.plan_type === 'X' ? 'Premium+' : 'Premium'}
                </span>
              </div>
            )}
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
              const isActive = item.path === '/admin/dashboard' 
                ? location.pathname.startsWith('/admin')
                : location.pathname === item.path;
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
                      {item.label}
                    </span>
                  ) : (
                    <>
                      <item.icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </>
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