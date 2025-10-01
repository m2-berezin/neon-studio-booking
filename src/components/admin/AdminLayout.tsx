import React, { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Bell, 
  Calendar, 
  MessageSquare, 
  DollarSign,
  LogOut,
  Menu,
  X,
  Shield
} from 'lucide-react';
import { useState } from 'react';
import { NotificationBell } from '@/components/NotificationBell';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">Não tem permissões de administrador.</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/payments', icon: DollarSign, label: 'Pagamentos' },
    { path: '/admin/bookings', icon: Calendar, label: 'Reservas' },
    { path: '/admin/messages', icon: MessageSquare, label: 'Mensagens' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-card border-r border-border transition-all duration-300 flex flex-col fixed h-full z-50`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {sidebarOpen ? (
            <>
              <div>
                <h1 className="text-xl font-bold neon-title">7T7 Admin</h1>
                <p className="text-xs text-muted-foreground">Panel de Controlo</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="mx-auto"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? 'default' : 'ghost'}
                className={`w-full justify-start ${!sidebarOpen && 'justify-center px-0'}`}
                onClick={() => navigate(item.path)}
              >
                <item.icon className={`h-5 w-5 ${sidebarOpen && 'mr-2'}`} />
                {sidebarOpen && <span>{item.label}</span>}
              </Button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <Button
            variant="ghost"
            className={`w-full justify-start ${!sidebarOpen && 'justify-center px-0'}`}
            onClick={() => navigate('/')}
          >
            <LayoutDashboard className={`h-5 w-5 ${sidebarOpen && 'mr-2'}`} />
            {sidebarOpen && <span>Voltar ao Site</span>}
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start ${!sidebarOpen && 'justify-center px-0'}`}
            onClick={() => signOut()}
          >
            <LogOut className={`h-5 w-5 ${sidebarOpen && 'mr-2'}`} />
            {sidebarOpen && <span>Sair</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        {/* Top Bar */}
        <header className="bg-card border-b border-border p-4 flex items-center justify-between sticky top-0 z-40">
          <h2 className="text-xl font-semibold">
            {menuItems.find(item => item.path === location.pathname)?.label || 'Admin'}
          </h2>
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
