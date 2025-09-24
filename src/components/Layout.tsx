import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Gift, MessageCircle, User } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/book', icon: Calendar, label: 'Book' },
    { path: '/rewards', icon: Gift, label: 'Rewards' },
    { path: '/messages', icon: MessageCircle, label: 'Messages' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Logo */}
      <header className="flex justify-center py-6 px-4">
        <h1 className="text-3xl font-bold text-primary neon-glow tracking-wider">
          7T7Studios
        </h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="flex items-center justify-around py-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`tap-target flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                isActive(path)
                  ? 'text-primary neon-glow'
                  : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;