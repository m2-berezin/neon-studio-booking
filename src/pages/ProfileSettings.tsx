import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Key, Bell, Moon, Sun, Globe, Save, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });
  
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    language: 'pt',
    emailNotifications: true,
    smsNotifications: false,
  });

  const handleProfileUpdate = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const { error } = await updateProfile({
        full_name: formData.full_name,
        phone: formData.phone,
      });

      if (error) {
        throw error;
      }

      setEditingProfile(false);
      toast({
        title: 'Perfil Atualizado',
        description: 'As tuas informações foram atualizadas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao atualizar o perfil',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    toast({
      title: 'Definição Atualizada',
      description: `${key} foi atualizada.`,
    });
  };

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/profile')}
          className="mb-4"
        >
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
            <Input
              id="email"
              value={user.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado. Contacta o suporte se necessário.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <div className="flex gap-2">
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                disabled={!editingProfile}
                placeholder="O teu nome completo"
              />
              {!editingProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingProfile(true)}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                disabled={!editingProfile}
                placeholder="+351 9XX XXX XXX"
              />
            </div>
          </div>

          {editingProfile && (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleProfileUpdate}
                disabled={loading}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'A guardar...' : 'Guardar'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingProfile(false);
                  setFormData({
                    full_name: profile?.full_name || '',
                    phone: profile?.phone || '',
                  });
                }}
                size="sm"
              >
                Cancelar
              </Button>
            </div>
          )}
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
              <Label>Notificações Push</Label>
              <p className="text-sm text-muted-foreground">
                Recebe notificações sobre ofertas e atualizações
              </p>
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) => handleSettingChange('notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Notificações por Email</Label>
              <p className="text-sm text-muted-foreground">
                Recebe emails sobre novos serviços e ofertas
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Notificações SMS</Label>
              <p className="text-sm text-muted-foreground">
                Recebe SMS sobre reservas confirmadas
              </p>
            </div>
            <Switch
              checked={settings.smsNotifications}
              onCheckedChange={(checked) => handleSettingChange('smsNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* App Preferences */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Preferências da App
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Modo Escuro</Label>
              <p className="text-sm text-muted-foreground">
                Alterna entre tema claro e escuro
              </p>
            </div>
            <Switch
              checked={settings.darkMode}
              onCheckedChange={(checked) => handleSettingChange('darkMode', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Idioma</Label>
            <Select
              value={settings.language}
              onValueChange={(value) => handleSettingChange('language', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={() => toast({
              title: 'Funcionalidade em Desenvolvimento',
              description: 'A alteração de password estará disponível em breve.',
            })}
            className="w-full"
          >
            Alterar Password
          </Button>
          
          <Button
            variant="outline"
            onClick={() => toast({
              title: 'Autenticação de Dois Fatores',
              description: 'Esta funcionalidade estará disponível numa atualização futura.',
            })}
            className="w-full"
          >
            Configurar 2FA
          </Button>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => toast({
              title: 'Funcionalidade em Desenvolvimento',
              description: 'Para apagar a conta, contacta o suporte.',
            })}
            className="w-full"
          >
            Apagar Conta
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Esta ação é irreversível. Todos os dados serão permanentemente removidos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSettings;