import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Send, CheckCircle } from 'lucide-react';

const SendWelcomeToExisting = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const sendWelcomeMessages = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-welcome-to-existing', {
        method: 'POST'
      });

      if (error) {
        throw error;
      }

      setResult(data);
      toast.success(`Mensagens enviadas com sucesso! ${data.sent} utilizadores`);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erro ao enviar mensagens: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin()) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">Acesso Negado</h2>
        <p className="text-muted-foreground">Apenas administradores podem aceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-6 w-6" />
            Enviar Mensagens de Boas-Vindas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Esta função enviará mensagens de boas-vindas de <strong>Ghost Wayne</strong> para todos os
              utilizadores existentes que ainda não receberam mensagens.
            </p>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm">O que será enviado:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Mensagem de boas-vindas do Ghost Wayne</li>
                <li>Mensagem sobre recompensas com botão de ação</li>
                <li>Notificação para cada utilizador</li>
              </ul>
            </div>

            <Button
              onClick={sendWelcomeMessages}
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A Enviar Mensagens...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Mensagens de Boas-Vindas
                </>
              )}
            </Button>

            {result && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <h4 className="font-semibold text-green-900 dark:text-green-100">
                      Mensagens Enviadas com Sucesso!
                    </h4>
                    <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                      <p>✅ Enviado para: <strong>{result.sent}</strong> utilizadores</p>
                      {result.errors > 0 && (
                        <p>⚠️ Erros: <strong>{result.errors}</strong></p>
                      )}
                      <p>📊 Total de utilizadores: <strong>{result.total_users}</strong></p>
                      <p>📧 Utilizadores sem mensagens: <strong>{result.users_without_messages}</strong></p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SendWelcomeToExisting;
