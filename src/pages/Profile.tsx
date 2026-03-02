import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Settings, LogOut, Shield, Mail, Phone, ArrowLeft, ArrowRight, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, updateProfile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [renewalDate, setRenewalDate] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(profile?.full_name || '');
  
  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const fetchRenewalDate = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.rpc('get_subscription_renewal_date', { p_user_id: user.id });
        if (!error && data) setRenewalDate(data);
      } catch (error) { console.error('Error fetching renewal date:', error); }
    };
    fetchRenewalDate();
  }, [user]);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      toast({ title: 'Sessão terminada com sucesso' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao terminar a sessão.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      toast({ title: 'Erro', description: 'O nome não pode estar vazio.', variant: 'destructive' });
      return;
    }
    try {
      await updateProfile({ full_name: editedName.trim() });
      setIsEditingName(false);
      toast({ title: 'Nome atualizado' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao atualizar o nome.', variant: 'destructive' });
    }
  };

  if (!user || !profile) {
    return <div className="flex items-center justify-center min-h-64"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/?tab=7')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>

      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-accent accent-glow mb-1">O Teu Perfil</h1>
        <p className="text-xs text-muted-foreground">Gere a tua conta do estúdio</p>
      </div>

      {/* Profile Header */}
      <div className="studio-card bg-gradient-to-br from-primary/10 to-accent/10 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-1.5 mb-1.5">
                <Input value={editedName} onChange={(e) => setEditedName(e.target.value)}
                  className="text-sm font-bold h-8" placeholder="O teu nome" autoFocus />
                <Button size="icon" variant="ghost" onClick={handleSaveName} className="shrink-0 h-7 w-7">
                  <Check className="h-3.5 w-3.5 text-green-500" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditedName(profile?.full_name || ''); setIsEditingName(false); }} className="shrink-0 h-7 w-7">
                  <X className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mb-1.5">
                <h2 className="text-base font-bold text-foreground">{profile.full_name || 'No name provided'}</h2>
                <Button size="icon" variant="ghost" onClick={() => setIsEditingName(true)} className="h-7 w-7 shrink-0">
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs text-muted-foreground capitalize">{profile.role} Membro</span>
              {profile.role === 'admin' && <Shield className="h-3.5 w-3.5 text-primary" />}
            </div>
            <p className="text-xs text-muted-foreground">
              Membro desde {new Date(profile.created_at).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/20 space-y-1">
          <div className="flex items-center gap-1.5 text-xs">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{user.email}</span>
          </div>
          {profile.phone && (
            <div className="flex items-center gap-1.5 text-xs">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{profile.phone}</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-border/20">
          {renewalDate ? (
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Renovação a {format(new Date(renewalDate), 'dd/MM/yyyy')}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between cursor-pointer tap-target group" onClick={() => navigate('/subscriptions')}>
              <div className="flex items-center gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Não Subscrito</span>
              </div>
              <div className="flex items-center gap-1 text-accent group-hover:text-accent/80">
                <span className="text-xs font-medium">Subscrever Agora</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <div className="studio-card cursor-pointer tap-target p-3" onClick={() => navigate('/profile/settings')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-secondary rounded-lg">
              <Settings className="text-accent" size={16} />
            </div>
            <span className="font-medium text-sm text-foreground">Definições</span>
          </div>
          <span className="text-muted-foreground text-xs">→</span>
        </div>
      </div>

      {/* Sign Out */}
      <div className="studio-card cursor-pointer tap-target p-3" onClick={handleSignOut}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-destructive/20 rounded-lg">
              <LogOut className="text-destructive" size={16} />
            </div>
            <span className="font-medium text-sm text-foreground">{loading ? 'A terminar sessão...' : 'Terminar Sessão'}</span>
          </div>
          <span className="text-muted-foreground text-xs">→</span>
        </div>
      </div>

      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground">7T7Studios v1.0.0</p>
      </div>
    </div>
  );
};

export default Profile;
