import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Home, Calendar, Gift, MessageCircle, User, LogOut, Settings, Star, Music, Folder, Info } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { Logo } from '@/components/Logo';

const Layout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut, isAdmin } = useAuth();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/book', icon: Calendar, label: 'Book' },
    { path: '/projects', icon: Folder, label: 'Projects' },
    { path: '/subscriptions', icon: Star, label: 'Subscriptions' },
    { path: '/beats', icon: Music, label: 'Beats' },
    { path: '/rewards', icon: Gift, label: 'Rewards' },
    { path: '/messages', icon: MessageCircle, label: 'Messages' },
    { path: '/studio-info', icon: Info, label: 'Info' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  // Add admin navigation items if user is admin
  const adminNavItems = [
    { path: '/admin', icon: Settings, label: 'Admin' },
  ];

  const allNavItems = isAdmin() ? [...navItems, ...adminNavItems] : navItems;

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to auth if not authenticated (except on auth page)
  if (!user && location.pathname !== '/auth') {
    navigate('/auth');
    return null;
  }

  // Don't show layout for auth page
  if (location.pathname === '/auth') {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Logo and Logout */}
      <header className="flex items-center justify-between py-6 px-4">
        <Logo size="md" />
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
                      ? 'text-primary bg-primary/10' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
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