import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Music, Award, User, Settings, LogOut, Shield, Mail, Phone, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
const Profile = () => {
  const navigate = useNavigate();
  const {
    user,
    profile,
    signOut,
    updateProfile,
    isAdmin
  } = useAuth();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const [renewalDate, setRenewalDate] = useState<string | null>(null);

  // Fetch subscription renewal date
  useEffect(() => {
    const fetchRenewalDate = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase.rpc('get_subscription_renewal_date', {
          p_user_id: user.id
        });

        if (!error && data) {
          setRenewalDate(data);
        }
      } catch (error) {
        console.error('Error fetching renewal date:', error);
      }
    };

    fetchRenewalDate();
  }, [user]);
  const menuItems = [{
    label: 'Definições',
    icon: Settings,
    path: '/profile/settings'
  }];
  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      toast({
        title: 'Sessão terminada com sucesso',
        description: 'A sessão foi terminada.'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao terminar a sessão. Tente novamente.',
        variant: 'destructive'
      });
    }
    setLoading(false);
  };
  if (!user || !profile) {
    return <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="space-y-6">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate('/?tab=7')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

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
          
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">
              {profile.full_name || 'No name provided'}
            </h2>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-muted-foreground capitalize">{profile.role} Membro</span>
              {profile.role === 'admin' && <Shield className="h-4 w-4 text-primary" />}
            </div>
            <p className="text-sm text-muted-foreground">
              Membro desde {new Date(profile.created_at).toLocaleDateString('pt-PT', {
              month: 'short',
              year: 'numeric'
            })}
            </p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-4 pt-4 border-t border-border/20 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{user.email}</span>
          </div>
          {profile.phone && <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{profile.phone}</span>
            </div>}
        </div>

        {/* Subscription Renewal */}
        <div className="mt-4 pt-4 border-t border-border/20">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Renovação de subscrição a dia {renewalDate ? format(new Date(renewalDate), 'dd/MM/yyyy') : 'N/A'}
            </span>
          </div>
        </div>

      </div>

      {/* Menu Items */}
      <div className="space-y-3">
        {menuItems.map(item => <div key={item.label} className="studio-card cursor-pointer tap-target" onClick={() => navigate(item.path)}>
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
          </div>)}
      </div>

      {/* Sign Out */}
      <div className="studio-card cursor-pointer tap-target" onClick={handleSignOut}>
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
    </div>;
};
export default Profile;