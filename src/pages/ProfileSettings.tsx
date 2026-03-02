import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Key, Bell, Save, Edit3, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { supabase } from '@/integrations/supabase/client';

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  useEffect(() => { window.scrollTo(0, 0); }, []);
  
  const [formData, setFormData] = useState({ full_name: profile?.full_name || '', phone: profile?.phone || '' });
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const { settings: notificationSettings, toggleSetting } = useNotificationSettings();

  const handleProfileUpdate = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { error } = await updateProfile({ full_name: formData.full_name, phone: formData.phone });
      if (error) throw error;
      setEditingProfile(false);
      toast({ title: 'Perfil Atualizado' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Falha ao atualizar', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: 'Erro', description: 'As passwords não coincidem.', variant: 'destructive' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({ title: 'Erro', description: 'Mínimo 6 caracteres.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setChangingPassword(false);
      toast({ title: 'Password Atualizada' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('delete_own_account');
      if (error) throw error;
      toast({ title: 'Conta Eliminada' });
      await signOut();
      navigate('/auth');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally { setLoading(false); setShowDeleteDialog(false); }
  };

  if (!user || !profile) {
    return <div className="flex items-center justify-center min-h-64"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/profile')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Perfil
        </Button>
      </div>
      
      <div className="mb-4">
        <h1 className="text-xl font-bold text-foreground mb-0.5">Definições</h1>
        <p className="text-xs text-muted-foreground">Gere as tuas preferências e conta</p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <User className="h-4 w-4" /> Informações do Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input id="email" value={user.email} disabled className="bg-muted h-8 text-xs" />
            <p className="text-xs text-muted-foreground">Não pode ser alterado.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="full_name" className="text-xs">Nome Completo</Label>
            <div className="flex gap-1.5">
              <Input id="full_name" value={formData.full_name} onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                disabled={!editingProfile} placeholder="O teu nome" className="h-8 text-xs" />
              {!editingProfile && (
                <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)} className="h-8 w-8 p-0">
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone" className="text-xs">Telefone</Label>
            <Input id="phone" value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              disabled={!editingProfile} placeholder="+351 9XX XXX XXX" className="h-8 text-xs" />
          </div>
          {editingProfile && (
            <div className="flex gap-1.5 pt-1">
              <Button onClick={handleProfileUpdate} disabled={loading} size="sm" className="text-xs h-7">
                <Save className="h-3.5 w-3.5 mr-1" /> {loading ? 'A guardar...' : 'Guardar'}
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { setEditingProfile(false); setFormData({ full_name: profile?.full_name || '', phone: profile?.phone || '' }); }}>
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Bell className="h-4 w-4" /> Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {[
            { key: 'newMessages' as const, label: 'Mensagens Novas', desc: 'Notificações de mensagens novas' },
            { key: 'voucherAvailable' as const, label: 'Voucher 15€', desc: 'Quando o voucher fica disponível' },
            { key: 'bookingReminders' as const, label: 'Lembretes de Reservas', desc: '72h antes da tua reserva' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <Label className="text-xs">{item.label}</Label>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch checked={notificationSettings[item.key]} onCheckedChange={() => toggleSetting(item.key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Key className="h-4 w-4" /> Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {!changingPassword ? (
            <Button variant="outline" onClick={() => setChangingPassword(true)} className="w-full text-xs h-8">Alterar Password</Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="newPassword" className="text-xs">Nova Password</Label>
                <div className="relative">
                  <Input id="newPassword" type={showNewPassword ? "text" : "password"} value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Mínimo 6 caracteres" className="pr-9 h-8 text-xs" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}>
                    {showNewPassword ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-xs">Confirmar Password</Label>
                <div className="relative">
                  <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Repete a password" className="pr-9 h-8 text-xs" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button onClick={handlePasswordChange} disabled={loading || !passwordData.newPassword || !passwordData.confirmPassword} size="sm" className="text-xs h-7">
                  <Save className="h-3.5 w-3.5 mr-1" /> {loading ? 'A guardar...' : 'Guardar'}
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { setChangingPassword(false); setPasswordData({ newPassword: '', confirmPassword: '' }); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm text-destructive">Zona de Perigo</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} className="w-full text-xs h-8" disabled={loading}>
            Apagar Conta
          </Button>
          <p className="text-xs text-muted-foreground mt-1.5">Ação irreversível. Todos os dados serão removidos.</p>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Tens a certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Isto irá eliminar permanentemente a tua conta e todos os dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {loading ? 'A eliminar...' : 'Sim, eliminar conta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfileSettings;
