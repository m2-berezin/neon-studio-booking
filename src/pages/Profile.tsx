import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Music, Award, User, Settings, LogOut, Shield, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, updateProfile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const userStats = [
    { label: 'Sessões Reservadas', value: '0', icon: Calendar },
    { label: 'Projectos Concluídos', value: '0', icon: Music },
    { label: 'Recompensas Ganhas', value: '0', icon: Award },
  ];

  const menuItems = [
    { label: 'Definições', icon: Settings, path: '/profile/settings' },
    { label: 'Facturação e Subscrições', icon: Calendar, path: '/subscriptions' },
  ];

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: 'Sessão terminada com sucesso',
        description: 'A sessão foi terminada.',
      });
      navigate('/auth');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao terminar a sessão. Tente novamente.',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const toggleAdminMode = async () => {
    if (!profile) return;
    
    setLoading(true);
    const newRole = profile.role === 'admin' ? 'client' : 'admin';
    
    const { error } = await updateProfile({ role: newRole });
    
    if (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar o estado de administrador',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: `Função atualizada para ${newRole}`,
      });
    }
    setLoading(false);
  };

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-accent accent-glow mb-2">
          O Teu Perfil
        </h1>
        <p className="text-muted-foreground">
          Gere a tua conta do estúdio
        </p>
      </div>

      {/* Profile Header */}
      <div className="studio-card bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
            <User className="text-primary" size={28} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">
              {profile.full_name || 'No name provided'}
            </h2>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-muted-foreground capitalize">{profile.role} Membro</span>
              {profile.role === 'admin' && (
                <Shield className="h-4 w-4 text-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Membro desde {new Date(profile.created_at).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-4 pt-4 border-t border-border/20 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{user.email}</span>
          </div>
          {profile.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{profile.phone}</span>
            </div>
          )}
        </div>

        {/* Admin Toggle - Only visible for admin users */}
        {isAdmin() && (
          <div className="mt-4 pt-4 border-t border-border/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Modo Admin</span>
              </div>
              <Button
                variant={profile.role === 'admin' ? "default" : "outline"}
                size="sm"
                onClick={toggleAdminMode}
                disabled={loading}
              >
                {profile.role === 'admin' ? 'Desactivar' : 'Activar'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {userStats.map((stat) => (
          <div key={stat.label} className="studio-card text-center">
            <stat.icon className="text-primary mx-auto mb-2" size={20} />
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Menu Items */}
      <div className="space-y-3">
        {menuItems.map((item) => (
          <div 
            key={item.label} 
            className="studio-card cursor-pointer tap-target"
            onClick={() => navigate(item.path)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-secondary rounded-lg">
                  <item.icon className="text-accent" size={18} />
                </div>
                <span className="font-medium text-foreground">{item.label}</span>
              </div>
              <div className="text-muted-foreground">
                →
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sign Out */}
      <div 
        className="studio-card cursor-pointer tap-target"
        onClick={handleSignOut}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-destructive/20 rounded-lg">
              <LogOut className="text-destructive" size={18} />
            </div>
            <span className="font-medium text-foreground">
              {loading ? 'A terminar sessão...' : 'Terminar Sessão'}
            </span>
          </div>
          <div className="text-muted-foreground">
            →
          </div>
        </div>
      </div>

      {/* App Version */}
      <div className="text-center pt-4">
        <p className="text-xs text-muted-foreground">
          7T7Studios v1.0.0
        </p>
      </div>
    </div>
  );
};

export default Profile;