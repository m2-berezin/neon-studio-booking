import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Megaphone } from 'lucide-react';

const AdminShout = () => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendShout = async () => {
    if (!message.trim()) {
      toast.error('Por favor, escreva uma mensagem');
      return;
    }

    setLoading(true);
    try {
      // Get all users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id');

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        toast.error('Nenhum utilizador encontrado');
        return;
      }

      // Create notification for each user
      const notifications = profiles.map(profile => ({
        user_id: profile.id,
        title: '📢 Mensagem da Administração',
        body: message.trim(),
        read: false
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;

      toast.success(`Notificação enviada para ${profiles.length} utilizadores!`);
      setMessage('');
    } catch (error) {
      console.error('Error sending shout:', error);
      toast.error('Erro ao enviar notificação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Megaphone className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">SHOUT</CardTitle>
                <CardDescription>
                  Envie uma notificação para todos os clientes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Mensagem
              </label>
              <Textarea
                placeholder="Escreva a mensagem que quer enviar para todos os clientes..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Esta mensagem será enviada como notificação para todos os utilizadores registados
              </p>
            </div>
            <Button 
              onClick={handleSendShout}
              disabled={loading || !message.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? 'A enviar...' : 'Enviar Notificação'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminShout;
