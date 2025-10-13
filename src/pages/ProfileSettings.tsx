import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Key, Bell, Save, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { supabase } from '@/integrations/supabase/client';
const ProfileSettings = () => {
  const navigate = useNavigate();
  const {
    user,
    profile,
    updateProfile
  } = useAuth();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || ''
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const {
    settings: notificationSettings,
    toggleSetting
  } = useNotificationSettings();
  const [appSettings, setAppSettings] = useState({
    darkMode: false,
    language: 'pt'
  });
  const handleProfileUpdate = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const {
        error
      } = await updateProfile({
        full_name: formData.full_name,
        phone: formData.phone
      });
      if (error) {
        throw error;
      }
      setEditingProfile(false);
      toast({
        title: 'Perfil Atualizado',
        description: 'As tuas informações foram atualizadas com sucesso.'
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao atualizar o perfil',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As passwords não coincidem.',
        variant: 'destructive'
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Erro',
        description: 'A password deve ter pelo menos 6 caracteres.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setPasswordData({ newPassword: '', confirmPassword: '' });
      setChangingPassword(false);
      toast({
        title: 'Password Atualizada',
        description: 'A tua password foi alterada com sucesso.'
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao alterar a password',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  if (!user || !profile) {
    return <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="container mx-auto p-4 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/profile')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Perfil
        </Button>
        
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Definições
        </h1>
        <p className="text-muted-foreground">
          Gere as tuas preferências e informações da conta
        </p>
      </div>

      {/* Profile Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações do Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado. Contacta o suporte se necessário.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <div className="flex gap-2">
              <Input id="full_name" value={formData.full_name} onChange={e => setFormData(prev => ({
              ...prev,
              full_name: e.target.value
            }))} disabled={!editingProfile} placeholder="O teu nome completo" />
              {!editingProfile && <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
                  <Edit3 className="h-4 w-4" />
                </Button>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <div className="flex gap-2">
              <Input id="phone" value={formData.phone} onChange={e => setFormData(prev => ({
              ...prev,
              phone: e.target.value
            }))} disabled={!editingProfile} placeholder="+351 9XX XXX XXX" />
            </div>
          </div>

          {editingProfile && <div className="flex gap-2 pt-2">
              <Button onClick={handleProfileUpdate} disabled={loading} size="sm">
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'A guardar...' : 'Guardar'}
              </Button>
              <Button variant="outline" onClick={() => {
            setEditingProfile(false);
            setFormData({
              full_name: profile?.full_name || '',
              phone: profile?.phone || ''
            });
          }} size="sm">
                Cancelar
              </Button>
            </div>}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Mensagens Novas</Label>
              <p className="text-sm text-muted-foreground">
                Notificações quando recebes mensagens novas
              </p>
            </div>
            <Switch checked={notificationSettings.newMessages} onCheckedChange={() => toggleSetting('newMessages')} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Voucher de €15 Disponível</Label>
              <p className="text-sm text-muted-foreground">
                Notificação quando o voucher de €15 fica disponível
              </p>
            </div>
            <Switch checked={notificationSettings.voucherAvailable} onCheckedChange={() => toggleSetting('voucherAvailable')} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Lembretes de Reservas</Label>
              <p className="text-sm text-muted-foreground">
                Notificação uma semana antes da tua reserva
              </p>
            </div>
            <Switch checked={notificationSettings.bookingReminders} onCheckedChange={() => toggleSetting('bookingReminders')} />
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              ⚠️ As notificações por email foram removidas conforme solicitado.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* App Preferences */}
      

      {/* Security */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!changingPassword ? (
            <Button 
              variant="outline" 
              onClick={() => setChangingPassword(true)} 
              className="w-full"
            >
              Alterar Password
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Repete a nova password"
                  minLength={6}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handlePasswordChange} 
                  disabled={loading || !passwordData.newPassword || !passwordData.confirmPassword}
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'A guardar...' : 'Guardar Nova Password'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setChangingPassword(false);
                    setPasswordData({ newPassword: '', confirmPassword: '' });
                  }}
                  size="sm"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => toast({
          title: 'Funcionalidade em Desenvolvimento',
          description: 'Para apagar a conta, contacta o suporte.'
        })} className="w-full">
            Apagar Conta
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Esta ação é irreversível. Todos os dados serão permanentemente removidos.
          </p>
        </CardContent>
      </Card>
    </div>;
};
export default ProfileSettings;